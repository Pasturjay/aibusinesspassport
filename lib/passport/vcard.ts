/**
 * Utility to generate standard vCard 3.0 string payloads
 * for saving Business Passport details directly to phone contacts.
 */

export interface VCardOptions {
  businessName: string;
  tradingName?: string;
  entityType?: string;
  phone?: string;
  email?: string;
  website?: string;
  passportUrl?: string;
  passportId?: string;
  address?: {
    line1?: string;
    city?: string;
    lga?: string;
    state?: string;
    country?: string;
  };
  description?: string;
}

export function generateVCard(opts: VCardOptions): string {
  const displayName = opts.tradingName || opts.businessName;
  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${opts.businessName};;;;`,
    `FN:${displayName}`,
    `ORG:${opts.businessName}`,
  ];

  if (opts.entityType) {
    lines.push(`TITLE:${opts.entityType}`);
  }

  if (opts.phone) {
    lines.push(`TEL;TYPE=WORK,VOICE:${opts.phone}`);
  }

  if (opts.email) {
    lines.push(`EMAIL;TYPE=WORK:${opts.email}`);
  }

  if (opts.website || opts.passportUrl) {
    lines.push(`URL:${opts.website || opts.passportUrl}`);
  }

  if (opts.address) {
    const street = (opts.address.line1 || "").replace(/;/g, "\\;");
    const city = (opts.address.city || "").replace(/;/g, "\\;");
    const region = (opts.address.state || "").replace(/;/g, "\\;");
    const country = (opts.address.country || "Nigeria").replace(/;/g, "\\;");
    lines.push(`ADR;TYPE=WORK:;;${street};${city};${region};;${country}`);
  }

  if (opts.description || opts.passportId) {
    const noteContent = [
      opts.passportId ? `Verified Business Passport: ${opts.passportId}` : "",
      opts.description || "",
    ]
      .filter(Boolean)
      .join(" - ");
    lines.push(`NOTE:${noteContent}`);
  }

  lines.push(`REV:${new Date().toISOString()}`);
  lines.push("END:VCARD");

  return lines.join("\r\n");
}
