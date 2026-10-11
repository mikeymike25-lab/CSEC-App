import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { 
  collection, 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  setDoc, 
  updateDoc, 
  where 
} from 'firebase/firestore';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { db } from '../firebaseConfig';

const SESSION_STORAGE_KEY = '@csec_active_session_id';

export interface DeviceSession {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'web';
  platform: string;
  osName: string;
  osVersion: string;
  browser?: string;
  lastActive: number;
  createdAt: number;
  status: 'active' | 'revoked';
  isCurrent?: boolean;
}

// Memory cache for current session ID to avoid async delays
let currentSessionIdCache: string | null = null;
let sessionUnsubscribe: (() => void) | null = null;
let appStateSubscription: { remove: () => void } | null = null;

/**
 * Parses user-agent on Web platforms to identify Laptop / Desktop model & Browser
 */
function getWebDeviceInfo(): {
  deviceName: string;
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'web';
  osName: string;
  osVersion: string;
  browser: string;
} {
  if (typeof window === 'undefined' || !window.navigator) {
    return {
      deviceName: 'Windows PC / Laptop (Chrome)',
      deviceType: 'desktop',
      osName: 'Windows',
      osVersion: '10/11',
      browser: 'Chrome'
    };
  }

  const nav = window.navigator as any;
  const ua = nav.userAgent || '';
  const isChromium = !!(window as any).chrome;
  const uad = nav.userAgentData;
  const navPlatform = (nav.platform || '').toLowerCase();

  // 1. Detect Browser (Google Chrome, Edge, Firefox, Safari)
  let browser = 'Chrome';
  if (ua.includes('Edg/')) {
    browser = 'Edge';
  } else if (ua.includes('Firefox/') || ua.includes('FxiOS/')) {
    browser = 'Firefox';
  } else if (isChromium || ua.includes('Chrome/') || ua.includes('CriOS/')) {
    browser = 'Chrome';
  } else if (ua.includes('Safari/') && !isChromium) {
    browser = 'Safari';
  } else if (ua.includes('OPR/') || ua.includes('Opera/')) {
    browser = 'Opera';
  }

  // 2. Detect Operating System (Windows vs Mac vs Mobile)
  let os = 'Windows';
  let osVer = '10/11';

  // Check modern Client Hints platform first
  const hintPlatform = (uad?.platform || '').toLowerCase();
  if (hintPlatform.includes('win') || navPlatform.includes('win') || ua.includes('Windows')) {
    os = 'Windows';
    osVer = '10/11';
  } else if (isChromium && !navPlatform.includes('mac') && !navPlatform.includes('iphone')) {
    // Running in Chromium on Windows host (even if DevTools emulates mobile)
    os = 'Windows';
    osVer = '10/11';
  } else if (!isChromium && (ua.includes('iPhone') || ua.includes('iPad'))) {
    os = ua.includes('iPad') ? 'iPadOS' : 'iOS';
    osVer = '';
  } else if (!isChromium && (ua.includes('Macintosh') || ua.includes('Mac OS X'))) {
    os = 'macOS';
    osVer = '';
  } else if (ua.includes('Android')) {
    os = 'Android';
    osVer = '';
  } else if (ua.includes('Linux')) {
    os = 'Linux';
    osVer = '';
  } else {
    // Default for Chromium on Windows machines
    os = isChromium ? 'Windows' : 'Desktop';
  }

  // 3. Device Name & Type
  let deviceName = '';
  let deviceType: 'mobile' | 'desktop' | 'tablet' | 'web' = 'desktop';

  if (os === 'Windows') {
    deviceType = 'desktop';
    deviceName = `Windows PC / Laptop (${browser})`;
  } else if (os === 'macOS') {
    deviceType = 'desktop';
    deviceName = `MacBook / PC (${browser})`;
  } else if (os === 'iOS') {
    deviceType = 'mobile';
    deviceName = `iPhone (${browser})`;
  } else if (os === 'Android') {
    deviceType = 'mobile';
    deviceName = `Android Web (${browser})`;
  } else {
    deviceType = 'desktop';
    deviceName = `${os} Laptop (${browser})`;
  }

  return {
    deviceName,
    deviceType,
    osName: os,
    osVersion: osVer,
    browser
  };
}

/**
 * Reads hardware and OS details on Android & iOS mobile devices
 */
async function getMobileDeviceInfo(): Promise<{
  deviceName: string;
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'web';
  osName: string;
  osVersion: string;
  browser: string;
}> {
  try {
    const brand = Device.brand || '';
    const model = Device.modelName || Device.deviceName || (Platform.OS === 'android' ? 'Android Device' : 'iOS Device');
    
    // Construct readable device name (e.g. "Xiaomi Redmi 14" or "Samsung Galaxy S24")
    let deviceName = model;
    if (brand && !model.toLowerCase().includes(brand.toLowerCase())) {
      deviceName = `${brand} ${model}`;
    }

    let deviceType: 'mobile' | 'desktop' | 'tablet' | 'web' = 'mobile';
    if (Device.deviceType === Device.DeviceType.TABLET) {
      deviceType = 'tablet';
    } else if (Device.deviceType === Device.DeviceType.DESKTOP) {
      deviceType = 'desktop';
    }

    return {
      deviceName,
      deviceType,
      osName: Device.osName || (Platform.OS === 'android' ? 'Android' : 'iOS'),
      osVersion: Device.osVersion || '',
      browser: 'CSEC Sentinel App'
    };
  } catch (error) {
    return {
      deviceName: Platform.OS === 'android' ? 'Android Device' : 'iOS Device',
      deviceType: 'mobile',
      osName: Platform.OS,
      osVersion: '',
      browser: 'CSEC Sentinel App'
    };
  }
}

/**
 * Comprehensive cross-platform device info detector
 */
export async function getClientDeviceInfo() {
  if (Platform.OS === 'web') {
    return getWebDeviceInfo();
  }
  return await getMobileDeviceInfo();
}

/**
 * Obtains or creates a persistent unique session ID for the current physical client
 */
export async function getOrCreateSessionId(): Promise<string> {
  if (currentSessionIdCache) return currentSessionIdCache;

  try {
    let storedId: string | null = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      storedId = window.localStorage.getItem(SESSION_STORAGE_KEY);
    }
    if (!storedId) {
      storedId = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    }
    if (!storedId) {
      storedId = 'csec_sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(SESSION_STORAGE_KEY, storedId);
      }
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, storedId);
    }
    currentSessionIdCache = storedId;
    return storedId;
  } catch (err) {
    const fallbackId = 'csec_sess_' + Date.now();
    currentSessionIdCache = fallbackId;
    return fallbackId;
  }
}

/**
 * Initializes and registers the active session in Firestore,
 * and sets up real-time revocation listener to kick off this device if revoked remotely.
 */
export async function registerActiveSession(
  userId: string,
  onRemoteRevoked: () => void
): Promise<() => void> {
  // Clean up previous listeners if any
  if (sessionUnsubscribe) {
    sessionUnsubscribe();
    sessionUnsubscribe = null;
  }
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription.remove = () => {};
    appStateSubscription = null;
  }

  const sessionId = await getOrCreateSessionId();
  const deviceInfo = await getClientDeviceInfo();
  const sessionDocRef = doc(db, 'users', userId, 'sessions', sessionId);

  try {
    const existingSnap = await getDoc(sessionDocRef);
    const now = Date.now();

    const sessionPayload: Partial<DeviceSession> = {
      id: sessionId,
      userId,
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType,
      platform: Platform.OS,
      osName: deviceInfo.osName,
      osVersion: deviceInfo.osVersion,
      browser: deviceInfo.browser,
      lastActive: now,
      status: 'active',
      createdAt: existingSnap.exists() ? (existingSnap.data().createdAt || now) : now
    };

    await setDoc(sessionDocRef, sessionPayload, { merge: true });
  } catch (error) {
    console.warn("[sessionService] Failed to register session in Firestore:", error);
  }

  // 1. Listen for real-time revocation from other devices
  sessionUnsubscribe = onSnapshot(
    sessionDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data?.status === 'revoked') {
          console.warn("[sessionService] Remote revocation detected for session:", sessionId);
          onRemoteRevoked();
        }
      }
    },
    (err) => {
      console.warn("[sessionService] Session snapshot error:", err.code);
    }
  );

  // 2. Heartbeat on AppState resume (Foreground)
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      updateDoc(sessionDocRef, { lastActive: Date.now() }).catch(() => {});
    }
  };

  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

  return () => {
    if (sessionUnsubscribe) {
      sessionUnsubscribe();
      sessionUnsubscribe = null;
    }
    if (appStateSubscription) {
      appStateSubscription.remove();
      appStateSubscription = null;
    }
  };
}

/**
 * Listens to all active sessions of the user in real-time
 */
export function subscribeToUserSessions(
  userId: string,
  currentSessionId: string,
  callback: (sessions: DeviceSession[]) => void
): () => void {
  const sessionsColRef = collection(db, 'users', userId, 'sessions');

  const unsubscribe = onSnapshot(
    sessionsColRef,
    (snapshot) => {
      const sessions: DeviceSession[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as DeviceSession;
        // Only return active sessions
        if (data.status === 'active') {
          sessions.push({
            ...data,
            id: docSnap.id,
            isCurrent: docSnap.id === currentSessionId
          });
        }
      });

      // Sort: current device first, then newest lastActive
      sessions.sort((a, b) => {
        if (a.isCurrent) return -1;
        if (b.isCurrent) return 1;
        return (b.lastActive || 0) - (a.lastActive || 0);
      });

      callback(sessions);
    },
    (error) => {
      console.warn("[sessionService] User sessions subscription error:", error.code);
      callback([]);
    }
  );

  return unsubscribe;
}

/**
 * Remotely terminates a specific device session
 */
export async function revokeDeviceSession(userId: string, sessionId: string): Promise<void> {
  const sessionDocRef = doc(db, 'users', userId, 'sessions', sessionId);
  await updateDoc(sessionDocRef, {
    status: 'revoked',
    revokedAt: Date.now()
  });
}

/**
 * Revokes all sessions except the current active device
 */
export async function revokeAllOtherSessions(userId: string, currentSessionId: string): Promise<number> {
  const sessionsColRef = collection(db, 'users', userId, 'sessions');
  const q = query(sessionsColRef, where('status', '==', 'active'));
  const snapshot = await getDocs(q);

  let revokedCount = 0;
  const promises: Promise<void>[] = [];

  snapshot.forEach((docSnap) => {
    if (docSnap.id !== currentSessionId) {
      promises.push(
        updateDoc(docSnap.ref, {
          status: 'revoked',
          revokedAt: Date.now()
        })
      );
      revokedCount++;
    }
  });

  await Promise.all(promises);
  return revokedCount;
}

/**
 * Cleanly terminates the current device session upon intentional logout
 */
export async function terminateCurrentSession(userId: string): Promise<void> {
  try {
    const sessionId = currentSessionIdCache || (await AsyncStorage.getItem(SESSION_STORAGE_KEY));
    if (sessionId && userId) {
      const sessionDocRef = doc(db, 'users', userId, 'sessions', sessionId);
      await deleteDoc(sessionDocRef).catch(() => {});
    }
  } catch (err) {
    console.warn("[sessionService] Error terminating current session:", err);
  } finally {
    try {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {}
    currentSessionIdCache = null;
    if (sessionUnsubscribe) {
      sessionUnsubscribe();
      sessionUnsubscribe = null;
    }
    if (appStateSubscription) {
      appStateSubscription.remove();
      appStateSubscription = null;
    }
  }
}
