/**
 * Document Studio Template Definitions & Industry Packs.
 * Provides starting v0 templates with section structures bound to Business Brain paths.
 */

export interface TemplateSection {
  key: string;
  title: string;
  description: string;
  requiredBrainPaths: string[];
  defaultPrompt: string;
}

export interface DocumentTemplateDefinition {
  key: string;
  kind: string;
  title: string;
  description: string;
  industry?: string; // "all", "construction", "ict", "logistics", "retail", "hospitality", "agriculture"
  version: number;
  confirmBeforeFiling: boolean;
  legalDisclaimerRequired: boolean;
  sections: TemplateSection[];
}

export const DOCUMENT_TEMPLATES: Record<string, DocumentTemplateDefinition> = {
  profile_standard: {
    key: "profile_standard",
    kind: "profile_standard",
    title: "Standard Company Profile",
    description: "Comprehensive business overview suitable for general clients, partners, and directory listings.",
    industry: "all",
    version: 0,
    confirmBeforeFiling: false,
    legalDisclaimerRequired: false,
    sections: [
      {
        key: "exec_summary",
        title: "Executive Summary",
        description: "High-level overview of the business mission, values, and primary value proposition.",
        requiredBrainPaths: ["identity.legalName", "identity.description", "identity.industry"],
        defaultPrompt: "Summarize the business profile, mission statement, and core industry focus.",
      },
      {
        key: "company_overview",
        title: "Company Overview",
        description: "Legal entity information, registration status, and physical location.",
        requiredBrainPaths: ["identity.legalName", "identity.businessType", "identity.address.city", "identity.address.state"],
        defaultPrompt: "Detail the company legal structure, registration status, year founded, and headquarters location.",
      },
      {
        key: "products_services",
        title: "Products & Services",
        description: "Detailed list of services offered and key capabilities.",
        requiredBrainPaths: ["services", "capabilities"],
        defaultPrompt: "List and describe core services and operational capabilities in plain, compelling language.",
      },
      {
        key: "track_record",
        title: "Verified Experience & Track Record",
        description: "Selected client engagements and past projects.",
        requiredBrainPaths: ["experience"],
        defaultPrompt: "Highlight key completed projects, client names, project scope, and execution dates.",
      },
      {
        key: "contact_info",
        title: "Contact & Identity",
        description: "Official contact details and legal identity identifiers.",
        requiredBrainPaths: ["identity.contact.email", "identity.contact.phone", "identity.address.line1"],
        defaultPrompt: "Format official contact info, phone numbers, email address, physical address, and CAC registration details.",
      },
    ],
  },

  profile_corporate: {
    key: "profile_corporate",
    kind: "profile_corporate",
    title: "Corporate Profile",
    description: "Formal corporate profile designed for corporate enterprise clients, banking, and strategic alliances.",
    industry: "all",
    version: 0,
    confirmBeforeFiling: false,
    legalDisclaimerRequired: false,
    sections: [
      {
        key: "corporate_summary",
        title: "Corporate Executive Summary",
        description: "Strategic executive overview highlighting market position and corporate governance.",
        requiredBrainPaths: ["identity.legalName", "identity.description"],
        defaultPrompt: "Draft an authoritative corporate summary highlighting market positioning, operational scope, and leadership.",
      },
      {
        key: "governance_leadership",
        title: "Governance & Key Personnel",
        description: "Directors, key managers, and organizational leadership structure.",
        requiredBrainPaths: ["people"],
        defaultPrompt: "Summarize key directors and leadership team members with their qualifications and roles.",
      },
      {
        key: "compliance_financial",
        title: "Compliance & Statutory Status",
        description: "CAC, FIRS Tax Clearance, and statutory compliance status.",
        requiredBrainPaths: ["identity.rcNumber", "identity.tin", "credentials"],
        defaultPrompt: "Outline statutory compliance status, CAC incorporation number, FIRS TIN, and official licences.",
      },
      {
        key: "core_competencies",
        title: "Core Competencies & Services",
        description: "Enterprise capabilities and service portfolio.",
        requiredBrainPaths: ["services", "capabilities"],
        defaultPrompt: "Present corporate services and technical capabilities structured for enterprise buyers.",
      },
      {
        key: "client_portfolio",
        title: "Representative Clients & Case Studies",
        description: "Track record of corporate and institutional engagements.",
        requiredBrainPaths: ["experience"],
        defaultPrompt: "Detail notable project milestones, corporate client engagements, and delivery performance.",
      },
    ],
  },

  profile_procurement: {
    key: "profile_procurement",
    kind: "profile_procurement",
    title: "Procurement & Vendor Profile",
    description: "Pre-qualification profile tailored for government and enterprise procurement vendor onboarding.",
    industry: "all",
    version: 0,
    confirmBeforeFiling: false,
    legalDisclaimerRequired: false,
    sections: [
      {
        key: "vendor_identity",
        title: "Vendor Identification & Statutory Data",
        description: "Legal entity name, RC Number, TIN, and operational address.",
        requiredBrainPaths: ["identity.legalName", "identity.rcNumber", "identity.tin", "identity.address.line1"],
        defaultPrompt: "Present vendor legal registration, CAC RC Number, Tax Identification Number (TIN), and registered office.",
      },
      {
        key: "technical_capacity",
        title: "Technical Capacity & Infrastructure",
        description: "Operational equipment, branch locations, and staff count.",
        requiredBrainPaths: ["operations.hasEmployees", "operations.operatesStates", "capabilities"],
        defaultPrompt: "Detail operational infrastructure, staff capacity, operating states, and technical machinery.",
      },
      {
        key: "statutory_certifications",
        title: "Licences, Permits & Statutory Compliance",
        description: "Active regulatory approvals and certifications.",
        requiredBrainPaths: ["credentials"],
        defaultPrompt: "List active regulatory licences, industry body memberships, and statutory certifications.",
      },
      {
        key: "verified_experience",
        title: "Relevant Past Performance",
        description: "Verified contract execution history.",
        requiredBrainPaths: ["experience"],
        defaultPrompt: "Format past contract performance with client names, contract values, completion years, and project scopes.",
      },
    ],
  },

  profile_tender: {
    key: "profile_tender",
    kind: "profile_tender",
    title: "Tender & Bid Response Profile",
    description: "Structured response document for formal competitive tender submissions.",
    industry: "all",
    version: 0,
    confirmBeforeFiling: false,
    legalDisclaimerRequired: false,
    sections: [
      {
        key: "tender_intro",
        title: "Tender Transmittal & Executive Overview",
        description: "Formal transmittal section addressing tender issuer.",
        requiredBrainPaths: ["identity.legalName", "identity.description"],
        defaultPrompt: "Draft a formal tender transmittal letter expressing interest and summarizing bid compliance.",
      },
      {
        key: "eligibility_matrix",
        title: "Mandatory Eligibility & Compliance Matrix",
        description: "Tabular summary of mandatory CAC, FIRS, PENCOM, and ITF compliance.",
        requiredBrainPaths: ["identity.rcNumber", "identity.tin", "credentials"],
        defaultPrompt: "Construct a compliance matrix cross-referencing statutory registration numbers and certificates.",
      },
      {
        key: "technical_proposal",
        title: "Technical Capability & Delivery Methodology",
        description: "Proposed methodology and operational resources.",
        requiredBrainPaths: ["services", "capabilities"],
        defaultPrompt: "Detail technical approach, service delivery workflow, and operational quality control.",
      },
      {
        key: "team_experience",
        title: "Key Team & Relevant Past Experience",
        description: "Team credentials and verified tender experience.",
        requiredBrainPaths: ["people", "experience"],
        defaultPrompt: "Highlight key personnel assignments and past project references matching tender domain requirements.",
      },
    ],
  },

  profile_investor: {
    key: "profile_investor",
    kind: "profile_investor",
    title: "Investor Deck & Overview",
    description: "Growth-focused summary for angel investors, venture funds, and financial institutions.",
    industry: "all",
    version: 0,
    confirmBeforeFiling: false,
    legalDisclaimerRequired: false,
    sections: [
      {
        key: "investment_teaser",
        title: "Investment Teaser & Value Proposition",
        description: "Compelling summary of market opportunity and core innovation.",
        requiredBrainPaths: ["identity.legalName", "identity.description", "identity.industry"],
        defaultPrompt: "Craft a concise investment narrative detailing problem, solution, and addressable market opportunity.",
      },
      {
        key: "traction_metrics",
        title: "Operational Traction & Growth",
        description: "Key operational metrics, client acquisition, and footprint.",
        requiredBrainPaths: ["operations.sellsOnline", "operations.operatesStates", "experience"],
        defaultPrompt: "Summarize market footprint, client traction, service reach, and operational growth indicators.",
      },
      {
        key: "revenue_model",
        title: "Business & Revenue Model",
        description: "Monetization structure and core services pricing.",
        requiredBrainPaths: ["services"],
        defaultPrompt: "Describe pricing model, revenue streams, and monetization mechanics.",
      },
      {
        key: "founding_team",
        title: "Founders & Executive Team",
        description: "Founder backgrounds and key leadership competencies.",
        requiredBrainPaths: ["people"],
        defaultPrompt: "Introduce founders and key executives, highlighting industry experience and track record.",
      },
    ],
  },

  profile_one_page: {
    key: "profile_one_page",
    kind: "profile_one_page",
    title: "One-Page Business Summary",
    description: "Compact single-page summary suitable for quick networking, flyer inclusion, or digital attachments.",
    industry: "all",
    version: 0,
    confirmBeforeFiling: false,
    legalDisclaimerRequired: false,
    sections: [
      {
        key: "one_page_content",
        title: "Company At A Glance",
        description: "Condensed summary of identity, services, credentials, and contact info.",
        requiredBrainPaths: ["identity.legalName", "identity.description", "services", "identity.contact.email"],
        defaultPrompt: "Create a crisp one-page overview combining legal identity, top 3 services, key credentials, and quick contact details.",
      },
    ],
  },

  quotation: {
    key: "quotation",
    kind: "quotation",
    title: "Commercial Quotation",
    description: "Official itemized quotation document for clients.",
    industry: "all",
    version: 0,
    confirmBeforeFiling: false,
    legalDisclaimerRequired: false,
    sections: [
      {
        key: "quote_header",
        title: "Quotation Header & Client Information",
        description: "Quotation reference, validity date, and client details.",
        requiredBrainPaths: ["identity.legalName", "identity.address.line1"],
        defaultPrompt: "Format quotation title, validity period, client name, and vendor legal details.",
      },
      {
        key: "scope_deliverables",
        title: "Scope of Deliverables & Pricing Table",
        description: "Itemized deliverables, quantities, and pricing breakdown.",
        requiredBrainPaths: ["services"],
        defaultPrompt: "Present itemized deliverables table with line item description, estimated units, and total prices.",
      },
      {
        key: "terms_payment",
        title: "Payment Terms & Validity",
        description: "Payment schedule, bank account details, and validity terms.",
        requiredBrainPaths: ["bankAccountDetails"],
        defaultPrompt: "Detail payment terms, bank payment details, and quotation validity conditions.",
      },
    ],
  },

  invoice: {
    key: "invoice",
    kind: "invoice",
    title: "Tax & Commercial Invoice",
    description: "Formal commercial invoice including TIN and bank payment instructions.",
    industry: "all",
    version: 0,
    confirmBeforeFiling: false,
    legalDisclaimerRequired: false,
    sections: [
      {
        key: "invoice_header",
        title: "Invoice Summary & Vendor Data",
        description: "Invoice number, date, due date, vendor RC, and TIN.",
        requiredBrainPaths: ["identity.legalName", "identity.tin", "identity.address.line1"],
        defaultPrompt: "Format official tax invoice header with Tax Identification Number (TIN), invoice date, and due date.",
      },
      {
        key: "billable_items",
        title: "Billable Line Items",
        description: "Itemized description of completed work or supplied goods.",
        requiredBrainPaths: ["services"],
        defaultPrompt: "Create billable items table with item descriptions, unit rates, subtotal, VAT (7.5% if applicable), and grand total.",
      },
      {
        key: "payment_instructions",
        title: "Bank Payment Instructions",
        description: "Official bank account details for settlement.",
        requiredBrainPaths: ["bankAccountDetails"],
        defaultPrompt: "Provide precise bank account number, bank name, and account holder name for direct settlement.",
      },
    ],
  },

  contract: {
    key: "contract",
    kind: "contract",
    title: "Services Agreement / Contract Draft",
    description: "Formal legal services agreement draft. Requires lawyer review before execution.",
    industry: "all",
    version: 0,
    confirmBeforeFiling: true,
    legalDisclaimerRequired: true,
    sections: [
      {
        key: "parties_recitals",
        title: "Parties & Recitals",
        description: "Identification of Service Provider and Client under Nigerian Law.",
        requiredBrainPaths: ["identity.legalName", "identity.rcNumber", "identity.address.line1"],
        defaultPrompt: "Draft formal contract introductory clause identifying parties, CAC RC Number, and recitals under Laws of the Federal Republic of Nigeria.",
      },
      {
        key: "scope_obligations",
        title: "Scope of Services & Obligations",
        description: "Detailed scope of work and obligations of each party.",
        requiredBrainPaths: ["services"],
        defaultPrompt: "Specify clear obligations of Service Provider and Client regarding service delivery and approvals.",
      },
      {
        key: "commercial_terms",
        title: "Compensation, Invoicing & Payment",
        description: "Fee structure, payment milestones, and late payment terms.",
        requiredBrainPaths: ["services"],
        defaultPrompt: "Outline fee structure, payment schedule, invoice settlement window, and tax withholdings.",
      },
      {
        key: "boilerplate_legal",
        title: "Termination, Dispute Resolution & Governing Law",
        description: "Standard dispute resolution and Nigerian law governing clause.",
        requiredBrainPaths: ["identity.address.state"],
        defaultPrompt: "Draft standard termination notice period, arbitration clause (Lagos/Abuja), and governing law (Laws of the Federal Republic of Nigeria).",
      },
    ],
  },

  proposal: {
    key: "proposal",
    kind: "proposal",
    title: "Commercial Business Proposal",
    description: "Persuasive commercial proposal detailing solution design, timeline, and ROI.",
    industry: "all",
    version: 0,
    confirmBeforeFiling: false,
    legalDisclaimerRequired: false,
    sections: [
      {
        key: "proposal_exec",
        title: "Executive Summary & Context",
        description: "Background understanding of client needs and proposed intervention.",
        requiredBrainPaths: ["identity.legalName", "identity.description"],
        defaultPrompt: "Summarize client context, core challenge, and proposed strategic solution.",
      },
      {
        key: "solution_methodology",
        title: "Proposed Solution & Methodology",
        description: "Step-by-step methodology and implementation plan.",
        requiredBrainPaths: ["services", "capabilities"],
        defaultPrompt: "Outline proposed solution architecture, project phases, deliverables, and execution timeline.",
      },
      {
        key: "commercials_roi",
        title: "Commercial Investment & Expected Outcomes",
        description: "Pricing options and value delivered.",
        requiredBrainPaths: ["services"],
        defaultPrompt: "Present commercial options, pricing breakdown, and anticipated return on investment.",
      },
    ],
  },

  capability_statement: {
    key: "capability_statement",
    kind: "capability_statement",
    title: "Official Capability Statement",
    description: "Formal document highlighting core competencies, past performance, and corporate codes.",
    industry: "all",
    version: 0,
    confirmBeforeFiling: false,
    legalDisclaimerRequired: false,
    sections: [
      {
        key: "competencies_summary",
        title: "Core Competencies & Key Differentiators",
        description: "Primary capabilities and competitive advantages.",
        requiredBrainPaths: ["identity.legalName", "capabilities", "services"],
        defaultPrompt: "List core competencies, technical specializations, and key market differentiators.",
      },
      {
        key: "past_performance",
        title: "Verified Past Performance",
        description: "Track record of client execution.",
        requiredBrainPaths: ["experience"],
        defaultPrompt: "Present concise past performance references detailing clients, project scope, and outcomes.",
      },
      {
        key: "corporate_data",
        title: "Corporate Identity Data",
        description: "RC Number, TIN, DUNS, and contact coordinates.",
        requiredBrainPaths: ["identity.rcNumber", "identity.tin", "identity.contact.email"],
        defaultPrompt: "Format statutory registration codes, tax IDs, physical addresses, and contact channels.",
      },
    ],
  },

  eoi: {
    key: "eoi",
    kind: "eoi",
    title: "Expression of Interest (EOI)",
    description: "Formal EOI letter and technical eligibility submission for public or private tenders.",
    industry: "all",
    version: 0,
    confirmBeforeFiling: false,
    legalDisclaimerRequired: false,
    sections: [
      {
        key: "eoi_letter",
        title: "Formal Expression of Interest Letter",
        description: "Official letter submitting EOI for advertised project.",
        requiredBrainPaths: ["identity.legalName", "identity.description"],
        defaultPrompt: "Draft formal EOI submission letter declaring intent to participate in procurement process.",
      },
      {
        key: "eligibility_overview",
        title: "Organizational & Technical Eligibility",
        description: "Overview of entity registration, licences, and operational capacity.",
        requiredBrainPaths: ["identity.rcNumber", "credentials", "capabilities"],
        defaultPrompt: "Detail organizational eligibility, regulatory permits, technical staff capacity, and operational Readiness.",
      },
    ],
  },

  letterhead: {
    key: "letterhead",
    kind: "letterhead",
    title: "Official Corporate Letterhead",
    description: "Branded corporate letterhead template for official correspondence.",
    industry: "all",
    version: 0,
    confirmBeforeFiling: false,
    legalDisclaimerRequired: false,
    sections: [
      {
        key: "letterhead_body",
        title: "Official Correspondence Body",
        description: "Official letter text formatted on corporate letterhead layout.",
        requiredBrainPaths: ["identity.legalName", "identity.address.line1", "identity.contact.phone"],
        defaultPrompt: "Format formal letter layout with header (company name, RC, TIN, address, contact) and body text space.",
      },
    ],
  },

  business_card: {
    key: "business_card",
    kind: "business_card",
    title: "Digital & Print Business Card",
    description: "Compact corporate card layout featuring live Passport QR link.",
    industry: "all",
    version: 0,
    confirmBeforeFiling: false,
    legalDisclaimerRequired: false,
    sections: [
      {
        key: "card_front",
        title: "Business Card Content",
        description: "Front and back business card fields.",
        requiredBrainPaths: ["identity.legalName", "identity.contact.email", "identity.contact.phone"],
        defaultPrompt: "Structure business card text layout including name, legal business title, phone, email, website, and passport QR.",
      },
    ],
  },
};

/**
 * Industry Template Packs (Sector-Specific Overrides & Supplemental Prompt Rules)
 */
export const INDUSTRY_TEMPLATE_PACKS: Record<string, { name: string; priorityFocus: string; supplementalPrompts: Record<string, string> }> = {
  construction: {
    name: "Construction & Engineering Pack",
    priorityFocus: "Safety standards (HSE), COREN/NSE certifications, plant & equipment capacity, completed civil works.",
    supplementalPrompts: {
      profile_procurement: "Emphasize COREN engineering registration, HSE safety policy, heavy equipment inventory, and structural project track record.",
    },
  },
  ict: {
    name: "ICT & Software Solutions Pack",
    priorityFocus: "Cybersecurity compliance, NITDA registration, cloud infrastructure, SLA guarantees, software IP.",
    supplementalPrompts: {
      profile_procurement: "Highlight NITDA registration, data protection compliance (NDPA), cloud infrastructure architecture, and 99.9% uptime SLAs.",
    },
  },
  logistics: {
    name: "Logistics & Supply Chain Pack",
    priorityFocus: "Fleet size, warehousing square meters, GIT insurance, state haulage permits, goods tracking.",
    supplementalPrompts: {
      profile_procurement: "Detail vehicle fleet count, Goods in Transit (GIT) insurance coverage, interstate transit permits, and warehouse capacity.",
    },
  },
  retail: {
    name: "Retail & Fashion Pack",
    priorityFocus: "Brand identity, online e-commerce channels, inventory capacity, wholesale supply capability.",
    supplementalPrompts: {
      profile_standard: "Highlight retail store locations, e-commerce ordering channels, product catalogue breadth, and distribution capabilities.",
    },
  },
  hospitality: {
    name: "Food, Hospitality & Catering Pack",
    priorityFocus: "NAFDAC approvals, public health hygiene certificates, daily catering capacity, food safety controls.",
    supplementalPrompts: {
      profile_procurement: "Focus on NAFDAC registration, public health certificates, food safety HACCP protocols, and daily meal throughput capacity.",
    },
  },
  agriculture: {
    name: "Agriculture & Agro-Processing Pack",
    priorityFocus: "Farm acreage/LGA coordinates, NEPC export permit, processing capacity, outgrower scheme network.",
    supplementalPrompts: {
      profile_procurement: "Detail farm acreage, LGA locations, NEPC export registration, processing machinery capacity, and outgrower farmer networks.",
    },
  },
};
