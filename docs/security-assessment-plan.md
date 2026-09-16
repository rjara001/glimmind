# Glimmind — Security Assessment & Hardening Plan

## Objective

Perform a security assessment of the Glimmind application and identify concrete security vulnerabilities, misconfigurations, abuse vectors, and unnecessary exposure.

### Technology context

* Frontend: React
* Backend/infrastructure: Firebase / Google Cloud
* Database: Cloud Firestore
* Authentication: Firebase Authentication
* File storage: Firebase Storage
* Backend: Firebase Cloud Functions where applicable
* AI/API integrations: Gemini and/or other external AI services
* Hosting: Firebase Hosting where applicable

The assessment must focus on **real attack paths and practical risk**, not merely generic best practices.

Do not make assumptions. Inspect the actual code/configuration and report findings based on evidence.

---

# 0. CRITICAL — Secrets, AI/API Exposure & Cost Abuse

This is the highest-priority area.

## 0.1 Client-side credential exposure

* [ ] Identify every external API used by the application.
* [ ] Determine whether each API call originates from:

  * Browser/client
  * Cloud Function/backend
  * Both
* [ ] Inspect the generated frontend bundle, not only source files.
* [ ] Verify that no real secrets are shipped to the browser.
* [ ] Search for:

  * API keys
  * Service account credentials
  * Private keys
  * OAuth client secrets
  * Access tokens
  * Database credentials
  * AI provider credentials
* [ ] Distinguish Firebase client configuration from actual secrets.
* [ ] Determine whether any exposed Firebase API key is actually restricted appropriately.

## 0.2 AI API security

For every AI integration:

* [ ] Determine whether the browser can call the AI provider directly.
* [ ] If the browser calls the provider directly, determine exactly what credential is exposed.
* [ ] Determine whether an attacker can modify the request before it reaches the provider.
* [ ] Determine whether an attacker can:

  * Change the model
  * Change the prompt
  * Increase token limits
  * Increase audio duration
  * Change input parameters
  * Replay requests
  * Send arbitrary requests
* [ ] Verify that users cannot turn a legitimate application feature into an unrestricted proxy to a paid AI API.

## 0.3 AI abuse and billing

* [ ] Verify per-user rate limiting.
* [ ] Verify per-IP rate limiting where appropriate.
* [ ] Verify daily/monthly usage limits where appropriate.
* [ ] Verify quotas on expensive operations.
* [ ] Verify Google Cloud/Gemini billing alerts.
* [ ] Verify API quotas.
* [ ] Determine whether anonymous users can generate billable AI usage.
* [ ] Determine whether an attacker can create multiple accounts to bypass limits.
* [ ] Test replaying the same request repeatedly.
* [ ] Test concurrent requests.
* [ ] Test malformed or unusually large requests.
* [ ] Verify graceful behavior when quotas are exhausted.

## 0.4 Secret management

* [ ] Verify server-side secrets use Google Secret Manager or an appropriate secret-management mechanism.
* [ ] Verify secrets are not hardcoded in source code.
* [ ] Verify secrets are not committed to Git.
* [ ] Search Git history for previously exposed credentials.
* [ ] Verify credentials are not included in build artifacts.
* [ ] Recommend credential rotation where exposure is found.

---

# 1. CRITICAL — Authentication & Authorization

## 1.1 Firebase Authentication

* [ ] Review enabled authentication providers.
* [ ] Review Email/Password configuration.
* [ ] Review Google/Apple/Anonymous authentication if enabled.
* [ ] Review password policy.
* [ ] Verify email verification requirements for sensitive operations.
* [ ] Review account-linking behavior.
* [ ] Review anonymous authentication behavior.
* [ ] Verify session/token handling.
* [ ] Verify sensitive operations require appropriate authentication.
* [ ] Check MFA availability/enforcement for administrative or highly privileged accounts.

Do not assume that browser-side authentication checks provide security. Verify server-side/Firebase authorization independently.

## 1.2 Firestore Security Rules

Audit the complete `firestore.rules`.

* [ ] Identify every collection/document path.
* [ ] Verify least-privilege access.
* [ ] Verify users cannot access another user's data.
* [ ] Verify ownership checks use the correct object:

  * `resource.data`
  * `request.resource.data`
* [ ] Verify create operations correctly validate ownership.
* [ ] Verify update operations cannot change ownership fields.
* [ ] Verify delete operations are protected.
* [ ] Verify queries cannot bypass intended restrictions.
* [ ] Verify authenticated vs unauthenticated access.
* [ ] Verify anonymous users separately.
* [ ] Verify admin/privileged access.
* [ ] Verify custom claims where applicable.
* [ ] Search explicitly for:

  * `allow read, write: if true`
  * unconditional `allow read`
  * unconditional `allow write`
  * overly broad wildcard rules
* [ ] Check whether any development rules remain in production.
* [ ] Verify rules do not rely solely on client-provided fields that users can modify.

## 1.3 Firestore abuse

* [ ] Determine whether users can create unlimited documents.
* [ ] Determine whether users can write unlimited data.
* [ ] Determine whether expensive queries can be triggered repeatedly.
* [ ] Identify potentially expensive collection scans/queries.
* [ ] Identify endpoints or collections that could be abused for quota/cost exhaustion.

## 1.4 Storage Security Rules

Audit `storage.rules`.

* [ ] Verify user-scoped paths.
* [ ] Verify ownership checks.
* [ ] Verify authenticated access.
* [ ] Verify no unintended public read/write access.
* [ ] Validate file size.
* [ ] Validate content type where appropriate.
* [ ] Consider file extension/content mismatch attacks.
* [ ] Verify users cannot upload into another user's namespace.
* [ ] Verify users cannot delete another user's files.

---

# 2. HIGH — Firebase App Check

Determine whether Firebase App Check is appropriate for Glimmind.

* [ ] Check whether App Check is enabled.
* [ ] Check whether enforcement is enabled.
* [ ] Evaluate:

  * Firestore
  * Storage
  * Cloud Functions
* [ ] Verify invalid/unverified requests are rejected where enforcement is enabled.
* [ ] Explain clearly what App Check protects against and what it does NOT replace.
* [ ] Do not treat App Check as a replacement for Security Rules or authentication.

---

# 3. HIGH — Data Protection

## 3.1 Data classification

Identify exactly what data is stored.

* [ ] Email
* [ ] Display name
* [ ] User identifiers
* [ ] Voice recordings
* [ ] Transcriptions
* [ ] Game/session data
* [ ] Scores
* [ ] Progress
* [ ] Usage statistics
* [ ] Other potentially sensitive data

For each category identify:

* Where it is stored
* Who can access it
* How long it is retained
* Whether it is necessary

## 3.2 Voice recordings

* [ ] Identify exact Storage paths.
* [ ] Verify access controls.
* [ ] Verify whether recordings are publicly accessible.
* [ ] Verify whether recordings are automatically deleted.
* [ ] Verify transcription lifecycle.
* [ ] Verify temporary processing files are deleted.
* [ ] Check whether URLs/tokens could expose private recordings.

## 3.3 Encryption

Treat managed Firebase encryption as infrastructure rather than an application task.

* [ ] Verify HTTPS/TLS is used.
* [ ] Verify no application code sends sensitive data over insecure HTTP.
* [ ] Verify Firebase/Google-managed encryption assumptions.
* [ ] Identify any third-party service that may have different encryption characteristics.

---

# 4. HIGH — Cloud Functions Security

For every deployed function:

* [ ] Identify trigger type.
* [ ] Determine whether authentication is required.
* [ ] Verify `context.auth` / equivalent authentication validation.
* [ ] Verify authorization, not just authentication.
* [ ] Validate every input parameter.
* [ ] Use strict schemas such as Zod where appropriate.
* [ ] Reject unexpected fields where appropriate.
* [ ] Validate strings, numbers, arrays, object sizes, and URLs.
* [ ] Verify request size limits.
* [ ] Verify rate limiting.
* [ ] Verify replay resistance where relevant.
* [ ] Verify errors do not expose stack traces, secrets, internal IDs, or infrastructure details.
* [ ] Verify logs do not contain sensitive user information.
* [ ] Verify CORS configuration is appropriate.
* [ ] Verify callable functions cannot be abused as unrestricted backend proxies.

## Service accounts / IAM

For each function:

* [ ] Identify its service account.
* [ ] Review assigned IAM roles.
* [ ] Verify least privilege.
* [ ] Verify no unnecessary Owner/Editor roles.
* [ ] Verify the function cannot access unrelated resources.
* [ ] Verify secrets are only available to functions that need them.

---

# 5. HIGH — Client-Side Security

## 5.1 XSS

* [ ] Search for `dangerouslySetInnerHTML`.
* [ ] Search for raw HTML rendering.
* [ ] Search for Markdown/rich-text rendering.
* [ ] Determine whether user-controlled content can reach HTML sinks.
* [ ] Verify sanitization.
* [ ] Test stored XSS and reflected XSS.

## 5.2 Client-side trust

* [ ] Identify security decisions made only in React.
* [ ] Verify every security-critical decision is enforced server-side/Firebase-side.
* [ ] Identify hidden UI controls that could be bypassed by directly calling APIs.
* [ ] Verify client-side route guards are not treated as authorization.

## 5.3 Build artifacts

* [ ] Inspect production JavaScript bundles.
* [ ] Search for secrets and credentials.
* [ ] Search for internal endpoints.
* [ ] Identify unnecessary infrastructure information exposed to users.
* [ ] Distinguish harmless public configuration from sensitive information.

---

# 6. HIGH — Dependency Security

* [ ] Run `npm audit` / `pnpm audit`.
* [ ] Review direct dependencies.
* [ ] Review transitive dependencies.
* [ ] Review outdated packages.
* [ ] Check known CVEs.
* [ ] Review dependency lockfile.
* [ ] Verify lockfile is committed.
* [ ] Identify abandoned/unmaintained security-sensitive packages.
* [ ] Prioritize exploitable vulnerabilities over merely outdated versions.

Do not recommend upgrading dependencies blindly. Identify compatibility and actual exploitability.

---

# 7. MEDIUM — Content Security Policy & Security Headers

## 7.1 CSP

* [ ] Define CSP appropriate for the actual application.
* [ ] Start with Report-Only where appropriate.
* [ ] Identify required script origins.
* [ ] Identify required API/connect origins.
* [ ] Identify Firebase/Google origins required by the application.
* [ ] Identify font/image origins.
* [ ] Avoid `unsafe-eval` unless demonstrably required.
* [ ] Avoid `unsafe-inline` where practical.
* [ ] Verify CSP does not break Firebase functionality.

## 7.2 Security headers

Review:

* [ ] Strict-Transport-Security
* [ ] X-Content-Type-Options
* [ ] X-Frame-Options / frame-ancestors
* [ ] Referrer-Policy
* [ ] Permissions-Policy

For `Permissions-Policy`, allow only capabilities actually required by Glimmind, especially:

* microphone
* camera
* geolocation

Do not disable functionality the application genuinely requires.

---

# 8. MEDIUM — Network & Infrastructure

* [ ] Identify all externally reachable endpoints.
* [ ] Identify all Cloud Functions.
* [ ] Identify all third-party APIs.
* [ ] Determine whether any backend service is unnecessarily public.
* [ ] Review Cloud SQL/Redis/etc. only if actually used.
* [ ] Review VPC connectors only where applicable.
* [ ] Do not introduce VPC/network complexity unless the architecture actually requires it.

## 8.1 Observable network exposure (observed in production)

The following network traffic is visible in browser DevTools and is **expected/normal** for a Firebase application:

| Traffic | Purpose | Assessment |
|---------|---------|------------|
| `firestore.googleapis.com/.../Listen/channel` | Firestore real-time listeners (long-polling/WebSocket) | **Expected** — required for `onSnapshot` real-time sync |
| `identitytoolkit.googleapis.com` | Firebase Auth (sign-in, token refresh) | **Expected** |
| `firebasestorage.googleapis.com` | Storage uploads/downloads | **Expected** |
| `https://us-central1-fladycard-22a3e.cloudfunctions.net/...` | Direct Cloud Function calls (pre-rewrite) | **Expected but improved** — now proxied via `/api/*` rewrites |
| `https://fladycard-22a3e.web.app/api/*` | Clean API endpoints via Firebase Hosting rewrites | **Expected** — current production state |
| Firebase config in bundle (`apiKey`, `projectId`, `appId`) | Client SDK initialization | **Expected** — public by design, restricted via Firebase Console |

**These are NOT vulnerabilities** — they are the standard Firebase client-server architecture. The security boundary is enforced by Firestore Security Rules, not network obscurity.

---

# 9. MEDIUM — Logging & Monitoring

* [ ] Review Firebase/Google Cloud audit logs.
* [ ] Review Authentication logs.
* [ ] Review Firestore access patterns.
* [ ] Review Cloud Function errors.
* [ ] Monitor AI API usage.
* [ ] Monitor unexpected token/request consumption.
* [ ] Configure alerts for:

  * unusual AI usage
  * billing spikes
  * authentication anomalies
  * repeated failed authorization
  * unusual function invocation volume
* [ ] Verify logs do not contain secrets or unnecessary PII.

---

# 10. MEDIUM — Billing & Abuse Protection

This section is specifically important for Glimmind.

* [ ] Review Google Cloud billing configuration.
* [ ] Review billing alerts.
* [ ] Review API quotas.
* [ ] Review Firebase usage limits.
* [ ] Identify every potentially billable operation.
* [ ] Estimate worst-case abuse cost.
* [ ] Determine whether an attacker can intentionally increase:

  * Gemini usage
  * TTS usage
  * STT usage
  * Firestore reads
  * Firestore writes
  * Storage operations
  * Function invocations
* [ ] Identify the cheapest effective mitigation for each attack.
* [ ] Verify the application fails safely when quotas are exceeded.

---

# 11. Operational Security

## 11.1 Human access

* [ ] Review Google/Firebase Console users.
* [ ] Enforce MFA for privileged accounts.
* [ ] Review IAM roles.
* [ ] Remove obsolete accounts.
* [ ] Remove unnecessary permissions.

## 11.2 Service accounts

* [ ] Inventory service accounts.
* [ ] Review roles.
* [ ] Review unused accounts.
* [ ] Review service account keys.
* [ ] Remove unnecessary long-lived keys.
* [ ] Rotate credentials where required.

---

# 12. Data Lifecycle & GDPR

Assess the implementation against the application's actual behavior.

* [ ] User deletion removes Firebase Auth account.
* [ ] User deletion removes Firestore data.
* [ ] User deletion removes Storage files.
* [ ] User deletion removes associated recordings.
* [ ] User deletion removes transcription data where applicable.
* [ ] Data export is possible where required.
* [ ] Retention periods are defined.
* [ ] Privacy policy matches actual data collection and processing.
* [ ] Identify whether children/under-13 users can use the service and assess applicable requirements.

Do not assume legal compliance from technical implementation alone. Identify technical gaps separately from legal interpretation.

---

# 13. Security Testing

## 13.1 Automated tests

* [ ] Firestore Rules tests using `@firebase/rules-unit-testing`.
* [ ] Storage Rules tests.
* [ ] Function authentication tests.
* [ ] Function authorization tests.
* [ ] Input validation tests.
* [ ] Abuse/rate-limit tests.
* [ ] AI cost-abuse tests.
* [ ] XSS tests.
* [ ] CSP tests.

## 13.2 Manual attacker simulation

Perform testing from the perspective of an untrusted user.

### Anonymous user

* [ ] What can an unauthenticated user read?
* [ ] What can they write?
* [ ] Can they invoke functions?
* [ ] Can they consume AI?
* [ ] Can they create unlimited accounts?

### Authenticated user

* [ ] Can User A read User B's data?
* [ ] Can User A modify User B's data?
* [ ] Can User A delete User B's data?
* [ ] Can User A access User B's recordings?
* [ ] Can User A change ownership fields?

### Malicious client

* [ ] Modify Firestore requests.
* [ ] Modify Function requests.
* [ ] Replay requests.
* [ ] Send requests outside the UI.
* [ ] Call APIs directly with curl/Postman/custom scripts.
* [ ] Manipulate IDs.
* [ ] Manipulate parameters.
* [ ] Attempt excessive requests.
* [ ] Attempt to bypass client-side restrictions.

The assessment must assume that the attacker can fully control the browser and JavaScript running on their own machine.

---

# 14. Deliverables

Produce:

1. Executive summary
2. Architecture/security boundary diagram
3. Asset inventory
4. Authentication assessment
5. Firestore Rules assessment
6. Storage Rules assessment
7. Cloud Functions assessment
8. AI/API exposure assessment
9. AI abuse/cost assessment
10. Client-side security assessment
11. Dependency assessment
12. CSP/security-header assessment
13. Logging/monitoring assessment
14. Data lifecycle assessment
15. GDPR technical checklist
16. Remediation plan

For every finding include:

| Field           | Description                                           |
| --------------- | ----------------------------------------------------- |
| Severity        | Critical / High / Medium / Low / Informational        |
| Finding         | What is wrong                                         |
| Evidence        | Exact file/config/code/request supporting the finding |
| Attack scenario | How an attacker could exploit it                      |
| Impact          | Data / account / infrastructure / financial impact    |
| Likelihood      | Practical likelihood                                  |
| Recommendation  | Concrete remediation                                  |
| Verification    | How to confirm the fix                                |

Do not classify something as a vulnerability merely because it is visible in the browser.

For example:

* Firebase project ID → normally public/expected
* Firebase client configuration → normally public/expected
* Firestore endpoint → expected
* Firestore Security Rules bypass → vulnerability
* Service account private key → critical secret exposure
* Unrestricted Gemini credential in frontend → potentially critical/high depending on restrictions and billing exposure

---

# 15. Risk Prioritization

Prioritize findings based on actual impact.

### P0 — Critical

* Credential/secret exposure
* Unauthorized access to user data
* Arbitrary privileged operations
* Unrestricted paid AI/API access
* Ability to generate significant uncontrolled cloud costs

### P1 — High

* Authentication/authorization bypass
* Cross-user data access
* Unrestricted function abuse
* Storage exposure
* Significant XSS
* Serious exploitable dependency vulnerabilities
* Missing rate limiting on expensive operations

### P2 — Medium

* CSP weaknesses
* Security headers
* Excessive permissions
* Monitoring gaps
* Non-critical dependency issues

### P3 — Low / Informational

* Hardening opportunities
* Documentation gaps
* Minor configuration improvements

---

# 16. Final Output Requirements

Do not provide a generic security checklist as the final result.

Inspect the actual Glimmind implementation and produce:

1. **What is secure**
2. **What is exposed but expected**
3. **What is actually vulnerable**
4. **What could generate unexpected cost**
5. **What an attacker could realistically do**
6. **Exact remediation steps**
7. **Recommended order of fixes**

Pay particular attention to the distinction between:

> "The attacker can see it"

and

> "The attacker can exploit it."

The fact that the browser exposes Firebase information such as:

`projects/fladycard-22a3e`

or communicates with:

`firestore.googleapis.com`

must **not** be reported as a vulnerability by itself.

The primary security questions are:

> Can an attacker access data they should not access?

> Can an attacker perform operations they should not perform?

> Can an attacker use Glimmind as an unrestricted proxy to paid APIs?

> Can an attacker generate uncontrolled costs?

> Can an attacker obtain credentials that provide access beyond the intended client permissions?

These questions should drive the assessment and prioritization.

---

# 17. Security Boundaries & Trust Model

Document the actual security boundaries of Glimmind.

## 17.1 Component Trust Analysis

For each component identify:

- What the browser can control
- What the browser can observe
- What the browser can modify
- What Firebase Security Rules enforce
- What Cloud Functions enforce
- What IAM enforces
- What App Check enforces
- What the external AI provider enforces

## 17.2 False Boundaries (Must Not Be Trusted)

Explicitly identify anything that relies only on:

- UI restrictions
- Hidden fields
- Hidden endpoints
- Custom domains
- Hosting rewrites
- Client-side validation
- JavaScript obfuscation

These must **not** be considered security boundaries unless the underlying service independently enforces authorization.

## 17.3 Trust Model Diagram

```
Browser
  ↓
Firebase Auth
  ↓
Firestore / Storage
  ↓
Cloud Functions
  ↓
AI providers / external APIs
```

## 17.4 Arrow-by-Arrow Analysis

For each arrow, identify:

| Arrow | Authentication | Authorization | Input Validation | Rate Limiting | Cost Exposure | Data Exposure |
|-------|---------------|---------------|------------------|---------------|---------------|---------------|
| Browser → Firebase Auth | Firebase SDK / Email/Password / OAuth | N/A (auth itself) | Firebase internal | Firebase internal | N/A | Credentials (tokens) |
| Browser → Firestore | ID Token (via SDK) | **Firestore Security Rules** | Rules validation | Firebase quota / App Check | Read/write costs | User data per rules |
| Browser → Storage | ID Token (via SDK) | **Storage Security Rules** | Rules validation | Firebase quota / App Check | Storage ops costs | Files per rules |
| Browser → Cloud Functions | ID Token (callable) | **Function context.auth + code** | **Function code (Zod/etc)** | **Function code / App Check** | **Function invocations + downstream** | Request/response payloads |
| Cloud Functions → Firestore | Admin SDK (service account) | **IAM + Security Rules (bypass)** | Function code | Function code | Read/write costs | All data (admin) |
| Cloud Functions → Storage | Admin SDK (service account) | **IAM** | Function code | Function code | Storage ops costs | All files (admin) |
| Cloud Functions → AI Providers | API Key / Service Account | **Provider API key scopes** | **Function code** | **Function code / Provider quotas** | **High (token/audio costs)** | Prompts, audio, responses |

### Key Observations

- **Firestore/Storage**: Security Rules are the **only** enforcement between browser and data
- **Cloud Functions**: Function code is the enforcement; IAM grants broad access
- **AI Providers**: Function code + Provider API key scopes are the only enforcement
- **Hosting rewrites / custom domains**: Provide clean URLs only — **zero** security value
- **App Check**: Reduces automated abuse; **not** a substitute for auth/rules