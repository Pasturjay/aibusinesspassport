import { GeneratedDocSection } from "./generator";

export interface DOCXExportOptions {
  businessName: string;
  documentTitle: string;
  sections: GeneratedDocSection[];
  rcNumber?: string;
  tin?: string;
}

export async function exportToDOCXBuffer(options: DOCXExportOptions): Promise<Buffer> {
  const { businessName, documentTitle, sections, rcNumber, tin } = options;

  // Render structured xml/plain text representation for DOCX document export
  let docxText = `${documentTitle.toUpperCase()}\n`;
  docxText += `Prepared for: ${businessName}\n`;
  if (rcNumber) docxText += `RC Number: ${rcNumber}\n`;
  if (tin) docxText += `TIN: ${tin}\n`;
  docxText += `==========================================\n\n`;

  for (const sec of sections) {
    docxText += `[SECTION: ${sec.title.toUpperCase()}]\n`;
    docxText += `${sec.content}\n\n`;
    docxText += `------------------------------------------\n\n`;
  }

  return Buffer.from(docxText, "utf-8");
}
