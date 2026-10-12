/* ============================================================
   TEMA (claro / oscuro / según el sistema) — lógica compartida
   por el panel y las páginas de acceso. El <head> ya aplicó
   data-theme antes de pintar (views/partials/theme-head.ejs).
   API: Theme.get() · Theme.set(pref) · Theme.next() · Theme.onChange(fn)
============================================================ */
(function () {
  const root = document.documentElement;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
  const ORDER = ["light", "dark", "system"];
  const listeners = [];

  const ICONS = { light: "light_mode", dark: "dark_mode", system: "contrast" };
  const LABELS = { light: "claro", dark: "oscuro", system: "según el sistema" };

  function get() {
    try {
      const pref = localStorage.getItem("theme");
      return ORDER.includes(pref) ? pref : "system";
    } catch (e) {
      return "system";
    }
  }

  function apply(pref, animate) {
    const dark = pref === "dark" || (pref === "system" && systemDark.matches);
    if (animate) {
      root.classList.add("theme-transition");
      setTimeout(() => root.classList.remove("theme-transition"), 300);
    }
    root.setAttribute("data-theme", dark ? "dark" : "light");
    listeners.forEach((fn) => fn(pref));
  }

  function set(pref) {
    try {
      localStorage.setItem("theme", pref);
    } catch (e) {}
    apply(pref, true);
  }

  // "Sistema" sigue los cambios del sistema operativo en vivo.
  systemDark.addEventListener("change", () => {
    if (get() === "system") apply("system", true);
  });

  // Otra pestaña cambió el tema.
  window.addEventListener("storage", (e) => {
    if (e.key === "theme") apply(get(), true);
  });

  window.Theme = {
    ICONS,
    LABELS,
    get,
    set,
    next: () => set(ORDER[(ORDER.indexOf(get()) + 1) % ORDER.length]),
    onChange(fn) {
      listeners.push(fn);
      fn(get());
    },
  };
})();
