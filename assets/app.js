(() => {
  document.documentElement.classList.add("js");

  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const $ = (sel, root=document) => root.querySelector(sel);
  const make = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  };
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const mobileContent = window.matchMedia("(max-width: 680px)");

  // Premium interaction layer: all local, no tracking, no external scripts.
  const progress = make("div", "scroll-progress");
  progress.setAttribute("aria-hidden", "true");
  document.body.append(progress);

  const updateScrollProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    progress.style.setProperty("--progress", String(ratio));
  };
  updateScrollProgress();
  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  window.addEventListener("resize", updateScrollProgress);

  if (finePointer && !prefersReducedMotion) {
    const orb = make("div", "pointer-orb");
    orb.setAttribute("aria-hidden", "true");
    document.body.append(orb);

    document.addEventListener("pointermove", (event) => {
      orb.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    }, { passive: true });
    document.addEventListener("pointerdown", () => orb.classList.add("is-pressing"));
    document.addEventListener("pointerup", () => orb.classList.remove("is-pressing"));
  }

  // Mobile drawer
  const drawer = $("#mobileDrawer");
  const openBtn = $("#openDrawer");
  const closeBtn = $("#closeDrawer");

  const setDrawerState = (isOpen) => {
    if (!drawer) return;
    drawer.style.display = isOpen ? "block" : "none";
    drawer.setAttribute("aria-hidden", String(!isOpen));
    if (openBtn) openBtn.setAttribute("aria-expanded", String(isOpen));
  };
  const openDrawer = () => setDrawerState(true);
  const closeDrawer = () => setDrawerState(false);

  if (openBtn) openBtn.addEventListener("click", openDrawer);
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  if (drawer) drawer.addEventListener("click", (e) => { if (e.target === drawer) closeDrawer(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  // Reveal on scroll
  const els = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      for (const ent of entries){
        if (ent.isIntersecting){
          ent.target.classList.add("in");
          io.unobserve(ent.target);
        }
      }
    }, { threshold: 0.01, rootMargin: "0px 0px 140px 0px" });
    els.forEach(el => io.observe(el));
  } else {
    els.forEach(el => el.classList.add("in"));
  }

  // Active nav by current path
  const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const navLinks = $$("[data-nav]");
  navLinks.forEach(a => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    if (href === path) a.classList.add("active");
  });

  // Shared footer year. Keeping this here lets CSP block inline scripts.
  const year = $("#y");
  if (year) year.textContent = String(new Date().getFullYear());
  $$("[data-year]").forEach(el => {
    el.textContent = String(new Date().getFullYear());
  });

  const mobileCopyByPage = {
    "index.html": [
      [".hero h1", "Tu web vende."],
      [".hero p", "Diseño web premium, claro y listo para convertir visitas en clientes."],
      ["#first-impression-lab .section-title", "Elige la primera impresión correcta"],
      ["#first-impression-lab .section-lead", "Toca una dirección y mira qué estrategia encaja con tu marca."],
      ["#problema-solucion .section-title", "Tu cliente decide rápido"],
      ["#problema-solucion .section-lead", "Una web premium sube la percepción antes del primer mensaje."],
      ["#como-funciona .section-title", "Proceso simple"],
      ["#como-funciona .section-lead", "De idea a web lista para compartir y vender."],
      ["#portafolio .section-title", "Mira demos y elige una dirección"],
      ["#portafolio .section-lead", "Cada demo muestra una forma distinta de vender y generar confianza."],
      [".conversion-panel .section-title", "Haz que tu web se sienta más valiosa."],
      [".conversion-panel p", "Cuéntame qué vendes y te doy una dirección clara."]
    ],
    "servicios.html": [
      [".section > .container > .section-title", "Servicios web premium"],
      [".section > .container > .section-lead", "Menos ruido, más claridad: una web pensada para generar confianza y contactos."],
      [".grid-2 .section-title", "Minimalista, pero con intención"],
      [".grid-2 .section-lead", "Diseño limpio, mensajes claros y botones que llevan al contacto."]
    ],
    "planes.html": [
      [".section > .container > .section-title", "Elige tu plan."],
      [".section > .container > .section-lead", "Planes simples para verte mejor y convertir más."],
      [".pricing .price:nth-child(1) .plan-note", "Base profesional para recibir contactos."],
      [".pricing .price:nth-child(2) .plan-note", "Servicios, prueba y ruta clara a cotización."],
      [".pricing .price:nth-child(3) .plan-note", "Experiencia memorable y de alta percepción."],
      ["[data-plan-finder] .section-title", "Te digo qué plan elegir"],
      ["[data-plan-finder] .section-lead", "Selecciona tu objetivo y recibe una recomendación."],
      [".hr + .section-title", "Cómo avanzamos"],
      [".hr + .section-title + .section-lead", "Un proceso directo, sin complicarte."]
    ],
    "portafolio.html": [
      [".section > .container > .section-title", "Demos para tu web."],
      [".section > .container > .section-lead", "Mira demos rápidas: ventas, confianza, marca, tecnología o lujo."],
      [".conversion-panel .section-title", "¿Esta dirección encaja?"],
      [".conversion-panel p", "La adaptamos a tu producto, clientes y forma de vender."]
    ],
    "sobre-mi.html": [
      [".section > .container > .section-title", "Tu marca, más premium."],
      [".section > .container > .section-lead", "Tu marca puede sentirse premium, clara y fácil de recordar."],
      [".grid-2 .section-title", "Que tu marca se sienta más valiosa"],
      [".grid-2 .section-lead", "Creo webs modernas para que tu negocio se vea mejor y convierta con claridad."],
      [".section-title[style]", "Por qué funciona"]
    ],
    "contacto.html": [
      [".section > .container > .section-title", "Diagnóstico gratis."],
      [".section > .container > .section-lead", "Completa el formulario y recibe una dirección clara para tu web."],
      [".grid-2 .section-title", "Diagnóstico gratis"],
      [".grid-2 .section-lead", "Mientras más claro seas, mejor te puedo orientar."],
      [".contact-option:nth-child(1) span", "Ruta recomendada y siguiente paso."],
      [".contact-option:nth-child(2) span", "Para negocios que quieren verse más premium."],
      [".contact-option:nth-child(3) span", "Respuesta enfocada y directa."],
      [".card .grid-2 .section-title", "Una web que se vea real"],
      [".card .grid-2 .section-lead", "Premium, clara y lista para competir."]
    ]
  };

  const applyMobileCopy = () => {
    const current = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const copies = mobileCopyByPage[current] || [];

    copies.forEach(([selector, text]) => {
      if (!text) return;
      const el = $(selector);
      if (!el) return;
      if (!el.dataset.desktopText) el.dataset.desktopText = el.textContent;
      el.textContent = mobileContent.matches ? text : el.dataset.desktopText;
    });
  };

  applyMobileCopy();
  if (mobileContent.addEventListener) {
    mobileContent.addEventListener("change", applyMobileCopy);
  } else {
    mobileContent.addListener(applyMobileCopy);
  }

  const copyForViewport = (data, key) => {
    if (!data) return "";
    const mobileKey = `mobile${key.charAt(0).toUpperCase()}${key.slice(1)}`;
    return mobileContent.matches && data[mobileKey] ? data[mobileKey] : data[key];
  };

  const onMobileContentChange = (callback) => {
    if (mobileContent.addEventListener) {
      mobileContent.addEventListener("change", callback);
    } else {
      mobileContent.addListener(callback);
    }
  };

  // Close drawer when clicking a nav link
  $$("#mobileDrawer a").forEach(a => a.addEventListener("click", closeDrawer));

  if (finePointer && !prefersReducedMotion) {
    const resetInteractiveVars = (el) => {
      el.classList.remove("is-tilting");
      ["--tilt-x", "--tilt-y", "--shine-x", "--shine-y", "--magnet-x", "--magnet-y"].forEach(name => {
        el.style.removeProperty(name);
      });
    };

    $$(".btn, .hamburger, .drawer-close").forEach(el => {
      el.addEventListener("pointermove", (event) => {
        const rect = el.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        el.style.setProperty("--magnet-x", `${x * 10}px`);
        el.style.setProperty("--magnet-y", `${y * 8}px`);
      });
      el.addEventListener("pointerleave", () => resetInteractiveVars(el));
    });

    $$(".hover-lift, .project, .hero-card, .conversion-panel, .trust-item, .step").forEach(el => {
      el.addEventListener("pointermove", (event) => {
        const rect = el.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        el.classList.add("is-tilting");
        el.style.setProperty("--tilt-x", `${(x - 0.5) * 7}deg`);
        el.style.setProperty("--tilt-y", `${(0.5 - y) * 7}deg`);
        el.style.setProperty("--shine-x", `${x * 100}%`);
        el.style.setProperty("--shine-y", `${y * 100}%`);
      });
      el.addEventListener("pointerleave", () => resetInteractiveVars(el));
    });
  }

  const labAnswers = {
    conversion: {
      eyebrow: "Cliente listo para comprar",
      title: "Venta inmediata sin sentirse desesperado.",
      mobileTitle: "Venta clara y rápida.",
      body: "Ideal para una oferta concreta: el visitante entiende el resultado, ve prueba, resuelve dudas y llega al contacto con momentum.",
      mobileBody: "El cliente entiende la oferta y llega al contacto sin vueltas.",
      cta: "Ver demo de conversión",
      href: "demo-landing.html"
    },
    authority: {
      eyebrow: "Marca seria en segundos",
      title: "Confianza ejecutiva antes de hablar de precio.",
      mobileTitle: "Confianza antes del precio.",
      body: "Perfecto para empresas, consultoras y servicios B2B que necesitan verse sólidos, ordenados y listos para contratos importantes.",
      mobileBody: "Para empresas que necesitan verse sólidas desde el primer vistazo.",
      cta: "Ver demo corporativa",
      href: "demo-corporativa.html"
    },
    desire: {
      eyebrow: "Deseo visual premium",
      title: "Una web que se recuerda como una marca de alto valor.",
      mobileTitle: "Una marca que se recuerda.",
      body: "Para marcas creativas o high-end que venden percepción: textura, ritmo, color, lujo, voz y una experiencia que se queda en la memoria.",
      mobileBody: "Para marcas que venden percepción, deseo y estética premium.",
      cta: "Ver demos memorables",
      href: "portafolio.html"
    }
  };

  const ecosystemAnswers = {
    impact: {
      kicker: "Sistema de primera impresión",
      title: "Impacto visual antes de que el cliente piense.",
      mobileTitle: "Impacto antes del scroll.",
      body: "La página abre con una señal premium inmediata: color, contraste, logo y mensaje trabajan juntos para detener el scroll.",
      mobileBody: "Logo, color y mensaje detienen la atención rápido.",
      label: "Primera impresión",
      screen: "Tu marca se ve imposible de ignorar.",
      mobileScreen: "Tu marca se ve premium.",
      score: "92%",
      path: "4 pasos",
      signal: "24/7"
    },
    desire: {
      kicker: "Sistema de deseo",
      title: "La oferta se siente más valiosa sin explicar de más.",
      mobileTitle: "Tu oferta se siente más valiosa.",
      body: "El ritmo visual convierte servicios comunes en una experiencia aspiracional: el cliente siente calidad antes de pedir precio.",
      mobileBody: "El cliente siente calidad antes de pedir precio.",
      label: "Deseo construido",
      screen: "Tu producto se percibe premium.",
      mobileScreen: "Más deseo, menos explicación.",
      score: "+38%",
      path: "Más interés",
      signal: "Look premium"
    },
    trust: {
      kicker: "Sistema de confianza",
      title: "Cada bloque responde una duda antes de que se vuelva objeción.",
      mobileTitle: "Confianza sin explicar de más.",
      body: "Prueba, proceso, claridad y seguridad visual hacen que avanzar se sienta lógico, no arriesgado.",
      mobileBody: "Claridad, proceso y prueba reducen dudas rápido.",
      label: "Confianza activa",
      screen: "La decisión se siente segura.",
      mobileScreen: "Decidir se siente seguro.",
      score: "0 fricción",
      path: "Prueba clara",
      signal: "CSP listo"
    },
    action: {
      kicker: "Sistema de acción",
      title: "El contacto aparece cuando la persona ya tiene una razón para escribir.",
      mobileTitle: "Contacto cuando ya hay interés.",
      body: "CTA, demos, planes y recepcionista virtual trabajan como un ecosistema para convertir curiosidad en conversación.",
      mobileBody: "Botones, demos y chatbot empujan a la conversación.",
      label: "Conversión",
      screen: "Listo para solicitar diagnóstico.",
      mobileScreen: "Listo para pedir diagnóstico.",
      score: "CTA vivo",
      path: "Lead directo",
      signal: "Chat local"
    }
  };

  const updateEcosystemHero = (hero, button) => {
    const data = ecosystemAnswers[button.dataset.ecosystemStep];
    if (!data) return;

    $$("[data-ecosystem-step]", hero).forEach(option => {
      const isActive = option === button;
      option.classList.toggle("active", isActive);
      option.setAttribute("aria-pressed", String(isActive));
    });

    hero.dataset.ecosystemActive = button.dataset.ecosystemStep;
    $("[data-eco-kicker]", hero).textContent = copyForViewport(data, "kicker");
    $("[data-eco-title]", hero).textContent = copyForViewport(data, "title");
    $("[data-eco-body]", hero).textContent = copyForViewport(data, "body");
    $("[data-eco-screen-label]", hero).textContent = copyForViewport(data, "label");
    $("[data-eco-screen-title]", hero).textContent = copyForViewport(data, "screen");
    $("[data-eco-score]", hero).textContent = copyForViewport(data, "score");
    $("[data-eco-path]", hero).textContent = copyForViewport(data, "path");
    $("[data-eco-signal]", hero).textContent = copyForViewport(data, "signal");
  };

  const ecosystemHero = $("[data-ecosystem-hero]");
  if (ecosystemHero) {
    $$("[data-ecosystem-step]", ecosystemHero).forEach(button => {
      button.addEventListener("click", () => updateEcosystemHero(ecosystemHero, button));
    });
    const activeEcosystemButton = $("[data-ecosystem-step].active", ecosystemHero) || $("[data-ecosystem-step]", ecosystemHero);
    if (activeEcosystemButton) updateEcosystemHero(ecosystemHero, activeEcosystemButton);
    onMobileContentChange(() => {
      const activeButton = $("[data-ecosystem-step].active", ecosystemHero) || $("[data-ecosystem-step]", ecosystemHero);
      if (activeButton) updateEcosystemHero(ecosystemHero, activeButton);
    });
  }

  const updateExperienceLab = (lab, button) => {
    const data = labAnswers[button.dataset.labOption];
    if (!data) return;

    $$("[data-lab-option]", lab).forEach(option => {
      const isActive = option === button;
      option.classList.toggle("active", isActive);
      option.setAttribute("aria-pressed", String(isActive));
    });

    $("[data-lab-eyebrow]", lab).textContent = copyForViewport(data, "eyebrow");
    $("[data-lab-title]", lab).textContent = copyForViewport(data, "title");
    $("[data-lab-body]", lab).textContent = copyForViewport(data, "body");
    const link = $("[data-lab-link]", lab);
    link.textContent = copyForViewport(data, "cta");
    link.href = copyForViewport(data, "href");
  };

  const experienceLab = $("[data-experience-lab]");
  if (experienceLab) {
    experienceLab.addEventListener("click", (event) => {
      const button = event.target.closest("[data-lab-option]");
      if (!button || !experienceLab.contains(button)) return;
      updateExperienceLab(experienceLab, button);
    });
    const activeLabButton = $("[data-lab-option].active", experienceLab) || $("[data-lab-option]", experienceLab);
    if (activeLabButton) updateExperienceLab(experienceLab, activeLabButton);
    onMobileContentChange(() => {
      const activeButton = $("[data-lab-option].active", experienceLab) || $("[data-lab-option]", experienceLab);
      if (activeButton) updateExperienceLab(experienceLab, activeButton);
    });
  }

  $("[data-portfolio-filter]")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;

    const filter = button.dataset.filter || "all";
    const toolbar = event.currentTarget;
    const gallery = $(toolbar.getAttribute("data-target") || ".portfolio-gallery");
    if (!gallery) return;

    $$("[data-filter]", toolbar).forEach(option => {
      const isActive = option === button;
      option.classList.toggle("active", isActive);
      option.setAttribute("aria-pressed", String(isActive));
    });

    $$(".project", gallery).forEach(project => {
      const categories = (project.dataset.category || "").split(" ");
      const shouldShow = filter === "all" || categories.includes(filter);
      project.hidden = !shouldShow;
    });
  });

  const planAnswers = {
    presence: {
      name: "Plan Básico",
      label: "Presencia elegante",
      body: "Te conviene empezar con una web clara, rápida y confiable: lo suficiente para que tu negocio deje de verse improvisado y pueda recibir contactos.",
      mobileBody: "Web clara para verte profesional y recibir contactos.",
      href: "contacto.html"
    },
    sales: {
      name: "Plan Negocio",
      label: "Ruta de venta completa",
      body: "Es la mejor opción si quieres explicar servicios, resolver dudas, mostrar proceso y convertir visitas en conversaciones con más intención.",
      mobileBody: "Para explicar servicios, resolver dudas y convertir visitas.",
      href: "contacto.html"
    },
    premium: {
      name: "Plan Premium",
      label: "Experiencia de alta percepción",
      body: "Ideal si tu marca compite por valor, lujo o diferenciación. La web necesita sentirse más editorial, más personalizada y más memorable.",
      mobileBody: "Para marcas que necesitan verse high-end y memorables.",
      href: "contacto.html"
    }
  };

  const updatePlanFinder = (finder, button) => {
    const data = planAnswers[button.dataset.planChoice];
    if (!data) return;

    $$("[data-plan-choice]", finder).forEach(option => {
      const isActive = option === button;
      option.classList.toggle("active", isActive);
      option.setAttribute("aria-pressed", String(isActive));
    });

    $("[data-plan-name]", finder).textContent = copyForViewport(data, "name");
    $("[data-plan-label]", finder).textContent = copyForViewport(data, "label");
    $("[data-plan-body]", finder).textContent = copyForViewport(data, "body");
    $("[data-plan-link]", finder).href = copyForViewport(data, "href");
  };

  const planFinder = $("[data-plan-finder]");
  if (planFinder) {
    planFinder.addEventListener("click", (event) => {
      const button = event.target.closest("[data-plan-choice]");
      if (!button || !planFinder.contains(button)) return;
      updatePlanFinder(planFinder, button);
    });
    const activePlanButton = $("[data-plan-choice].active", planFinder) || $("[data-plan-choice]", planFinder);
    if (activePlanButton) updatePlanFinder(planFinder, activePlanButton);
    onMobileContentChange(() => {
      const activeButton = $("[data-plan-choice].active", planFinder) || $("[data-plan-choice]", planFinder);
      if (activeButton) updatePlanFinder(planFinder, activeButton);
    });
  }

  // FAQ accordion
  $$(".faq-item").forEach(item => {
    const btn = $(".faq-question", item);
    if (!btn) return;
    btn.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");
      // close all others
      $$(".faq-item.is-open").forEach(other => other.classList.remove("is-open"));
      if (!isOpen) item.classList.add("is-open");
    });
  });

  // WhatsApp floating button (update WHATSAPP_NUMBER with your real number)
  const WHATSAPP_NUMBER = "593999999999";
  const WA_MSG = encodeURIComponent("Hola Pittahaya, me interesa solicitar un diagnóstico gratis para mi web.");
  const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${WA_MSG}`;

  const waBtn = document.createElement("a");
  waBtn.className = "whatsapp-float";
  waBtn.href = waHref;
  waBtn.target = "_blank";
  waBtn.rel = "noopener noreferrer";
  waBtn.setAttribute("aria-label", "Contactar por WhatsApp");
  waBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="white"/><path d="M11.98 0C5.37 0 .002 5.37.002 11.98c0 2.09.544 4.048 1.497 5.754L.002 24l6.374-1.671A11.94 11.94 0 0 0 11.98 23.96C18.59 23.96 23.96 18.59 23.96 11.98S18.59 0 11.98 0zm0 21.88c-1.893 0-3.663-.512-5.172-1.405l-.371-.22-3.84 1.007.994-3.679-.228-.38A9.84 9.84 0 0 1 2.1 11.98C2.1 6.53 6.53 2.1 11.98 2.1s9.88 4.43 9.88 9.88-4.43 9.9-9.88 9.9z" fill="white"/></svg><span class="whatsapp-float__label">Escribir por WhatsApp</span>`;
  document.body.append(waBtn);

  // Portfolio cards: open their demo pages
  $$(".project").forEach(card => {
    const url = card.getAttribute("data-url");
    if (!url) return;

    // Ensure keyboard accessibility
    card.setAttribute("tabindex", "0");
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        window.location.href = url;
      }
    });

    card.addEventListener("click", () => {
      window.location.href = url;
    });
  });

  // Lead form: sends directly through the secure Vercel CRM function.
  const leadForm = $("[data-lead-form]");
  if (leadForm) {
    const status = $("[data-form-status]", leadForm);
    const fields = $$("[required]", leadForm);
    const submitButton = $("button[type='submit']", leadForm);
    const meter = make("div", "form-meter");
    const meterText = make("span", "form-meter__text", "Diagnóstico 0% listo");
    const meterTrack = make("span", "form-meter__track");
    const meterFill = make("span", "form-meter__fill");
    meterTrack.append(meterFill);
    meter.append(meterText, meterTrack);
    leadForm.prepend(meter);

    const updateFormMeter = () => {
      const completed = fields.filter(field => String(field.value || "").trim()).length;
      const percent = fields.length ? Math.round((completed / fields.length) * 100) : 0;
      meter.style.setProperty("--form-progress", `${percent}%`);
      meterText.textContent = percent === 100 ? "Diagnóstico listo para enviar" : `Diagnóstico ${percent}% listo`;
    };
    fields.forEach(field => {
      field.addEventListener("input", updateFormMeter);
      field.addEventListener("change", updateFormMeter);
    });
    updateFormMeter();

    const setStatus = (message, state = "info") => {
      if (!status) return;
      status.textContent = message;
      status.dataset.state = state;
      status.hidden = false;
    };

    leadForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(leadForm);
      const rawPayload = Object.fromEntries(formData.entries());
      const payload = {
        website: rawPayload.website || "",
        name: rawPayload.name || rawPayload.nombre || "",
        email: rawPayload.email || "",
        company: rawPayload.company || rawPayload.negocio || "",
        service: rawPayload.service || rawPayload.plan || "",
        plan: rawPayload.crm_plan || "",
        message: rawPayload.message || rawPayload.mensaje || "",
        source_page: window.location.href,
        source_demo: rawPayload.source_demo || "",
        utm_source: new URLSearchParams(window.location.search).get("utm_source") || "",
        utm_medium: new URLSearchParams(window.location.search).get("utm_medium") || "",
        utm_campaign: new URLSearchParams(window.location.search).get("utm_campaign") || ""
      };

      leadForm.classList.add("is-sending");
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Enviando...";
      }
      setStatus("Enviando tu solicitud de forma segura...", "info");

      try {
        const response = await fetch(leadForm.action || "/api/submit-lead", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));

        const sent = result.ok === true || result.success === true;
        if (!response.ok || !sent) {
          throw new Error(result.message || result.error || "No se pudo enviar la solicitud.");
        }

        setStatus(result.message || "Solicitud guardada. Te responderemos pronto en tu correo.", "success");
        leadForm.reset();
        updateFormMeter();
      } catch (error) {
        setStatus(error.message || "No se pudo enviar la solicitud. Intenta otra vez.", "error");
      } finally {
        leadForm.classList.remove("is-sending");
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Enviar solicitud";
        }
      }
    });
  }
})();
