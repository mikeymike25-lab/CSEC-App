import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  arrayUnion, 
  arrayRemove, 
  increment 
} from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

export interface VerifiedLink {
  id: string;
  url: string;
  domain: string;
  verdict: 'Safe' | 'Phishing';
  confidence: number;
  category: string;
  verifiedBy: string;
  verifiedAt: string;
  notes?: string;
}

export interface TriageTicket {
  id: string;
  url: string;
  domain: string;
  reportCount: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'pending' | 'in_review' | 'resolved' | 'rejected';
  reasons: string[];
  initialVerdict?: string;
  claimedBy?: string;
  claimedAt?: string;
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
  notes?: string;
}

/**
 * Normalizes a URL and extracts its host/domain for clean, consistent indexing.
 */
export function normalizeUrlForStorage(rawUrl: string): { cleanUrl: string; domain: string; docId: string } {
  let url = rawUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./i, '').toLowerCase();
    // Clean key: replace special characters so it is safe as a Firestore document ID
    const pathPart = urlObj.pathname === '/' ? '' : urlObj.pathname;
    const cleanUrl = `${domain}${pathPart}`.toLowerCase();
    const docId = cleanUrl.replace(/[\/\?#%&=:\.]+/g, '_').substring(0, 120) || domain;
    return { cleanUrl: url, domain, docId };
  } catch {
    const domain = url.split('/')[0].replace(/^https?:\/\//i, '').replace(/^www\./i, '').toLowerCase();
    const docId = domain.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 120);
    return { cleanUrl: url, domain, docId };
  }
}

/**
 * DATABASE 2 -> 3 PIPELINE:
 * User or Scanner submits an unverified link.
 * Automatically deduplicates in raw_submissions and upserts into triage_backlog.
 */
export async function submitLinkForTriage(
  rawUrl: string, 
  reason: string, 
  initialVerdict: string = 'Unknown',
  notes: string = ''
): Promise<{ success: boolean; message: string; reportCount: number }> {
  const user = auth.currentUser;
  const uid = user?.uid || 'anonymous_agent';
  const email = user?.email || 'Anonymous';
  const { cleanUrl, domain, docId } = normalizeUrlForStorage(rawUrl);

  const rawSubRef = doc(db, 'raw_submissions', docId);
  const triageRef = doc(db, 'triage_backlog', docId);

  const rawDoc = await getDoc(rawSubRef);
  const nowIso = new Date().toISOString();

  let currentCount = 1;

  if (rawDoc.exists()) {
    // Document already exists -> Anti-Flood Deduplication: Increment count & append reporter
    const data = rawDoc.data();
    currentCount = (data.reportCount || 1) + 1;

    await updateDoc(rawSubRef, {
      reportCount: increment(1),
      lastReportedAt: nowIso,
      reporters: arrayUnion(uid),
      reasons: arrayUnion(reason)
    });

    await setDoc(triageRef, {
      reportCount: increment(1),
      priority: currentCount >= 3 ? 'HIGH' : 'MEDIUM',
      lastUpdated: nowIso,
      reasons: arrayUnion(reason)
    }, { merge: true });

  } else {
    // New submission: Create in raw_submissions buffer
    await setDoc(rawSubRef, {
      id: docId,
      url: cleanUrl,
      domain,
      reportCount: 1,
      reporters: [uid],
      reporterEmails: [email],
      reasons: [reason],
      initialVerdict,
      notes,
      firstReportedAt: nowIso,
      lastReportedAt: nowIso,
      status: 'queued'
    });

    // Automatically stage into triage_backlog queue
    await setDoc(triageRef, {
      id: docId,
      url: cleanUrl,
      domain,
      reportCount: 1,
      priority: 'MEDIUM',
      status: 'pending',
      reasons: [reason],
      initialVerdict,
      notes,
      createdAt: nowIso
    });
  }

  return { 
    success: true, 
    message: currentCount > 1 
      ? `Link priority boosted (Reported ${currentCount} times). Staged in Researcher Triage.`
      : 'Link successfully submitted to C-SEC Threat Researchers for analysis.',
    reportCount: currentCount 
  };
}

/**
 * DATABASE 1 PIPELINE:
 * Admin / Researcher forces a link as Safe or Phishing.
 * Writes to verified_links, synchronizes system/threat_intel, and resolves any triage ticket.
 */
export async function forceOverrideLink(
  rawUrl: string, 
  verdict: 'Safe' | 'Phishing',
  category: string = 'Administrative Override',
  notes: string = ''
): Promise<{ success: boolean; domain: string }> {
  const user = auth.currentUser;
  const adminIdentifier = user?.email || user?.uid || 'ADMIN';
  const { cleanUrl, domain, docId } = normalizeUrlForStorage(rawUrl);
  const nowIso = new Date().toISOString();

  // 1. Write to DATABASE 1: verified_links
  await setDoc(doc(db, 'verified_links', docId), {
    id: docId,
    url: cleanUrl,
    domain,
    verdict,
    confidence: 100.0,
    category,
    verifiedBy: adminIdentifier,
    verifiedAt: nowIso,
    notes
  });

  // 2. Synchronize system/threat_intel with clean mutual exclusion (prevent dual-listing)
  const threatDocRef = doc(db, 'system', 'threat_intel');
  if (verdict === 'Safe') {
    await setDoc(threatDocRef, {
      whitelist: arrayUnion(domain),
      blacklist: arrayRemove(domain),
      updatedAt: nowIso,
      lastUpdatedBy: adminIdentifier
    }, { merge: true });
  } else {
    await setDoc(threatDocRef, {
      blacklist: arrayUnion(domain),
      whitelist: arrayRemove(domain),
      updatedAt: nowIso,
      lastUpdatedBy: adminIdentifier
    }, { merge: true });
  }

  // 3. If there is an open ticket in triage_backlog, mark it resolved
  try {
    const ticketRef = doc(db, 'triage_backlog', docId);
    const snap = await getDoc(ticketRef);
    if (snap.exists()) {
      await updateDoc(ticketRef, {
        status: 'resolved',
        resolution: `Verified ${verdict}`,
        resolvedBy: adminIdentifier,
        resolvedAt: nowIso
      });
    }
  } catch (err) {
    console.warn("Backlog status sync notice:", err);
  }

  return { success: true, domain };
}

/**
 * Remove a link from Database 1 (Un-force)
 */
export async function removeVerifiedLink(docId: string, domain: string, verdict: 'Safe' | 'Phishing') {
  const threatDocRef = doc(db, 'system', 'threat_intel');
  const listKey = verdict === 'Safe' ? 'whitelist' : 'blacklist';

  await deleteDoc(doc(db, 'verified_links', docId));
  await updateDoc(threatDocRef, {
    [listKey]: arrayRemove(domain),
    updatedAt: new Date().toISOString()
  });
}

/**
 * Resolves a ticket directly from the researcher triage backlog
 */
export async function resolveBacklogTicket(
  ticketId: string, 
  rawUrl: string, 
  verdict: 'Safe' | 'Phishing',
  notes: string = ''
) {
  return await forceOverrideLink(rawUrl, verdict, 'Researcher Triage Approved', notes);
}

/**
 * EXPORT THREAT INTEL DATA (JSON or CSV)
 * Extracts all verified links with complete audit trail.
 */
export async function exportThreatIntelData(format: 'csv' | 'json' = 'csv'): Promise<{ dataString: string; count: number; filename: string }> {
  const snap = await getDocs(collection(db, 'verified_links'));
  const links: VerifiedLink[] = [];

  snap.forEach(d => {
    links.push(d.data() as VerifiedLink);
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  if (format === 'json') {
    return {
      dataString: JSON.stringify(links, null, 2),
      count: links.length,
      filename: `csec_threat_intel_${timestamp}.json`
    };
  }

  // CSV Generation
  const headers = ['Domain', 'Full URL', 'Verdict', 'Confidence', 'Category', 'Verified By', 'Verified Date', 'Notes'];
  const rows = links.map(l => [
    `"${l.domain || ''}"`,
    `"${l.url || ''}"`,
    `"${l.verdict || ''}"`,
    `"${l.confidence ?? 100}%"`,
    `"${l.category || 'General'}"`,
    `"${l.verifiedBy || 'Admin'}"`,
    `"${l.verifiedAt || ''}"`,
    `"${(l.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  return {
    dataString: csvContent,
    count: links.length,
    filename: `csec_threat_intel_${timestamp}.csv`
  };
}
