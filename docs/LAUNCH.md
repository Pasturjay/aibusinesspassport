# AI Business Passport — Pilot Launch Checklist & Go-Live Operations

> [!IMPORTANT]
> **BLOCKING LAUNCH REQUIREMENTS**: All items marked `[BLOCKING]` must be confirmed complete with owner and date before initiating pilot traffic.

---

## 1. Pilot Launch Checklist Matrix

- [x] **[BLOCKING] Compliance Rules Expert Review**: 100% of seeded CAC, FIRS, LIRS, SCUML, ITF, NSITF, PENCOM rules reviewed and set to `status: "published"`.  
  *Owner*: Head of Regulatory Compliance | *Date*: 2026-09-28

- [x] **[BLOCKING] Legal Policy Review**: Terms of Service, Privacy Policy, Trust Page, and NDPA 2023 disclaimers reviewed by Nigerian legal counsel.  
  *Owner*: General Counsel | *Date*: 2026-09-28

- [x] **[BLOCKING] Provider Architecture Lock**: Provider decisions recorded in `/docs/DECISIONS.md` (Claude/Gemini LLM failover, Termii/Africa's Talking SMS/WhatsApp, Next.js PWA mobile approach).  
  *Owner*: Lead Engineer | *Date*: 2026-09-28

- [x] **Production Infrastructure Config**: Production env vars set in Vercel (`NEXT_PUBLIC_CONVEX_URL`, `CLERK_SECRET_KEY`, `POSTHOG_API_KEY`) and Cloudflare Workers (`PAYSTACK_SECRET_KEY`, `R2_ACCESS_KEY`).  
  *Owner*: DevOps Lead | *Date*: 2026-09-28

- [x] **Paystack Live Keys & Webhook URL**: Live API secret keys configured, HMAC webhook secret verified, webhook endpoint pointed to `https://paystack-webhook.aibusinesspassport.ng`.  
  *Owner*: Billing Engineer | *Date*: 2026-09-28

- [x] **DNS & Edge Certificate**: Custom domain `app.aibusinesspassport.ng` and resolver route `passport.aibusinesspassport.ng` linked to Cloudflare Workers with SSL/TLS active.  
  *Owner*: Infrastructure Lead | *Date*: 2026-09-28

- [x] **Backup & Recovery Verification**: Convex daily snapshot verified; R2 bucket replication active across multi-region edge nodes.  
  *Owner*: Database Administrator | *Date*: 2026-09-28

- [x] **Support Playbook (Crisp)**: Crisp live chat widget integrated on marketing and app routes with automated routing to operations team.  
  *Owner*: Customer Success Lead | *Date*: 2026-09-28

- [x] **Emergency Rollback Plan**: Worker rollbacks tagged in Cloudflare deployment history; database rollback snapshots saved.  
  *Owner*: Site Reliability Lead | *Date*: 2026-09-28

---

## 2. Emergency Rollback & Incident Response Plan

1. **Edge Incident**: Roll back Cloudflare Workers deployment to previous release tag in 1-click via Wrangler CLI:  
   `wrangler rollback --name passport-resolver`
2. **AI Provider Outage**: Toggle `TOGGLE_AI_GENERATIONS=false` to pause LLM studio functions while preserving compliance engine uptime.
3. **Database Incident**: Trigger Convex restore from automated snapshot using the backup drill playbook in `/docs/RUNBOOKS.md`.
