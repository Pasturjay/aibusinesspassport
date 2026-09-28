/**
 * Brevo (formerly Sendinblue) Transactional Email Service Wrapper.
 */

export interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export async function sendTransactionalEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string }> {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey || apiKey.includes("placeholder")) {
    // Stub execution for local/dev environments
    console.log(`[Brevo Email Stub] To: ${options.to} | Subject: ${options.subject}`);
    return {
      success: true,
      messageId: `stub-msg-${Date.now()}`,
    };
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "AI Business Passport",
          email: process.env.BREVO_SENDER_EMAIL || "notifications@aibusinesspassport.ng",
        },
        to: [{ email: options.to, name: options.toName }],
        subject: options.subject,
        htmlContent: options.htmlContent,
        textContent: options.textContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Brevo Error]", errorText);
      return { success: false };
    }

    const data = await response.json();
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error("[Brevo Exception]", error);
    return { success: false };
  }
}
