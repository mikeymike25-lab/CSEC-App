# Production Codebase Bug, Error & Security Audit Master Prompt

## Mission

You are a senior:

- Application Security Engineer
- Mobile Security Engineer
- Backend Engineer
- Software Architect
- QA Engineer
- Penetration Tester
- Code Auditor

Your mission is to perform a **deep, systematic, production-grade audit** of the entire application codebase.

---

# IMPORTANT: AUDIT ONLY — DO NOT FIX

> **THIS IS A READ-ONLY AUDIT.**

The application is already live as an APK and may have real users, production APIs, databases, and sensitive information.

During this audit:

- DO NOT modify application source code.
- DO NOT fix vulnerabilities.
- DO NOT refactor code.
- DO NOT upgrade dependencies.
- DO NOT change database policies.
- DO NOT change authentication.
- DO NOT change API behavior.
- DO NOT change configuration.
- DO NOT delete files.
- DO NOT create destructive test cases.
- DO NOT deploy anything.

Your job during this phase is ONLY:

**DISCOVER → ANALYZE → VERIFY SAFELY → DOCUMENT → PRIORITIZE → RECOMMEND**

Do not implement fixes until the audit is completely finished.

---

# Production Safety Rules

Because the APK is already live:

- Assume production may contain real users.
- Assume production databases may contain real data.
- Assume APIs may be publicly reachable.
- Never expose real secrets in reports.
- Never dump production databases.
- Never delete production data.
- Never modify real user accounts.
- Never brute-force real accounts.
- Never perform denial-of-service testing.
- Never spam production endpoints.
- Never upload destructive payloads to production.
- Never exploit systems outside the authorized application environment.

If testing requires potentially destructive behavior, use:

1. Local environment
2. Development environment
3. Test database
4. Staging environment

Prefer safe verification over aggressive exploitation.

---

# Phase 1 — Understand the Application

Before looking for vulnerabilities, understand the entire system.

Determine:

- Application purpose
- Main user workflows
- Technology stack
- Frontend/mobile framework
- Backend framework
- Database
- Authentication provider
- Authorization model
- API architecture
- External services
- Cloud infrastructure
- Storage
- Deployment architecture
- Production architecture
- Development architecture
- Staging architecture

Create a high-level architecture map:

```text
User
  |
  v
Mobile APK
  |
  v
API / Backend
  |
  +------> Authentication
  |
  +------> Authorization
  |
  +------> Database
  |
  +------> Storage
  |
  +------> External Services
```

Identify all trust boundaries.

---

# Phase 2 — Repository Reconnaissance

Map the entire repository.

Inspect relevant:

- Source directories
- Configuration files
- Environment files
- Package manifests
- Lock files
- Android files
- API files
- Database files
- Migration files
- Authentication files
- Authorization middleware
- Storage configuration
- CI/CD configuration
- Docker files
- Documentation
- Tests

Look for:

```text
package.json
package-lock.json
yarn.lock
pnpm-lock.yaml
requirements.txt
pyproject.toml
build.gradle
settings.gradle
AndroidManifest.xml
.env
.env.*
Dockerfile
docker-compose.yml
```

Do not assume every file is relevant. Determine its actual role.

---

# Phase 3 — Application Inventory

Create an inventory of:

- Screens
- Components
- Services
- API clients
- API routes
- Controllers
- Middleware
- Database models
- Database tables
- Database policies
- Authentication flows
- Authorization flows
- Admin functionality
- User functionality
- File uploads
- File downloads
- Notifications
- Background jobs
- Scheduled tasks
- Third-party integrations
- WebViews
- Deep links
- Native Android components

Document important relationships between components.

---

# Phase 4 — Functional Bug Audit

Search for functional bugs.

Check for:

## Logic Errors

- Incorrect conditions
- Reversed conditions
- Incorrect boolean logic
- Missing conditions
- Incorrect comparisons
- Off-by-one errors
- Incorrect calculations
- Incorrect state transitions
- Incorrect defaults
- Incorrect fallback behavior

## Data Handling

Check:

- Null values
- Undefined values
- Empty strings
- Empty arrays
- Empty objects
- Missing fields
- Unexpected data types
- Malformed API responses
- Missing database records

## Async Operations

Look for:

- Missing `await`
- Incorrect `await`
- Unhandled promises
- Race conditions
- Duplicate requests
- Double submissions
- Infinite retries
- Missing timeouts
- Incorrect retry logic

## State Management

Look for:

- Stale state
- State synchronization problems
- State mutation
- Incorrect state resets
- Incorrect caching
- Cache invalidation problems
- Loading-state bugs
- Navigation-state bugs

## Error Handling

Look for:

- Empty `catch` blocks
- Swallowed errors
- Silent failures
- Incorrect HTTP error handling
- Incorrect success messages
- Partial failures
- Missing rollback
- Infinite loading
- Blank screens
- Application crashes

---

# Phase 5 — Authentication Audit

Audit all authentication mechanisms.

Inspect:

- Registration
- Login
- Logout
- Password reset
- Account recovery
- Email verification
- Phone verification
- OAuth
- Social login
- JWT
- Access tokens
- Refresh tokens
- Session management
- Device sessions
- Biometric authentication

Check for:

- Authentication bypass
- Weak authentication
- Session fixation
- Token replay
- Token theft
- Incorrect token expiration
- Long-lived tokens
- Improper logout
- Insecure token storage
- Tokens in logs
- Tokens in URLs
- Tokens exposed to WebViews
- Client-side-only authentication
- Authentication-state desynchronization

### Important

Never consider this secure:

```text
The button is hidden from normal users.
```

Verify that the **backend independently enforces authorization**.

---

# Phase 6 — Authorization Audit

Treat authorization as a critical security boundary.

Trace every sensitive endpoint.

For every protected operation determine:

1. Is authentication required?
2. Is authorization required?
3. Is ownership verified?
4. Is the resource ID controlled by the client?
5. Is the user ID controlled by the client?
6. Is the role controlled by the client?
7. Is the permission controlled by the client?
8. Is the status controlled by the client?
9. Can another user access the resource?
10. Can a normal user access an administrative operation?

Look for:

- IDOR
- BOLA
- Broken access control
- Horizontal privilege escalation
- Vertical privilege escalation
- Missing ownership checks
- Missing role checks
- Client-controlled authorization
- Client-controlled user IDs
- Client-controlled roles
- Client-controlled permissions

---

# Phase 7 — API Security Audit

Map every API endpoint.

For each endpoint document:

| Field | Value |
|---|---|
| Endpoint | |
| HTTP Method | |
| Authentication | |
| Authorization | |
| Input | |
| Database Access | |
| External Services | |
| Sensitive Data | |
| Rate Limiting | |
| Validation | |
| Error Handling | |

Check for:

- Missing authentication
- Missing authorization
- IDOR/BOLA
- Mass assignment
- Excessive data exposure
- Parameter tampering
- Missing validation
- Weak validation
- Missing rate limiting
- Weak rate limiting
- HTTP method manipulation
- CORS problems
- Open redirects
- SSRF
- SQL injection
- NoSQL injection
- Command injection
- Path traversal
- Template injection
- Unsafe deserialization
- File upload vulnerabilities
- API enumeration
- User enumeration

---

# Phase 8 — Injection Audit

Trace user-controlled input.

Follow input into:

- SQL queries
- NoSQL queries
- Shell commands
- File paths
- HTML
- JavaScript
- Templates
- Regular expressions
- URLs
- HTTP requests
- Database filters
- Search functionality
- Logging systems

Check specifically for:

## SQL Injection

Verify whether database queries use:

- Prepared statements
- Parameterized queries
- Safe ORM methods

Identify unsafe string concatenation.

## XSS

Check:

- HTML rendering
- WebViews
- User-generated content
- Markdown rendering
- Unsafe DOM APIs
- Unsafe URL handling

## Command Injection

Check:

- Shell execution
- System commands
- Subprocess calls
- Dynamic command arguments

## Path Traversal

Check:

- File uploads
- File downloads
- File previews
- User-controlled filenames
- File paths

---

# Phase 9 — Database Security Audit

Inspect:

- Database schema
- Queries
- Models
- RLS
- Database policies
- Stored procedures
- Triggers
- Constraints
- Foreign keys
- Indexes
- Migrations

Check for:

- Unauthorized reads
- Unauthorized writes
- Unauthorized deletes
- Missing ownership validation
- Missing constraints
- Race conditions
- Duplicate records
- Data integrity problems
- Unsafe migrations
- Missing transactions
- Partial writes

---

# Supabase-Specific Audit

If Supabase is used, inspect:

- Row Level Security
- SELECT policies
- INSERT policies
- UPDATE policies
- DELETE policies
- Storage policies
- Anonymous access
- Service-role key usage
- Client-accessible tables
- Database functions
- `SECURITY DEFINER`
- Function permissions
- Database grants

For every sensitive table determine:

```text
Who can SELECT?
Who can INSERT?
Who can UPDATE?
Who can DELETE?
How is ownership verified?
```

---

# Phase 10 — Secrets Audit

Search the entire repository for:

- API keys
- JWT secrets
- Database passwords
- Service-role keys
- OAuth secrets
- Private keys
- Cloud credentials
- Encryption keys
- Signing keys
- Hardcoded passwords
- Development credentials
- Test credentials

Check:

- Source code
- `.env`
- Build configuration
- Android resources
- APK configuration
- Logs
- Documentation
- Git history if available

### NEVER expose secrets in the report.

Use:

```text
[REDACTED]
```

instead.

Classify discovered credentials as:

- Public/client-safe
- Sensitive
- Server-only
- Potentially compromised
- Production credential
- Development credential

---

# Phase 11 — Mobile APK Security Audit

Because the application is already distributed as an APK, perform a dedicated Android security audit.

## AndroidManifest.xml

Check:

- Exported activities
- Exported services
- Exported receivers
- Exported providers
- Intent filters
- Deep links
- App links
- Permissions
- Dangerous permissions
- Backup configuration
- Debug configuration
- Cleartext traffic
- Network security configuration

Check especially:

```text
android:debuggable
android:exported
android:allowBackup
android:usesCleartextTraffic
```

Look for:

- Exported sensitive components
- Unsafe deep links
- Excessive permissions
- Debug builds shipped to production
- Backup exposure
- Cleartext HTTP

---

# Phase 12 — Mobile Storage Audit

Identify where the APK stores:

- Access tokens
- Refresh tokens
- Passwords
- User IDs
- Personal information
- Authentication state
- API keys
- Recovery information

Inspect:

- AsyncStorage
- SharedPreferences
- SQLite
- Local files
- Cache
- Clipboard
- WebView storage
- Logs

Determine whether sensitive information requires secure storage.

---

# Phase 13 — WebView Security Audit

If WebViews exist, inspect:

- JavaScript
- JavaScript interfaces
- URL validation
- Navigation restrictions
- File access
- Mixed content
- External navigation
- Authentication handling
- Local storage

Look for:

- Arbitrary URL loading
- Unsafe JavaScript interfaces
- Authentication leakage
- Local file access
- Unsafe external navigation

---

# Phase 14 — Deep Link Security

Audit:

- Custom URL schemes
- Android App Links
- Intent handling
- URL parameters
- Resource IDs
- Authentication parameters

Determine whether attackers could manipulate deep-link parameters to:

- Access unauthorized resources
- Bypass authentication
- Trigger privileged actions
- Open malicious URLs
- Modify application state

---

# Phase 15 — Network Security

Check:

- HTTPS enforcement
- HTTP usage
- TLS configuration
- Certificate validation
- SSL verification
- API base URLs
- Development endpoints
- Staging endpoints
- Production endpoints
- Localhost references

Look for:

- Cleartext HTTP
- Disabled certificate validation
- Development servers
- Staging APIs exposed in production
- Internal APIs exposed publicly

---

# Phase 16 — Dependency Security

Inspect:

- Direct dependencies
- Transitive dependencies
- Outdated packages
- Vulnerable packages
- Abandoned packages
- Suspicious packages
- Unused packages

Use the appropriate package-manager audit tools when available.

Examples:

```bash
npm audit
pnpm audit
yarn audit
pip-audit
```

Do not blindly upgrade packages.

For every vulnerable dependency determine:

1. Is it actually used?
2. Is the vulnerable code path reachable?
3. Does the vulnerability affect this application?
4. Is a patched version available?
5. Could upgrading introduce breaking changes?

---

# Phase 17 — Business Logic Audit

Do not focus only on traditional vulnerabilities.

Understand the application's actual workflows.

Look for manipulation of:

- User IDs
- Resource IDs
- Roles
- Permissions
- Status
- Ownership
- Verification state
- Approval state
- Payment state
- Timestamps
- Limits
- Quotas
- Counters
- Reports
- Transaction state

Ask:

> Can a normal user cause the application to enter a state that should only be possible through a trusted backend process?

Never trust client-controlled:

```text
role
permission
price
userId
ownerId
status
verified
approved
admin
transactionState
```

---

# Phase 18 — Crash & Stability Audit

Look for:

- Null pointer errors
- Undefined access
- Invalid casts
- Malformed JSON
- Unexpected API responses
- Network failures
- Timeout failures
- Offline failures
- Memory pressure
- Large payloads
- Large lists
- Repeated navigation
- Background/foreground transitions
- Interrupted requests
- Application restart

Identify potential:

- Crashes
- Blank screens
- Infinite loading
- Incorrect success states
- Corrupted state
- Duplicate operations

---

# Phase 19 — Performance Audit

Check for:

- N+1 queries
- Excessive API requests
- Duplicate requests
- Unnecessary re-renders
- Memory leaks
- Large images
- Large API payloads
- Expensive loops
- Inefficient database queries
- Missing indexes
- Excessive polling
- Unbounded pagination
- Blocking operations

Consider low-end Android devices and slow networks.

---

# Phase 20 — Privacy & Data Exposure

Identify sensitive information handled by the application.

Determine:

- What is collected
- Where it is stored
- Where it is transmitted
- Who can access it
- Whether unnecessary data is collected
- Whether sensitive data appears in logs
- Whether APIs expose unnecessary fields
- Whether errors expose internal information

Check for:

- PII exposure
- Authentication information
- Financial information
- Private user records
- Internal identifiers
- Stack traces
- Database structure
- Debug information

---

# Phase 21 — Production Configuration Audit

Because the APK is already live, specifically search for development configuration accidentally shipped to production.

Look for:

- Debug mode
- Development APIs
- Staging APIs
- Test accounts
- Mock data
- Test API keys
- Verbose logging
- Development certificates
- Debug menus
- Hidden admin routes
- Authentication bypasses
- Temporary bypasses
- Localhost URLs
- Development database references

---

# Phase 22 — Safe Verification

Do not report every suspicious line as a confirmed vulnerability.

Classify every finding as:

### CONFIRMED

Evidence demonstrates that the issue exists.

### LIKELY

Strong evidence suggests the issue exists, but additional verification is required.

### POTENTIAL

Suspicious pattern requiring manual verification.

### FALSE POSITIVE

The apparent issue is mitigated by another control.

---

# Severity Classification

## CRITICAL

Examples:

- Remote code execution
- Authentication bypass
- Complete database compromise
- Major production secret exposure
- Arbitrary access to highly sensitive user data

## HIGH

Examples:

- IDOR/BOLA exposing sensitive data
- Privilege escalation
- Account takeover path
- SQL injection
- Server-side secret exposure
- Missing authorization on sensitive operations

## MEDIUM

Examples:

- Limited data exposure
- Significant business-logic weakness
- Stored XSS with limited impact
- Important security-control weakness
- Sensitive information leakage

## LOW

Examples:

- Minor information disclosure
- Low-impact configuration weakness
- Minor validation issue
- Security hardening opportunity

## INFORMATIONAL

Examples:

- Code quality concerns
- Maintainability issues
- Defense-in-depth recommendations
- Non-exploitable suspicious patterns

Do not classify something as critical simply because it is related to security.

Base severity on:

```text
Exploitability
+
Impact
+
Required Preconditions
+
Affected Scope
```

---

# Finding Format

Every finding MUST use this format:

```markdown
## [BUG-ID] — [Short Title]

**Severity:** CRITICAL / HIGH / MEDIUM / LOW / INFORMATIONAL

**Confidence:** CONFIRMED / LIKELY / POTENTIAL / FALSE POSITIVE

**Category:** Security / Functional / Authentication / Authorization / API / Database / Mobile / Performance / Privacy / Configuration / Dependency / Other

**Location:** `path/to/file.ext:line`

**Affected Component:** Component name

### Description

Explain the issue clearly.

### Root Cause

Explain exactly why the issue occurs.

### Impact

Explain what could happen.

### Attack / Failure Scenario

Describe a realistic scenario.

### Evidence

Provide relevant code or execution flow.

Do NOT expose real secrets.

### Reproduction

Provide safe reproduction steps.

### Expected Behavior

Describe what should happen.

### Actual Behavior

Describe what currently happens.

### Recommended Fix

Provide a concrete remediation recommendation.

### Regression Test

Describe the test that should be added.

### Related Findings

List related BUG-IDs.
```

---

# Authorization Finding Checklist

For every sensitive endpoint explicitly answer:

```text
Authentication required?
Authorization required?
Ownership verified?
Resource ID client-controlled?
User ID client-controlled?
Role client-controlled?
Permission client-controlled?
Status client-controlled?
Can another user access the resource?
Can a normal user access an admin operation?
```

---

# Mobile Sensitive Data Checklist

Create a table:

| Data | Storage Location | Protection | Risk |
|---|---|---|---|
| Access Token | | | |
| Refresh Token | | | |
| User ID | | | |
| Email | | | |
| Personal Data | | | |
| API Key | | | |

---

# Production Risk Assessment

For every HIGH or CRITICAL finding determine:

- Is it remotely exploitable?
- Does it require authentication?
- Does it affect all users?
- Does it affect specific users?
- Does exploitation require special permissions?
- Does it affect production data?
- Could existing users potentially be affected?
- Is immediate mitigation recommended?
- Is a backend fix required?
- Does the APK need to be updated?
- Can the issue be mitigated server-side without an APK update?

Do not claim that the application has already been exploited unless there is evidence.

---

# Cross-Component Analysis

Do not audit files independently.

Trace important data across:

```text
APK
 ↓
API
 ↓
Authentication
 ↓
Authorization
 ↓
Database
```

For example, if the APK sends:

```text
userId
```

trace it through:

```text
APK
 ↓
API request
 ↓
Backend controller
 ↓
Authorization
 ↓
Database query
```

Determine whether the value is:

- Client-controlled
- Validated
- Authorized
- Used directly in a database query
- Restricted to the authenticated user

This is especially important for detecting:

- IDOR
- BOLA
- Privilege escalation
- Business-logic vulnerabilities

---

# Final Audit Report

After completing the read-only audit, produce:

## 1. Executive Summary

Include:

- Total findings
- Confirmed vulnerabilities
- Likely vulnerabilities
- Potential vulnerabilities
- Functional bugs
- Mobile security issues
- API issues
- Database issues
- Configuration issues
- Dependency issues
- Production risks

---

## 2. Critical Findings

List all critical findings.

---

## 3. High Findings

List all high findings.

---

## 4. Medium Findings

List all medium findings.

---

## 5. Low Findings

List all low findings.

---

## 6. Informational Findings

List informational findings.

---

# Risk Matrix

Create:

| ID | Severity | Confidence | Category | Component | Production Impact | Fix Required |
|---|---|---|---|---|---|---|

---

# Attack Surface Map

Create a concise attack-surface diagram:

```text
                    ┌───────────────┐
                    │     USER      │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   MOBILE APK  │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ API / BACKEND │
                    └───────┬───────┘
                            │
                 ┌──────────┼──────────┐
                 ▼          ▼          ▼
          Authentication Authorization Database
                 │          │          │
                 └──────────┼──────────┘
                            │
                            ▼
                    External Services
```

Identify weak points and trust boundaries.

---

# Remediation Priorities

Do NOT fix anything during this audit.

Instead, produce a remediation plan based on:

1. Security impact
2. Exploitability
3. Production exposure
4. Number of potentially affected users
5. Data sensitivity
6. Ease of exploitation

Do not prioritize findings merely because they are easy to fix.

---

# False Positive Review

Before finalizing the report, challenge every finding.

Ask:

> Could another security control prevent exploitation?

Check:

- Authentication middleware
- Authorization middleware
- Database RLS
- Ownership checks
- Input validation
- Framework protections
- Network restrictions
- API gateway controls

Remove or downgrade findings that cannot be substantiated.

---

# Required Output Files

Create these documentation files:

```text
AUDIT_REPORT.md
SECURITY_FINDINGS.md
BUG_FINDINGS.md
PRODUCTION_RISK.md
REMEDIATION_PLAN.md
```

These files must contain **audit results only**.

Do not modify application source code.

---

# Final Rules

1. **AUDIT FIRST.**
2. **DO NOT FIX DURING THIS AUDIT.**
3. **DO NOT MODIFY APPLICATION SOURCE CODE.**
4. Do not modify database policies.
5. Do not modify authentication.
6. Do not modify API behavior.
7. Do not upgrade dependencies.
8. Do not deploy anything.
9. Do not expose secrets.
10. Do not perform destructive testing.
11. Do not attack unauthorized systems.
12. Do not dump production data.
13. Do not brute-force real accounts.
14. Do not create denial-of-service conditions.
15. Verify findings before calling them confirmed.
16. Trace vulnerabilities across the entire application.
17. Never assume client-side restrictions provide security.
18. Never trust client-controlled authorization values.
19. Consider the APK, backend, API, and database as one security system.
20. Separate confirmed vulnerabilities from potential issues.
21. Document evidence for every finding.
22. Provide remediation recommendations without implementing them.
23. Preserve the existing application exactly as it is during this audit.

---

# START

Begin the audit now.

First:

1. Map the repository.
2. Identify the technology stack.
3. Identify the production architecture.
4. Identify the APK/backend/database relationship.
5. Identify authentication and authorization boundaries.
6. Identify sensitive data flows.
7. Identify the attack surface.
8. Then begin the systematic audit.

**Do not skip directly to conclusions.**

**Do not fix anything.**

**Audit first.**
