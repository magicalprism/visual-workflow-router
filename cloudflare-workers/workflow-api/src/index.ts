/// <reference types="@cloudflare/workers-types" />

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENAI_API_KEY: string;
  ACCESS_PASSWORD_HASH: string;   // wrangler secret
  ACCESS_COOKIE_SECRET: string;   // wrangler secret
  // Optional comma-separated allowlist (e.g. "http://localhost:3000,https://your-app.web.app")
  ALLOWED_ORIGINS?: string;
  ACCESS_COOKIE_NAME?: string;    // default "vwf_access"
  SESSION_MAX_AGE_DAYS?: string;  // default "30"
}

type Workflow = {
  id: number;
  [k: string]: unknown;
};

/* ---------------- CORS helpers ---------------- */

function parseAllowedOrigins(env: Env): Set<string> {
  const raw = env.ALLOWED_ORIGINS || "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function pickOrigin(request: Request, env: Env): string | null {
  const reqOrigin = request.headers.get("Origin") || "";
  const allow = parseAllowedOrigins(env);
  if (allow.size === 0) {
    // default to allowing localhost in dev if not configured
    return reqOrigin === "http://localhost:3000" ? reqOrigin : null;
  }
  return allow.has(reqOrigin) ? reqOrigin : null;
}

function corsHeaders(origin: string | null) {
  // With credentials, Access-Control-Allow-Origin must be an exact origin, not "*".
  const allowOrigin = origin ?? "null";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
    "Content-Type": "application/json",
  };
}

function json(body: unknown, init: ResponseInit = {}, cors?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...(cors || {}), ...(init.headers || {}) },
  });
}

/* ---------------- Crypto + cookie helpers ---------------- */

const enc = new TextEncoder();

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromB64url(b64u: string): Uint8Array {
  return Uint8Array.from(
    atob(b64u.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function secureEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let v = 0;
  for (let i = 0; i < a.length; i++) v |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return v === 0;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return toHex(digest);
}

async function importHmac(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(dataB64: string, secret: string): Promise<string> {
  const key = await importHmac(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(dataB64));
  return b64url(sig);
}

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(/; */)) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    out[decodeURIComponent(part.slice(0, i))] = decodeURIComponent(
      part.slice(i + 1)
    );
  }
  return out;
}

/* ---------------- Auth handlers ---------------- */

async function handleAuthPass(
  request: Request,
  env: Env,
  cors: HeadersInit
): Promise<Response> {
  // Robust body parsing with clear errors
  const ct = (request.headers.get("content-type") || "").toLowerCase();
  let raw = "";
  let password = "";

  try {
    raw = await request.text();
    if (ct.includes("application/json")) {
      const obj = JSON.parse(raw) as any;
      password = String(obj?.password ?? "");
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(raw);
      password = String(params.get("password") || "");
    } else {
      // Try JSON anyway as a best-effort
      try {
        const obj = JSON.parse(raw) as any;
        password = String(obj?.password ?? "");
      } catch {
        /* ignore */
      }
    }
  } catch {
    return json({ ok: false, error: "invalid_json_read" }, { status: 400 }, cors);
  }

  if (!password) {
    return json(
      {
        ok: false,
        error: "invalid_json",
        detail: { contentType: ct, bodyPreview: raw.slice(0, 120) },
      },
      { status: 400 },
      cors
    );
  }

  if (!env.ACCESS_PASSWORD_HASH) {
    return json({ ok: false, error: "server_not_configured" }, { status: 500 }, cors);
  }

  const providedHash = await sha256Hex(password);
  if (!secureEq(providedHash, env.ACCESS_PASSWORD_HASH)) {
    return json({ ok: false, error: "invalid_password" }, { status: 401 }, cors);
  }

  // Create signed session cookie
  const now = Math.floor(Date.now() / 1000);
  const maxAge = Number(env.SESSION_MAX_AGE_DAYS || "30") * 24 * 60 * 60;
  const payload = {
    iat: now,
    exp: now + maxAge,
    n: b64url(crypto.getRandomValues(new Uint8Array(16))),
  };
  const payloadB64 = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await sign(payloadB64, env.ACCESS_COOKIE_SECRET);
  const token = `${payloadB64}.${sig}`;

  const name = env.ACCESS_COOKIE_NAME || "vwf_access";
  const cookie = [
    `${name}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    // cross-site dev (workers.dev ↔ localhost/web.app) requires None
    "SameSite=None",
    `Max-Age=${maxAge}`,
  ].join("; ");

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...(cors as Record<string, string>), "Set-Cookie": cookie },
  });
}

async function handleAuthStatus(
  request: Request,
  env: Env,
  cors: HeadersInit
): Promise<Response> {
  const name = env.ACCESS_COOKIE_NAME || "vwf_access";
  const cookies = parseCookies(request.headers.get("Cookie"));
  const token = cookies[name];
  if (!token) return json({ authed: false }, { status: 200 }, cors);

  const parts = token.split(".");
  if (parts.length !== 2) return json({ authed: false }, { status: 200 }, cors);
  const [payloadB64, sig] = parts;

  const expected = await sign(payloadB64, env.ACCESS_COOKIE_SECRET);
  if (!secureEq(sig, expected)) return json({ authed: false }, { status: 200 }, cors);

  let payload: any = {};
  try {
    payload = JSON.parse(new TextDecoder().decode(fromB64url(payloadB64)));
  } catch {
    return json({ authed: false }, { status: 200 }, cors);
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || now > Number(payload.exp)) {
    return json({ authed: false, reason: "expired" }, { status: 200 }, cors);
  }

  return json({ authed: true }, { status: 200 }, cors);
}

/* ---------------- Main fetch ---------------- */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = pickOrigin(request, env);
    const cors = corsHeaders(origin);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      // ---- Auth routes ----
      if (request.method === "POST" && url.pathname === "/auth/pass") {
        if (!origin) return json({ error: "origin_not_allowed" }, { status: 403 }, cors);
        return handleAuthPass(request, env, cors);
      }

      if (request.method === "GET" && url.pathname === "/auth/status") {
        if (!origin) return json({ authed: false }, { status: 200 }, cors);
        return handleAuthStatus(request, env, cors);
      }

      // ---- Health ----
      if (request.method === "GET" && url.pathname === "/health") {
        return json({ status: "ok" }, { status: 200 }, cors);
      }

      // ---- List workflows ----
      if (request.method === "GET" && url.pathname === "/workflows") {
        const supaRes = await fetch(
          `${env.SUPABASE_URL}/rest/v1/workflow?select=*&order=updated_at.desc`,
          {
            headers: {
              apikey: env.SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
          }
        );

        if (!supaRes.ok) {
          const detail = await supaRes.text();
          return json(
            { error: "supabase_error", status: supaRes.status, detail },
            { status: supaRes.status },
            cors
          );
        }

        const data = (await supaRes.json()) as unknown;
        const items = Array.isArray(data) ? (data as Workflow[]) : [];
        return json({ items, page: 1, total: items.length }, { status: 200 }, cors);
      }

      // ---- Get workflow by id: /workflows/:id ----
      if (request.method === "GET") {
        const m = url.pathname.match(/^\/workflows\/(\d+)$/);
        if (m) {
          const id = m[1];
          const supaRes = await fetch(
            `${env.SUPABASE_URL}/rest/v1/workflow?id=eq.${encodeURIComponent(id)}`,
            {
              headers: {
                apikey: env.SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
              },
            }
          );

          if (!supaRes.ok) {
            const detail = await supaRes.text();
            return json(
              { error: "supabase_error", status: supaRes.status, detail },
              { status: supaRes.status },
              cors
            );
          }

          const data = (await supaRes.json()) as unknown;
          const arr = Array.isArray(data) ? (data as Workflow[]) : [];
          if (arr.length === 0) {
            return json({ error: "not_found" }, { status: 404 }, cors);
          }
          return json(arr[0], { status: 200 }, cors);
        }
      }

      return json({ error: "not_found" }, { status: 404 }, cors);
    } catch (err: unknown) {
      const message =
        typeof err === "object" && err && "message" in err
          ? String((err as any).message)
          : String(err);
      return json({ error: "server_error", message }, { status: 500 }, cors);
    }
  },
};
