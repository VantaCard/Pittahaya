# Security Notes

This is a static website, so the strongest protections must be delivered by the hosting provider as HTTP headers.

Implemented in the project:
- Every public HTML page includes a defensive Content Security Policy meta tag.
- Vercel sends the production CSP from `vercel.json`, including the approved CRM/Supabase connections.
- The CSP blocks frames, workers, object embeds, unexpected media, and unapproved network connections.
- La recepcionista virtual funciona localmente (`assets/chatbot.js`) y no envía mensajes de visitantes a terceros.
- La recepcionista virtual construye su interfaz con nodos DOM seguros, sin `innerHTML` dinámico.
- El formulario público envía solicitudes a `/api/submit-lead`, con validación, honeypot, rate limiting básico, guardado en CRM y notificación privada.
- `_headers` is included for hosts like Netlify or Cloudflare Pages.
- `vercel.json` is included for Vercel deployments.
- Security headers restrict framing, object embeds, referrers, browser permissions, MIME sniffing, and legacy cross-domain policy files.

Before launch:
- Serve the site only over HTTPS.
- Keep `assets/pitahaya-logo.png`, `assets/styles.css`, `assets/app.js`, and `assets/demo-reveal.js` under your control.
- Keep `assets/chatbot.css` and `assets/chatbot.js` local unless you intentionally approve an external chat provider.
- Only add tracking pixels or third-party scripts after updating the Content Security Policy intentionally.
- If a host ignores `_headers` and `vercel.json`, configure the same headers in that hosting dashboard.
- Keep `SUPABASE_SERVICE_KEY`, `RESEND_API_KEY`, and CRM admin settings only in Vercel Environment Variables. Never paste service-role keys into browser HTML or public JavaScript.
