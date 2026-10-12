/* ============================================================
   PANEL — comportamiento común a todas las páginas:
   sidebar, modo oscuro, notificaciones, confirmaciones y filas
   de tabla clicables.
============================================================ */
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- Sidebar ---------- */
  const sidebar = $("#sidebar");
  const main = $(".main");
  const MOBILE = 1280;

  try {
    if (localStorage.getItem("sidebar") === "collapsed" && window.innerWidth > MOBILE) {
      sidebar.classList.add("collapsed");
      main.classList.add("sidebar-collapsed");
    }
  } catch (e) {}

  $("#sidebar-btn")?.addEventListener("click", () => {
    if (window.innerWidth <= MOBILE) return;
    const collapsed = sidebar.classList.toggle("collapsed");
    main.classList.toggle("sidebar-collapsed", collapsed);
    try { localStorage.setItem("sidebar", collapsed ? "collapsed" : "open"); } catch (e) {}
  });

  $("#mobile-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebar.classList.add("active");
  });
  $("#sidebar-close")?.addEventListener("click", () => sidebar.classList.remove("active"));
  document.addEventListener("click", (e) => {
    if (window.innerWidth <= MOBILE && !sidebar.contains(e.target)) sidebar.classList.remove("active");
  });

  /* ---------- Menú de tema del header (lógica en theme.js) ---------- */
  Theme.onChange((pref) => {
    const icon = $("#themeIcon");
    if (icon) icon.textContent = Theme.ICONS[pref];
    $("#themeBtn")?.setAttribute("aria-label", `Tema: ${Theme.LABELS[pref]}. Cambiar tema`);
    $$("[data-theme-choice]").forEach((item) =>
      item.setAttribute("aria-checked", String(item.dataset.themeChoice === pref)),
    );
  });

  const themeMenu = $("#themeMenu");
  const themeBtn = $("#themeBtn");
  const setMenu = (open) => {
    themeMenu.classList.toggle("open", open);
    themeBtn.setAttribute("aria-expanded", String(open));
  };

  themeBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = !themeMenu.classList.contains("open");
    $("#notificationBtn")?.classList.remove("active");
    setMenu(open);
    if (open) themeMenu.querySelector('[aria-checked="true"]')?.focus();
  });

  themeMenu?.addEventListener("click", (e) => {
    const item = e.target.closest("[data-theme-choice]");
    if (!item) return;
    Theme.set(item.dataset.themeChoice);
    setMenu(false);
    themeBtn.focus();
  });

  // Teclado: flechas para moverse, Escape para cerrar.
  themeMenu?.addEventListener("keydown", (e) => {
    const items = $$("[data-theme-choice]", themeMenu);
    const index = items.indexOf(document.activeElement);
    if (e.key === "Escape") {
      setMenu(false);
      themeBtn.focus();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (index + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[next].focus();
    }
  });

  document.addEventListener("click", (e) => {
    if (themeMenu && !themeMenu.contains(e.target)) setMenu(false);
  });

  /* ---------- Toast ---------- */
  window.showToast = (text, isError = false) => {
    const toast = $("#toast");
    toast.textContent = text;
    toast.classList.toggle("error", isError);
    toast.classList.remove("hidden");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.add("hidden"), 3500);
  };

  /* ---------- Confirmación: <form data-confirm="texto"> ---------- */
  const modal = $("#confirm-modal");
  let pendingForm = null;

  document.addEventListener("submit", (e) => {
    const form = e.target;
    if (!form.dataset.confirm || form.dataset.confirmed) return;
    e.preventDefault();
    pendingForm = form;
    $("#confirm-text").textContent = form.dataset.confirm;
    modal.classList.remove("hidden");
    $("#confirm-ok").focus();
  });

  const closeModal = () => {
    modal.classList.add("hidden");
    pendingForm = null;
  };
  $("#confirm-cancel")?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && pendingForm) closeModal(); });

  $("#confirm-ok")?.addEventListener("click", () => {
    const form = pendingForm;
    modal.classList.add("hidden");
    if (!form) return;
    form.dataset.confirmed = "1";
    form.querySelectorAll("button[type=submit]").forEach((b) => (b.disabled = true));
    form.submit();
  });

  /* ---------- Imágenes que no cargan → marcador neutro ---------- */
  document.addEventListener(
    "error",
    (e) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement) || img.classList.contains("img-missing")) return;
      img.classList.add("img-missing");
      img.title = "Imagen no disponible";
      img.removeAttribute("srcset");
      img.src = "data:image/svg+xml," + encodeURIComponent(
        // Gris semitransparente: se ve bien sobre fondo claro y oscuro.
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="rgba(128,138,152,0.16)"/>' +
        '<path d="M5 17l4-5 3 4 2-3 5 4H5z" fill="rgba(128,138,152,0.55)"/><circle cx="9" cy="8" r="1.8" fill="rgba(128,138,152,0.55)"/></svg>',
      );
    },
    true, // los errores de <img> no burbujean: se capturan
  );

  /* ---------- Filas de tabla clicables ---------- */
  document.addEventListener("click", (e) => {
    const row = e.target.closest("tr[data-href]");
    if (!row || e.target.closest("a, button, input, form")) return;
    window.location.href = row.dataset.href;
  });

  /* ---------- Notificaciones ---------- */
  const notifBtn = $("#notificationBtn");
  notifBtn?.addEventListener("click", (e) => {
    if (e.target.closest("a")) return;
    e.stopPropagation();
    if (themeMenu) setMenu(false);
    notifBtn.classList.toggle("active");
  });
  document.addEventListener("click", () => notifBtn?.classList.remove("active"));

  const money = (n) => "₡" + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  function timeAgo(value) {
    const seconds = Math.floor((Date.now() - new Date(value)) / 1000);
    const units = [[31536000, "año", "años"], [2592000, "mes", "meses"], [86400, "día", "días"], [3600, "hora", "horas"], [60, "minuto", "minutos"]];
    for (const [size, one, many] of units) {
      const n = Math.floor(seconds / size);
      if (n >= 1) return `hace ${n} ${n === 1 ? one : many}`;
    }
    return "hace unos segundos";
  }

  async function loadNotifications() {
    if (!notifBtn) return;
    try {
      const res = await fetch("/dashboard/api/notifications", { headers: { Accept: "application/json" } });
      if (!res.ok) return;
      const data = await res.json();

      const badge = $(".notification-badge", notifBtn);
      badge.textContent = data.actionable;
      badge.classList.toggle("hidden", data.actionable === 0);
      $(".notification-header small", notifBtn).textContent =
        `${data.counts.pending} por pagar · ${data.counts.to_ship} por enviar`;

      const list = $(".notification-list", notifBtn);
      list.replaceChildren(
        ...data.items.map((n) => {
          const li = document.createElement("li");
          const link = document.createElement("a");
          link.className = `notification-item ${n.type}`;
          link.href = `/dashboard/orders/${n.orderId}`;
          link.innerHTML = '<span class="material-symbols-rounded"></span><div><p><strong></strong></p><small></small></div>';
          link.querySelector("span").textContent = n.icon;
          link.querySelector("strong").textContent = n.message;
          link.querySelector("small").textContent =
            `${money(n.total)} · ${n.paymentMethod === "sinpe" ? "SINPE" : "Tarjeta"} · ${timeAgo(n.date)}`;
          li.appendChild(link);
          return li;
        }),
      );
    } catch (err) {
      console.error("Notificaciones:", err.message);
    }
  }

  loadNotifications();
  setInterval(loadNotifications, 60_000);
})();
