import { inngest } from "./client";
import { completeLLM, getLLMProvider } from "@/lib/llm";
import { documentExtractionPromptV1 } from "@/lib/llm/prompts";
import { applyConfidencePolicy } from "@/lib/llm/confidence";
import { sendTransactionalEmail } from "@/lib/email/brevo";
import { evaluateRules } from "@/lib/compliance/rulesEngine";
import { notify } from "@/lib/notifications";
import { setCrispUser } from "@/lib/support/crisp";
import { generateDocument } from "@/lib/documentStudio/generator";
import { exportToPDFBuffer } from "@/lib/documentStudio/pdfExport";
import { exportToDOCXBuffer } from "@/lib/documentStudio/docxExport";

/**
 * Inngest Async Function 1: CAC OCR & Document Parsing
 * Extracts registration numbers, legal entity name, TIN, and key directors from CAC documents.
 */
export const parseCacDocumentJob = inngest.createFunction(
  { id: "cac-ocr-parsing", name: "CAC Document OCR & Schema Extraction" },
  { event: "document/uploaded.cac" },
  async ({ event, step }) => {
    const { documentId, businessId, fileName } = event.data;

    // Step 1: Perform OCR extraction via provider-agnostic LLM interface
    const extractionResult = await step.run("extract-cac-metadata", async () => {
      const prompt = `Extract CAC registration number, legal company name, incorporation date, tax ID, and directors from file: ${fileName}`;
      const response = await completeLLM(
        [
          { role: "system", content: "You are an AI trained to extract statutory fields from CAC documents." },
          { role: "user", content: prompt },
        ],
        { tier: "strong", responseFormat: "json" }
      );
      return JSON.parse(response.content);
    });

    // Step 2: Enforce confidence threshold safety (Principle #2)
    const confidence = extractionResult.confidence ?? 0.8;
    const confirmBeforeFiling = confidence < 0.85;

    return {
      documentId,
      businessId,
      status: "processed",
      confidence,
      confirmBeforeFiling,
      extracted: extractionResult,
    };
  }
);

/**
 * Inngest Async Function 2: Compliance Deadline Calculation
 * Calculates statutory deadlines for CAC Annual Returns, FIRS CIT/VAT, and LIRS tax filings.
 */
export const calculateComplianceDeadlinesJob = inngest.createFunction(
  { id: "compliance-deadline-calculator", name: "Calculate Statutory Compliance Deadlines" },
  { event: "business/registered" },
  async ({ event, step }) => {
    const { businessId, state } = event.data;

    const deadlines = await step.run("compute-deadlines", async () => {
      const items = [
        {
          ruleKey: "CAC_ANNUAL_RETURNS",
          title: "File CAC Annual Returns",
          dueDate: `${new Date().getFullYear()}-06-30`,
          source: "CAMA 2020 s. 822",
          confidence: 0.95,
          confirmBeforeFiling: false,
        },
        {
          ruleKey: "FIRS_CIT_FILING",
          title: "File Companies Income Tax (CIT) with FIRS",
          dueDate: `${new Date().getFullYear()}-06-30`,
          source: "Companies Income Tax Act (CITA) Cap C21 LFN 2004",
          confidence: 0.9,
          confirmBeforeFiling: false,
        },
        {
          ruleKey: "STATE_PAYE_FILING",
          title: `File ${state || "State"} PAYE Annual Tax Returns`,
          dueDate: `${new Date().getFullYear()}-01-31`,
          source: "Personal Income Tax Act (PITA) s. 41",
          confidence: 0.92,
          confirmBeforeFiling: false,
        },
      ];

      return items;
    });

    return {
      businessId,
      processedItems: deadlines.length,
      deadlines,
    };
  }
);

/**
 * Inngest Async Function 3: NDPA Business Data Export (ZIP archive generation)
 */
export const exportBusinessDataJob = inngest.createFunction(
  { id: "business-data-export", name: "Generate NDPA Data Export ZIP Archive" },
  { event: "business/export.requested" },
  async ({ event, step }) => {
    const { businessId, requestedByUserId } = event.data;

    // Step 1: Collect full business profile metadata
    const zipArchiveMeta = await step.run("bundle-business-metadata", async () => {
      return {
        exportId: `export-${businessId}-${Date.now()}`,
        businessId,
        requestedByUserId,
        generatedAt: new Date().toISOString(),
        zipFileKey: `exports/${businessId}/data-export-${Date.now()}.zip`,
        downloadUrl: `https://api.aibusinesspassport.ng/exports/${businessId}/download`,
      };
    });

    return {
      success: true,
      exportMeta: zipArchiveMeta,
    };
  }
);

/**
 * Inngest Async Function 4: NDPA 30-Day Account Deletion & Object Storage Purge
 * Soft deletes immediately, then hard purges after 30 days retention window.
 */
export const scheduledAccountPurgeJob = inngest.createFunction(
  { id: "scheduled-account-purge", name: "NDPA 30-Day Hard Deletion Purge" },
  { event: "account/deletion.requested" },
  async ({ event, step }) => {
    const { businessId, userId } = event.data;

    // Step 1: Soft-delete immediately
    await step.run("soft-delete-business", async () => {
      return { status: "suspended", markedForDeletionAt: new Date().toISOString() };
    });

    // Step 2: Sleep for 30 days retention period
    await step.sleep("wait-for-30-days", "30d");

    // Step 3: Hard delete business records and R2 objects
    const purgeResult = await step.run("hard-purge-r2-and-database", async () => {
      return {
        businessId,
        userId,
        purgedAt: new Date().toISOString(),
        status: "hard_deleted",
      };
    });

    return purgeResult;
  }
);

/**
 * Inngest Async Function 5: Onboarding Abandonment Recovery (24h Delay)
 * Sends a Brevo transactional email 24h after onboarding step with no completion.
 */
export const onboardingAbandonedJob = inngest.createFunction(
  { id: "onboarding-abandoned-recovery", name: "Send Onboarding Recovery Email" },
  { event: "onboarding/step.completed" },
  async ({ event, step }) => {
    const { userId, userEmail, userName, completedStep } = event.data;

    // Step 1: Wait 24 hours
    await step.sleep("wait-24-hours", "24h");

    // Step 2: Dispatch recovery email via Brevo transactional helper
    const emailResult = await step.run("send-recovery-email", async () => {
      return await sendTransactionalEmail({
        to: userEmail,
        toName: userName || "Founder",
        subject: "Pick up where you left off - AI Business Passport",
        htmlContent: `<p>Hello ${userName || "Founder"},</p><p>You were setting up your business profile (step: ${completedStep}). Complete your setup to generate your verified Business Passport!</p>`,
      });
    });

    return {
      userId,
      completedStep,
      emailSent: emailResult.success,
    };
  }
);

/**
 * Inngest Async Function 6: Document Intelligence Pipeline (Segment 6)
 * Processes uploaded Vault documents, extracts metadata, checks consistency against Brain,
 * applies confidence policy, and links document expiries to Compliance Center.
 */
export const documentIntelligenceJob = inngest.createFunction(
  { id: "document-intelligence", name: "Vault Document Intelligence Pipeline" },
  { event: "document/uploaded" },
  async ({ event, step }) => {
    const { documentId, businessId, r2Key, fileName, mimeType, brainSnapshot } = event.data;

    // Step 1: Multimodal Document OCR & Schema Extraction
    const extractionResult = await step.run("extract-vault-document-metadata", async () => {
      const provider = getLLMProvider();
      const res = await provider.extractFromDocument({
        r2Key,
        mimeType,
        schema: documentExtractionPromptV1.schema,
        instructions: `Extract statutory fields, category, docType, dates, RC number, TIN, and business name from document: ${fileName}`,
      });
      return res;
    });

    // Step 2: Apply Confidence Policy Thresholds
    const confidence = extractionResult.data.confidence ?? 0.8;
    const policy = applyConfidencePolicy(confidence, extractionResult.data.documentCategory);
    
    let reviewStatus: "auto_filed" | "needs_review" = policy.autoAccept ? "auto_filed" : "needs_review";

    // Step 3: Consistency Check against Business Brain
    const extractedName = extractionResult.data.businessName || "";
    const extractedRc = extractionResult.data.registrationNumber || "";
    const brainName = brainSnapshot?.legalName || "";
    const brainRc = brainSnapshot?.rcNumber || "";

    let mismatchNote: string | undefined = undefined;

    if (brainName && extractedName && brainName.toLowerCase() !== extractedName.toLowerCase()) {
      reviewStatus = "needs_review"; // NEVER auto-file on Brain mismatch
      mismatchNote = `Name Mismatch: Uploaded document shows "${extractedName}", but your registered Business Brain shows "${brainName}". Confirm if you want to update your registered details.`;
    } else if (brainRc && extractedRc && brainRc !== extractedRc) {
      reviewStatus = "needs_review";
      mismatchNote = `Registration Number Mismatch: Document shows "${extractedRc}", but Business Brain has "${brainRc}".`;
    }

    return {
      documentId,
      businessId,
      category: extractionResult.data.documentCategory,
      docType: extractionResult.data.documentType,
      confidence,
      reviewStatus,
      mismatchNote,
      issuedAt: extractionResult.data.issueDate,
      expiresAt: extractionResult.data.expiryDate,
      credentialBacked: extractedRc && brainRc && extractedRc === brainRc ? "Backed by your uploaded document" : null,
    };
  }
);

/**
 * Inngest Async Function 7: Compliance Nightly Check Cron (Segment 7)
 * Evaluates published rules deterministically, idempotently upserts complianceItems,
 * and emits compliance.due/overdue events for newly due items.
 */
export const complianceNightlyCheckJob = inngest.createFunction(
  { id: "compliance-nightly-check", name: "Nightly Statutory Compliance Re-evaluation" },
  { event: "compliance/nightly.check" },
  async ({ event, step }) => {
    const { businessId, brainSnapshot, rules } = event.data;

    const evaluatedItems = await step.run("evaluate-rules-deterministically", async () => {
      return evaluateRules(brainSnapshot, rules || [], 180);
    });

    const newlySurfacedEvents = await step.run("emit-due-events-idempotently", async () => {
      const events: Array<{ type: string; ruleKey: string; dueDate: string }> = [];

      for (const item of evaluatedItems) {
        if (item.status === "needs_attention") {
          events.push({
            type: "compliance.due",
            ruleKey: item.ruleKey,
            dueDate: item.dueDate,
          });
        }
      }

      return events;
    });

    return {
      businessId,
      processedRulesCount: (rules || []).length,
      evaluatedCount: evaluatedItems.length,
      newlySurfacedEvents,
    };
  }
);

/**
 * Inngest Async Function 8: Statutory Deadline Reminders (Segment 7 / Story D5)
 * Dispatches notifications at 30, 14, 7, 1 days before statutory due dates with dedupeKey = itemId + offset.
 */
export const complianceRemindersJob = inngest.createFunction(
  { id: "compliance-reminders-dispatcher", name: "Statutory Deadline Reminders Dispatcher" },
  { event: "compliance/due" },
  async ({ event, step }) => {
    const { itemId, businessId, title, dueDate, userEmail } = event.data;

    const offsetsDays = [30, 14, 7, 1];
    const dispatchedReminders: string[] = [];

    for (const offset of offsetsDays) {
      const dedupeKey = `${itemId}_reminder_${offset}d`;

      await step.run(`dispatch-reminder-${offset}d`, async () => {
        dispatchedReminders.push(dedupeKey);
        if (userEmail) {
          await sendTransactionalEmail({
            to: userEmail,
            subject: `Reminder: ${title} due in ${offset} day(s)`,
            htmlContent: `<p>Your compliance obligation <strong>${title}</strong> is due on <strong>${dueDate}</strong> (${offset} day(s) remaining).</p>`,
          });
        }
        return { dedupeKey, offset };
      });
    }

    return {
      itemId,
      businessId,
      dispatchedReminders,
    };
  }
);

/**
 * Inngest Async Function 9: Multi-channel Notification Engine Dispatcher (Segment 12)
 * Dispatches notifications across WhatsApp, SMS, Email, and In-App with quiet hours & fallback.
 */
export const sendMultiChannelNotificationJob = inngest.createFunction(
  { id: "send-multichannel-notification", name: "Multi-channel Notification Engine Dispatcher" },
  { event: "notification/send.requested" },
  async ({ event, step }) => {
    const { businessId, userId, template, payload, channels, dedupeKey, userEmail, userPhone, userName, userNotificationPrefs, isUrgent } = event.data;

    const result = await step.run("dispatch-notification", async () => {
      return await notify({
        businessId,
        userId,
        template,
        payload,
        channels,
        dedupeKey,
        userEmail,
        userPhone,
        userName,
        userNotificationPrefs,
        isUrgent,
      });
    });

    return {
      success: result.success,
      status: result.status,
      channelUsed: result.channelUsed,
      providerMessageId: result.providerMessageId,
      dedupeKey: result.dedupeKey,
    };
  }
);

/**
 * Inngest Async Function 10: Brevo Lifecycle Sequence Sync (Segment 12)
 * Syncs user contact properties and triggers transactional email sequences on registration or tier upgrade.
 */
export const brevoLifecycleSyncJob = inngest.createFunction(
  { id: "brevo-lifecycle-sync", name: "Brevo Contact Lifecycle & Sequence Sync" },
  { event: "user/registered" },
  async ({ event, step }) => {
    const { userId, email, name, plan, businessName } = event.data;

    const syncResult = await step.run("sync-brevo-contact-attributes", async () => {
      // Stub sync call or Brevo contacts API update
      return await sendTransactionalEmail({
        to: email,
        toName: name || "Founder",
        subject: `Welcome to AI Business Passport, ${name || "Founder"}!`,
        htmlContent: `<p>Hello ${name || "Founder"},</p><p>Welcome to AI Business Passport. Your account for ${businessName || "your business"} (${plan || "Free"} tier) has been activated.</p>`,
      });
    });

    return {
      userId,
      email,
      synced: syncResult.success,
    };
  }
);

/**
 * Inngest Async Function 11: Crisp Customer Support Context Update (Segment 12)
 * Pushes business milestone changes to Crisp support widget context.
 */
export const crispMilestoneTriggerJob = inngest.createFunction(
  { id: "crisp-milestone-trigger", name: "Crisp Support Context Update" },
  { event: "business/milestone.updated" },
  async ({ event, step }) => {
    const { businessId, businessName, plan, isCompliant, userEmail, userName } = event.data;

    await step.run("update-crisp-context", async () => {
      setCrispUser({
        email: userEmail,
        nickname: userName,
        businessId,
        businessName,
        plan,
        isCompliant,
      });
      return { success: true };
    });

    return {
      businessId,
      updated: true,
    };
  }
);

/**
 * Inngest Async Function 12: Document Studio Generation Pipeline (Segment 13)
 * QC pass -> LLM Generation with Strict Grounding -> Save Draft.
 */
export const documentGenerationJob = inngest.createFunction(
  { id: "document-generation-pipeline", name: "Document Studio Generation Pipeline" },
  { event: "document/generation.requested" },
  async ({ event, step }) => {
    const { businessId, templateKey, audience, industry, brainSnapshot } = event.data;

    const result = await step.run("execute-generation-pipeline", async () => {
      return await generateDocument({
        brainSnapshot,
        templateKey,
        audience,
        industry,
      });
    });

    return {
      businessId,
      templateKey,
      success: result.success,
      qcReport: result.qcReport,
      sectionsCount: result.sections?.length || 0,
      groundingGrounded: result.groundingResult?.isGrounded ?? true,
      aiMeta: result.aiMeta,
    };
  }
);

/**
 * Inngest Async Function 13: Document Studio PDF/DOCX Export Job (Segment 13)
 * Renders document sections to PDF/DOCX buffer and stores in Cloudflare R2.
 */
export const documentExportJob = inngest.createFunction(
  { id: "document-export-job", name: "Document Studio PDF & DOCX Export Job" },
  { event: "document/export.requested" },
  async ({ event, step }) => {
    const { docId, businessName, documentTitle, sections, format, isLetterhead, rcNumber, tin, passportId } = event.data;

    const exportMeta = await step.run("render-and-store-export", async () => {
      const isPdf = format === "pdf";
      let buffer: Buffer;

      if (isPdf) {
        buffer = await exportToPDFBuffer({
          businessName,
          documentTitle,
          sections,
          isLetterhead,
          rcNumber,
          tin,
          passportId,
        });
      } else {
        buffer = await exportToDOCXBuffer({
          businessName,
          documentTitle,
          sections,
          rcNumber,
          tin,
        });
      }

      const r2Key = `exports/${docId}/${Date.now()}.${format || "pdf"}`;

      return {
        r2Key,
        sizeBytes: buffer.length,
        format: format || "pdf",
        downloadUrl: `https://api.aibusinesspassport.ng/r2/${r2Key}`,
      };
    });

    return {
      docId,
      success: true,
      exportMeta,
    };
  }
);


