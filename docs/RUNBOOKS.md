# AI Business Passport — Operational Runbooks & Reliability Manual

## 1. Sentry Alert Rules Matrix

| Alert Rule Name | Threshold Condition | Notification Channels | Action Runbook |
|---|---|---|---|
| **Payment Failure Spike** | Paystack webhook failure rate > 5% over 15 min | Slack `#alerts-billing`, PagerDuty | Check Paystack status page, verify HMAC key integrity, inspect `paymentEvents` table |
| **Compliance Engine Failure** | Rules evaluation error rate > 1% | Email `ops@aibusinesspassport.ng` | Inspect `complianceRules` predicate DSL parsing errors |
| **AI Generation Error Rate** | `/lib/llm` call failure rate > 5% over 1 hour | Slack `#alerts-ai` | Verify Anthropic/Gemini API quota, check fallback provider cascade |
| **Low Extraction Confidence** | OCR document extraction confidence < 0.60 | In-app admin review queue | Surface document in `unparsedSections[]` for manual verification |

---

## 2. Backup & Restore Drill Manual (Convex & R2)

### 2.1 Convex Database Backup
- **Automated Schedule**: Daily automated snapshot at 02:00 WAT.
- **Manual Snapshot Command**: `npx convex export --out ./backups/convex-snapshot-$(date +%Y%m%d).json`
- **Restore Verification Procedure**:
  1. Initialize scratch environment: `npx convex dev --deployment scratch-restore`
  2. Import snapshot: `npx convex import ./backups/convex-snapshot-YYYYMMDD.json`
  3. Run integrity check suite: `npx vitest run tests/convex-privacy.test.ts`

### 2.2 Cloudflare R2 Document Vault Recovery
- **Replication**: Multi-region R2 replication across Europe and US West.
- **Lifecycle Rules**: 
  - Temporary export packages automatically expire after 7 days.
  - Soft-deleted documents purged after 30-day grace period.

---

## 3. Incident Kill-Switches & Emergency Toggles

- **Kill-Switch 1 (AI Generations)**: Set `TOGGLE_AI_GENERATIONS=false` in environment config to disable high-cost Document Studio & AI Assistant calls while keeping core compliance active.
- **Kill-Switch 2 (Passport Public Resolver)**: Set `MAINTENANCE_MODE=true` in Cloudflare Workers environment to serve cached static Passport pages during edge incidents.
