/**
 * Security, PII Redaction, and Prompt Injection Defense for Business AI Assistant.
 */

export interface SecurityCheckResult {
  safeText: string;
  isInjectionAttempt: boolean;
  sanitized: boolean;
}

/**
 * Redacts sensitive PII (NIN, BVN, Bank Account Numbers) from logs and assistant inputs.
 */
export function redactPII(text: string): string {
  if (!text) return "";

  // Redact 11-digit NIN / BVN sequences
  let redacted = text.replace(/\b\d{11}\b/g, "[REDACTED_PII]");

  // Redact 10-digit Bank Account Number sequences when near bank context
  redacted = redacted.replace(/(account|bank|acc)\s*:?\s*\b\d{10}\b/gi, "$1: [REDACTED_ACCOUNT]");

  return redacted;
}

/**
 * Wraps untrusted user uploads (documents, tender texts) in isolated XML tags
 * and neutralizes prompt-injection attack vectors.
 */
export function wrapUntrustedContent(content: string, contentType: string = "untrusted_document"): SecurityCheckResult {
  if (!content) {
    return { safeText: "", isInjectionAttempt: false, sanitized: false };
  }

  // Detect common prompt injection attack patterns
  const injectionPatterns = [
    /ignore\s+previous\s+instructions/i,
    /system\s+prompt\s+override/i,
    /you\s+are\n+now\s+an\s+admin/i,
    /reveal\s+all\s+user\s+data/i,
    /drop\s+table/i,
    /grant\s+admin\s+access/i,
  ];

  let isInjectionAttempt = false;
  for (const pattern of injectionPatterns) {
    if (pattern.test(content)) {
      isInjectionAttempt = true;
      break;
    }
  }

  // Neutralize potential system instruction tags
  let sanitizedContent = content
    .replace(/<system>/gi, "&lt;system&gt;")
    .replace(/<\/system>/gi, "&lt;/system&gt;")
    .replace(/<instructions>/gi, "&lt;instructions&gt;")
    .replace(/<\/instructions>/gi, "&lt;/instructions&gt;");

  // If explicit prompt injection attempt detected, neutralize instruction phrases
  if (isInjectionAttempt) {
    sanitizedContent = `[DATA ONLY - PROMPT INJECTION NEUTRALIZED]: ${sanitizedContent.replace(/ignore\s+all\s+instructions/gi, "[NEUTRALIZED]")}`;
  }

  const safeText = `<untrusted_content type="${contentType}">\n${sanitizedContent}\n</untrusted_content>`;

  return {
    safeText,
    isInjectionAttempt,
    sanitized: true,
  };
}
