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
      body: "Ideal para una oferta concreta: el visitante entiende el resultado, ve prueba, resuelve dudas y llega al contacto con momentum.",
      cta: "Ver demo de conversión",
      href: "demo-landing.html"
    },
    authority: {
      eyebrow: "Marca seria en segundos",
      title: "Confianza ejecutiva antes de hablar de precio.",
      body: "Perfecto para empresas, consultoras y servicios B2B que necesitan verse sólidos, ordenados y listos para contratos importantes.",
      cta: "Ver demo corporativa",
      href: "demo-corporativa.html"
    },
    desire: {
      eyebrow: "Deseo visual premium",
      title: "Una web que se recuerda como una marca de alto valor.",
      body: "Para marcas creativas o high-end que venden percepción: textura, ritmo, color, lujo, voz y una experiencia que se queda en la memoria.",
      cta: "Ver demos memorables",
      href: "portafolio.html"
    }
  };

  const ecosystemAnswers = {
    impact: {
      kicker: "Sistema de primera impresión",
      title: "Impacto visual antes de que el cliente piense.",
      body: "La página abre con una señal premium inmediata: color, contraste, logo y mensaje trabajan juntos para detener el scroll.",
      label: "Primera impresión",
      screen: "Tu marca se ve imposible de ignorar.",
      score: "92%",
      path: "4 pasos",
      signal: "24/7"
    },
    desire: {
      kicker: "Sistema de deseo",
      title: "La oferta se siente más valiosa sin explicar de más.",
      body: "El ritmo visual convierte servicios comunes en una experiencia aspiracional: el cliente siente calidad antes de pedir precio.",
      label: "Deseo construido",
      screen: "Tu producto se percibe premium.",
      score: "+38%",
      path: "Más interés",
      signal: "Look premium"
    },
    trust: {
      kicker: "Sistema de confianza",
      title: "Cada bloque responde una duda antes de que se vuelva objeción.",
      body: "Prueba, proceso, claridad y seguridad visual hacen que avanzar se sienta lógico, no arriesgado.",
      label: "Confianza activa",
      screen: "La decisión se siente segura.",
      score: "0 fricción",
      path: "Prueba clara",
      signal: "CSP listo"
    },
    action: {
      kicker: "Sistema de acción",
      title: "El contacto aparece cuando la persona ya tiene una razón para escribir.",
      body: "CTA, demos, planes y recepcionista virtual trabajan como un ecosistema para convertir curiosidad en conversación.",
      label: "Conversión",
      screen: "Listo para solicitar diagnóstico.",
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
    $("[data-eco-kicker]", hero).textContent = data.kicker;
    $("[data-eco-title]", hero).textContent = data.title;
    $("[data-eco-body]", hero).textContent = data.body;
    $("[data-eco-screen-label]", hero).textContent = data.label;
    $("[data-eco-screen-title]", hero).textContent = data.screen;
    $("[data-eco-score]", hero).textContent = data.score;
    $("[data-eco-path]", hero).textContent = data.path;
    $("[data-eco-signal]", hero).textContent = data.signal;
  };

  const ecosystemHero = $("[data-ecosystem-hero]");
  if (ecosystemHero) {
    $$("[data-ecosystem-step]", ecosystemHero).forEach(button => {
      button.addEventListener("click", () => updateEcosystemHero(ecosystemHero, button));
    });
  }

  $("[data-experience-lab]")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-lab-option]");
    const lab = event.currentTarget;
    if (!button || !lab.contains(button)) return;

    const data = labAnswers[button.dataset.labOption];
    if (!data) return;

    $$("[data-lab-option]", lab).forEach(option => {
      const isActive = option === button;
      option.classList.toggle("active", isActive);
      option.setAttribute("aria-pressed", String(isActive));
    });

    $("[data-lab-eyebrow]", lab).textContent = data.eyebrow;
    $("[data-lab-title]", lab).textContent = data.title;
    $("[data-lab-body]", lab).textContent = data.body;
    const link = $("[data-lab-link]", lab);
    link.textContent = data.cta;
    link.href = data.href;
  });

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
      href: "contacto.html"
    },
    sales: {
      name: "Plan Negocio",
      label: "Ruta de venta completa",
      body: "Es la mejor opción si quieres explicar servicios, resolver dudas, mostrar proceso y convertir visitas en conversaciones con más intención.",
      href: "contacto.html"
    },
    premium: {
      name: "Plan Premium",
      label: "Experiencia de alta percepción",
      body: "Ideal si tu marca compite por valor, lujo o diferenciación. La web necesita sentirse más editorial, más personalizada y más memorable.",
      href: "contacto.html"
    }
  };

  $("[data-plan-finder]")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-plan-choice]");
    const finder = event.currentTarget;
    if (!button || !finder.contains(button)) return;

    const data = planAnswers[button.dataset.planChoice];
    if (!data) return;

    $$("[data-plan-choice]", finder).forEach(option => {
      const isActive = option === button;
      option.classList.toggle("active", isActive);
      option.setAttribute("aria-pressed", String(isActive));
    });

    $("[data-plan-name]", finder).textContent = data.name;
    $("[data-plan-label]", finder).textContent = data.label;
    $("[data-plan-body]", finder).textContent = data.body;
    $("[data-plan-link]", finder).href = data.href;
  });

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

  // Lead form: sends directly through the secure Vercel email function.
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
      const payload = Object.fromEntries(formData.entries());

      leadForm.classList.add("is-sending");
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Enviando...";
      }
      setStatus("Enviando tu solicitud de forma segura...", "info");

      try {
        const response = await fetch(leadForm.action || "/api/contact", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.ok) {
          throw new Error(result.message || "No se pudo enviar la solicitud.");
        }

        setStatus("Solicitud enviada. Te responderemos pronto en tu correo.", "success");
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
