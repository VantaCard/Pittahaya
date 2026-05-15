const RESEND_ENDPOINT = "https://api.resend.com/emails";
const TO_EMAIL = process.env.LEAD_TO_EMAIL || "jfmcorp@jfmcorporation.com";
const FROM_EMAIL = process.env.LEAD_FROM_EMAIL || "Pittahaya <onboarding@resend.dev>";
const MAX_BODY_BYTES = 8000;
const MAX_TEXT_LENGTH = 1600;
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const recentRequests = new Map();

const responseHeaders = {
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff"
};

const json = (body, status = 200) => Response.json(body, { status, headers: responseHeaders });

const cleanText = (value, maxLength = 220) =>
  String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const cleanMessage = (value) =>
  String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const getClientIp = (request) => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
};

const isSameOrigin = (request) => {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
};

const isRateLimited = (ip) => {
  const now = Date.now();
  const requests = (recentRequests.get(ip) || []).filter((time) => now - time < WINDOW_MS);
  requests.push(now);
  recentRequests.set(ip, requests);
  return requests.length > MAX_REQUESTS_PER_WINDOW;
};

const getJsonBody = async (request) => {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("unsupported_content_type");
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    throw new Error("payload_too_large");
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error("invalid_json");
  }
};

const buildEmail = ({ nombre, email, negocio, plan, mensaje }) => {
  const safe = {
    nombre: escapeHtml(nombre),
    email: escapeHtml(email),
    negocio: escapeHtml(negocio),
    plan: escapeHtml(plan),
    mensaje: escapeHtml(mensaje).replace(/\n/g, "<br>")
  };

  const text = [
    "Nueva solicitud desde Pittahaya",
    "",
    `Nombre: ${nombre}`,
    `Correo: ${email}`,
    `Negocio o marca: ${negocio}`,
    `Necesidad: ${plan}`,
    "",
    "Mensaje:",
    mensaje
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#151515">
      <h2 style="margin:0 0 12px;color:#e83487">Nueva solicitud desde Pittahaya</h2>
      <p><strong>Nombre:</strong> ${safe.nombre}</p>
      <p><strong>Correo:</strong> ${safe.email}</p>
      <p><strong>Negocio o marca:</strong> ${safe.negocio}</p>
      <p><strong>Necesidad:</strong> ${safe.plan}</p>
      <p><strong>Mensaje:</strong><br>${safe.mensaje}</p>
    </div>
  `;

  return { text, html };
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: { ...responseHeaders, Allow: "POST, OPTIONS" }
      });
    }

    if (request.method !== "POST") {
      return json({ ok: false, message: "Metodo no permitido." }, 405);
    }

    if (!isSameOrigin(request)) {
      return json({ ok: false, message: "Origen no autorizado." }, 403);
    }

    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return json({ ok: false, message: "Demasiadas solicitudes. Intenta de nuevo en un minuto." }, 429);
    }

    let body;
    try {
      body = await getJsonBody(request);
    } catch {
      return json({ ok: false, message: "La solicitud no tiene un formato valido." }, 400);
    }

    if (cleanText(body.website, 120)) {
      return json({ ok: true, message: "Solicitud recibida." });
    }

    const lead = {
      nombre: cleanText(body.nombre),
      email: cleanText(body.email),
      negocio: cleanText(body.negocio),
      plan: cleanText(body.plan),
      mensaje: cleanMessage(body.mensaje)
    };

    if (!lead.nombre || !isEmail(lead.email) || !lead.negocio || !lead.plan || !lead.mensaje) {
      return json({ ok: false, message: "Completa todos los campos antes de enviar." }, 422);
    }

    if (!process.env.RESEND_API_KEY) {
      return json({ ok: false, message: "El envio automatico aun no esta configurado." }, 503);
    }

    const { text, html } = buildEmail(lead);
    const resendResponse = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
        "User-Agent": "pittahaya-contact-form/1.0"
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        reply_to: lead.email,
        subject: `Nueva solicitud web de ${lead.nombre}`,
        html,
        text
      })
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text().catch(() => "");
      console.error("Resend email failed", resendResponse.status, errorText.slice(0, 500));
      return json({ ok: false, message: "No se pudo enviar la solicitud. Intenta nuevamente." }, 502);
    }

    return json({ ok: true, message: "Solicitud enviada. Te responderemos muy pronto." });
  }
};
