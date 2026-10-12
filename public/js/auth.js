/* ============================================================
   PÁGINAS DE ACCESO (login, recuperar contraseña)
   Tema, mostrar contraseña, aviso de Bloq Mayús y estado de carga.
============================================================ */
(function () {
  /* ---------- Tema: un botón que rota claro → oscuro → sistema ---------- */
  const themeSwitch = document.querySelector("[data-theme-switch]");
  const SHORT = { light: "Claro", dark: "Oscuro", system: "Sistema" };

  Theme.onChange((pref) => {
    themeSwitch.querySelector("[data-theme-icon]").textContent = Theme.ICONS[pref];
    themeSwitch.querySelector("[data-theme-label]").textContent = SHORT[pref];
    themeSwitch.setAttribute("aria-label", `Tema: ${Theme.LABELS[pref]}. Cambiar tema`);
  });
  themeSwitch.addEventListener("click", Theme.next);

  /* ---------- Mostrar / ocultar contraseña ---------- */
  document.addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-toggle-password]");
    if (!toggle) return;

    const input = document.getElementById(toggle.dataset.togglePassword);
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    toggle.setAttribute("aria-pressed", String(show));
    toggle.setAttribute("aria-label", show ? "Ocultar contraseña" : "Mostrar contraseña");
    toggle.querySelector(".icon").textContent = show ? "visibility_off" : "visibility";
    input.focus();
  });

  /* ---------- Aviso de Bloq Mayús en campos de contraseña ---------- */
  const capsCheck = (e) => {
    // Solo los campos que tienen aviso (contraseñas, aunque estén visibles).
    const hint = e.target.closest?.(".field")?.querySelector("[data-capslock]");
    if (!hint || typeof e.getModifierState !== "function") return;
    hint.hidden = !e.getModifierState("CapsLock");
  };
  document.addEventListener("keydown", capsCheck);
  document.addEventListener("keyup", capsCheck);
  document.addEventListener("focusout", (e) => {
    e.target.closest?.(".field")?.querySelector("[data-capslock]")?.setAttribute("hidden", "");
  });

  /* ---------- Envío: evita doble clic y muestra que está cargando ---------- */
  document.querySelectorAll("[data-auth-form]").forEach((form) => {
    form.addEventListener("submit", () => {
      const button = form.querySelector("[type=submit]");
      button.disabled = true;
      button.classList.add("is-loading");
      button.setAttribute("aria-busy", "true");
      button.querySelector(".btn__label").textContent = button.dataset.loadingText;
    });
  });

  // Al volver con "atrás", el navegador puede restaurar el botón deshabilitado.
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) window.location.reload();
  });
})();
