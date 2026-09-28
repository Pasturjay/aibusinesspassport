# AI Business Passport - System Architecture

AI Business Passport is Nigeria's AI-powered business operating system. It provides founders and SMEs with a single source of truth ("The Business Brain") to register, remain compliant, generate professional documentation, win tenders, and publish a verifiable identity (The Business Passport).

---

## System Architecture & Wiring Map

The following Mermaid diagram represents the complete end-to-end system topology across clients, Next.js App Router on Vercel, Convex backend, Cloudflare Workers, Inngest async workers, and external third-party integrations:

```mermaid
flowchart TB
    subgraph Clients["Clients & Public Web"]
        MKT["Public Marketing Visitor\n(Desktop / Mobile >= 360px)"]
        AUTH_USER["Authenticated SME / Founder\n(App Dashboard)"]
        VERIFIER["Third-Party Verifier / Tender Board\n(/p/[passportId])"]
    end

    subgraph EdgeWorkers["Cloudflare Edge Workers (/workers)"]
        RESOLVER["passport-resolver Worker\n(Cache + Edge Fast Resolver)"]
        PAY_HOOK["paystack-webhook Worker\n(HMAC-SHA512 Verification)"]
    end

    subgraph VercelApp["Next.js App Router (Vercel)"]
        subgraph RouteGroups["Route Groups"]
            MKT_GRP["(marketing)\nPage + Crisp + GA4"]
            APP_GRP["(app)\nDashboard + Crisp + PostHog\n(Strictly NO GA4)"]
            PUB_GRP["(public)\n/p/[passportId] Fallback Page"]
        end
        API_ROUTES["API Routes\n/api/sentry-test (dev)"]
    end

    subgraph BusinessBrain["Convex (Single Source of Truth)"]
        SCHEMA["Schema & Invariants\n- businesses (Business Brain)\n- passports (Public Slugs)\n- complianceItems (Source-backed)\n- documents (Metadata + R2 Keys)"]
        QUERIES["Convex Functions\n- getPublicPassport (Minimal Shape)\n- getOwnerPassport (Full Private)\n- createComplianceItem (Enforces confirmBeforeFiling)"]
    end

    subgraph AsyncWork["Inngest (All Asynchronous Work)"]
        INNGEST_JOBS["Inngest Jobs Engine\n- CAC OCR & Document Parsing\n- Tender Document Generation\n- Compliance Deadline Reminders\n- ChartMogul Revenue Sync"]
    end

    subgraph Storage["Cloudflare R2"]
        R2_BUCKET["R2 Object Storage\n(Document Bytes Only)"]
    end

    subgraph ExternalServices["External Platforms & Telemetry"]
        CLERK["Clerk (Auth & Identity)"]
        PAYSTACK["Paystack / Nomba (Payments)"]
        BREVO["Brevo (Transactional Email)"]
        SENTRY["Sentry (Error Tracing across App & Workers)"]
        POSTHOG["PostHog (Product Analytics with businessId)"]
        GA4["Google Analytics 4 (Marketing Landing Only)"]
        CRISP["Crisp (Customer Support Chat)"]
        CHARTMOGUL["ChartMogul (B2B Revenue Metrics)"]
        LLM_LAYER["/lib/llm Wrapper\n(Claude 3.5 / Gemini 1.5)"]
    end

    %% Client Interactions
    MKT --> MKT_GRP
    AUTH_USER --> APP_GRP
    VERIFIER --> RESOLVER
    RESOLVER --> PUB_GRP
    RESOLVER --> QUERIES

    %% Edge Worker to Inngest & Sentry
    PAYSTACK -->|Webhook Event| PAY_HOOK
    PAY_HOOK -->|Dispatches Events| INNGEST_JOBS
    PAY_HOOK -.->|Error Instrumentation| SENTRY
    RESOLVER -.->|Error Instrumentation| SENTRY

    %% Next.js Connections
    APP_GRP --> CLERK
    APP_GRP --> POSTHOG
    APP_GRP --> CRISP
    MKT_GRP --> GA4
    MKT_GRP --> CRISP
    API_ROUTES -.->|Dev Testing| SENTRY

    %% Vercel to Convex & LLM
    APP_GRP --> QUERIES
    PUB_GRP --> QUERIES
    APP_GRP --> LLM_LAYER
    INNGEST_JOBS --> LLM_LAYER

    %% Business Brain & R2
    QUERIES --- SCHEMA
    SCHEMA -.->|Stores Object Keys| R2_BUCKET
    INNGEST_JOBS -->|Read/Write Metadata| SCHEMA
    INNGEST_JOBS -->|Fetch/Upload Bytes| R2_BUCKET

    %% Async Jobs External Integrations
    INNGEST_JOBS --> BREVO
    INNGEST_JOBS --> CHARTMOGUL
```

---

## Core Architectural Guarantees

1. **Business Brain (Single Source of Truth)**:
   - Data entered once by the business owner is reused across all profiles, generated documents, and passport cards.
2. **Source-Backed AI**:
   - Every compliance item carries `source`, `lastReviewedAt`, `effectiveDate`, `confidence`, and `confirmBeforeFiling`.
   - Low confidence (< 0.85) automatically forces `confirmBeforeFiling = true` via database mutation logic.
3. **Privacy by Design**:
   - The public resolver query (`getPublicPassport`) filters fields at the Convex database layer.
   - Client applications never receive unneeded sensitive owner fields (such as NIN, BVN, turnover, bank account numbers).
4. **Clean Provider Isolation**:
   - LLMs are invoked strictly through `/lib/llm` adapters, ensuring zero vendor lock-in between Anthropic and Google Gemini.
5. **Separation of Work**:
   - Next.js serverless functions never run long-running tasks. All OCR, PDF generation, and external syncs execute reliably in Inngest background workers.
