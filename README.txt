# Pittahaya (Multipágina)

## Páginas principales
- index.html
- servicios.html
- planes.html
- portafolio.html
- sobre-mi.html
- contacto.html

## Demos internas (experiencias totalmente distintas)
- demo-landing.html (Sprint de conversión)
- demo-corporativa.html (Confianza ejecutiva)
- demo-marca.html (Estudio de marca)
- demo-servicios.html (Menú de servicios)
- demo-startup.html (Vitrina SaaS)
- demo-highend.html (Lujo editorial)

## Nota
Cada demo es **standalone** (con su propio CSS y tipografía), para que el cliente se sienta “sumergido” en una experiencia diferente.

## Seguridad
- Cada página incluye una política CSP y una política de referrer.
- `_headers` incluye cabeceras de seguridad para Netlify / Cloudflare Pages.
- `vercel.json` incluye las mismas cabeceras para Vercel.
- `SECURITY.md` documenta la configuración y los cuidados antes de publicar.

## Chatbot
- `assets/chatbot.css` y `assets/chatbot.js` añaden la recepcionista virtual de Pittahaya en todas las páginas.
- El chatbot funciona localmente, recomienda demos/planes y no depende de scripts externos.

## Solicitudes automaticas y CRM
- `contacto.html` envia el formulario a `/api/submit-lead`.
- `api/submit-lead.js` guarda el lead en Supabase CRM y envia notificacion a `jfmcorp@jfmcorporation.com` usando Resend.
- `api/crm.js` protege el dashboard CRM con login de Supabase y allowlist de admins.
- `api/crm-config.js` entrega al navegador solo la URL publica y anon key de Supabase para iniciar sesion.
- `crm/login.html`, `crm/index.html` y `crm/lead.html` forman el panel CRM.
- `api/contact.mjs` queda como handler anterior de email por si se necesita fallback.
- Antes de probar en produccion, ejecuta en Supabase SQL Editor el schema SQL del paquete CRM limpio para crear `leads`, `lead_notes` y `lead_tasks`.
- En Vercel agrega estas Environment Variables:
  - `RESEND_API_KEY`: API key privada de Resend.
  - `LEAD_TO_EMAIL`: `jfmcorp@jfmcorporation.com`.
  - `LEAD_FROM_EMAIL`: email verificado para enviar, por ejemplo `Pittahaya <noreply@jfmcorporation.com>`.
  - `SUPABASE_URL`: URL del proyecto Supabase del CRM.
  - `NEXT_PUBLIC_SUPABASE_URL`: la misma URL de Supabase, usada por el login del CRM.
  - `SUPABASE_ANON_KEY`: anon/public key de Supabase para login.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: la misma anon/public key de Supabase.
  - `SUPABASE_SERVICE_KEY`: service role key privada de Supabase, nunca anon/public key.
  - Si tu proyecto la llama `SUPABASE_SERVICE_ROLE_KEY`, tambien funciona como alternativa.
  - `CRM_ADMIN_EMAILS`: correos permitidos para entrar al CRM, por ejemplo `jfmcorp@jfmcorporation.com`.
