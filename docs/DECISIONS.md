# Architecture & Design Decisions (ADRs)

This document tracks technical decisions, architectural trade-offs, and operational assumptions made in **AI Business Passport**.

---

## ADR 001: Monorepo Structure & Separation of Concerns
- **Date**: 2026-09-28
- **Status**: Accepted
- **Context**: The platform consists of a Next.js App Router application (Vercel), Convex serverless database & business brain, Cloudflare Workers for edge execution, Inngest background jobs, and shared libraries.
- **Decision**: Maintain a unified repository structure:
  - `/app`: Next.js App Router grouped into `(marketing)`, `(app)`, and `(public)`.
  - `/convex`: Convex schema, mutations, actions, and queries as the single source of truth.
  - `/workers`: Edge workers (`passport-resolver`, `paystack-webhook`).
  - `/inngest`: All asynchronous workflows (OCR, document generation, syncs).
  - `/lib`: Provider-agnostic wrappers (`llm`, `analytics`, `copy`, `support`, `utils`).
  - `/docs`: Technical documentation and architecture records.
  - `/tests`: Vitest unit tests, Playwright E2E tests, and Convex access-control tests.
- **Consequences**: Fast local development, consolidated type definitions, shared linting and testing pipelines, independent Cloudflare deployments.

---

## ADR 002: Source-Backed AI Schema Enforcement
- **Date**: 2026-09-28
- **Status**: Accepted
- **Context**: Compliance requirements in Nigeria (CAMA 2020, FIRS, SCUML, ITF, NSITF) carry legal liability. AI must never hallucinate regulations or deadlines.
- **Decision**: All compliance-relevant outputs must carry schema-level provenance fields:
  - `source` (statutory citation or official circular)
  - `lastReviewedAt` (timestamp of human verification)
  - `effectiveDate` (applicable tax or statutory period)
  - `confidence` (numeric score 0.0 - 1.0)
  - `confirmBeforeFiling` (boolean)
  Crucially, if `confidence < 0.85`, `confirmBeforeFiling` is forced to `true` inside Convex mutations, not solely in LLM system prompts.
- **Consequences**: Regulatory accuracy is backed by human-in-the-loop data and database invariants.

---

## ADR 003: Privacy by Design in Public Passport Resolution
- **Date**: 2026-09-28
- **Status**: Accepted
- **Context**: The public Business Passport (`/p/[passportId]`) allows third parties (clients, partners, banks, tender boards) to verify business legitimacy. However, private director data (NIN, BVN), financial turnover, internal documents, and bank account numbers must remain confidential.
- **Decision**: Public vs. private shape filtering is enforced strictly at the Convex query layer (`getPublicPassport` vs `getOwnerPassport`). Under no circumstances is full business data sent to the client and filtered in React.
- **Consequences**: Zero accidental leakage of confidential personal or financial data over public endpoints.

---

## ADR 004: Plain-Language Product Voice Enforcement
- **Date**: 2026-09-28
- **Status**: Accepted
- **Context**: Nigerian SMEs and founders are overwhelmed by bureaucratic and archaic legal terms.
- **Decision**: Centralize copy tokens in `/lib/copy.ts` and outlaw specific jargon ("statutory compliance obligations", "post-incorporation filing", "corporate documentation repository", "regulatory obligations"). A dedicated Vitest test suite (`tests/banned-phrases.test.ts`) scans `/app` and `/lib` on every commit and CI run, failing if banned terms are introduced.
- **Consequences**: Consistent, approachable, founder-first communication across both human UI and AI generated output.

---

## ADR 005: Analytics Hygiene & GA4 Isolation
- **Date**: 2026-09-28
- **Status**: Accepted
- **Context**: PostHog tracks product engagement, while Google Analytics 4 is strictly for top-of-funnel marketing attribution.
- **Decision**: 
  - GA4 script is imported solely inside `app/(marketing)/layout.tsx` and never in authenticated app or public passport layouts.
  - The universal PostHog `track()` helper requires a `businessId` parameter on every event to ensure multi-tenant B2B analytics fidelity.
- **Consequences**: Clean data boundaries, no marketing tracking cookies on private customer workflows, reliable company-level cohorts.

---

## ADR 006: Sentry Instrumentation on Every Payment & Deadline Path
- **Date**: 2026-09-28
- **Status**: Accepted
- **Context**: Payment failures (Paystack/Nomba) and missed statutory deadlines have immediate financial impact on businesses.
- **Decision**: Mandatory Sentry error logging and exception capture on all payment webhook handlers, payment initiation routes, and compliance deadline calculation jobs before merge.
- **Consequences**: Immediate alerting and tracing for mission-critical operations.
