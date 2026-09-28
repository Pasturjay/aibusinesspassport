import { GeneratedDocSection } from "./generator";

export interface PDFExportOptions {
  businessName: string;
  rcNumber?: string;
  tin?: string;
  passportId?: string;
  documentTitle: string;
  sections: GeneratedDocSection[];
  isLetterhead?: boolean;
  contact?: {
    phone?: string;
    email?: string;
    address?: string;
  };
}

export function generatePDFHtml(options: PDFExportOptions): string {
  const { businessName, rcNumber, tin, passportId, documentTitle, sections, isLetterhead, contact } = options;
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.aibusinesspassport.ng";
  const passportUrl = passportId ? `${appBaseUrl}/p/${passportId}` : `${appBaseUrl}`;

  const headerHtml = isLetterhead
    ? `
      <div style="border-b: 2px solid #1e40af; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h1 style="margin: 0; color: #1e40af; font-size: 22px; text-transform: uppercase;">${businessName}</h1>
          <p style="margin: 3px 0; font-size: 11px; color: #475569;">
            ${rcNumber ? "RC: " + rcNumber + " | " : ""}${tin ? "TIN: " + tin : ""}
          </p>
          <p style="margin: 2px 0; font-size: 11px; color: #64748b;">
            ${contact?.address || ""} ${contact?.phone ? " | Tel: " + contact.phone : ""} ${contact?.email ? " | Email: " + contact.email : ""}
          </p>
        </div>
        <div style="text-align: right;">
          <span style="display: inline-block; background-color: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 4px 8px; font-size: 10px; font-weight: bold; border-radius: 4px;">
            VERIFIED PASSPORT
          </span>
        </div>
      </div>
    `
    : `
      <div style="border-b: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px;">
        <span style="font-size: 12px; font-weight: bold; color: #2563eb; text-transform: uppercase;">AI Business Passport &bull; Document Studio</span>
        <h1 style="margin: 6px 0 0 0; color: #0f172a; font-size: 24px;">${documentTitle}</h1>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Prepared for <strong>${businessName}</strong> ${rcNumber ? "(RC: " + rcNumber + ")" : ""}</p>
      </div>
    `;

  const sectionsHtml = sections
    .map(
      (sec) => `
    <div style="margin-bottom: 24px;">
      <h2 style="color: #1e293b; font-size: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px;">${sec.title}</h2>
      <div style="font-size: 12px; line-height: 1.6; color: #334155;">
        ${sec.content.replace(/\n\n/g, "<br/><br/>").replace(/\n/g, "<br/>")}
      </div>
    </div>
  `
    )
    .join("");

  const qrHtml = `
    <div style="margin-top: 40px; border-t: 1px solid #e2e8f0; pt-15px; text-align: center; font-size: 10px; color: #64748b;">
      <p>Scan or verify live business credentials at: <a href="${passportUrl}" style="color: #2563eb;">${passportUrl}</a></p>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>${documentTitle} - ${businessName}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #0f172a; }
        </style>
      </head>
      <body>
        ${headerHtml}
        ${sectionsHtml}
        ${qrHtml}
      </body>
    </html>
  `;
}

export async function exportToPDFBuffer(options: PDFExportOptions): Promise<Buffer> {
  const html = generatePDFHtml(options);
  return Buffer.from(html, "utf-8");
}
