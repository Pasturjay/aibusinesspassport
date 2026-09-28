import { mutation } from "../_generated/server";

/**
 * Seed Pilot Persona Demo Data for Pilot Launch.
 * Persona UC-1: Sarah Johnson (Idea Founder, Business Name)
 * Persona UC-2: Johnson Adebayo (SME Owner, Limited Company)
 * Persona UC-5: Ngozi Chukwu (Tender Specialist, Procurement Contractor)
 */
export const seedPilotDemoPersonas = mutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();

    // 1. UC-1 Sarah Johnson (Idea Founder)
    await ctx.db.insert("users", {
      clerkId: "demo_clerk_sarah",
      email: "sarah@luminaideas.ng",
      name: "Sarah Johnson",
      role: "owner",
      locale: "en-NG",
      notificationPrefs: { email: true, sms: true, whatsapp: true, inApp: true },
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });

    const sarahBizId = await ctx.db.insert("businesses", {
      ownerUserId: "demo_clerk_sarah",
      brainVersion: 1,
      status: "registered",
      onboardingState: {
        step: "completed",
        completedAt: now,
        answers: {},
      },
      plan: {
        tier: "free",
        status: "active",
      },
      operations: {
        hasEmployees: true,
        hasPhysicalShop: false,
        sellsOnline: true,
        employeeCount: 2,
        operatesStates: ["Lagos"],
        branches: [],
      },
      capabilities: [{ name: "Brand Design", description: "Graphic and identity design" }],
      services: [{ name: "Branding", description: "Creative branding services" }],
      identity: {
        legalName: "Lumina Creative Studio",
        businessType: "business_name",
        rcNumber: "BN-789012",
        tin: "23456789-0001",
        industry: "Creative & Design",
        description: "Brand identity, graphic design, and digital media studio",
        address: {
          line1: "14 Commercial Avenue",
          city: "Yaba",
          lga: "Lagos Mainland",
          state: "Lagos",
          country: "Nigeria",
        },
        contact: {
          phone: "+2348021112222",
          email: "hello@luminaideas.ng",
          socials: [],
        },
      },
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });

    await ctx.db.insert("subscriptions", {
      businessId: sarahBizId,
      tier: "free",
      interval: "monthly",
      amountKobo: 0,
      status: "active",
      paystackCodes: {},
      startedAt: now,
      currentPeriodEnd: "2027-01-01T00:00:00Z",
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });

    await ctx.db.insert("passports", {
      businessId: sarahBizId,
      passportId: "BP-NG-SARAH01",
      passportSlug: "lumina-creative",
      style: "minimal",
      tagline: "Brand Identity & Graphic Design",
      fieldVisibility: {
        legalName: "public",
        tradingName: "public",
        industry: "public",
        description: "public",
        phone: "public",
        email: "public",
        rcNumber: "on_request",
        tin: "private",
      },
      isActive: true,
      nfcEnabled: true,
      isVerified: true,
      status: "active",
      issuedAt: "2026-01-10",
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });

    // 2. UC-2 Johnson Adebayo (Limited SME Owner)
    await ctx.db.insert("users", {
      clerkId: "demo_clerk_johnson",
      email: "johnson@apexzenith.ng",
      name: "Johnson Adebayo",
      role: "owner",
      locale: "en-NG",
      notificationPrefs: { email: true, sms: true, whatsapp: true, inApp: true },
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });

    const johnsonBizId = await ctx.db.insert("businesses", {
      ownerUserId: "demo_clerk_johnson",
      brainVersion: 1,
      status: "registered",
      onboardingState: {
        step: "completed",
        completedAt: now,
        answers: {},
      },
      plan: {
        tier: "plus",
        status: "active",
      },
      operations: {
        hasEmployees: true,
        hasPhysicalShop: true,
        sellsOnline: true,
        employeeCount: 15,
        operatesStates: ["Lagos", "Oyo", "Abuja", "Kano", "Rivers"],
        branches: [],
      },
      capabilities: [{ name: "Interstate Haulage", description: "Fleet logistics across 5 states" }],
      services: [{ name: "Logistics", description: "Haulage and warehousing" }],
      identity: {
        legalName: "Apex Zenith Logistics Limited",
        tradingName: "Apex Zenith Express",
        businessType: "limited_company",
        rcNumber: "RC-1456789",
        tin: "10987654-0001",
        industry: "Logistics & Supply Chain",
        description: "Haulage, last-mile freight delivery, and warehousing across Nigeria",
        address: {
          line1: "8 Ikeja Industrial Estate",
          city: "Ikeja",
          lga: "Ikeja",
          state: "Lagos",
          country: "Nigeria",
        },
        contact: {
          phone: "+2348034445555",
          email: "contact@apexzenith.ng",
          socials: [],
        },
      },
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });

    await ctx.db.insert("subscriptions", {
      businessId: johnsonBizId,
      tier: "plus",
      interval: "monthly",
      amountKobo: 500000,
      status: "active",
      paystackCodes: {},
      startedAt: now,
      currentPeriodEnd: "2027-01-01T00:00:00Z",
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });

    await ctx.db.insert("passports", {
      businessId: johnsonBizId,
      passportId: "BP-NG-JOHNSON02",
      passportSlug: "apex-zenith-logistics",
      style: "corporate",
      tagline: "Reliable Freight & Freight Forwarding Nationwide",
      fieldVisibility: {
        legalName: "public",
        tradingName: "public",
        industry: "public",
        description: "public",
        services: "public",
        city: "public",
        state: "public",
        phone: "public",
        email: "public",
        rcNumber: "public",
        tin: "private",
        complianceDocs: "on_request",
      },
      isActive: true,
      nfcEnabled: true,
      isVerified: true,
      status: "active",
      issuedAt: "2025-06-15",
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });

    // 3. UC-5 Ngozi Chukwu (Tender Specialist)
    await ctx.db.insert("users", {
      clerkId: "demo_clerk_ngozi",
      email: "ngozi@vertextech.ng",
      name: "Ngozi Chukwu",
      role: "owner",
      locale: "en-NG",
      notificationPrefs: { email: true, sms: true, whatsapp: true, inApp: true },
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });

    const ngoziBizId = await ctx.db.insert("businesses", {
      ownerUserId: "demo_clerk_ngozi",
      brainVersion: 1,
      status: "registered",
      onboardingState: {
        step: "completed",
        completedAt: now,
        answers: {},
      },
      plan: {
        tier: "pro",
        status: "active",
      },
      operations: {
        hasEmployees: true,
        hasPhysicalShop: true,
        sellsOnline: false,
        employeeCount: 30,
        operatesStates: ["Abuja", "Lagos", "Kano", "Kaduna"],
        branches: [],
      },
      capabilities: [{ name: "Civil Engineering", description: "Federal procurement construction contractor" }],
      services: [{ name: "Procurement Contracting", description: "Government infrastructure projects" }],
      identity: {
        legalName: "Vertex Infrastructure & ICT Solutions Limited",
        businessType: "limited_company",
        rcNumber: "RC-987654",
        tin: "55443322-0001",
        industry: "Construction & ICT Services",
        description: "Civil engineering, fiber optic deployment, and government procurement contractor",
        address: {
          line1: "22 Central Business District",
          city: "Abuja",
          lga: "Abuja Municipal",
          state: "Abuja",
          country: "Nigeria",
        },
        contact: {
          phone: "+2348056667777",
          email: "tenders@vertextech.ng",
          socials: [],
        },
      },
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });

    await ctx.db.insert("subscriptions", {
      businessId: ngoziBizId,
      tier: "pro",
      interval: "monthly",
      amountKobo: 1500000,
      status: "active",
      paystackCodes: {},
      startedAt: now,
      currentPeriodEnd: "2027-01-01T00:00:00Z",
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });

    await ctx.db.insert("passports", {
      businessId: ngoziBizId,
      passportId: "BP-NG-NGOZI05",
      passportSlug: "vertex-infra-ict",
      style: "premium",
      tagline: "Grade-A Federal Government Procurement Contractor",
      fieldVisibility: {
        legalName: "public",
        tradingName: "public",
        industry: "public",
        description: "public",
        services: "public",
        phone: "public",
        email: "public",
        rcNumber: "public",
        tin: "private",
      },
      isActive: true,
      nfcEnabled: true,
      isVerified: true,
      status: "active",
      issuedAt: "2024-11-01",
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });

    return {
      success: true,
      sarahBizId,
      johnsonBizId,
      ngoziBizId,
    };
  },
});
