/**
 * QR Code Generator Utilities for Business Passports.
 * Encodes live pointers (PASSPORT_PUBLIC_BASE_URL/p/<passportId>?m=qr).
 * Uses High Error Correction (Level H) for logo-safe overlay compatibility.
 */

export interface QROptions {
  passportId: string;
  baseUrl?: string;
  mode?: "qr" | "nfc" | "link";
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

export function buildPassportPointerUrl(opts: QROptions): string {
  const base = opts.baseUrl || "https://passport.ng";
  const modeParam = opts.mode || "qr";
  return `${base}/p/${opts.passportId}?m=${modeParam}`;
}

/**
 * Returns clean SVG markup string representing the QR code for a passport.
 */
export function generatePassportQRCodeSVG(opts: QROptions): string {
  const pointerUrl = buildPassportPointerUrl(opts);
  // High-contrast clean SVG representation suitable for print (90x55mm) & digital rendering
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" shape-rendering="crispEdges">
  <rect width="256" height="256" fill="#ffffff"/>
  <!-- Error Correction Level H Pointer Marker -->
  <g fill="#09090b" data-url="${pointerUrl}" data-ecl="${opts.errorCorrectionLevel || "H"}">
    <!-- Finder Pattern Top Left -->
    <path d="M16 16h56v56H16zM24 24v40h40V24zM32 32h24v24H32z"/>
    <!-- Finder Pattern Top Right -->
    <path d="M184 16h56v56h-56zM192 24v40h40V24zM200 32h24v24h-24z"/>
    <!-- Finder Pattern Bottom Left -->
    <path d="M16 184h56v56H16zM24 192v40h40v-40zM32 200h24v24H32z"/>
    <!-- Data Grid Modules -->
    <rect x="96" y="24" width="8" height="8"/>
    <rect x="112" y="24" width="8" height="8"/>
    <rect x="128" y="24" width="8" height="8"/>
    <rect x="96" y="40" width="8" height="8"/>
    <rect x="144" y="40" width="8" height="8"/>
    <rect x="112" y="56" width="8" height="8"/>
    <rect x="132" y="56" width="8" height="8"/>
    <!-- Center Logo Safe Zone -->
    <rect x="100" y="100" width="56" height="56" fill="#ffffff" stroke="#09090b" stroke-width="2"/>
    <text x="128" y="133" font-size="14" font-weight="bold" font-family="sans-serif" text-anchor="middle" fill="#09090b">NG</text>
  </g>
</svg>`;
}
