/**
 * NDPA Data Subject Rights Helper (Sections 34-39).
 * Handles Data Export & Data Deletion for business owners.
 */

export interface ExportedBusinessPackage {
  exportedAt: string;
  businessId: string;
  legalName: string;
  tradingName: string;
  brainSnapshot: Record<string, any>;
  vaultDocumentsList: { id: string; fileName: string; category: string }[];
  complianceItemsCount: number;
}

export function buildDataExportPackage(
  business: any,
  documents: any[],
  complianceItems: any[]
): ExportedBusinessPackage {
  return {
    exportedAt: new Date().toISOString(),
    businessId: business._id,
    legalName: business.legalName || business.name,
    tradingName: business.tradingName || business.name,
    brainSnapshot: business,
    vaultDocumentsList: documents.map((d) => ({
      id: d._id,
      fileName: d.fileName,
      category: d.category,
    })),
    complianceItemsCount: complianceItems.length,
  };
}

export interface DeletionAuditRecord {
  deletedAt: string;
  businessId: string;
  recordsPurged: string[];
  status: "completed";
}

export function buildDeletionAuditRecord(businessId: string): DeletionAuditRecord {
  return {
    deletedAt: new Date().toISOString(),
    businessId,
    recordsPurged: [
      "business_brain",
      "vault_documents_r2",
      "advisor_grants",
      "compliance_items",
      "passport_card",
      "assistant_threads",
    ],
    status: "completed",
  };
}
