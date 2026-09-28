# AI Business Passport — Threat Model & NDPA 2023 Security Specification

> [!IMPORTANT]
> **LEGAL NOTICE**: Prior to commercial launch in Nigeria, a qualified Nigerian legal practitioner specializing in data protection law must review all policies, consent flows, and terms of service to ensure full compliance with the Nigeria Data Protection Act (NDPA) 2023 and NDPC regulations.

---

## 1. Threat Model & Countermeasure Matrix

| Threat | Vulnerability / Attack Vector | Mitigation Countermeasure | Enforcement Implementation |
|---|---|---|---|
| **1. Passport Enumeration / Scraping** | Bot queries `/p/:id` or `passports.getPublic` using sequential IDs to scrape business directory | Permanent UUID decoupling (`passportId` generator), sliding window rate limiting (10 req/min per IP), Turnstile captcha on requests | `lib/security/rateLimiter.ts`, `passports.getPublic` minimal return validator |
| **2. Prompt Injection (Tenders/Docs)** | Malicious tender PDF or user input contains system prompt override (e.g. "Ignore previous instructions") | System prompt sandwiching (`wrapUntrustedContent`), isolated parsing, grounding validation against Brain data | `lib/llm/client.ts`, `checkGrounding()` in Document Studio & Tender Assistant |
| **3. Presigned R2 URL Leakage** | Long-lived presigned URLs exposed in browser history or log files | Short-lived signed URLs (15-minute maximum TTL), temporary token validation, category-level advisor access check | `convex/documents.ts`, Cloudflare R2 bucket access policy |
| **4. Webhook Forgery / Replay** | Attacker posts fake Paystack payment webhooks to grant unpaid subscriptions | Strict HMAC-SHA512 signature verification (`X-Paystack-Signature`), idempotent `eventId` deduplication table | `/workers/paystack-webhook`, `paymentEvents` table index |
| **5. Advisor Over-Access** | External accountant or lawyer accesses ungranted Vault categories | Server-side `requireBusinessAccess(ctx, businessId, "advisor", category)` checking active, unexpired, non-revoked grants | `convex/authHelpers.ts`, `convex/advisors.ts` |
| **6. Package Link Abuse** | Shareable passport package link downloaded repeatedly by unauthorized third parties | Hard cap of 10 downloads per approved package, 7-day automatic expiry, anti-abuse OTP verification | `convex/requests.ts`, Inngest package assembly job |
| **7. AI Cost Abuse** | Malicious user loops complex Document Studio or Tender Assistant generations | Per-business daily quota caps, monthly counter limits in Convex transactions, emergency `TOGGLE_AI_GENERATIONS` kill-switch | `lib/llm/costControls.ts`, `usage` table counters |

---

## 2. NDPA 2023 Compliance Specification

### 2.1 Lawful Basis for Processing (Section 25)
Under the Nigeria Data Protection Act (NDPA) 2023:
- **Contractual Necessity (Sec 25(1)(b))**: Business registration, compliance tracking, and document vault storage are processed to fulfill the operating contract.
- **Explicit Consent (Sec 25(1)(a))**: Optional advisor grants, public passport sharing, and marketing communications require granular opt-in consent.
- **Legitimate Interest (Sec 25(1)(f))**: Security event logging, fraud prevention, and deterministic compliance auditing.

### 2.2 Data Subject Rights (NDPA Sections 34-39)
1. **Right to Data Portability / Export**: Users can export full Business Brain and Vault document metadata via `exportBusinessData(businessId)`.
2. **Right to Erasure ("Right to be Forgotten")**: Executive data deletion via `deleteBusinessData(businessId)` revokes all advisor grants, deletes Vault documents from Cloudflare R2, and purges business records.

### 2.3 Breach Notification Runbook (72-Hour Requirement)
If a data breach is detected:
1. **Detection & Containment (Hour 0–4)**: Isolate compromised services, revoke presigned R2 tokens, and trigger kill-switch.
2. **Internal Audit (Hour 4–12)**: Determine scope of compromised data (PII, TIN, NIN, financials).
3. **NDPC Regulatory Notification (Hour 12–72)**: Notify the Nigeria Data Protection Commission (NDPC) within 72 hours of becoming aware of the breach per NDPA Section 40.
4. **Data Subject Notification**: Notify affected business owners via email and SMS with remediation steps.

### 2.4 Data Protection Officer (DPO) Contact
- **Email**: `dpo@aibusinesspassport.ng`
- **Address**: Victoria Island, Lagos, Nigeria

---

## 3. Record of Processing Activities (ROPA)

| Processing Activity | Categories of Personal Data | Retention Period | Storage Location |
|---|---|---|---|
| Business Registration | Director Legal Name, NIN, Phone, Email | Account lifetime + 7 years statutory CAC requirement | Convex (PostgreSQL engine) |
| Tax & Compliance | Business TIN, Turnover, Tax Clearances | 6 years (FIRS statutory requirement) | Cloudflare R2 + Convex |
| Public Passport | Public Trading Name, Industry, City, Services | Permanent until updated or account deleted | Edge Cache + Workers Resolver |
| Support & AI Logs | Redacted chat logs, feedback ratings | 90 days | Convex table (`assistantMessages`) |
