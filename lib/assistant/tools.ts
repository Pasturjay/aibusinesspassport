/**
 * Tool definitions and schemas for Business AI Assistant function calling.
 */

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  isWriteAction: boolean;
}

export const ASSISTANT_TOOLS: ToolDefinition[] = [
  {
    name: "get_business_brain",
    description: "Retrieve read-only Business Brain snapshot for the active business.",
    parameters: { type: "object", properties: {} },
    isWriteAction: false,
  },
  {
    name: "get_compliance_items",
    description: "Get current items for what your business needs to stay compliant.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["needs_attention", "coming_up", "completed", "all"] },
      },
    },
    isWriteAction: false,
  },
  {
    name: "evaluate_compliance_for_change",
    description: "Run deterministic compliance rules engine against a proposed business operational change (e.g. hired employees, new branch).",
    parameters: {
      type: "object",
      properties: {
        changeType: { type: "string", enum: ["hired_employees", "new_branch", "new_activity", "address_change"] },
        details: { type: "string" },
      },
      required: ["changeType"],
    },
    isWriteAction: false,
  },
  {
    name: "search_vault",
    description: "Search stored documents in the Business Vault.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        category: { type: "string" },
      },
    },
    isWriteAction: false,
  },
  {
    name: "get_document_status",
    description: "Check review and extraction status of a Vault document.",
    parameters: {
      type: "object",
      properties: {
        documentId: { type: "string" },
      },
      required: ["documentId"],
    },
    isWriteAction: false,
  },
  {
    name: "report_business_change",
    description: "Report a business change event (hired employees, opened branch, new activity). REQUIRES USER CONFIRMATION.",
    parameters: {
      type: "object",
      properties: {
        changeType: { type: "string", enum: ["hired_employees", "new_branch", "new_activity", "address_change"] },
        details: { type: "string" },
      },
      required: ["changeType", "details"],
    },
    isWriteAction: true,
  },
  {
    name: "start_document_generation",
    description: "Create a new document draft in Document Studio.",
    parameters: {
      type: "object",
      properties: {
        kind: { type: "string" },
        audienceType: { type: "string" },
      },
      required: ["kind"],
    },
    isWriteAction: true,
  },
  {
    name: "start_tender_analysis",
    description: "Analyze a tender document in Tender Assistant.",
    parameters: {
      type: "object",
      properties: {
        documentId: { type: "string" },
      },
      required: ["documentId"],
    },
    isWriteAction: true,
  },
  {
    name: "create_referral",
    description: "Connect with a verified professional (accountant or lawyer) on the marketplace.",
    parameters: {
      type: "object",
      properties: {
        providerType: { type: "string", enum: ["accountant", "lawyer", "agent"] },
        context: { type: "string" },
      },
      required: ["providerType"],
    },
    isWriteAction: true,
  },
  {
    name: "generate_passport_share_link",
    description: "Generate a public share link for the Business Passport.",
    parameters: {
      type: "object",
      properties: {},
    },
    isWriteAction: false,
  },
];
