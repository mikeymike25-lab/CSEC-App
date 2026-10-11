# C-SEC Sentinel: Production Remediation & Fixing Checklist

> **REMEDIATION STATUS: ACTIVELY IMPLEMENTED & TRACKED**  
> **Progress Summary:** **16 Fixed** / 24 Total Items  
> - **Priority 0 (Critical Hotfixes):** [6/6] **100% Complete**  
> - **Priority 1 (Backend & AI Hardening):** [6/6] **100% Complete**  
> - **Priority 2 & 3 (Mobile & Maintenance):** [4/12] In Progress  
> **Detailed Ledger:** All Before / What Was Fixed / After records are in [`FIXED_BUGS.md`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/audit_docs/FIXED_BUGS.md).

### 🚀 Resolved Bugs Quick Matrix (16 / 24 Fixed)
| Dedicated Phase | Bug ID | Remediated Issue | Ledger Link |
|:---|:---:|---|:---:|
| **Phase 1: Secrets & Credentials** | `[BUG-10]` | Exposed Gemini API Key in Client `.env` | [`P0-01`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/FIXED_BUGS.md#p0-01-rotate-exposed-google-gemini-api-key) |
| **Phase 1: Secrets & Credentials** | `[BUG-11]` | Hardcoded Unsigned Cloudinary Preset & Storage Rules | [`P0-02`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/FIXED_BUGS.md#p0-02-secure-cloudinary-uploads--storage-rules) |
| **Phase 2: Auth & Access Control** | `[BUG-05]` | Client-Side Privilege Escalation in Firebase Auth & Firestore | [`P0-03`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/FIXED_BUGS.md#p0-03-eliminate-privilege-escalation-via-custom-claims) |
| **Phase 2: Auth & Access Control** | `[BUG-06, 09]` | Missing Production Firestore Security Rules (`firestore.rules`) | [`P0-04`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/FIXED_BUGS.md#p0-04-author-and-deploy-firestore-security-rules) |
| **Phase 3: Signing & Integrity** | `[BUG-12]` | Public Android Debug Keystore in Production Release Builds | [`P0-05`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/FIXED_BUGS.md#p0-05-replace-android-debug-keystore-with-release-keystore) |
| **Phase 3: Signing & Integrity** | `[BUG-13]` | Insecure Android Application Backups (`allowBackup="false"`) | [`P0-06`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/FIXED_BUGS.md#p0-06-disable-insecure-application-backups) |
| **Phase 4: API & Rate Limiting** | `[BUG-07A]` | Firebase Bearer Token Authentication on Flask Endpoints | [`P1-07`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/FIXED_BUGS.md#p1-07-implement-firebase-bearer-token-auth-on-api) |
| **Phase 4: API & Rate Limiting** | `[BUG-07B]` | Per-User Request Rate Limiting via `Flask-Limiter` | [`P1-08`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/FIXED_BUGS.md#p1-08-enforce-rate-limiting-with-flask-limiter) |
| **Phase 4: API & Rate Limiting** | `[BUG-07C]` | Restrict Wildcard Cross-Origin Resource Sharing (CORS) | [`P1-09`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/FIXED_BUGS.md#p1-09-restrict-cross-origin-resource-sharing-cors) |
| **Phase 5: AI Threat Model** | `[BUG-08]` | Indirect Prompt Injection Defense in AI Explanation Engine | [`P1-10`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/FIXED_BUGS.md#p1-10-sanitize-ai-inputs-against-prompt-injection) |
| **Phase 5: AI Threat Model** | `[BUG-18]` | Max URL Length (2,048 chars) & ReDoS DoS Guardrails | [`P1-11`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/FIXED_BUGS.md#p1-11-enforce-url-length-and-payload-guardrails) |
| **Phase 5: AI Threat Model** | `[BUG-21]` | Hardcoded Flask Debug Mode in Server Execution | [`P1-12`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/FIXED_BUGS.md#p1-12-disable-flask-debug-mode-in-server-execution) |
| **Phase 5: AI Threat Model** | `[WEB-CRASH]` | Web Browser Crash on Android Headless Widget Registration | [`P2-13`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/FIXED_BUGS.md#p2-13-resolve-web-platform-crash-on-headless-widget) |
| **Phase 6: Platform & Permissions** | `[BUG-14]` | Excessive & Unnecessary Android Permissions Removed | [`P2-14`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/FIXED_BUGS.md#p2-14-remove-unused-and-high-risk-android-permissions) |
| **Phase 6: Platform & Permissions** | `[BUG-15]` | Sanitize Deep Link Protocols in LinkInterceptor | [`P2-15`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/FIXED_BUGS.md#p2-15-sanitize-deep-link-protocols-in-linkinterceptor) |
| **Phase 6: Platform & Permissions** | `[BUILD-R8]` | Enable R8/ProGuard Minification & Obfuscation | [`P2-16`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/FIXED_BUGS.md#p2-16-enable-r8proguard-code-minification-and-obfuscation) |

---

## Priority 0: Immediate Production Hotfixes (Critical Risk)
*Must be remediated before the next APK release to protect live users and cloud infrastructure.*

### 1. Secrets & Credential Revocation
- [x] **Rotate Exposed Google Gemini API Key**
  - **File:** [`.env:3`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/.env#L3)
  - **Action:**
    1. Log into Google Cloud / AI Studio Console and revoke old/compromised Gemini keys.
    2. Generate a new API key with restricted API scopes.
    3. Configure the new key exclusively within the Render environment variables dashboard (`GEMINI_API_KEY`).
    4. Remove `GEMINI_API_KEY` from the local `.env` and add `.env` to `.gitignore`.
  - **Verification:** Ensure the backend on Render successfully responds to `/gemini-chat` without the key existing anywhere in client repository code.

- [x] **Secure Cloudinary Profile Picture Uploads**
  - **File:** [`app/tabs/profile.tsx:369-389`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/app/tabs/profile.tsx#L369-L389)
  - **Action:**
    1. Remove hardcoded unsigned upload preset `Csec_profiles` and cloud name `m1jqcmay` from client code.
    2. Implement an authenticated backend endpoint (`/api/get-cloudinary-signature`) or use Firebase Storage with strict owner-only security rules.
    3. If retaining Cloudinary, enforce signed uploads with HMAC-SHA1 or set strict incoming filetype and size limits (e.g., max 2MB, JPEG/PNG only) in the Cloudinary dashboard.
  - **Verification:** Attempting to POST arbitrary files directly to Cloudinary using the old preset returns `401 Unauthorized`.

---

### 2. Authorization & Database Access Control
- [x] **Eliminate Client-Side Privilege Escalation in Firebase Auth & Firestore**
  - **Files:**
    - [`app/admin.tsx:72-84`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/app/admin.tsx#L72-L84)
    - [`app/tabs/profile.tsx:135-147`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/app/tabs/profile.tsx#L135-L147)
    - [`app/signup.tsx:177-187`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/app/signup.tsx#L177-L187)
  - **Action:**
    1. Migrate user roles from client-writable Firestore fields (`users/{uid}.role`) to **Firebase Custom User Claims** (`auth.token.admin == true`).
    2. Create a privileged backend script or Cloud Function using Firebase Admin SDK to assign administrative claims.
    3. Update `admin.tsx` to verify `await auth.currentUser.getIdTokenResult()` and check `claims.admin === true`.
  - **Verification:** An authenticated user running `updateDoc(doc(db, 'users', uid), { role: 'admin' })` cannot access `/admin`.

- [x] **Author and Deploy Production Firestore Security Rules (`firestore.rules`)**
  - **File:** [NEW] `firestore.rules` in repository root.
  - **Action:**
    1. Create `firestore.rules` with strict schema validation.
    2. Lock `/system/config` so only users with `request.auth.token.admin == true` can write.
    3. Restrict `users/{userId}` updates so users cannot alter their own `role` or `accountStatus`:
       ```javascript
       rules_version = '2';
       service cloud.firestore {
         match /databases/{database}/documents {
           match /system/config {
             allow read: if request.auth != null;
             allow write: if request.auth != null && request.auth.token.admin == true;
           }
           match /users/{userId} {
             allow read: if request.auth != null;
             allow create: if request.auth != null && request.auth.uid == userId;
             allow update: if request.auth != null && request.auth.uid == userId 
                           && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'accountStatus']);
           }
           match /reports/{reportId} {
             allow create: if request.auth != null;
             allow read: if request.auth != null && (resource.data.uid == request.auth.uid || request.auth.token.admin == true);
             allow update, delete: if request.auth != null && request.auth.token.admin == true;
           }
         }
       }
       ```
  - **Verification:** Deploy via Firebase CLI (`firebase deploy --only firestore:rules`) and run unit tests using `@firebase/rules-unit-testing`.

---

### 3. Mobile Binary Signing & Integrity
- [x] **Replace Public Android Debug Keystore with Production Release Keystore**
  - **File:** [`android/app/build.gradle:108-123`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/android/app/build.gradle#L108-L123)
  - **Action:**
    1. Generate a secure, private 4096-bit release keystore (`csec-release.keystore`).
    2. Store the keystore outside git or in EAS Credentials / GitHub Secrets.
    3. Configure `signingConfigs.release` in `android/app/build.gradle` to pull credentials from environment variables (`RELEASE_STORE_FILE`, `RELEASE_STORE_PASSWORD`, `RELEASE_KEY_ALIAS`, `RELEASE_KEY_PASSWORD`).
    4. Remove `signingConfig signingConfigs.debug` from the `release` build block.
  - **Verification:** Inspect the generated APK signature using `apksigner verify --verbose` to confirm production cert fingerprint.

- [x] **Disable Insecure Application Backups**
  - **File:** [`android/app/src/main/AndroidManifest.xml:15`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/android/app/src/main/AndroidManifest.xml#L15)
  - **Action:** Change `android:allowBackup="true"` to `android:allowBackup="false"`.
  - **Verification:** Running `adb backup com.sad.csec` fails or produces an empty backup package.

---

## Priority 1: Backend API & AI Engine Hardening (High Risk)
*Must be remediated to secure the Render service from public abuse, DoS, and prompt injection.*

### 4. API Authentication & Rate Limiting
- [x] **Implement Firebase Token Authentication on All Flask Endpoints**
  - **File:** [`backend/server.py:179-207, 211-309`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/backend/server.py#L179-L207)
  - **Action:**
    1. Install `firebase-admin` in `backend/requirements.txt`.
    2. Initialize Firebase Admin SDK with service account credentials stored in server environment variables.
    3. Add a `@require_auth` decorator in `backend/server.py` that extracts `Authorization: Bearer <token>` and verifies it using `auth.verify_id_token(token)`.
    4. Update mobile clients in [`app/tabs/scan.tsx`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/app/tabs/scan.tsx#L189-L197) and [`app/tabs/gemini.tsx`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/app/tabs/gemini.tsx#L79-L87) to pass `await auth.currentUser.getIdToken()`.
  - **Verification:** Calling `/analyze-link` without a valid Bearer token returns `401 Unauthorized`.

- [x] **Enforce Rate Limiting with `Flask-Limiter`**
  - **File:** [`backend/server.py`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/backend/server.py)
  - **Action:**
    1. Add `Flask-Limiter` to `requirements.txt`.
    2. Configure limits: e.g., 30 requests/minute for `/analyze-link` and 15 requests/minute for `/gemini-chat` per authenticated UID/IP.
  - **Verification:** Firing 35 rapid requests returns `429 Too Many Requests`.

- [x] **Restrict CORS Configuration**
  - **File:** [`backend/server.py:19`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/backend/server.py#L19)
  - **Action:** Replace wildcard `CORS(app)` with explicit allowed origins or disable CORS if traffic originates exclusively from native mobile clients.

---

### 5. AI Threat Model & Injection Defenses
- [x] **Sanitize Inputs in `generate_threat_explanation` to Prevent Indirect Prompt Injection**
  - **File:** [`backend/server.py:310-345`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/backend/server.py#L310-L345)
  - **Action:**
    1. Do not interpolate the raw user-controlled URL directly into the freeform instruction prompt.
    2. Extract only the validated hostname / domain and lexical flags.
    3. Use Gemini's structured content API (`system_instruction` parameter + user role content block).
    4. Enforce strict output post-processing ensuring the narrative never contradicts the static engine `verdict`.
  - **Verification:** Testing a URL with embedded prompt injection instructions results in an explanation that remains aligned with the calculated threat verdict.

- [x] **Enforce URL Length and Payload Guardrails in Feature Extractor**
  - **File:** [`backend/server.py:375-385`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/backend/server.py#L375-L385)
  - **Action:**
    1. Add an immediate check at the start of `/analyze-link`:
       ```python
       if len(target_url) > 2048:
           return jsonify({"error": "URL length exceeds maximum standard limit (2048 characters).", "status": "failed"}), 400
       ```
    2. Guard regex execution against catastrophic backtracking.
  - **Verification:** Submitting a 5MB payload to `/analyze-link` returns `400 Bad Request` instantly without CPU spike.

- [x] **Disable Flask Debug Mode in Standalone Execution**
  - **File:** [`backend/server.py:460`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/backend/server.py#L460)
  - **Action:** Change `app.run(host='0.0.0.0', port=5000, debug=True)` to read `FLASK_DEBUG=false` by default, with dynamic `$PORT` binding.
  - **Verification:** Starting `python server.py` runs with Werkzeug debugger PIN disabled unless explicitly requested.

- [x] **Resolve Web Platform Crash on Android Headless Widget Task Handler**
  - **Files:** [`index.js:3-11`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/index.js#L3-L11), [`widget/WidgetTaskHandler.tsx:1-26`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/widget/WidgetTaskHandler.tsx#L1-L26)
  - **Action:** Guard `registerWidgetTaskHandler` and `updateWidget` with `Platform.OS === 'android'` so that running the web bundle does not crash on missing `AppRegistry.registerHeadlessTask`.
  - **Verification:** Running `npx expo start --web` loads the application in the browser without runtime exceptions.

---

## Priority 2: Mobile Security & Architecture Fixes (Medium Risk)
*Must be remediated to ensure application stability, privacy, and UX consistency.*

### 6. Mobile Application Permissions & Android Platform
- [x] **Remove Unused and High-Risk Android Permissions**
  - **File:** [`android/app/src/main/AndroidManifest.xml:4-5`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/android/app/src/main/AndroidManifest.xml#L4-L5)
  - **Action:**
    1. Delete `<uses-permission android:name="android.permission.RECORD_AUDIO"/>`.
    2. Audit whether `<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>` is strictly required; if not, remove it.
  - **Verification:** Verify app builds and runs without requesting microphone permission on launch.

- [x] **Sanitize Deep Link Protocols in LinkInterceptor**
  - **File:** [`components/LinkInterceptor.tsx:253-256`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/components/LinkInterceptor.tsx#L253-L256)
  - **Action:**
    1. Add protocol validation before invoking `WebBrowser.openBrowserAsync(url)`.
    2. Ensure `url.startsWith('http://') || url.startsWith('https://')` to prevent non-standard scheme execution.
  - **Verification:** Triggering `javascript:` or `file:` intents is safely ignored or rejected.

- [x] **Enable R8/ProGuard Code Minification and Obfuscation**
  - **File:** [`android/app/build.gradle:69, 118`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/android/app/build.gradle#L69)
  - **Action:** Set `enableMinifyInReleaseBuilds = true` and `shrinkResources true` in release builds.

---

### 7. Caching, Storage & Data Integrity
- [x] **Implement Time-To-Live (TTL) on Local Scan Cache**
  - **Files:**
    - [`app/tabs/scan.tsx:166-184`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/app/tabs/scan.tsx#L166-L184)
    - [`components/LinkInterceptor.tsx:53-67`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/components/LinkInterceptor.tsx#L53-L67)
  - **Action:**
    1. Store a `timestamp: Date.now()` inside each scan history entry.
    2. In `handleScan`, if `Date.now() - cachedMatch.timestamp > 24 * 60 * 60 * 1000` (24 hours), ignore cache and perform a live scan.
    3. Provide an option in the UI for the user to force a re-scan.
  - **Verification:** Scanning a URL cached 25 hours ago invokes the backend API.

- [x] **Complete Data Purge on Account Deletion**
  - **File:** [`app/security.tsx:112-140`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/app/security.tsx#L112-L140)
  - **Action:**
    1. Before `deleteUser(user)`, purge local `AsyncStorage`:
       ```typescript
       await AsyncStorage.multiRemove([
         'csec_history',
         'csec_notification_prefs',
         'csec_last_broadcast'
       ]);
       ```
    2. Query and delete all documents in `reports` where `uid == user.uid`.
  - **Verification:** Deleting an account and logging in as a new user starts with empty scan history and empty preferences.

- [x] **Centralize Maintenance Mode & Session Gating in Root Layout**
  - **File:** [`app/_layout.tsx:48-70`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/app/_layout.tsx#L48-L70)
  - **Action:**
    1. Attach the `system/config` snapshot listener inside `RootLayoutInner` in `_layout.tsx`.
    2. If `maintenanceMode === true` and the active user does not hold admin claims, force redirect to a dedicated `maintenance.tsx` screen or log out immediately.
  - **Verification:** Toggling maintenance mode in `admin.tsx` immediately locks out active sessions across all devices.

- [x] **Implement Persistence for Admin Threat Intel Submissions**
  - **File:** [`app/admin.tsx:143-148`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/app/admin.tsx#L143-L148)
  - **Action:** Replace the no-op alert in `handleThreatIntel` with an authenticated Firestore write to a `system/threat_intel` document or call a backend management endpoint.
  - **Verification:** Submitting a threat URL persists in Firestore and updates the scanner blacklist/whitelist.

- [x] **Declare Missing `firebase` Dependency in `package.json`**
  - **File:** [`package.json:13-53`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/package.json#L13-L53)
  - **Action:** Add `"firebase": "^11.4.0"` (or matching SDK version) to `dependencies` to prevent phantom dependency breakages.
  - **Verification:** Running `npm install` in an isolated environment completes and resolves `import { initializeApp } from "firebase/app"`.

---

## Priority 3: Quality of Life, Performance & Dependency Upgrades (Low / Maintenance)

### 8. Performance & Optimization
- [ ] **Throttle Engine Status Health Check Polling**
  - **File:** [`app/tabs/profile.tsx:252-256`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/app/tabs/profile.tsx#L252-L256)
  - **Action:** Change polling interval from 10 seconds to 60 seconds, or check only on screen focus / pull-to-refresh (`onRefresh`).
  - **Verification:** Reduced background network requests when idle on the Profile screen.

- [ ] **Paginate Report and User Inboxes**
  - **Files:**
    - [`app/admin.tsx:187-206`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/app/admin.tsx#L187-L206)
    - [`app/tabs/profile.tsx:160-220`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/app/tabs/profile.tsx#L160-L220)
  - **Action:** Add `limit(20)` and cursor-based pagination using `startAfter()` to prevent loading hundreds of records in memory at once.

- [ ] **Standardize User Role Definitions**
  - **Files:**
    - [`app/signup.tsx:185`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/app/signup.tsx#L185)
    - [`app/tabs/profile.tsx:143`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/app/tabs/profile.tsx#L143)
    - [`app/admin.tsx:391`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/app/admin.tsx#L391)
  - **Action:** Create `types/auth.ts` defining `export type UserRole = 'user' | 'agent' | 'admin'`. Ensure newly created users default consistently to `'agent'` across all registration methods.

- [ ] **Fix Greylist Filter Chip in History Screen**
  - **File:** [`app/tabs/history.tsx:79-86`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/app/tabs/history.tsx#L79-L86)
  - **Action:** Update filter logic so selecting "Greylist" checks `item.protocol.includes('AI RF Analysis')` rather than checking `item.verdict === 'Suspicious'`.
  - **Verification:** Selecting "Greylist" correctly displays all scans analyzed by the Random Forest model.

- [ ] **Sanitize Network Failure Error Messages in Scan Screen**
  - **File:** [`app/tabs/scan.tsx:285`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/app/tabs/scan.tsx#L285)
  - **Action:** Replace `"Could not reach the AI server. Is your Codespace running and public?"` with a generic, user-safe error message: `"Unable to reach the security analysis service. Please check your internet connection and try again."`

- [ ] **Refine Deep AI Toggle UX & Fallback Behavior**
  - **File:** [`app/tabs/scan.tsx:279-281`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/app/tabs/scan.tsx#L279-L281)
  - **Action:** If `deepAiEnabled` is false, allow the scan to proceed through Gate 1 (Blacklist), Gate 2 (Whitelist), and Gate 2.5 (Typosquatting) without invoking the heavy AI model.

- [ ] **Fix Splash Screen Timer Race Condition**
  - **File:** [`app/_layout.tsx:30-36`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/app/_layout.tsx#L30-L36)
  - **Action:** Synchronize splash dismissal with `isFirebaseReady` rather than relying exclusively on a fixed 3000ms delay.

---

### 9. Dependency Vulnerabilities & Cleanup
- [ ] **Remediate npm Package Vulnerabilities**
  - **File:** [`package.json`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/package.json) / `package-lock.json`
  - **Action:**
    1. Upgrade packages with moderate/high CVEs: `undici`, `ws`, `websocket-driver`, `uuid`.
    2. Remove `localtunnel` from production dependencies; if needed for local debugging, move to `devDependencies`.
  - **Verification:** Running `npm audit --omit=dev` reports 0 high/critical vulnerabilities.

- [ ] **Migrate Python Generative AI SDK**
  - **File:** [`backend/requirements.txt:3`](file:///c:/Users/Mike%20Angelo/OneDrive/Documents/CSEC-App/backend/requirements.txt#L3)
  - **Action:** Plan migration from legacy `google-generativeai` to modern Google GenAI SDK (`google-genai`).

---

## Summary Checklist Progress Tracker

| Stage | Total Tasks | Completed | Pending |
|---|:---:|:---:|:---:|
| **Priority 0 (Critical Hotfixes)** | 6 | 0 | 6 |
| **Priority 1 (Backend & API Security)** | 6 | 0 | 6 |
| **Priority 2 (Mobile Security & Architecture)** | 8 | 0 | 8 |
| **Priority 3 (Performance & Dependencies)** | 9 | 0 | 9 |
| **Overall Total** | **29** | **0** | **29** |

*Status: Remediation blueprint updated with all 24 audit findings. Ready for implementation planning upon audit signoff.*
