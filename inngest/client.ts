import { Inngest } from "inngest";

/**
 * Inngest client for AI Business Passport.
 * Orchestrates all asynchronous work: OCR, doc generation, reminders, and sync jobs.
 */
export const inngest = new Inngest({
  id: "ai-business-passport",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
