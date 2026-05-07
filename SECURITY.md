# Security Notes

This is a static website, so the strongest protections must be delivered by the hosting provider as HTTP headers.

Implemented in the project:
- Inline JavaScript was removed so `script-src 'self'` can block injected scripts.
- Every HTML page includes a defensive Content Security Policy meta tag.
- The CSP blocks inline event handlers, frames, workers, object embeds, unexpected media, and unapproved network connections.
- La recepcionista virtual funciona localmente (`assets/chatbot.js`) y no envía mensajes de visitantes a terceros.
- La recepcionista virtual construye su interfaz con nodos DOM seguros, sin `innerHTML` dinámico.
- `_headers` is included for hosts like Netlify or Cloudflare Pages.
- `vercel.json` is included for Vercel deployments.
- Security headers restrict framing, object embeds, referrers, browser permissions, MIME sniffing, and legacy cross-domain policy files.

Before launch:
- Serve the site only over HTTPS.
- Keep `assets/pitahaya-logo.png`, `assets/styles.css`, `assets/app.js`, and `assets/demo-reveal.js` under your control.
- Keep `assets/chatbot.css` and `assets/chatbot.js` local unless you intentionally approve an external chat provider.
- Only add tracking pixels or third-party scripts after updating the Content Security Policy intentionally.
- If a host ignores `_headers` and `vercel.json`, configure the same headers in that hosting dashboard.
- Keep the current contact flow as `mailto:` unless you add a trusted backend with validation, rate limiting, and spam protection.
