(() => {
  if (document.querySelector("[data-pitahaya-chat]")) return;

  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  const routes = {
    contacto: "contacto.html",
    planes: "planes.html",
    servicios: "servicios.html",
    portafolio: "portafolio.html",
    landing: "demo-landing.html",
    corporativa: "demo-corporativa.html",
    marca: "demo-marca.html",
    serviciosDemo: "demo-servicios.html",
    startup: "demo-startup.html",
    lujo: "demo-highend.html"
  };

  const normalize = (value) => value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  const make = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  };

  const root = make("section", "pitahaya-chat");
  root.setAttribute("data-pitahaya-chat", "");
  root.setAttribute("aria-label", "Recepcionista virtual Pitahaya");

  const launcher = make("button", "pitahaya-chat__launcher");
  launcher.type = "button";
  launcher.setAttribute("aria-label", "Abrir recepcionista Pitahaya");
  launcher.title = "Habla con Pitahaya";
  launcher.setAttribute("aria-expanded", "false");
  const launcherSpark = make("span", "pitahaya-chat__spark");
  launcherSpark.setAttribute("aria-hidden", "true");
  const launcherText = make("span", "", "Habla con Pitahaya");
  launcher.append(launcherSpark, launcherText);

  const panel = make("div", "pitahaya-chat__panel");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Recepción virtual de Pitahaya");

  const header = make("div", "pitahaya-chat__header");
  const identity = make("div", "pitahaya-chat__identity");
  const avatar = make("img", "pitahaya-chat__avatar");
  avatar.src = "assets/pitahaya-logo.png";
  avatar.alt = "Pitahaya";
  const identityText = make("div", "");
  const title = make("span", "pitahaya-chat__title", "Recepcionista Pitahaya");
  const status = make("span", "pitahaya-chat__status", "Recepción virtual para tu proyecto");
  const close = make("button", "pitahaya-chat__close", "×");
  close.type = "button";
  close.setAttribute("aria-label", "Cerrar chat");
  identityText.append(title, status);
  identity.append(avatar, identityText);
  header.append(identity, close);

  const messages = make("div", "pitahaya-chat__messages");
  messages.setAttribute("role", "log");
  messages.setAttribute("aria-live", "polite");

  const quick = make("div", "pitahaya-chat__quick");
  const quickPrompts = [
    "Precios y planes",
    "Tiempo de entrega",
    "Qué demo necesito",
    "Hablar con recepción"
  ];
  quickPrompts.forEach(prompt => {
    const button = make("button", "", prompt);
    button.type = "button";
    button.addEventListener("click", () => handleUserMessage(prompt));
    quick.append(button);
  });

  const form = make("form", "pitahaya-chat__composer");
  const input = make("input", "pitahaya-chat__input");
  input.type = "text";
  input.placeholder = "Pregunta precios, demos, tiempos, SEO...";
  input.setAttribute("aria-label", "Mensaje para el asistente");
  input.autocomplete = "off";
  const send = make("button", "pitahaya-chat__send", "Enviar");
  send.type = "submit";
  form.append(input, send);

  const privacy = make("div", "pitahaya-chat__privacy", "Recepción local: responde preguntas frecuentes en tu navegador y no envía tus mensajes a terceros.");

  panel.append(header, messages, quick, form, privacy);
  root.append(launcher, panel);
  document.body.append(root);

  const setOpen = (isOpen) => {
    root.classList.toggle("is-open", isOpen);
    launcher.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) input.focus();
  };

  const scrollMessages = () => {
    messages.scrollTop = messages.scrollHeight;
  };

  const addMessage = (role, text, actions = []) => {
    const item = make("div", `pitahaya-chat__message pitahaya-chat__message--${role}`);
    const bubble = make("div", "pitahaya-chat__bubble", text);
    item.append(bubble);

    if (actions.length) {
      const actionWrap = make("div", "pitahaya-chat__actions");
      actions.forEach(action => {
        if (action.href) {
          const link = make("a", "pitahaya-chat__action", action.label);
          link.href = action.href;
          actionWrap.append(link);
          return;
        }

        const button = make("button", "pitahaya-chat__action", action.label);
        button.type = "button";
        button.addEventListener("click", () => handleUserMessage(action.prompt || action.label));
        actionWrap.append(button);
      });
      item.append(actionWrap);
    }

    messages.append(item);
    scrollMessages();
  };

  const demoActions = [
    { label: "Landing", href: routes.landing },
    { label: "Corporativa", href: routes.corporativa },
    { label: "Marca", href: routes.marca },
    { label: "Servicios", href: routes.serviciosDemo },
    { label: "Startup", href: routes.startup },
    { label: "Lujo", href: routes.lujo }
  ];

  const actionSets = {
    start: [
      { label: "Ver demos", href: routes.portafolio },
      { label: "Ver planes", href: routes.planes },
      { label: "Contactar", href: routes.contacto }
    ],
    quote: [
      { label: "Comparar planes", href: routes.planes },
      { label: "Solicitar diagnóstico", href: routes.contacto }
    ],
    services: [
      { label: "Ver servicios", href: routes.servicios },
      { label: "Cotizar proyecto", href: routes.contacto }
    ],
    contact: [
      { label: "Ir a Contacto", href: routes.contacto },
      { label: "Ver planes primero", href: routes.planes }
    ]
  };

  const answerBank = [
    {
      keywords: ["hola", "buenas", "hello", "hey", "atiendan", "atencion", "atender", "recepcion", "asesor", "ayuda"],
      text: "Hola, bienvenido a Pitahaya. Soy la recepcionista virtual: puedo orientarte sobre precios, demos, tiempos, servicios, seguridad, SEO o el siguiente paso para cotizar.",
      actions: actionSets.start
    },
    {
      keywords: ["precio", "precios", "plan", "planes", "costo", "costos", "cuanto", "cotiz", "presupuesto", "valor", "pago", "pagos", "cuotas", "barato", "caro"],
      text: "Para precio, la forma más rápida es comparar planes: Básico para presencia, Negocio para vender con claridad y Premium para una experiencia de alta gama. Si no sabes cuál elegir, deja tus datos y te recomendamos uno.",
      actions: actionSets.quote
    },
    {
      keywords: ["tiempo", "demora", "entrega", "dias", "semanas", "cuando", "rapido", "fecha", "deadline", "urgente"],
      text: "El tiempo depende del alcance, contenido y revisiones. Una landing suele ser más rápida; una web completa requiere más estrategia, secciones y ajustes. Para estimarlo bien, conviene enviar el tipo de web y la urgencia.",
      actions: actionSets.contact
    },
    {
      keywords: ["proceso", "pasos", "como funciona", "trabajan", "metodo", "revision", "revisiones", "cambios", "brief", "diagnostico"],
      text: "El proceso recomendado es: diagnóstico, dirección visual, estructura de secciones, diseño, ajustes y preparación para publicar. La idea es avanzar con claridad, sin improvisar tu primera impresión.",
      actions: actionSets.services
    },
    {
      keywords: ["demo", "demos", "portafolio", "ejemplo", "ejemplos", "muestra", "ver trabajos", "recomienda", "recomiendame"],
      text: "Te ayudo a elegir demo según la intención: Landing para ventas, Corporativa para confianza, Marca para identidad, Servicios para explicar ofertas, Startup para producto digital y Lujo para alta gama.",
      actions: demoActions
    },
    {
      keywords: ["venta", "ventas", "landing", "campana", "lead", "conversion", "convertir", "anuncios", "publicidad", "clientes"],
      text: "Si tu prioridad es vender o captar leads, te conviene una Landing Premium: mensaje directo, prueba visual, beneficios claros y CTA fuerte hacia contacto o cotización.",
      actions: [
        { label: "Ver demo Landing", href: routes.landing },
        { label: "Crear mi landing", href: routes.contacto }
      ]
    },
    {
      keywords: ["empresa", "corporativa", "corporativo", "confianza", "b2b", "seria", "autoridad", "institucional", "negocio"],
      text: "Para una empresa que necesita verse seria y confiable, recomiendo Web Corporativa: estructura clara, autoridad, servicios, prueba de confianza y una ruta directa para conversar.",
      actions: [
        { label: "Ver demo Corporativa", href: routes.corporativa },
        { label: "Cotizar corporativa", href: routes.contacto }
      ]
    },
    {
      keywords: ["marca", "branding", "identidad", "diseno", "diseño", "logo", "visual", "colores", "estilo", "memorabl"],
      text: "Si quieres que la marca se recuerde, la ruta ideal es Marca & Diseño: identidad visual, tono premium, secciones con personalidad y una experiencia menos genérica.",
      actions: [
        { label: "Ver demo Marca", href: routes.marca },
        { label: "Crear mi estilo", href: routes.contacto }
      ]
    },
    {
      keywords: ["servicio", "servicios", "paquete", "paquetes", "consultoria", "explicar", "oferta", "beneficios", "propuesta"],
      text: "Si vendes servicios, la web debe ordenar tu oferta: qué haces, para quién es, beneficios, proceso, paquetes y siguiente paso. Eso reduce dudas antes de hablar de precio.",
      actions: [
        { label: "Ver demo Servicios", href: routes.serviciosDemo },
        { label: "Ordenar mis servicios", href: routes.contacto }
      ]
    },
    {
      keywords: ["startup", "saas", "app", "software", "tech", "producto", "aplicacion", "plataforma", "waitlist", "demo producto"],
      text: "Para una app, SaaS o startup, conviene una web que explique rápido el problema, el producto, beneficios, métricas y CTA para demo o lista de espera.",
      actions: [
        { label: "Ver demo Startup", href: routes.startup },
        { label: "Diseñar producto web", href: routes.contacto }
      ]
    },
    {
      keywords: ["lujo", "premium", "alta gama", "boutique", "exclusivo", "exclusiva", "elegante", "lujoso", "sofisticado"],
      text: "Para alta gama, la web debe sentirse cara sin gritar: menos ruido, más intención, fotografía fuerte, ritmo editorial y CTA elegante. El demo High-End es el mejor punto de partida.",
      actions: [
        { label: "Ver demo High-End", href: routes.lujo },
        { label: "Crear web premium", href: routes.contacto }
      ]
    },
    {
      keywords: ["seo", "google", "busqueda", "buscador", "posicionar", "ranking", "meta", "palabras clave"],
      text: "La web incluye base SEO: estructura clara, títulos, descripciones, jerarquía de contenido y rendimiento cuidado. Para SEO avanzado se puede definir una estrategia de palabras clave y contenido.",
      actions: actionSets.services
    },
    {
      keywords: ["celular", "movil", "mobile", "responsive", "tablet", "telefono", "adaptable"],
      text: "Sí, la experiencia debe verse bien en celular, tablet y escritorio. El diseño responsive es clave porque muchos clientes deciden desde el teléfono.",
      actions: actionSets.services
    },
    {
      keywords: ["velocidad", "rapida", "rapido", "performance", "carga", "pesada", "optimizar"],
      text: "La velocidad importa mucho para confianza y conversión. Se cuidan imágenes, estructura, scripts locales y una experiencia ligera para que la página cargue sin sentirse pesada.",
      actions: actionSets.services
    },
    {
      keywords: ["seguridad", "seguro", "privacy", "privacidad", "csp", "cookies", "pixel", "tracking", "datos"],
      text: "La web está pensada con seguridad base: CSP, scripts locales, política de referrer y cabeceras para hosting. La recepcionista funciona localmente y no envía tus mensajes a terceros.",
      actions: [
        { label: "Hablar del proyecto", href: routes.contacto },
        { label: "Ver servicios", href: routes.servicios }
      ]
    },
    {
      keywords: ["dominio", "hosting", "host", "publicar", "subir", "deploy", "correo", "email", "mantenimiento"],
      text: "Se puede preparar la web para publicarla en hosting moderno y conectar dominio/correo según lo que tengas. Si necesitas mantenimiento, conviene definirlo desde el inicio.",
      actions: actionSets.contact
    },
    {
      keywords: ["tienda", "ecommerce", "e-commerce", "carrito", "producto", "productos", "reservas", "citas", "agenda", "booking"],
      text: "Si necesitas tienda, catálogo, reservas o citas, la estructura cambia. La recepcionista puede ubicarte, pero para cotizar eso bien necesitamos saber productos, métodos de pago y flujo de compra.",
      actions: actionSets.contact
    },
    {
      keywords: ["textos", "copy", "contenido", "fotos", "imagenes", "videos", "redaccion", "mensaje", "copywriting"],
      text: "Si no tienes textos o imágenes, se puede ayudarte a ordenar el mensaje: propuesta de valor, beneficios, secciones y CTA. Mientras mejor sea el contenido, más fuerte se siente la web.",
      actions: actionSets.contact
    },
    {
      keywords: ["whatsapp", "telefono", "llamar", "humano", "persona", "correo", "contacto", "hablar", "reunion"],
      text: "Para hablar con una persona o dejar los datos del proyecto, ve a Contacto. Ahí puedes explicar qué vendes, qué necesitas y qué estilo quieres lograr.",
      actions: actionSets.contact
    },
    {
      keywords: ["ecuador", "quito", "guayaquil", "cuenca", "espanol", "ingles", "idioma", "internacional"],
      text: "Pitahaya tiene raíz ecuatoriana y puede orientar una web para mercado local o internacional. Si necesitas versión en inglés o enfoque por ciudad/país, conviene indicarlo al cotizar.",
      actions: actionSets.contact
    },
    {
      keywords: ["gracias", "perfecto", "ok", "listo", "genial", "super"],
      text: "Con mucho gusto. Si quieres avanzar, deja tus datos y una descripción corta del proyecto para preparar una recomendación más precisa.",
      actions: [
        { label: "Solicitar diagnóstico", href: routes.contacto },
        { label: "Ver demos", href: routes.portafolio }
      ]
    }
  ];

  const scoreAnswer = (entry, text) => entry.keywords.reduce((score, keyword) => {
    if (!text.includes(keyword)) return score;
    return score + (keyword.includes(" ") ? 3 : 1);
  }, 0);

  const replyFor = (rawText) => {
    const text = normalize(rawText);

    if (!text) {
      return {
        text: "Bienvenido a Pitahaya. Cuéntame qué tipo de proyecto tienes y te ayudo a ubicar la mejor opción: demo, planes o contacto directo.",
        actions: [
          { label: "Ver demos", href: routes.portafolio },
          { label: "Ver planes", href: routes.planes },
          { label: "Contactar", href: routes.contacto }
        ]
      };
    }

    const best = answerBank
      .map((entry) => ({ entry, score: scoreAnswer(entry, text) }))
      .sort((a, b) => b.score - a.score)[0];

    if (best && best.score > 0) return best.entry;

    return {
      text: "Puedo orientarte sobre casi cualquier duda frecuente de la web: precios, demos, tiempos, SEO, seguridad, hosting, contenido, tienda, reservas o contacto. Si tu pregunta requiere datos específicos, te llevo a Contacto para responderte mejor.",
      actions: [
        { label: "Ver demos", href: routes.portafolio },
        { label: "Comparar planes", href: routes.planes },
        { label: "Contactar", href: routes.contacto }
      ]
    };
  };

  const showBotReply = (text) => {
    const typing = make("div", "pitahaya-chat__message pitahaya-chat__message--bot");
    typing.append(make("div", "pitahaya-chat__bubble", "Preparando tu atención..."));
    messages.append(typing);
    scrollMessages();

    window.setTimeout(() => {
      typing.remove();
      const response = replyFor(text);
      addMessage("bot", response.text, response.actions);
    }, 360);
  };

  function handleUserMessage(value) {
    const text = String(value || "").trim();
    if (!text) return;

    addMessage("user", text);
    showBotReply(text);
    input.value = "";
  }

  launcher.addEventListener("click", () => setOpen(true));
  close.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.classList.contains("is-open")) setOpen(false);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    handleUserMessage(input.value);
  });

  addMessage(
    "bot",
    "Bienvenido a Pitahaya. Soy la recepcionista virtual: puedo orientarte, mostrarte demos, explicar planes y llevarte al contacto correcto.",
    [
      { label: "Qué demo necesito", prompt: "Qué demo necesito" },
      { label: "Ver planes", href: routes.planes },
      { label: "Cotizar", href: routes.contacto }
    ]
  );
})();
