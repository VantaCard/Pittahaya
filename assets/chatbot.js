(() => {
  if (document.querySelector("[data-pitahaya-chat]")) return;

  // ── Routes ───────────────────────────────────────────────────
  const routes = {
    contacto:     "contacto.html",
    planes:       "planes.html",
    servicios:    "servicios.html",
    portafolio:   "portafolio.html",
    faq:          "faq.html",
    landing:      "demo-landing.html",
    corporativa:  "demo-corporativa.html",
    marca:        "demo-marca.html",
    serviciosDemo:"demo-servicios.html",
    startup:      "demo-startup.html",
    lujo:         "demo-highend.html"
  };

  // ── Utilities ────────────────────────────────────────────────
  const normalize = (v) => String(v).toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[.,;:!?¿¡()"'\[\]{}\-/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const make = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls)  el.className = cls;
    if (text) el.textContent = text;
    return el;
  };

  // ── Conversation state ───────────────────────────────────────
  const state = {
    name: null,
    industry: null,
    msgCount: 0,
    recentTopics: [],          // last 5 matched topic ids
    askedAbout:  new Set(),    // every topic id ever matched
    lastIntent:  null,         // the last matched id (or "fallback")
    pendingFollowUp: null      // a follow-up offer the bot wants to honor next turn
  };

  // Common Spanish stopwords (ignored for fuzzy matching)
  const STOPWORDS = new Set([
    "el","la","los","las","un","una","unos","unas","de","del","al","a","y","o","u","e",
    "que","como","cuando","donde","cual","cuales","quien","quienes",
    "es","son","esta","estan","estoy","esto","eso","ese","esa","esos","esas",
    "yo","tu","el","ella","nosotros","vosotros","ellos","ellas","mi","mis","tu","tus",
    "su","sus","con","sin","por","para","pero","si","no","ni","mas","menos",
    "muy","mucho","poco","tanto","todo","todos","toda","todas","algo","alguien","nada","nadie",
    "ya","aun","hay","ser","estar","tengo","tener","tenia","tienes","tiene","quiero","necesito",
    "ahora","antes","despues","tambien","solo","puede","puedo","podria","hacer","hago"
  ]);

  // Levenshtein-lite: how similar are two short tokens?
  const tokenSimilar = (a, b) => {
    if (a === b) return true;
    const la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 2) return false;
    if (la < 4 || lb < 4) return false;

    // Allow 1 edit for ≤6 chars, 2 edits for longer
    const maxEdits = Math.max(la, lb) <= 6 ? 1 : 2;

    // Dynamic programming Levenshtein
    const dp = Array.from({ length: la + 1 }, () => new Array(lb + 1).fill(0));
    for (let i = 0; i <= la; i++) dp[i][0] = i;
    for (let j = 0; j <= lb; j++) dp[0][j] = j;
    for (let i = 1; i <= la; i++) {
      for (let j = 1; j <= lb; j++) {
        dp[i][j] = a[i-1] === b[j-1]
          ? dp[i-1][j-1]
          : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
        if (dp[i][j] > maxEdits && j === i) {
          // early-out heuristic: if diagonal already exceeds budget, bail
        }
      }
    }
    return dp[la][lb] <= maxEdits;
  };

  // Returns whether `keyword` appears in `text` (exact OR fuzzy on tokens)
  const fuzzyContains = (text, keyword) => {
    if (text.includes(keyword)) return true;
    if (!/^[a-z]+$/.test(keyword) || keyword.length < 5) return false;
    return text.split(/\s+/).some(tok => tokenSimilar(tok, keyword));
  };

  // Detect if a keyword appears with negation immediately before it
  const isNegated = (text, keyword) => {
    const idx = text.indexOf(keyword);
    if (idx === -1) return false;
    const before = text.slice(Math.max(0, idx - 28), idx);
    return /\b(no|ni|nunca|tampoco|sin|ya\s+tengo|ya\s+hice|no\s+quiero|no\s+necesito)\b\s*$/.test(before);
  };

  // Extract first name from "soy X", "me llamo X", "mi nombre es X"
  const COMMON_PROFESSIONS = new Set([
    "medico","abogado","doctor","ingeniero","arquitecto","dentista","psicologo","nutricionista",
    "terapeuta","consultor","coach","fotografo","contador","emprendedor","dueño","fundador",
    "ceo","gerente","artista","disenador","diseñador","chef","barbero","estilista","entrenador"
  ]);

  const extractName = (text) => {
    const patterns = [
      /(?:^|\s)me\s+llamo\s+([a-zñáéíóú]{3,18})/i,
      /(?:^|\s)mi\s+nombre\s+es\s+([a-zñáéíóú]{3,18})/i,
      /(?:^|\s)soy\s+([a-zñáéíóú]{3,18})(?:\b)/i
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m && m[1]) {
        const candidate = m[1].toLowerCase();
        if (STOPWORDS.has(candidate)) continue;
        if (COMMON_PROFESSIONS.has(candidate)) continue;
        if (candidate.length < 3) continue;
        return candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }
    return null;
  };

  let msgCount   = 0;
  let lastTopics = [];

  // ── DOM ──────────────────────────────────────────────────────
  const root = make("section", "pitahaya-chat");
  root.setAttribute("data-pitahaya-chat", "");
  root.setAttribute("aria-label", "Asistente virtual Pittahaya");

  const launcher = make("button", "pitahaya-chat__launcher");
  launcher.type = "button";
  launcher.setAttribute("aria-label", "Abrir asistente Pittahaya");
  launcher.setAttribute("aria-expanded", "false");
  const launcherSpark = make("span", "pitahaya-chat__spark");
  launcherSpark.setAttribute("aria-hidden", "true");
  const launcherText = make("span", "", "Habla con Pittahaya");
  launcher.append(launcherSpark, launcherText);

  const panel = make("div", "pitahaya-chat__panel");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Asistente virtual Pittahaya");

  const header = make("div", "pitahaya-chat__header");
  const identity = make("div", "pitahaya-chat__identity");
  const avatar = make("img", "pitahaya-chat__avatar");
  avatar.src = "assets/pitahaya-logo.png";
  avatar.alt = "Pittahaya";
  const identityText = make("div", "");
  const titleEl  = make("span", "pitahaya-chat__title", "Asistente Pittahaya");
  const statusEl = make("span", "pitahaya-chat__status", "En línea · responde al instante");
  const closeBtn = make("button", "pitahaya-chat__close", "×");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Cerrar chat");
  identityText.append(titleEl, statusEl);
  identity.append(avatar, identityText);
  header.append(identity, closeBtn);

  const messages = make("div", "pitahaya-chat__messages");
  messages.setAttribute("role", "log");
  messages.setAttribute("aria-live", "polite");

  const quick = make("div", "pitahaya-chat__quick");

  const form = make("form", "pitahaya-chat__composer");
  const input = make("input", "pitahaya-chat__input");
  input.type = "text";
  input.placeholder = "Escribe tu pregunta aquí...";
  input.setAttribute("aria-label", "Escribe tu mensaje");
  input.autocomplete = "off";
  const send = make("button", "pitahaya-chat__send", "Enviar");
  send.type = "submit";
  form.append(input, send);

  const privacy = make("div", "pitahaya-chat__privacy",
    "Asistente local: tus mensajes no se envían a servidores externos.");

  panel.append(header, messages, quick, form, privacy);
  root.append(launcher, panel);
  document.body.append(root);

  // ── Quick prompts ────────────────────────────────────────────
  const renderQuickPrompts = (prompts) => {
    quick.innerHTML = "";
    prompts.forEach(p => {
      const btn = make("button", "", p);
      btn.type = "button";
      btn.addEventListener("click", () => handleUserMessage(p));
      quick.append(btn);
    });
  };

  const initialPrompts = [
    "¿Cuánto cuesta?",
    "¿Cuánto tiempo toma?",
    "Ver demos",
    "¿Por qué Pittahaya?"
  ];
  renderQuickPrompts(initialPrompts);

  // ── Actions helpers ──────────────────────────────────────────
  const act = {
    quote:    [{ label: "Comparar planes", href: routes.planes }, { label: "Solicitar diagnóstico", href: routes.contacto }],
    contact:  [{ label: "Ir a Contacto", href: routes.contacto }, { label: "Ver planes", href: routes.planes }],
    services: [{ label: "Ver servicios", href: routes.servicios }, { label: "Cotizar ahora", href: routes.contacto }],
    demos:    [{ label: "Ver todos los demos", href: routes.portafolio }, { label: "Hablar con asistente", prompt: "¿Qué demo necesito según mi negocio?" }],
    start:    [{ label: "Ver demos", href: routes.portafolio }, { label: "Ver planes", href: routes.planes }, { label: "Contacto", href: routes.contacto }],
    faq:      [{ label: "Ver preguntas frecuentes", href: routes.faq }, { label: "Contacto directo", href: routes.contacto }]
  };

  const demosActs = [
    { label: "Landing",       href: routes.landing },
    { label: "Corporativa",   href: routes.corporativa },
    { label: "Marca",         href: routes.marca },
    { label: "Servicios",     href: routes.serviciosDemo },
    { label: "Startup",       href: routes.startup },
    { label: "Lujo",          href: routes.lujo }
  ];

  // ── Answer bank ──────────────────────────────────────────────
  // Each entry: { id, phrases[], keywords[], text, actions[], followUp? }
  // phrases (multi-word): score = words × 4
  // keywords (single word): score = 1 (2 if len > 7)
  const bank = [

    // ── Greeting ───────────────────────────
    {
      id: "greeting",
      phrases: ["buen dia", "buena tarde", "buena noche", "como estan", "hay alguien"],
      keywords: ["hola", "buenas", "hello", "hey", "hi", "saludos", "atencion", "asesor", "ayuda", "disponible", "alguien", "recepcion"],
      text: "¡Hola! Bienvenido a Pittahaya. Estoy aquí para ayudarte con cualquier pregunta sobre tu web: precios, demos, tiempos, proceso o lo que necesites saber para dar el primer paso. ¿Por dónde empezamos?",
      actions: act.start
    },

    // ── Why Pittahaya / differentiator ─────
    {
      id: "why",
      phrases: ["por que pittahaya", "que diferencia", "que los hace diferentes", "por que elegirlos", "vale la pena", "en que se diferencian", "mejor opcion", "que ventaja", "que ofrecen de diferente"],
      keywords: ["diferenci", "ventaja", "mejor", "especial", "unico", "elegiria", "convence", "confiar"],
      text: "Pittahaya no rellena una plantilla con tu nombre: diseña desde cero pensando en tu oferta, tu cliente ideal y la percepción que quieres provocar. El resultado es una web que se siente hecha para ti, no genérica. Además, el proceso es claro, personal y orientado a resultados: la meta no es 'tener una web', sino tener una herramienta que trabaje las 24 horas.",
      actions: [{ label: "Ver demos reales", href: routes.portafolio }, { label: "Solicitar diagnóstico", href: routes.contacto }]
    },

    // ── Pricing / plans ────────────────────
    {
      id: "pricing",
      phrases: ["cuanto cuesta", "cual es el precio", "cuanto vale", "que precio tiene", "cuanto cobran", "tienen precios", "precio de una web", "precio de la web", "cuanto es", "cuanto me costaria", "precio aproximado"],
      keywords: ["precio", "precios", "plan", "planes", "costo", "costos", "cuanto", "cotiz", "presupuesto", "valor", "cobran", "tarifa", "tarifas"],
      text: "Los planes están pensados para distintas necesidades: Plan Básico para una presencia profesional inicial, Plan Negocio para vender con claridad (el más elegido), y Plan Premium para una experiencia de alta gama con mayor nivel de personalización. El precio exacto depende del alcance, número de páginas y nivel de detalle. La forma más directa de saberlo es en el diagnóstico gratis: sin compromiso, recibes una propuesta clara.",
      actions: act.quote
    },

    // ── Installments / payment ─────────────
    {
      id: "payment",
      phrases: ["pagar en cuotas", "pago en partes", "formas de pago", "metodos de pago", "pago anticipado", "mitad y mitad", "transferencia", "tarjeta de credito"],
      keywords: ["cuotas", "pago", "pagos", "anticipo", "deposito", "efectivo", "transferencia", "tarjeta", "financiamiento"],
      text: "Las condiciones de pago se definen con cada proyecto según el alcance. Generalmente se trabaja con un anticipo al confirmar el inicio y el saldo al entregar. Los detalles exactos se acuerdan durante el diagnóstico para que todo quede claro desde el primer día.",
      actions: act.contact
    },

    // ── ROI / is it worth it ────────────────
    {
      id: "roi",
      phrases: ["vale la pena invertir", "retorno de inversion", "me va a generar clientes", "cuanto voy a ganar", "como saber si vale", "es rentable tener una web", "beneficio de tener web"],
      keywords: ["rentable", "retorno", "inversion", "roi", "beneficio", "ganancias", "clientes nuevos", "resultados"],
      text: "Una web premium no es un gasto: es una herramienta de ventas activa 24/7. El retorno depende de tu oferta y mercado, pero en general: una web que genera confianza desde el primer segundo convierte más visitas en conversaciones, reduce el tiempo de decisión del cliente y sube la percepción de valor de tu precio. El primer paso es que no te cueste más un mal sitio que uno bueno.",
      actions: [{ label: "Ver cómo funciona", href: routes.servicios }, { label: "Solicitar diagnóstico", href: routes.contacto }]
    },

    // ── Timeline / delivery ────────────────
    {
      id: "timeline",
      phrases: ["cuanto tiempo toma", "cuanto demora", "en cuanto tiempo", "dias tarda", "semanas tarda", "fecha de entrega", "cuando estaria lista", "es rapido el proceso"],
      keywords: ["tiempo", "demora", "entrega", "dias", "semanas", "cuando", "rapido", "fecha", "deadline", "urgente", "pronto", "plazo"],
      text: "Depende del alcance y la velocidad de revisiones. Una landing de alto impacto puede estar lista en pocos días; una web completa con múltiples páginas puede tomar uno a dos semanas. Lo importante es definir los tiempos reales desde el inicio para que no haya sorpresas. En el diagnóstico se acuerda el plazo concreto.",
      actions: act.contact
    },

    // ── Process / how it works ─────────────
    {
      id: "process",
      phrases: ["como funciona el proceso", "como trabajan", "cuales son los pasos", "como es el flujo", "que incluye el proceso", "como empezamos"],
      keywords: ["proceso", "pasos", "metodo", "revision", "revisiones", "cambios", "brief", "diagnostico", "flujo", "etapas"],
      text: "El proceso tiene 4 etapas: 1) Diagnóstico: definimos objetivo, cliente ideal, oferta y tono visual. 2) Diseño: construyo la propuesta visual completa alineada con tu negocio. 3) Revisión: ajustamos textos, secciones y detalles hasta que todo se sienta correcto. 4) Publicación: la web queda lista para compartir y vender. Todo por escrito y sin improvisar.",
      actions: act.services
    },

    // ── Number of revisions ────────────────
    {
      id: "revisions",
      phrases: ["cuantas revisiones", "puedo pedir cambios", "que pasa si no me gusta", "que pasa si quiero cambiar algo"],
      keywords: ["revisiones", "cambios", "ajustes", "iteraciones", "rondas", "modificaciones"],
      text: "El proceso incluye rondas de revisión para ajustar textos, estructura y detalles visuales hasta que el resultado represente tu marca con precisión. La meta es que la entrega se sienta convincente. Si algo no convence, se trabaja hasta llegar a eso: no se abandona a mitad del proceso.",
      actions: act.contact
    },

    // ── Guarantee ──────────────────────────
    {
      id: "guarantee",
      phrases: ["hay garantia", "que pasa si no me convence", "garantia de satisfaccion", "y si no me gusta el resultado", "devolucion de dinero", "reembolso"],
      keywords: ["garantia", "garantizan", "reembolso", "devolucion", "satisfaccion", "resultado final"],
      text: "El proceso está diseñado para que el resultado final sea lo que acordamos: hay diagnóstico, revisiones y ajustes antes de la entrega definitiva. Trabajamos juntos hasta llegar a una web que te convenza, no se entrega algo a medias. Los detalles de la política de revisiones se definen al inicio del proyecto.",
      actions: act.contact
    },

    // ── Communication / collaboration ──────
    {
      id: "communication",
      phrases: ["como nos comunicamos", "por donde me contactan", "hay reunion", "videollamada", "por whatsapp", "correo electronico"],
      keywords: ["comunicacion", "contacto", "reunion", "videollamada", "chat", "mensaje", "respuesta", "horario", "atencion"],
      text: "La comunicación es totalmente remota: WhatsApp para actualizaciones rápidas, correo para envío de archivos y feedback estructurado, y videollamada cuando hay que revisar algo juntos. El diagnóstico inicial puede hacerse por WhatsApp o formulario. La respuesta suele ser rápida.",
      actions: [{ label: "Escribir por WhatsApp", href: routes.contacto }, { label: "Formulario de contacto", href: routes.contacto }]
    },

    // ── What the client needs to provide ───
    {
      id: "content",
      phrases: ["que necesito tener listo", "que me piden para empezar", "necesito textos previos", "necesito fotos propias", "que debo preparar"],
      keywords: ["textos", "copy", "contenido", "fotos", "imagenes", "videos", "redaccion", "mensaje", "copywriting", "proveer", "preparar"],
      text: "No es obligatorio tener todo listo. Si no tienes textos, se puede orientarte a construir el mensaje: propuesta de valor, beneficios y llamadas a la acción. Las imágenes pueden combinarse con librerías licenciadas de alta calidad. Lo más importante al inicio es tener claro qué vendes y para quién es.",
      actions: act.contact
    },

    // ── Can I edit after delivery ───────────
    {
      id: "editable",
      phrases: ["puedo editar despues", "puedo modificar yo", "me van a enseñar", "como hago cambios", "yo mismo puedo actualizar"],
      keywords: ["editar", "modificar", "actualizar", "cambiar texto", "yo solo", "autonomia", "independiente", "cms", "wordpress"],
      text: "Sí, puedes editar el contenido básico. La entrega incluye instrucciones claras para hacer cambios simples. Si necesitas actualizaciones más frecuentes o complejas, se puede definir un plan de mantenimiento desde el inicio para que no dependas de nadie para lo esencial.",
      actions: act.contact
    },

    // ── Post-launch / maintenance ───────────
    {
      id: "maintenance",
      phrases: ["mantenimiento de la web", "que pasa despues de publicar", "soporte post entrega", "seguimiento despues", "actualizaciones periodicas"],
      keywords: ["mantenimiento", "soporte", "actualizacion", "actualizaciones", "despues", "post", "publicacion", "seguimiento"],
      text: "Después de la publicación se puede definir un plan de soporte para cambios, actualizaciones de contenido o ajustes de rendimiento. Lo aclaramos desde el diagnóstico para que sepas exactamente qué cubre el proyecto y qué es adicional.",
      actions: act.contact
    },

    // ── Domain / hosting / email ────────────
    {
      id: "hosting",
      phrases: ["incluye dominio", "incluye hosting", "como funciona el hosting", "donde se publica", "email corporativo", "correo empresarial"],
      keywords: ["dominio", "hosting", "host", "publicar", "subir", "deploy", "correo", "email", "servidor", "nube", "vercel"],
      text: "Depende del plan. En la mayoría de casos puedo acompañarte en la configuración del dominio y hosting, o conectar la web a lo que ya tengas. El correo corporativo se puede configurar por separado. Todo queda acordado desde el diagnóstico para que no haya costos sorpresa.",
      actions: act.contact
    },

    // ── Analytics / tracking ────────────────
    {
      id: "analytics",
      phrases: ["analytics incluido", "puedo ver visitas", "estadisticas de la web", "google analytics", "como medir resultados"],
      keywords: ["analytics", "estadisticas", "metricas", "visitas", "trafico", "datos", "seguimiento", "tracking", "pixel"],
      text: "Se puede integrar Google Analytics u otras herramientas de medición para que puedas ver visitas, comportamiento y conversiones. Esto se define durante el proceso según tus necesidades. Medir es clave para saber si la web está cumpliendo su objetivo.",
      actions: act.contact
    },

    // ── SEO ────────────────────────────────
    {
      id: "seo",
      phrases: ["seo incluido", "aparece en google", "como me posiciono", "palabras clave", "ranking en google"],
      keywords: ["seo", "google", "busqueda", "buscador", "posicionar", "ranking", "meta", "indexar", "buscar"],
      text: "Toda web incluye SEO base: estructura semántica correcta, títulos, meta descripciones, jerarquía de contenido y rendimiento cuidado. Para SEO avanzado con estrategia de palabras clave, contenido y posicionamiento competitivo, se puede definir como un servicio adicional.",
      actions: act.services
    },

    // ── Mobile responsive ──────────────────
    {
      id: "mobile",
      phrases: ["se ve bien en celular", "version movil", "funciona en telefono", "diseño para celular"],
      keywords: ["celular", "movil", "mobile", "responsive", "tablet", "telefono", "adaptable", "pantalla"],
      text: "Sí, la web es completamente responsive: se ve y funciona bien en celular, tablet y escritorio. Esto es crítico hoy porque la mayoría de decisiones de compra se hacen desde el teléfono. El diseño mobile-first no es opcional, es la base.",
      actions: act.services
    },

    // ── Speed / performance ────────────────
    {
      id: "speed",
      phrases: ["carga rapido", "web lenta", "velocidad de carga", "como optimizan"],
      keywords: ["velocidad", "rapida", "rapido", "performance", "carga", "pesada", "optimizar", "lento", "ligera"],
      text: "La velocidad es parte de la experiencia premium. Se cuidan las imágenes, el código limpio, los scripts locales y la estructura del hosting para que la página cargue sin sentirse pesada. Una web lenta aleja clientes antes de que lean una sola palabra.",
      actions: act.services
    },

    // ── WhatsApp integration ────────────────
    {
      id: "whatsapp-integration",
      phrases: ["boton de whatsapp", "integrar whatsapp", "chat de whatsapp", "link a whatsapp", "whatsapp en la web"],
      keywords: ["whatsapp", "wa", "chat", "botón whatsapp", "integración whatsapp"],
      text: "Sí, se integra WhatsApp en la web para que los visitantes puedan contactarte con un clic: botón flotante, links directos con mensaje predefinido o sección de contacto con WhatsApp como primera opción. Es uno de los CTA con mejor conversión en mercados latinoamericanos.",
      actions: act.contact
    },

    // ── Security ───────────────────────────
    {
      id: "security",
      phrases: ["es segura la web", "seguridad del sitio", "proteccion de datos"],
      keywords: ["seguridad", "seguro", "privacidad", "csp", "cookies", "datos", "protegida", "https", "ssl", "certificado"],
      text: "La web se construye con seguridad desde la base: HTTPS, cabeceras de seguridad (CSP, XFO, HSTS), política de referrer y scripts locales que no envían datos a terceros. El formulario de contacto tiene protección antispam y los datos del cliente se tratan con responsabilidad.",
      actions: [{ label: "Ver servicios", href: routes.servicios }, { label: "Contactar", href: routes.contacto }]
    },

    // ── E-commerce / store / booking ────────
    {
      id: "ecommerce",
      phrases: ["necesito tienda online", "quiero vender productos", "carrito de compra", "sistema de reservas", "agenda online", "citas en linea"],
      keywords: ["tienda", "ecommerce", "carrito", "productos", "reservas", "citas", "agenda", "booking", "catalogo", "pago online"],
      text: "Sí, se puede construir catálogo, tienda, sistema de reservas o agenda online. La arquitectura cambia según si necesitas pagos en línea, inventario o gestión de citas. Para cotizarlo bien conviene saber el número de productos, métodos de pago deseados y el flujo de compra. Compártelo en el diagnóstico.",
      actions: act.contact
    },

    // ── Multi-language ─────────────────────
    {
      id: "multilanguage",
      phrases: ["en ingles y espanol", "sitio bilingue", "dos idiomas", "version en ingles"],
      keywords: ["idioma", "ingles", "bilingue", "multilanguage", "traduccion", "traducir"],
      text: "Sí, se puede hacer una web en inglés, en español o en ambos idiomas. Para versiones bilingües se define la estructura desde el diseño para que el cambio de idioma sea fluido. Indícalo en el diagnóstico para incluirlo en el alcance.",
      actions: act.contact
    },

    // ── Geography ──────────────────────────
    {
      id: "geography",
      phrases: ["trabajan fuera de ecuador", "solo en quito", "estan en guayaquil", "pueden atender a mexico", "latinoamerica"],
      keywords: ["ecuador", "quito", "guayaquil", "cuenca", "internacional", "latinoamerica", "mexico", "colombia", "peru", "chile", "españa"],
      text: "Pittahaya tiene raíz ecuatoriana pero trabaja con clientes en toda Latinoamérica. El proceso es 100% remoto: diagnóstico, diseño, revisiones y entrega se hacen por medios digitales sin importar tu ubicación.",
      actions: act.contact
    },

    // ── Demo selection / portfolio ──────────
    {
      id: "demos",
      phrases: ["que demo necesito", "que demo me recomiendas", "cual demo es mejor para mi", "ver ejemplos", "ver portafolio", "ver trabajos", "tienen ejemplos"],
      keywords: ["demo", "demos", "portafolio", "ejemplo", "ejemplos", "muestra", "trabajos", "recomienda", "ver"],
      text: "Tenemos 6 demos según el tipo de negocio: Landing para captar leads o vender rápido, Corporativa para confianza y autoridad B2B, Marca & Diseño para identidad memorable, Servicios para explicar tu oferta paso a paso, Startup para producto digital o SaaS, y Lujo para alta gama exclusiva. ¿Cuál describe mejor tu negocio?",
      actions: demosActs
    },

    // ── Landing page / conversion ───────────
    {
      id: "landing",
      phrases: ["pagina de ventas", "landing page", "pagina para vender", "captar clientes", "quiero mas leads"],
      keywords: ["venta", "ventas", "landing", "campana", "lead", "leads", "conversion", "convertir", "anuncios", "publicidad", "clientes"],
      text: "Para captar leads o vender con una oferta concreta, lo ideal es una Landing de alto impacto: mensaje directo, sección de beneficios, prueba social, dudas resueltas y CTA fuerte hacia WhatsApp o formulario. Sin distracciones, todo el tráfico va hacia una sola acción.",
      actions: [{ label: "Ver demo Landing", href: routes.landing }, { label: "Crear mi landing", href: routes.contacto }]
    },

    // ── Corporate web ──────────────────────
    {
      id: "corporate",
      phrases: ["pagina empresarial", "web corporativa", "necesito una web para mi empresa", "web profesional para empresa", "para negocio establecido"],
      keywords: ["empresa", "corporativa", "corporativo", "confianza", "b2b", "seria", "autoridad", "institucional", "negocio", "establecido"],
      text: "Para una empresa que necesita verse sólida y confiable, la Web Corporativa muestra estructura clara, autoridad, servicios, equipo, prueba de confianza y una ruta directa para cotizar. Ideal para negocios que venden a otras empresas o a clientes de decisión pausada.",
      actions: [{ label: "Ver demo Corporativa", href: routes.corporativa }, { label: "Cotizar corporativa", href: routes.contacto }]
    },

    // ── Brand / identity ───────────────────
    {
      id: "brand",
      phrases: ["identidad de marca", "diseño de marca", "quiero una marca memorable", "web con identidad propia", "diseño original"],
      keywords: ["marca", "branding", "identidad", "diseño", "logo", "visual", "colores", "estilo", "memorable", "personalidad"],
      text: "Si quieres que la marca se recuerde, la ruta es Marca & Diseño: identidad visual propia, tono premium, secciones con personalidad y una experiencia que se siente diferente al primer scroll. No es una plantilla, es una dirección visual pensada para tu negocio.",
      actions: [{ label: "Ver demo Marca", href: routes.marca }, { label: "Crear mi identidad", href: routes.contacto }]
    },

    // ── Services web ───────────────────────
    {
      id: "services-web",
      phrases: ["web para mis servicios", "quiero mostrar mis servicios", "explicar lo que ofrezco", "web para consultor", "web para profesional"],
      keywords: ["servicio", "servicios", "paquete", "paquetes", "consultoria", "explicar", "oferta", "beneficios", "propuesta", "profesional"],
      text: "Si vendes servicios, la web debe ordenar tu oferta: qué haces exactamente, para quién es ideal, qué beneficios concretos tiene, cómo es el proceso y cuál es el siguiente paso. Eso reduce objeciones antes de hablar de precio y prepara al cliente para decir que sí más rápido.",
      actions: [{ label: "Ver demo Servicios", href: routes.serviciosDemo }, { label: "Ordenar mi oferta", href: routes.contacto }]
    },

    // ── Startup / SaaS / app ───────────────
    {
      id: "startup",
      phrases: ["tengo una app", "tengo un saas", "producto digital", "lista de espera", "waitlist", "web para startup"],
      keywords: ["startup", "saas", "app", "software", "tech", "producto", "aplicacion", "plataforma", "waitlist", "tecnologia"],
      text: "Para una app, SaaS o startup, la web debe explicar rápido el problema, el producto, los beneficios clave, métricas de confianza y CTA para demo o lista de espera. El demo Startup muestra exactamente esa estructura.",
      actions: [{ label: "Ver demo Startup", href: routes.startup }, { label: "Diseñar mi producto web", href: routes.contacto }]
    },

    // ── Luxury / high-end ─────────────────
    {
      id: "luxury",
      phrases: ["alta gama", "web de lujo", "experiencia exclusiva", "para clientes premium", "publico de alto poder adquisitivo"],
      keywords: ["lujo", "premium", "boutique", "exclusivo", "exclusiva", "elegante", "lujoso", "sofisticado", "highend", "high-end"],
      text: "Para alta gama, la web debe sentirse cara sin gritar: menos elementos, más intención, fotografía fuerte, ritmo editorial lento y CTA elegante. El demo High-End es la mejor referencia para ese nivel de experiencia.",
      actions: [{ label: "Ver demo High-End", href: routes.lujo }, { label: "Crear web de lujo", href: routes.contacto }]
    },

    // ── Specific industry: health ───────────
    {
      id: "industry-health",
      phrases: ["tengo una clinica", "soy medico", "tengo consultorio", "soy psicologo", "soy nutricionista", "soy dentista", "soy terapeuta"],
      keywords: ["clinica", "medico", "consultorio", "psicologo", "nutricionista", "dentista", "terapeuta", "salud", "doctor", "odontologia"],
      text: "Para salud y bienestar lo más importante es generar confianza inmediata: credenciales claras, foto profesional, especialidades, proceso de atención y un botón para agendar cita. El cliente decide con quién confiar su salud en los primeros 7 segundos de ver la web.",
      actions: [{ label: "Ver demo Servicios", href: routes.serviciosDemo }, { label: "Cotizar para mi clínica", href: routes.contacto }]
    },

    // ── Specific industry: food/restaurant ──
    {
      id: "industry-food",
      phrases: ["tengo un restaurante", "tengo una cafeteria", "tengo un bar", "negocio de comida"],
      keywords: ["restaurante", "cafeteria", "bar", "comida", "menu", "gastronomia", "delivery", "chef"],
      text: "Para restaurante o cafetería la web debe mostrar el concepto, el menú con fotos apetitosas, la ubicación, el horario y un link directo para reservas o pedidos. La fotografía lo es todo: la comida entra por los ojos antes de entrar al local.",
      actions: [{ label: "Ver demo Marca", href: routes.marca }, { label: "Cotizar mi restaurante", href: routes.contacto }]
    },

    // ── Specific industry: legal/coach ──────
    {
      id: "industry-professional",
      phrases: ["soy abogado", "soy coach", "soy consultor", "soy arquitecto", "soy contador", "soy fotógrafo", "servicios profesionales"],
      keywords: ["abogado", "coach", "consultor", "arquitecto", "contador", "fotografo", "fotografía", "coach"],
      text: "Para profesionales independientes la web es la primera impresión antes de una llamada o reunión. Debe mostrar quién eres, en qué te especializas, tu propuesta de valor única y prueba social (casos, resultados, testimonios). Eso convierte visitas en consultas agendadas.",
      actions: [{ label: "Ver demo Corporativa", href: routes.corporativa }, { label: "Hablar de mi proyecto", href: routes.contacto }]
    },

    // ── Objection: too expensive ───────────
    {
      id: "objection-price",
      phrases: ["es muy caro", "no tengo presupuesto", "no puedo pagar tanto", "es costoso", "fuera de mi presupuesto", "tengo poco dinero"],
      keywords: ["caro", "costoso", "barato", "economico", "accesible", "presupuesto bajo", "no puedo", "falta dinero"],
      text: "Es válido. El Plan Básico existe justamente para quien quiere empezar con autoridad sin un presupuesto grande. Lo más caro suele ser seguir sin una presencia que genere confianza: perder clientes que se van a la competencia por no verte serio. ¿Quieres que te mostremos el plan de menor inversión?",
      actions: [{ label: "Ver Plan Básico", href: routes.planes }, { label: "Solicitar diagnóstico", href: routes.contacto }]
    },

    // ── Objection: do it myself ────────────
    {
      id: "objection-diy",
      phrases: ["lo puedo hacer yo mismo", "voy a hacerlo yo", "aprender a hacer mi web", "puedo aprender wordpress", "lo hago solo"],
      keywords: ["yo mismo", "yo solo", "hacerlo yo", "aprendo", "autoaprendizaje"],
      text: "Claro que puedes. La pregunta es: mientras aprendes y construyes, ¿qué costo tiene el tiempo que no estás dedicando a tu negocio? Y cuando termines, ¿la web transmitirá la confianza que necesitas para cobrar lo que vale tu trabajo? Una web premium no es solo código: es estrategia, copy y dirección visual combinados.",
      actions: [{ label: "Ver demos para comparar", href: routes.portafolio }, { label: "Solicitar diagnóstico gratis", href: routes.contacto }]
    },

    // ── Objection: already have a web ──────
    {
      id: "objection-existing",
      phrases: ["ya tengo web", "ya tengo una pagina", "quiero mejorar mi web actual", "tengo web pero no funciona", "mi web esta desactualizada"],
      keywords: ["rediseño", "mejorar", "actualizar", "renovar", "antigua", "desactualizada", "ya tengo"],
      text: "Perfecto punto de partida. Si tu web existe pero no genera confianza, no convierte o simplemente no refleja el nivel de tu negocio, un rediseño puede ser la inversión más directa que hagas este año. El diagnóstico gratis sirve exactamente para eso: analizar qué falla y qué se puede mejorar.",
      actions: [{ label: "Solicitar diagnóstico de mi web", href: routes.contacto }, { label: "Ver servicio de rediseño", href: routes.servicios }]
    },

    // ── vs Wix / WordPress / builders ──────
    {
      id: "vs-builders",
      phrases: ["por que no usar wix", "vs wordpress", "wix vs pittahaya", "squarespace vs pittahaya", "no es lo mismo que wix", "que diferencia con wordpress"],
      keywords: ["wix", "wordpress", "squarespace", "webflow", "shopify", "plantilla", "constructor", "builder"],
      text: "Wix, WordPress y similares dan herramientas para que tú construyas. Pittahaya diseña la estrategia visual, el copy de conversión, la experiencia de usuario y la arquitectura desde cero para tu negocio específico. La diferencia se nota: una plantilla rellenada versus una web pensada para vender tu oferta en particular.",
      actions: [{ label: "Ver demos propios", href: routes.portafolio }, { label: "Solicitar diagnóstico", href: routes.contacto }]
    },

    // ── First step / how to start ───────────
    {
      id: "first-step",
      phrases: ["por donde empiezo", "como empezar", "cual es el primer paso", "quiero empezar", "quiero contratar", "quiero una cotizacion"],
      keywords: ["empezar", "comenzar", "inicio", "primer paso", "contratar", "cotizar", "avanzar", "siguiente paso"],
      text: "El primer paso es el diagnóstico gratis: un formulario corto donde describes tu negocio, tu cliente ideal y qué tipo de web necesitas. Con esa información preparo una recomendación clara y una propuesta ajustada a tu caso, sin compromiso.",
      actions: [{ label: "Ir al diagnóstico gratis", href: routes.contacto }, { label: "Ver planes antes", href: routes.planes }]
    },

    // ── Social proof / references ───────────
    {
      id: "testimonials",
      phrases: ["tienen referencias", "clientes satisfechos", "caso de exito", "quiero ver resultados", "pueden mostrar clientes"],
      keywords: ["referencia", "referencias", "testimonio", "testimonios", "caso", "exito", "resultado", "cliente real", "opinion"],
      text: "En el portafolio puedes ver los demos con distintos estilos y niveles de acabado. Clientes reales han reportado mayor confianza transmitida, más consultas recibidas y precios percibidos como más altos después del rediseño. En el diagnóstico puedo compartir casos más específicos según tu industria.",
      actions: [{ label: "Ver portafolio", href: routes.portafolio }, { label: "Hablar del proyecto", href: routes.contacto }]
    },

    // ── Technical skill required ────────────
    {
      id: "technical",
      phrases: ["no se de tecnologia", "no soy tecnico", "soy principiante", "no entiendo de webs"],
      keywords: ["tecnico", "tecnologia", "programar", "codigo", "html", "css", "principiante", "novato", "no entiendo"],
      text: "No necesitas saber nada técnico. El proceso está diseñado para que tú te concentres en tu negocio mientras nosotros manejamos todo lo técnico: diseño, código, hosting, dominio y publicación. La entrega es una web lista para usar, no un archivo que tienes que subir tú.",
      actions: act.contact
    },

    // ── FAQ page ───────────────────────────
    {
      id: "faq-link",
      phrases: ["mas preguntas frecuentes", "donde veo las preguntas", "tienen faq", "pagina de preguntas"],
      keywords: ["faq", "frecuentes", "dudas", "preguntas comunes"],
      text: "Tenemos una página de Preguntas Frecuentes con respuestas sobre precios, tiempos, textos, hosting y más. ¿Quieres verla?",
      actions: act.faq
    },

    // ── Contact / human ────────────────────
    {
      id: "contact",
      phrases: ["quiero hablar con una persona", "quiero hablar con alguien", "quiero que me llamen", "necesito hablar con ustedes"],
      keywords: ["humano", "persona", "llamar", "reunion", "whatsapp", "contacto", "hablar", "correo"],
      text: "Para hablar directamente, lo más rápido es WhatsApp o el formulario de contacto. Puedes describir tu proyecto, qué vendes y qué estilo quieres lograr. La respuesta es rápida y sin formalidades innecesarias.",
      actions: act.contact
    },

    // ── Farewell / thanks ──────────────────
    {
      id: "farewell",
      phrases: ["muchas gracias", "hasta luego", "que tengas buen dia", "con eso es todo", "era todo lo que queria saber"],
      keywords: ["gracias", "perfecto", "listo", "genial", "super", "excelente", "entendi", "entendido", "ok", "claro"],
      text: "Con gusto. Si decides avanzar, el diagnóstico gratis es el primer paso: describes tu proyecto y recibes una propuesta clara, sin compromiso. Cuando quieras estamos aquí.",
      actions: [{ label: "Solicitar diagnóstico", href: routes.contacto }, { label: "Ver demos", href: routes.portafolio }]
    },

    // ── Compliment ─────────────────────────
    {
      id: "compliment",
      phrases: ["me gusta su web", "me gusta pittahaya", "su web es muy bonita", "quiero algo asi"],
      keywords: ["bonito", "bonita", "precioso", "hermoso", "me gusta", "quiero algo asi", "impresionante"],
      text: "¡Gracias! Eso mismo es lo que hacemos para tu negocio: una web que provoca exactamente esa reacción en tus clientes. ¿Quieres que hablemos de cómo trasladar esa experiencia a tu marca?",
      actions: [{ label: "Solicitar diagnóstico gratis", href: routes.contacto }, { label: "Ver demos", href: routes.portafolio }]
    }

  ];

  // ── Scoring ──────────────────────────────────────────────────
  const scoreEntry = (entry, text) => {
    let score = 0;
    let hit   = false;

    // Phrase matches score high (token count × 4)
    (entry.phrases || []).forEach(phrase => {
      const norm = normalize(phrase);
      if (text.includes(norm)) {
        score += norm.split(/\s+/).length * 4;
        hit = true;
      }
    });

    // Keyword matches: exact (worth more) or fuzzy (worth less)
    (entry.keywords || []).forEach(kw => {
      const k = normalize(kw);
      if (text.includes(k)) {
        if (isNegated(text, k)) { score -= 2; return; }
        score += k.length > 7 ? 2 : 1;
        hit = true;
      } else if (fuzzyContains(text, k)) {
        score += 1.2;   // typo-tolerant partial credit
        hit = true;
      }
    });

    // Compound bonus: when ≥2 distinct keywords match, the topic is very likely the intent
    let distinctMatches = 0;
    (entry.keywords || []).forEach(kw => {
      if (text.includes(normalize(kw))) distinctMatches++;
    });
    if (distinctMatches >= 2) score += 2;

    return { score, hit };
  };

  // Build a friendly "personalization prefix" if we know the name and it's the first time
  const personalize = (responseText) => {
    if (state.name && state.msgCount === 1) {
      return `${responseText}\n\n— Por cierto, mucho gusto ${state.name}.`;
    }
    return responseText;
  };

  // When the user asks something we partially understood, surface the next-best topic
  const partialFallback = (scored) => {
    // Find an entry that *almost* matched (score 1–2)
    const near = scored.find(s => s.score >= 1 && s.score < 3 && s.e.id !== state.lastIntent);
    if (near) {
      const labelFor = {
        pricing: "los precios", timeline: "los tiempos de entrega", demos: "los demos",
        process: "el proceso", seo: "SEO", security: "la seguridad",
        hosting: "dominio y hosting", "first-step": "cómo empezar",
        revisions: "las revisiones", "objection-price": "el presupuesto"
      };
      const friendly = labelFor[near.e.id] || "ese tema";
      return {
        text: `Si entiendo bien, hablas sobre ${friendly}. ${near.e.text}\n\nSi no era eso, escríbelo de otra forma o te llevo al diagnóstico para una respuesta más exacta.`,
        actions: [...(near.e.actions || []).slice(0, 2), { label: "Diagnóstico gratis", href: routes.contacto }]
      };
    }
    return null;
  };

  const replyFor = (rawText) => {
    const text = normalize(rawText);

    if (!text) {
      return {
        text: state.name
          ? `Cuéntame qué proyecto tienes en mente, ${state.name}, y te oriento.`
          : "Cuéntame qué tipo de proyecto tienes y te ayudo a ubicar la mejor opción.",
        actions: act.start
      };
    }

    // Pure greeting (≤4 words, no question marks) and we know the name → personal greet
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const isPureGreeting = wordCount <= 4
      && !/[?¿]/.test(rawText)
      && /^(hola|buenas|hi|hello|hey|saludos)\b/.test(text);
    if (isPureGreeting && state.name) {
      return {
        text: `¡Hola otra vez, ${state.name}! ¿En qué te ayudo ahora? Puedo darte detalles de precios, tiempos, demos o el siguiente paso.`,
        actions: act.start
      };
    }

    // Score every entry
    const scored = bank
      .map(e => ({ e, ...scoreEntry(e, text) }))
      .sort((a, b) => b.score - a.score);

    const best   = scored[0];
    const second = scored[1];

    // Strong primary match
    if (best && best.score >= 3) {
      // Multi-intent: if the second-best is also strong AND on a different topic family, combine
      const combineable = second
        && second.score >= 3
        && second.e.id !== best.e.id
        && !best.e.id.startsWith("industry-") // industry replies already imply other topics
        && !second.e.id.startsWith("industry-");

      let responseText = best.e.text;
      let actions = best.e.actions;

      if (combineable) {
        responseText += "\n\n" + second.e.text;
        // Merge & de-dupe actions
        const seen = new Set();
        actions = [...best.e.actions, ...second.e.actions].filter(a => {
          const key = a.href || a.prompt || a.label;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 4);
        state.recentTopics = [best.e.id, second.e.id, ...state.recentTopics].slice(0, 5);
      } else {
        state.recentTopics = [best.e.id, ...state.recentTopics].slice(0, 5);
      }

      state.askedAbout.add(best.e.id);
      state.lastIntent = best.e.id;

      // Context-aware follow-up appended after pricing if we haven't shown demos yet
      if (best.e.id === "pricing" && !state.askedAbout.has("demos")) {
        responseText += "\n\n¿Quieres que también te muestre cuál demo encaja mejor con tu negocio?";
      }
      if (best.e.id === "demos" && !state.askedAbout.has("pricing")) {
        responseText += "\n\nCuando elijas dirección, te puedo dar referencia de precios.";
      }
      if (best.e.id.startsWith("industry-") && !state.askedAbout.has("first-step")) {
        responseText += "\n\nSi quieres avanzar, el diagnóstico gratis es el camino más directo: describes tu caso y recibes una recomendación específica.";
      }

      return { text: personalize(responseText), actions };
    }

    // Weak primary match → try partial fallback
    const partial = partialFallback(scored);
    if (partial) {
      state.lastIntent = "partial";
      return partial;
    }

    // True fallback: contextual suggestions
    state.lastIntent = "fallback";
    const haveAsked = [...state.askedAbout];
    const suggest = haveAsked.length
      ? "Si quieres un detalle preciso, lo más útil es el diagnóstico gratis: describes tu caso y recibes una respuesta ajustada."
      : "Para algo más específico de tu proyecto, el diagnóstico gratis es el camino más directo. También tenemos preguntas frecuentes para dudas comunes.";

    return {
      text: state.name
        ? `Entiendo lo que preguntas, ${state.name}. ${suggest}`
        : `Buena pregunta. ${suggest}`,
      actions: [
        { label: "Solicitar diagnóstico", href: routes.contacto },
        { label: "Ver FAQ", href: routes.faq },
        { label: "Ver demos", href: routes.portafolio }
      ]
    };
  };

  // ── Message handling ─────────────────────────────────────────
  const scrollMessages = () => { messages.scrollTop = messages.scrollHeight; };

  const addMessage = (role, text, actions = []) => {
    const item = make("div", `pitahaya-chat__message pitahaya-chat__message--${role}`);
    const bubble = make("div", "pitahaya-chat__bubble", text);
    item.append(bubble);

    if (actions.length) {
      const wrap = make("div", "pitahaya-chat__actions");
      actions.forEach(a => {
        if (a.href) {
          const link = make("a", "pitahaya-chat__action", a.label);
          link.href = a.href;
          wrap.append(link);
        } else {
          const btn = make("button", "pitahaya-chat__action", a.label);
          btn.type = "button";
          btn.addEventListener("click", () => handleUserMessage(a.prompt || a.label));
          wrap.append(btn);
        }
      });
      item.append(wrap);
    }

    messages.append(item);
    scrollMessages();
  };

  const showBotReply = (rawText) => {
    // Typing indicator with 3 dots
    const typingMsg = make("div", "pitahaya-chat__message pitahaya-chat__message--bot");
    const typingBubble = make("div", "pitahaya-chat__bubble pitahaya-chat__typing-bubble");
    typingBubble.innerHTML = "<span></span><span></span><span></span>";
    typingMsg.append(typingBubble);
    messages.append(typingMsg);
    scrollMessages();

    const response = replyFor(rawText);
    const delay = Math.min(500 + response.text.length * 5, 1400);

    window.setTimeout(() => {
      typingMsg.remove();
      addMessage("bot", response.text, response.actions);

      // After a few messages, suggest alternative quick prompts
      if (msgCount === 3) {
        renderQuickPrompts(["¿Cuántas revisiones incluye?", "¿Puedo editar después?", "¿Incluye hosting?", "¿Trabajas fuera de Ecuador?"]);
      }
    }, delay);
  };

  function handleUserMessage(value) {
    const text = String(value || "").trim();
    if (!text) return;

    // Try to learn the user's name on the way in
    if (!state.name) {
      const found = extractName(text);
      if (found) state.name = found;
    }

    msgCount++;
    state.msgCount = msgCount;
    addMessage("user", text);
    showBotReply(text);
    input.value = "";
  }

  // ── Viewport & keyboard ──────────────────────────────────────
  const isMobile = () => window.matchMedia("(max-width:620px)").matches;

  const updateViewport = () => {
    const vp = window.visualViewport;
    const vh = Math.round(vp?.height || window.innerHeight);
    const kbOffset = vp ? Math.max(0, Math.round(window.innerHeight - vp.height - vp.offsetTop)) : 0;
    const kbOpen = isMobile() && document.activeElement === input && kbOffset > 90;
    const base = isMobile() ? "max(14px,env(safe-area-inset-bottom))" : "max(18px,env(safe-area-inset-bottom))";

    root.style.setProperty("--pitahaya-chat-vh", `${vh}px`);
    root.style.setProperty("--pitahaya-chat-bottom", base);
    root.classList.toggle("is-keyboard", kbOpen);

    if (kbOpen) {
      window.requestAnimationFrame(() => {
        const vBottom = vp ? vp.height + vp.offsetTop : window.innerHeight;
        const pBottom = panel.getBoundingClientRect().bottom;
        const overflow = Math.max(0, Math.ceil(pBottom - vBottom + 10));
        if (overflow) root.style.setProperty("--pitahaya-chat-bottom", `${overflow + 14}px`);
        window.setTimeout(scrollMessages, 60);
      });
    }
  };

  const setOpen = (open) => {
    root.classList.toggle("is-open", open);
    launcher.setAttribute("aria-expanded", String(open));
    updateViewport();
    if (!open) { root.classList.remove("is-keyboard"); return; }
    scrollMessages();
    if (!isMobile()) input.focus();
  };

  // ── Event listeners ──────────────────────────────────────────
  launcher.addEventListener("click", () => setOpen(true));
  closeBtn.addEventListener("click", () => setOpen(false));
  form.addEventListener("submit", (e) => { e.preventDefault(); handleUserMessage(input.value); });
  input.addEventListener("focus", () => { updateViewport(); window.setTimeout(updateViewport, 220); window.setTimeout(scrollMessages, 260); });
  input.addEventListener("blur", () => window.setTimeout(updateViewport, 120));
  window.addEventListener("resize", updateViewport);
  window.visualViewport?.addEventListener("resize", updateViewport);
  window.visualViewport?.addEventListener("scroll", updateViewport);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && root.classList.contains("is-open")) setOpen(false); });

  // ── Initial greeting ─────────────────────────────────────────
  addMessage("bot",
    "¡Hola! Soy el asistente de Pittahaya. Puedo responder cualquier pregunta sobre diseño web, precios, tiempos, demos, proceso o lo que necesites saber. ¿En qué te ayudo?",
    [
      { label: "¿Cuánto cuesta?",    prompt: "¿Cuánto cuesta?" },
      { label: "Ver demos",          href: routes.portafolio },
      { label: "Diagnóstico gratis", href: routes.contacto }
    ]
  );
})();
