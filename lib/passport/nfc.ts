/**
 * NFC NDEF Record Utilities for Physical Business Passport Cards.
 */

export interface NFCOptions {
  passportId: string;
  baseUrl?: string;
}

export interface NDEFPayload {
  recordType: "URL";
  uri: string;
  bytes: number[];
  encodingInstructions: string[];
}

export function generateNDEFPayload(opts: NFCOptions): NDEFPayload {
  const base = opts.baseUrl || "https://passport.ng";
  const uri = `${base}/p/${opts.passportId}?m=nfc`;

  // Standard NDEF URI record encoding bytes
  const encoder = new TextEncoder();
  const uriBytes = Array.from(encoder.encode(uri));

  return {
    recordType: "URL",
    uri,
    bytes: [0xd1, 0x01, uriBytes.length + 1, 0x55, 0x04, ...uriBytes],
    encodingInstructions: [
      "1. Open NFC Writer app (e.g. NFC Tools on iOS/Android).",
      "2. Select 'Write' -> 'Add a record' -> 'URL / URI'.",
      `3. Enter destination URL: ${uri}`,
      "4. Hold physical NFC chip / card near phone top edge to write.",
      "5. Lock tag optionally to make physical card read-only.",
    ],
  };
}
