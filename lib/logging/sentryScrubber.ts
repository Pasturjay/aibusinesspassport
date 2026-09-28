/**
 * Sentry PII Scrubber & Sanitizer.
 * Redacts NIN, TIN, emails, phone numbers, and auth tokens before event dispatch.
 */

const PII_PATTERNS = [
  { name: "Email", regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replacement: "[REDACTED_EMAIL]" },
  { name: "Phone", regex: /\b(?:\+?234|0)[789][01]\d{8}\b/g, replacement: "[REDACTED_PHONE]" },
  { name: "TIN", regex: /\b\d{8,10}-\d{4}\b/g, replacement: "[REDACTED_TIN]" },
  { name: "NIN", regex: /\b\d{11}\b/g, replacement: "[REDACTED_NIN]" },
  { name: "Token", regex: /\b(sk_[a-zA-Z0-9_]{20,}|bearer\s+[a-zA-Z0-9._-]{20,})\b/gi, replacement: "[REDACTED_TOKEN]" },
];

export function scrubPIIFromText(text: string): string {
  let cleaned = text;
  for (const pattern of PII_PATTERNS) {
    cleaned = cleaned.replace(pattern.regex, pattern.replacement);
  }
  return cleaned;
}

export function scrubSentryEvent(event: any): any {
  if (!event) return event;

  if (typeof event.message === "string") {
    event.message = scrubPIIFromText(event.message);
  }

  if (event.breadcrumbs && Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map((b: any) => {
      if (typeof b.message === "string") {
        b.message = scrubPIIFromText(b.message);
      }
      return b;
    });
  }

  if (event.extra) {
    event.extra = JSON.parse(scrubPIIFromText(JSON.stringify(event.extra)));
  }

  return event;
}
