const responseHeaders = {
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff"
};

const sendJson = (res, status, body) => {
  Object.entries(responseHeaders).forEach(([key, value]) => res.setHeader(key, value));
  return res.status(status).json(body);
};

const normalizeSupabaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/(?:rest|auth)\/v1$/, "");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { ok: false, error: "Metodo no permitido." });
  }

  const origin = req.headers.origin;
  if (origin) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
    const host = req.headers.host || "";
    let allowed = false;
    try { allowed = new URL(origin).host === host || origin === siteUrl; } catch { /* malformed */ }
    if (!allowed) return sendJson(res, 403, { ok: false, error: "Acceso no permitido." });
  }

  const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return sendJson(res, 500, {
      ok: false,
      error: "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en Vercel."
    });
  }

  return sendJson(res, 200, {
    ok: true,
    supabaseUrl,
    supabaseAnonKey
  });
};
