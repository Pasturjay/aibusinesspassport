import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * AI Business Passport - Complete Convex Database Schema
 * The single source of truth ("The Business Brain") for Nigerian businesses.
 */
export default defineSchema({
  // 1. Users
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    name: v.string(),
    role: v.union(
      v.literal("owner"),
      v.literal("staff"),
      v.literal("advisor"),
      v.literal("admin"),
      v.literal("content_editor")
    ),
    activeBusinessId: v.optional(v.id("businesses")),
    locale: v.string(), // e.g. "en-NG"
    notificationPrefs: v.object({
      email: v.boolean(),
      sms: v.boolean(),
      whatsapp: v.boolean(),
      inApp: v.boolean(),
    }),
    createdAt: v.string(),
    updatedAt: v.string(),
    schemaVersion: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // 2. Businesses (The Business Brain Root)
  businesses: defineTable({
    ownerUserId: v.string(), // Clerk user ID or user doc ID
    status: v.union(
      v.literal("idea"),
      v.literal("registering"),
      v.literal("registered"),
      v.literal("suspended")
    ),

    // Business Identity
    identity: v.object({
      legalName: v.string(),
      tradingName: v.optional(v.string()),
      businessType: v.union(
        v.literal("business_name"),
        v.literal("limited_company"),
        v.literal("incorporated_trustees"),
        v.literal("unregistered")
      ),
      rcNumber: v.optional(v.string()),
      tin: v.optional(v.string()),
      industry: v.string(),
      subIndustry: v.optional(v.string()),
      description: v.string(),
      yearFounded: v.optional(v.number()),
      address: v.object({
        line1: v.string(),
        city: v.string(),
        lga: v.string(),
        state: v.string(),
        country: v.string(),
      }),
      contact: v.object({
        phone: v.string(),
        email: v.string(),
        website: v.optional(v.string()),
        socials: v.array(v.string()),
      }),
      logoStorageKey: v.optional(v.string()),
    }),

    // Operational Footprint
    operations: v.object({
      hasEmployees: v.boolean(),
      employeeCount: v.optional(v.number()),
      hasPhysicalShop: v.boolean(),
      sellsOnline: v.boolean(),
      branches: v.array(
        v.object({
          name: v.string(),
          line1: v.string(),
          city: v.string(),
          state: v.string(),
        })
      ),
      operatesStates: v.array(v.string()),
    }),

    // Capabilities and Services
    capabilities: v.array(
      v.object({
        name: v.string(),
        description: v.string(),
      })
    ),
    services: v.array(
      v.object({
        name: v.string(),
        description: v.string(),
        priceRange: v.optional(v.string()),
      })
    ),

    // Onboarding State
    onboardingState: v.object({
      step: v.string(),
      completedAt: v.optional(v.string()),
      answers: v.record(v.string(), v.string()),
    }),

    // Subscription Plan
    plan: v.object({
      tier: v.union(v.literal("free"), v.literal("plus"), v.literal("pro"), v.literal("pro_plus")),
      status: v.union(
        v.literal("active"),
        v.literal("past_due"),
        v.literal("cancelled"),
        v.literal("trialing")
      ),
      currentPeriodEnd: v.optional(v.string()),
      paystackCustomerCode: v.optional(v.string()),
      paystackSubscriptionCode: v.optional(v.string()),
    }),

    // Brain Versioning
    brainVersion: v.number(),

    // Sensitive Private Fields (Never exposed in public resolver queries)
    directorNIN: v.optional(v.string()),
    directorBVN: v.optional(v.string()),
    turnoverRange: v.optional(v.string()),
    bankAccountDetails: v.optional(
      v.object({
        accountNumber: v.string(),
        bankCode: v.string(),
        bankName: v.string(),
      })
    ),

    createdAt: v.string(),
    updatedAt: v.string(),
    schemaVersion: v.number(),
  })
    .index("by_owner", ["ownerUserId"])
    .index("by_status", ["status"]),

  // 3. Brain History (Versioned audit trail for Business Brain)
  brainHistory: defineTable({
    businessId: v.id("businesses"),
    version: v.number(),
    patch: v.string(), // JSON stringified patch
    actor: v.object({
      type: v.union(v.literal("user"), v.literal("ai"), v.literal("system")),
      id: v.string(),
    }),
    reason: v.string(),
    createdAt: v.string(),
  })
    .index("by_business", ["businessId"])
    .index("by_business_version", ["businessId", "version"]),

  // 4. People (Directors, Shareholders, Key Staff)
  people: defineTable({
    businessId: v.id("businesses"),
    name: v.string(),
    role: v.union(
      v.literal("director"),
      v.literal("shareholder"),
      v.literal("secretary"),
      v.literal("employee"),
      v.literal("contact")
    ),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    bio: v.optional(v.string()),
    nin: v.optional(v.string()), // Sensitive: National Identity Number
    isPublic: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_business", ["businessId"]),

  // 5. Credentials (Licences, Certifications, Registrations)
  credentials: defineTable({
    businessId: v.id("businesses"),
    type: v.union(
      v.literal("certification"),
      v.literal("licence"),
      v.literal("award"),
      v.literal("membership"),
      v.literal("registration")
    ),
    name: v.string(),
    issuer: v.string(),
    issuedAt: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
    documentId: v.optional(v.id("documents")),
    verificationStatus: v.union(
      v.literal("self_declared"),
      v.literal("document_backed"),
      v.literal("needs_review")
    ),
    isPublic: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_business", ["businessId"]),

  // 6. Experience (Projects, Track Record)
  experience: defineTable({
    businessId: v.id("businesses"),
    clientName: v.string(),
    projectTitle: v.string(),
    value: v.optional(v.string()),
    year: v.number(),
    description: v.string(),
    referenceDocumentId: v.optional(v.id("documents")),
    isPublic: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_business", ["businessId"]),

  // 7. Documents (Vault metadata, bytes in Cloudflare R2)
  documents: defineTable({
    businessId: v.id("businesses"),
    r2Key: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    category: v.union(
      v.literal("registration"),
      v.literal("tax"),
      v.literal("licences"),
      v.literal("employees"),
      v.literal("contracts"),
      v.literal("finance"),
      v.literal("credentials"),
      v.literal("tender"),
      v.literal("other"),
      v.literal("uncategorised")
    ),
    docType: v.optional(v.string()), // e.g. "cac_certificate", "tax_clearance", "lease"
    extracted: v.optional(v.string()), // JSON record
    extractionConfidence: v.optional(v.number()), // 0.0 - 1.0
    reviewStatus: v.union(
      v.literal("auto_filed"),
      v.literal("needs_review"),
      v.literal("confirmed"),
      v.literal("rejected")
    ),
    issuedAt: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
    status: v.union(v.literal("processing"), v.literal("ready"), v.literal("failed")),
    uploadedBy: v.string(),
    folderShareGrants: v.array(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_business", ["businessId"])
    .index("by_business_category", ["businessId", "category"]),

  // 8. Advisor Grants (Scoped category-level delegation)
  advisorGrants: defineTable({
    businessId: v.id("businesses"),
    advisorUserId: v.string(),
    categories: v.array(v.string()),
    expiresAt: v.optional(v.string()),
    grantedBy: v.string(),
    revokedAt: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_business", ["businessId"])
    .index("by_advisor", ["advisorUserId"])
    .index("by_business_advisor", ["businessId", "advisorUserId"]),

  // 9. Compliance Rules (Versioned content, human-maintained)
  complianceRules: defineTable({
    ruleKey: v.string(),
    version: v.number(),
    title: v.string(),
    plainLanguageSummary: v.string(),
    appliesWhen: v.string(), // Structured predicate JSON over Business Brain fields
    obligationType: v.string(),
    recurrence: v.object({
      frequency: v.string(), // e.g. "annual", "monthly", "event_triggered"
      dueDateRule: v.string(),
    }),
    jurisdiction: v.string(), // "federal" or state name
    agency: v.string(), // "CAC", "FIRS", "LIRS", "SCUML", "ITF", "NSITF", "PENCOM"
    steps: v.array(
      v.object({
        title: v.string(),
        description: v.string(),
        link: v.optional(v.string()),
      })
    ),
    estimatedCost: v.optional(v.string()),
    source: v.object({
      name: v.string(),
      url: v.optional(v.string()),
    }),
    effectiveDate: v.string(),
    lastReviewedAt: v.string(),
    reviewedBy: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("in_review"),
      v.literal("published"),
      v.literal("retired")
    ),
    confidenceIfMatched: v.number(),
    authorId: v.optional(v.string()),
    changeNote: v.optional(v.string()),
    sourceUrlStatus: v.optional(v.union(v.literal("ok"), v.literal("failed"), v.literal("pending"))),
    lastCheckedAt: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
    schemaVersion: v.number(),
  })
    .index("by_rule_key", ["ruleKey"])
    .index("by_rule_key_version", ["ruleKey", "version"])
    .index("by_agency", ["agency"])
    .index("by_jurisdiction", ["jurisdiction"]),

  // 10. Compliance Items (Active items evaluated for a business)
  complianceItems: defineTable({
    businessId: v.id("businesses"),
    ruleKey: v.string(),
    ruleVersion: v.number(),
    status: v.union(
      v.literal("needs_attention"),
      v.literal("coming_up"),
      v.literal("completed"),
      v.literal("potentially_applicable"),
      v.literal("needs_review"),
      v.literal("verified")
    ),
    dueDate: v.optional(v.string()),
    plainSummary: v.string(),
    source: v.string(),
    lastReviewedAt: v.string(),
    confirmBeforeFiling: v.boolean(),
    confidence: v.number(),
    evidenceDocumentId: v.optional(v.id("documents")),
    completedAt: v.optional(v.string()),
    snoozedUntil: v.optional(v.string()),
    createdFrom: v.union(
      v.literal("onboarding"),
      v.literal("nightly_check"),
      v.literal("change_event"),
      v.literal("manual")
    ),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_business", ["businessId"])
    .index("by_business_status", ["businessId", "status"])
    .index("by_due_date", ["dueDate"]),

  // 11. Compliance Audit Log
  complianceAuditLog: defineTable({
    businessId: v.id("businesses"),
    itemId: v.optional(v.id("complianceItems")),
    action: v.string(),
    actor: v.object({
      type: v.string(),
      id: v.string(),
    }),
    shownText: v.string(),
    ruleVersion: v.number(),
    createdAt: v.string(),
  })
    .index("by_business", ["businessId"])
    .index("by_item", ["itemId"]),

  // 12. Passports (Public Verifiable Identity)
  passports: defineTable({
    businessId: v.id("businesses"),
    passportId: v.string(), // "BP-NG-" + 6 chars from 32-char alphabet
    passportSlug: v.optional(v.string()),
    style: v.union(
      v.literal("professional"),
      v.literal("corporate"),
      v.literal("minimal"),
      v.literal("modern"),
      v.literal("creative"),
      v.literal("premium")
    ),
    fieldVisibility: v.record(
      v.string(),
      v.union(v.literal("public"), v.literal("private"), v.literal("on_request"))
    ),
    tagline: v.optional(v.string()),
    isActive: v.boolean(),
    nfcEnabled: v.boolean(),
    isVerified: v.optional(v.boolean()),
    status: v.optional(v.string()),
    issuedAt: v.optional(v.string()),
    revokedAt: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
    schemaVersion: v.number(),
  })
    .index("by_business", ["businessId"])
    .index("by_passport_id", ["passportId"])
    .index("by_slug", ["passportSlug"]),

  // 13. Passport Scans (Telemetry & QR/NFC Analytics)
  passportScans: defineTable({
    passportId: v.string(),
    scannedAt: v.string(),
    method: v.union(v.literal("qr"), v.literal("nfc"), v.literal("link")),
    viewerFingerprintHash: v.optional(v.string()),
    contactSaved: v.boolean(),
    referrer: v.optional(v.string()),
  }).index("by_passport_id", ["passportId"]),

  // 14. Connections (Networking & Business Leads)
  connections: defineTable({
    businessId: v.id("businesses"),
    name: v.string(),
    company: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    source: v.union(v.literal("passport_scan"), v.literal("request"), v.literal("manual")),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    lastContactedAt: v.optional(v.string()),
    followUpAt: v.optional(v.string()),
    status: v.string(), // "active" | "blocked" | "archived"
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_business", ["businessId"]),

  // 15. Document Requests (Third parties requesting credentials)
  documentRequests: defineTable({
    passportId: v.string(),
    businessId: v.id("businesses"),
    requesterName: v.string(),
    requesterCompany: v.string(),
    requesterEmail: v.string(),
    requesterPhone: v.optional(v.string()),
    isVerifiedEmail: v.optional(v.boolean()),
    verificationToken: v.optional(v.string()),
    requestedItems: v.array(
      v.union(
        v.literal("company_profile"),
        v.literal("registration"),
        v.literal("compliance_docs"),
        v.literal("capability_statement"),
        v.literal("certifications"),
        v.literal("contact")
      )
    ),
    message: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("expired")
    ),
    decidedAt: v.optional(v.string()),
    packageId: v.optional(v.id("sharedPackages")),
    accessToken: v.string(), // Hashed token
    expiresAt: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_passport_id", ["passportId"])
    .index("by_business", ["businessId"])
    .index("by_token", ["verificationToken"]),

  // 16. Shared Packages (Bundled documents provided to requester)
  sharedPackages: defineTable({
    businessId: v.id("businesses"),
    requestId: v.id("documentRequests"),
    items: v.array(
      v.object({
        label: v.string(),
        documentId: v.optional(v.id("documents")),
        generatedDocId: v.optional(v.id("generatedDocs")),
      })
    ),
    gaps: v.array(v.string()), // Requested items that were missing or expired
    accessTokenHash: v.string(),
    expiresAt: v.string(),
    downloadCount: v.number(),
    maxDownloads: v.optional(v.number()),
    createdAt: v.string(),
  })
    .index("by_business", ["businessId"])
    .index("by_request", ["requestId"])
    .index("by_token_hash", ["accessTokenHash"]),

  // 17. Generated Docs (Company Profiles, Quotes, Invoices, Contracts)
  generatedDocs: defineTable({
    businessId: v.id("businesses"),
    kind: v.union(
      v.literal("profile_standard"),
      v.literal("profile_corporate"),
      v.literal("profile_procurement"),
      v.literal("profile_tender"),
      v.literal("profile_investor"),
      v.literal("profile_one_page"),
      v.literal("quotation"),
      v.literal("invoice"),
      v.literal("contract"),
      v.literal("proposal"),
      v.literal("capability_statement"),
      v.literal("eoi"),
      v.literal("letterhead"),
      v.literal("business_card"),
      v.literal("tender_response")
    ),
    audience: v.object({
      name: v.optional(v.string()),
      type: v.optional(v.string()),
    }),
    industry: v.optional(v.string()),
    templateId: v.string(),
    inputSnapshot: v.number(), // Brain snapshot version
    qcReport: v.object({
      missingFields: v.array(v.string()),
      inconsistencies: v.array(v.string()),
      contradictions: v.array(v.string()),
      passed: v.boolean(),
    }),
    draftContent: v.string(), // Structured JSON
    status: v.union(
      v.literal("qc_failed"),
      v.literal("draft"),
      v.literal("reviewed"),
      v.literal("exported")
    ),
    exportR2Key: v.optional(v.string()),
    confirmBeforeFiling: v.boolean(),
    aiMeta: v.object({
      model: v.string(),
      promptVersion: v.string(),
      tokens: v.number(),
      costEstimate: v.string(),
    }),
    createdAt: v.string(),
    updatedAt: v.string(),
    schemaVersion: v.number(),
  }).index("by_business", ["businessId"]),

  // 18. Templates (Document Generation Templates)
  templates: defineTable({
    key: v.string(),
    kind: v.string(),
    industry: v.optional(v.string()),
    version: v.number(),
    structure: v.string(), // JSON sections with variable bindings to Brain paths
    promptTemplate: v.string(),
    status: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_key", ["key"])
    .index("by_key_version", ["key", "version"]),

  // 18b. Generated Document Versions (History & Regeneration Trail)
  generatedDocVersions: defineTable({
    docId: v.id("generatedDocs"),
    version: v.number(),
    sectionKey: v.string(),
    previousContent: v.string(),
    newContent: v.string(),
    actor: v.union(v.literal("user"), v.literal("ai")),
    createdAt: v.string(),
  }).index("by_doc", ["docId"]),

  // 19. Tenders (Tender Parsing, Scoring & Readiness)
  tenders: defineTable({
    businessId: v.id("businesses"),
    sourceDocumentId: v.id("documents"),
    title: v.string(),
    issuer: v.optional(v.string()),
    deadline: v.optional(v.string()),
    extractionStatus: v.string(),
    extractionConfidence: v.number(),
    requirements: v.array(
      v.object({
        id: v.string(),
        category: v.union(
          v.literal("company_docs"),
          v.literal("technical"),
          v.literal("financial"),
          v.literal("submission")
        ),
        text: v.string(),
        mandatory: v.boolean(),
        matchStatus: v.union(
          v.literal("available"),
          v.literal("needs_preparation"),
          v.literal("missing")
        ),
        matchedDocumentId: v.optional(v.id("documents")),
        matchedBrainPath: v.optional(v.string()),
        confidence: v.number(),
        sourcePageRef: v.optional(v.string()),
      })
    ),
    readiness: v.object({
      available: v.number(),
      needsPrep: v.number(),
      missing: v.number(),
      score: v.number(),
      mandatoryMissing: v.number(),
    }),
    unparsedSections: v.array(v.string()),
    acceptedRiskReqIds: v.optional(v.array(v.string())),
    responseGeneratedDocId: v.optional(v.id("generatedDocs")),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_business", ["businessId"]),

  // 20. Assistant Threads (Business Operating System AI Chat)
  assistantThreads: defineTable({
    businessId: v.id("businesses"),
    userId: v.string(),
    mode: v.union(v.literal("simple"), v.literal("show_me"), v.literal("do_it_for_me")),
    title: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_business", ["businessId"])
    .index("by_user", ["userId"]),

  // 21. Assistant Messages
  assistantMessages: defineTable({
    threadId: v.id("assistantThreads"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    toolCalls: v.array(
      v.object({
        name: v.string(),
        args: v.string(),
        result: v.optional(v.string()),
      })
    ),
    citations: v.array(
      v.object({
        ruleKey: v.string(),
        version: v.number(),
        source: v.string(),
        lastReviewedAt: v.string(),
      })
    ),
    feedbackRating: v.optional(v.union(v.literal("thumbs_up"), v.literal("thumbs_down"))),
    promptVersion: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_thread", ["threadId"]),

  // 22. Business Change Events
  businessChangeEvents: defineTable({
    businessId: v.id("businesses"),
    type: v.union(
      v.literal("hired_employees"),
      v.literal("new_branch"),
      v.literal("new_activity"),
      v.literal("address_change"),
      v.literal("other")
    ),
    payload: v.string(), // JSON
    processedAt: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_business", ["businessId"]),

  // 23. Payment Events (Audit Log of Provider Webhook Ingests)
  paymentEvents: defineTable({
    provider: v.union(v.literal("paystack"), v.literal("nomba")),
    eventId: v.string(),
    reference: v.string(),
    type: v.string(),
    payload: v.string(),
    processedAt: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_event_id", ["eventId"])
    .index("by_reference", ["reference"]),

  // 24. Subscriptions
  subscriptions: defineTable({
    businessId: v.id("businesses"),
    tier: v.union(v.literal("free"), v.literal("plus"), v.literal("pro"), v.literal("pro_plus")),
    interval: v.union(v.literal("monthly"), v.literal("annual")),
    amountKobo: v.number(),
    status: v.string(),
    paystackCodes: v.object({
      customerCode: v.optional(v.string()),
      subscriptionCode: v.optional(v.string()),
      emailToken: v.optional(v.string()),
    }),
    startedAt: v.string(),
    currentPeriodEnd: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
    schemaVersion: v.number(),
  }).index("by_business", ["businessId"]),

  // 25. Purchases (A la carte purchases)
  purchases: defineTable({
    businessId: v.id("businesses"),
    sku: v.union(
      v.literal("tender_package"),
      v.literal("document_pack"),
      v.literal("print_order"),
      v.literal("profile_generation")
    ),
    amountKobo: v.number(),
    status: v.string(),
    reference: v.string(),
    fulfilledAt: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_business", ["businessId"])
    .index("by_reference", ["reference"]),

  // 26. Marketplace: Print Partners
  printPartners: defineTable({
    name: v.string(),
    city: v.string(),
    pricing: v.string(), // JSON pricing matrix
    status: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_city", ["city"]),

  // 27. Marketplace: Print Orders
  printOrders: defineTable({
    businessId: v.id("businesses"),
    partnerId: v.id("printPartners"),
    designDocId: v.id("generatedDocs"),
    itemType: v.optional(v.string()), // "business_card", "letterhead", "stickers"
    quantity: v.number(),
    amountKobo: v.number(),
    platformMarginPct: v.number(),
    marginKobo: v.optional(v.number()),
    status: v.string(), // "received", "printing", "shipped", "delivered"
    trackingNote: v.optional(v.string()),
    rating: v.optional(v.number()), // 1 - 5 stars
    reviewComment: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_business", ["businessId"])
    .index("by_partner", ["partnerId"]),

  // 28. Marketplace: Service Providers (Lawyers, Accountants, Agents)
  serviceProviders: defineTable({
    type: v.union(
      v.literal("accountant"),
      v.literal("lawyer"),
      v.literal("agent"),
      v.literal("consultant")
    ),
    name: v.string(),
    states: v.array(v.string()),
    verified: v.boolean(),
    feeModel: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_type", ["type"]),

  // 29. Marketplace: Referrals
  referrals: defineTable({
    businessId: v.id("businesses"),
    providerId: v.id("serviceProviders"),
    context: v.string(),
    status: v.string(), // "new", "contacted", "converted", "closed"
    leadFeeKobo: v.optional(v.number()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_business", ["businessId"])
    .index("by_provider", ["providerId"]),

  // 30. Marketplace: Done-For-Me Jobs
  doneForMeJobs: defineTable({
    businessId: v.id("businesses"),
    service: v.string(),
    status: v.string(), // "requested", "quoted", "accepted", "paid", "in_progress", "completed"
    assignedTo: v.optional(v.string()),
    notes: v.array(v.string()),
    quoteKobo: v.optional(v.number()),
    paidAt: v.optional(v.string()),
    deliverableDocumentId: v.optional(v.id("documents")),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_business", ["businessId"]),

  // 31. Notifications
  notifications: defineTable({
    userId: v.string(),
    businessId: v.id("businesses"),
    channel: v.union(
      v.literal("email"),
      v.literal("sms"),
      v.literal("whatsapp"),
      v.literal("in_app")
    ),
    template: v.string(),
    payload: v.string(), // JSON
    status: v.union(
      v.literal("queued"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("delivered")
    ),
    providerMessageId: v.optional(v.string()),
    sentAt: v.optional(v.string()),
    dedupeKey: v.string(),
    createdAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_business", ["businessId"])
    .index("by_dedupe_key", ["dedupeKey"]),

  // 32. Usage (Entitlements and quota tracking)
  usage: defineTable({
    businessId: v.id("businesses"),
    period: v.string(), // e.g. "2026-09"
    counters: v.object({
      aiGenerations: v.number(),
      tenderAnalyses: v.number(),
      ocrPages: v.number(),
      assistantMessages: v.number(),
    }),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_business", ["businessId"])
    .index("by_business_period", ["businessId", "period"]),

  // 33. Expected Documents per Business Type
  expectedDocuments: defineTable({
    businessType: v.union(
      v.literal("business_name"),
      v.literal("limited_company"),
      v.literal("incorporated_trustees"),
      v.literal("unregistered")
    ),
    docType: v.string(),
    label: v.string(),
    category: v.string(),
    mandatory: v.boolean(),
    description: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_business_type", ["businessType"]),

  // 34. Immutable Admin Audit Log
  adminAuditLogs: defineTable({
    adminUserId: v.string(),
    adminRole: v.string(),
    action: v.string(),
    targetId: v.optional(v.string()),
    targetType: v.string(),
    details: v.string(), // JSON string
    createdAt: v.string(),
  })
    .index("by_admin", ["adminUserId"])
    .index("by_action", ["action"]),
});
