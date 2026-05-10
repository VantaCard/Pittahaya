(() => {
  document.documentElement.classList.add("js");

  const els = Array.from(document.querySelectorAll("[data-reveal]"));

  if (!("IntersectionObserver" in window)) {
    els.forEach(el => el.classList.add("in"));
  } else {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.01, rootMargin: "0px 0px 140px 0px" });

    els.forEach(el => observer.observe(el));
  }

  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!canHover) return;

  const targets = Array.from(document.querySelectorAll([
    ".heroGrid > div",
    ".launchPanel",
    ".executivePanel",
    ".brandStage",
    ".serviceStage",
    ".productStage",
    ".editorialFrame",
    ".offer",
    ".authority",
    ".matrixCard",
    ".item",
    ".feature",
    ".signatureCard",
    ".campaignPanel",
    ".reportCard",
    ".pathCard",
    ".brandCta",
    ".demoCta",
    ".corpCta",
    ".serviceCta",
    ".startupCta",
    ".luxCta"
  ].join(",")));

  targets.forEach((target) => {
    target.classList.add("demo-tilt");
    target.addEventListener("pointermove", (event) => {
      const rect = target.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      target.style.setProperty("--tilt-x", `${(x * 5).toFixed(2)}deg`);
      target.style.setProperty("--tilt-y", `${(-y * 5).toFixed(2)}deg`);
      target.classList.add("is-demo-tilting");
    });
    target.addEventListener("pointerleave", () => {
      target.classList.remove("is-demo-tilting");
      target.style.removeProperty("--tilt-x");
      target.style.removeProperty("--tilt-y");
    });
  });
})();
