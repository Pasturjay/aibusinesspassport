/**
 * Plain-language multi-channel notification templates.
 * Enforces Zero Private Data in SMS / WhatsApp text bodies (no NIN, BVN, or sensitive financials).
 */

export type NotificationTemplateKey =
  | "compliance_due"
  | "compliance_overdue"
  | "document_expiring"
  | "document_request_received"
  | "request_decided"
  | "follow_up_reminder"
  | "payment_failed"
  | "welcome"
  | "onboarding_abandoned";

export interface RenderedTemplate {
  subject: string;
  bodyText: string;
  htmlContent: string;
}

export function renderNotificationTemplate(
  template: NotificationTemplateKey,
  payload: Record<string, any>
): RenderedTemplate {
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.aibusinesspassport.ng";

  switch (template) {
    case "compliance_due": {
      const title = payload.title || "Statutory Filing";
      const dueDate = payload.dueDate || "soon";
      const days = payload.daysRemaining ?? "";
      const daysText = days !== "" ? ` in ${days} day(s)` : "";

      const subject = `Reminder: ${title} due${daysText}`;
      const bodyText = `AI Business Passport: Your compliance obligation "${title}" is due on ${dueDate}. Visit ${appBaseUrl}/dashboard to view details.`;
      const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0f172a;">Compliance Filing Reminder</h2>
          <p>Your business compliance requirement <strong>${title}</strong> is due on <strong>${dueDate}</strong>.</p>
          <p style="margin-top: 20px;">
            <a href="${appBaseUrl}/dashboard" style="background-color: #2563eb; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Compliance Calendar
            </a>
          </p>
        </div>
      `;
      return { subject, bodyText, htmlContent };
    }

    case "compliance_overdue": {
      const title = payload.title || "Statutory Filing";
      const dueDate = payload.dueDate || "recently";

      const subject = `URGENT: ${title} is OVERDUE`;
      const bodyText = `AI Business Passport URGENT: "${title}" was due on ${dueDate} and is now overdue. Log in now to avoid penalties: ${appBaseUrl}/dashboard`;
      const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626;">Filing Overdue Alert</h2>
          <p>Your business compliance item <strong>${title}</strong> was due on <strong>${dueDate}</strong> and requires immediate action.</p>
          <p style="margin-top: 20px;">
            <a href="${appBaseUrl}/dashboard" style="background-color: #dc2626; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">
              File / Update Status Now
            </a>
          </p>
        </div>
      `;
      return { subject, bodyText, htmlContent };
    }

    case "document_expiring": {
      const docType = payload.docType || "Document";
      const fileName = payload.fileName || docType;
      const expiresAt = payload.expiresAt || "soon";

      const subject = `Document Expiring: ${docType}`;
      const bodyText = `AI Business Passport: Your stored document "${fileName}" expires on ${expiresAt}. Upload a updated copy: ${appBaseUrl}/vault`;
      const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0f172a;">Document Expiry Notice</h2>
          <p>Your Vault document <strong>${fileName}</strong> (${docType}) is set to expire on <strong>${expiresAt}</strong>.</p>
          <p style="margin-top: 20px;">
            <a href="${appBaseUrl}/vault" style="background-color: #2563eb; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Upload Renewal to Vault
            </a>
          </p>
        </div>
      `;
      return { subject, bodyText, htmlContent };
    }

    case "document_request_received": {
      const name = payload.requesterName || "Someone";
      const company = payload.requesterCompany || "a business partner";

      const subject = `New Document Request from ${name} (${company})`;
      const bodyText = `AI Business Passport: ${name} from ${company} requested your business profile package. Review & approve: ${appBaseUrl}/requests`;
      const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0f172a;">New Business Profile Request</h2>
          <p><strong>${name}</strong> from <strong>${company}</strong> has submitted a request to view your verified Business Passport & document package.</p>
          <p style="margin-top: 20px;">
            <a href="${appBaseUrl}/requests" style="background-color: #2563eb; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Review Request
            </a>
          </p>
        </div>
      `;
      return { subject, bodyText, htmlContent };
    }

    case "request_decided": {
      const status = payload.status || "decided";
      const businessName = payload.businessName || "Business";

      const subject = `Profile Request ${status.toUpperCase()} by ${businessName}`;
      const bodyText = `AI Business Passport: Your profile request to ${businessName} was ${status}. Check status: ${appBaseUrl}/p`;
      const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0f172a;">Request Update</h2>
          <p>Your profile access request to <strong>${businessName}</strong> has been marked as <strong>${status}</strong>.</p>
        </div>
      `;
      return { subject, bodyText, htmlContent };
    }

    case "follow_up_reminder": {
      const title = payload.title || "Follow-up Action";
      const action = payload.action || "Please complete your pending action.";

      const subject = `Reminder: ${title}`;
      const bodyText = `AI Business Passport: ${title} - ${action}. Log in: ${appBaseUrl}/dashboard`;
      const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0f172a;">${title}</h2>
          <p>${action}</p>
          <p style="margin-top: 20px;">
            <a href="${appBaseUrl}/dashboard" style="background-color: #2563eb; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Open Dashboard
            </a>
          </p>
        </div>
      `;
      return { subject, bodyText, htmlContent };
    }

    case "payment_failed": {
      const tier = payload.tier || "subscription";

      const subject = `Payment Failed - Action Required`;
      const bodyText = `AI Business Passport: Your payment for ${tier} could not be processed. Update billing to retain features: ${appBaseUrl}/settings/billing`;
      const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626;">Subscription Payment Issue</h2>
          <p>We were unable to renew your subscription for <strong>${tier}</strong>.</p>
          <p style="margin-top: 20px;">
            <a href="${appBaseUrl}/settings/billing" style="background-color: #dc2626; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Update Billing Details
            </a>
          </p>
        </div>
      `;
      return { subject, bodyText, htmlContent };
    }

    case "welcome": {
      const name = payload.userName || "Founder";
      const legalName = payload.legalName || "your business";

      const subject = `Welcome to AI Business Passport!`;
      const bodyText = `AI Business Passport: Welcome ${name}! Your profile for ${legalName} is live. Explore your dashboard: ${appBaseUrl}/dashboard`;
      const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0f172a;">Welcome, ${name}!</h2>
          <p>Your AI Business Passport for <strong>${legalName}</strong> has been initialized.</p>
          <p style="margin-top: 20px;">
            <a href="${appBaseUrl}/dashboard" style="background-color: #2563eb; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Get Started
            </a>
          </p>
        </div>
      `;
      return { subject, bodyText, htmlContent };
    }

    case "onboarding_abandoned": {
      const legalName = payload.legalName || "your business";
      const resumeUrl = payload.resumeUrl || `${appBaseUrl}/onboarding`;

      const subject = `Complete your setup for ${legalName}`;
      const bodyText = `AI Business Passport: Pick up where you left off setting up ${legalName}. Complete setup: ${resumeUrl}`;
      const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0f172a;">Resume Business Onboarding</h2>
          <p>You're almost done creating your verified business card and passport for <strong>${legalName}</strong>.</p>
          <p style="margin-top: 20px;">
            <a href="${resumeUrl}" style="background-color: #2563eb; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Resume Setup
            </a>
          </p>
        </div>
      `;
      return { subject, bodyText, htmlContent };
    }
  }
}
