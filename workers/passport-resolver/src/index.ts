import { captureWorkerException, ExecutionContext, WorkerEnv } from "../../common/sentry";

export interface Env extends WorkerEnv {
  CONVEX_URL: string;
  PASSPORT_RESOLVER_SECRET: string;
}

// In-memory / edge cache storage simulation
const edgeCache = new Map<string, { data: any; cachedAt: number }>();

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/health") {
        return new Response(JSON.stringify({ status: "healthy", service: "passport-resolver" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Purge Cache Webhook: POST /purge-cache
      if (url.pathname === "/purge-cache" && request.method === "POST") {
        const body = (await request.json().catch(() => ({}))) as { passportId?: string };
        if (body.passportId) {
          edgeCache.delete(body.passportId);
        } else {
          edgeCache.clear();
        }
        return new Response(JSON.stringify({ status: "purged" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 1. Match route: /p/:id.vcf
      const vcfMatch = url.pathname.match(/^\/p\/([a-zA-Z0-9_-]+)\.vcf$/);
      if (vcfMatch) {
        const passportId = vcfMatch[1];
        const passportData = await fetchPassportData(passportId, env);

        if (!passportData || passportData.available === false) {
          return new Response("BEGIN:VCARD\r\nVERSION:3.0\r\nNOTE:Passport unavailable\r\nEND:VCARD", {
            status: 404,
            headers: { "Content-Type": "text/vcard; charset=utf-8" },
          });
        }

        const vcard = generateVCardContent(passportData);
        return new Response(vcard, {
          status: 200,
          headers: {
            "Content-Type": "text/vcard; charset=utf-8",
            "Content-Disposition": `inline; filename="${passportId}.vcf"`,
          },
        });
      }

      // 2. Match route: /passport/:id (JSON public shape)
      const jsonMatch = url.pathname.match(/^\/passport\/([a-zA-Z0-9_-]+)$/);
      if (jsonMatch) {
        const passportId = jsonMatch[1];
        const passportData = await fetchPassportData(passportId, env);

        if (!passportData || passportData.available === false) {
          return new Response(JSON.stringify({ available: false, message: "This Passport is not available" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify(passportData), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=60, s-maxage=300",
          },
        });
      }

      // 3. Match route: /p/:id (Fast 2G HTML page)
      const htmlMatch = url.pathname.match(/^\/p\/([a-zA-Z0-9_-]+)$/);
      if (htmlMatch) {
        const passportId = htmlMatch[1];
        const mode = url.searchParams.get("m") || "link";

        const passportData = await fetchPassportData(passportId, env);

        // Record scan event asynchronously
        ctx.waitUntil(logScanTelemetry(passportId, mode, request, env));

        if (!passportData || passportData.available === false) {
          return new Response(renderUnavailableHTML(passportId), {
            status: 404,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }

        const html = renderFastHTML(passportData);
        return new Response(html, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=60, s-maxage=300",
          },
        });
      }

      return new Response("Not Found", { status: 404 });
    } catch (error) {
      ctx.waitUntil(
        captureWorkerException(error, env, {
          service: "passport-resolver",
          url: request.url,
        })
      );

      // FAILS CLOSED: Never leak partial private data on error!
      return new Response(renderUnavailableHTML("error"), {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  },
};

/**
 * Edge cache lookup or fetch from Convex
 */
async function fetchPassportData(passportId: string, env: Env): Promise<any> {
  const now = Date.now();
  const cached = edgeCache.get(passportId);
  if (cached && now - cached.cachedAt < 60000) {
    return cached.data;
  }

  if (!env.CONVEX_URL) {
    // Fallback mock public shape if Convex URL is not set in test environment
    const mockPublic = {
      available: true,
      passportId,
      passportSlug: passportId.toLowerCase(),
      style: "professional",
      legalName: "Acme Logistics & Technology Ltd",
      tradingName: "AcmeExpress",
      industry: "Logistics",
      description: "Tech-enabled logistics solutions",
      state: "Lagos",
      phone: "+2348031234567",
      email: "hello@acme.ng",
      verifiedBadge: { isVerifiedDocBacked: true, badgeLabel: "Backed by uploaded document" },
    };
    edgeCache.set(passportId, { data: mockPublic, cachedAt: now });
    return mockPublic;
  }

  try {
    const res = await fetch(`${env.CONVEX_URL}/api/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.PASSPORT_RESOLVER_SECRET || "resolver_secret"}`,
      },
      body: JSON.stringify({
        path: "passports:getPublic",
        args: { passportIdentifier: passportId },
      }),
    });

    if (!res.ok) return null;
    const json = (await res.json()) as { value?: any };
    const data = json.value;
    if (data) {
      edgeCache.set(passportId, { data, cachedAt: now });
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Logs scan telemetry asynchronously
 */
async function logScanTelemetry(passportId: string, mode: string, request: Request, env: Env) {
  if (!env.CONVEX_URL) return;
  try {
    await fetch(`${env.CONVEX_URL}/api/mutation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.PASSPORT_RESOLVER_SECRET || "resolver_secret"}`,
      },
      body: JSON.stringify({
        path: "passports:recordPassportScan",
        args: {
          passportId,
          method: mode === "qr" || mode === "nfc" ? mode : "link",
          referrer: request.headers.get("referer") || undefined,
        },
      }),
    });
  } catch {
    // Silent telemetry failure
  }
}

/**
 * Fast 2G HTML Renderer (No JavaScript required)
 */
function renderFastHTML(p: any): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${p.legalName || "Business Passport"}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 16px; color: #0f172a; }
    .card { max-width: 480px; margin: 20px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .badge { display: inline-block; background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }
    h1 { font-size: 20px; margin: 12px 0 4px 0; }
    p { font-size: 13px; color: #475569; margin: 4px 0; }
    .btn { display: block; text-align: center; background: #2563eb; color: #ffffff; text-decoration: none; padding: 10px; border-radius: 6px; font-size: 13px; font-weight: bold; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">✓ ${p.verifiedBadge?.badgeLabel || "Verified"}</span>
    <h1>${p.legalName}</h1>
    ${p.tradingName ? `<p><em>Trading as ${p.tradingName}</em></p>` : ""}
    <p><strong>Industry:</strong> ${p.industry || "General Enterprise"}</p>
    <p><strong>State:</strong> ${p.state || "Nigeria"}</p>
    <p>${p.description || ""}</p>
    <a href="/p/${p.passportId}.vcf" class="btn">🎴 Add to Contacts (vCard)</a>
  </div>
</body>
</html>`;
}

/**
 * Generic Unavailable HTML (Fails closed on error or revoked passport)
 */
function renderUnavailableHTML(passportId: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Passport Unavailable</title>
  <style>
    body { font-family: sans-serif; background: #f8fafc; text-align: center; padding: 40px 16px; color: #334155; }
    .box { max-width: 400px; margin: 0 auto; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; }
  </style>
</head>
<body>
  <div class="box">
    <h2>This Business Passport is not available</h2>
    <p>The requested passport (${passportId}) is currently inactive or private.</p>
  </div>
</body>
</html>`;
}

/**
 * Generates vCard 3.0 content from public fields
 */
function generateVCardContent(p: any): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${p.tradingName || p.legalName}`,
    `ORG:${p.legalName}`,
  ];

  if (p.phone) lines.push(`TEL;TYPE=WORK,VOICE:${p.phone}`);
  if (p.email) lines.push(`EMAIL;TYPE=WORK:${p.email}`);
  if (p.industry) lines.push(`TITLE:${p.industry}`);
  if (p.passportId) lines.push(`NOTE:Verified Business Passport: ${p.passportId}`);

  lines.push("END:VCARD");
  return lines.join("\r\n");
}
