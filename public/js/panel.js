/* ============================================================
   PANEL — comportamiento común a todas las páginas:
   sidebar, desplegables del header, búsqueda, pestañas,
   confirmaciones, notificaciones y filas de tabla clicables.
   El tema vive en theme.js.
============================================================ */
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const root = document.documentElement;
  const isDesktop = () => window.matchMedia("(min-width: 1025px)").matches;

  /* ---------- Sidebar: contraer (escritorio) ---------- */
  const sidebar = $("#sidebar");
  const collapseBtn = $("#sidebar-btn");

  function syncCollapse() {
    const collapsed = root.getAttribute("data-sidebar") === "collapsed";
    collapseBtn?.setAttribute("aria-pressed", String(collapsed));
    collapseBtn?.setAttribute("aria-label", collapsed ? "Expandir menú" : "Contraer menú");
  }

  collapseBtn?.addEventListener("click", () => {
    const collapsed = root.getAttribute("data-sidebar") !== "collapsed";
    if (collapsed) root.setAttribute("data-sidebar", "collapsed");
    else root.removeAttribute("data-sidebar");
    try { localStorage.setItem("sidebar", collapsed ? "collapsed" : "open"); } catch (e) {}
    hideTooltip();
    syncCollapse();
  });
  syncCollapse();

  /* ---------- Sidebar: panel deslizable (móvil) ---------- */
  const backdrop = $("#sidebar-backdrop");
  const menuBtn = $("#mobile-btn");

  function setMobileMenu(open) {
    sidebar.classList.toggle("is-open", open);
    backdrop.hidden = !open;
    menuBtn?.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
    if (open) $(".sidebar__link.is-active, .sidebar__link", sidebar)?.focus();
    else menuBtn?.focus();
  }

  menuBtn?.addEventListener("click", () => setMobileMenu(true));
  $("#sidebar-close")?.addEventListener("click", () => setMobileMenu(false));
  backdrop?.addEventListener("click", () => setMobileMenu(false));
  window.matchMedia("(min-width: 1025px)").addEventListener("change", () => {
    if (sidebar.classList.contains("is-open")) setMobileMenu(false);
  });

  /* ---------- Tooltip del menú contraído ---------- */
  const tooltip = document.createElement("div");
  tooltip.className = "sidebar-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.hidden = true;
  document.body.appendChild(tooltip);

  function showTooltip(link) {
    if (!isDesktop() || root.getAttribute("data-sidebar") !== "collapsed") return;
    const rect = link.getBoundingClientRect();
    tooltip.textContent = link.dataset.tooltip;
    tooltip.style.left = `${rect.right + 12}px`;
    tooltip.style.top = `${rect.top + rect.height / 2}px`;
    tooltip.hidden = false;
  }
  function hideTooltip() {
    tooltip.hidden = true;
  }

  sidebar?.addEventListener("mouseover", (e) => {
    const link = e.target.closest("[data-tooltip]");
    if (link) showTooltip(link);
  });
  sidebar?.addEventListener("mouseout", hideTooltip);
  sidebar?.addEventListener("focusin", (e) => {
    const link = e.target.closest("[data-tooltip]");
    if (link) showTooltip(link);
  });
  sidebar?.addEventListener("focusout", hideTooltip);
  $(".sidebar__nav")?.addEventListener("scroll", hideTooltip);

  /* ---------- Desplegables (tema, notificaciones, usuario) ---------- */
  const dropdowns = $$("[data-dropdown]");

  function setDropdown(dropdown, open) {
    dropdown.classList.toggle("is-open", open);
    $("[data-dropdown-toggle]", dropdown).setAttribute("aria-expanded", String(open));
    if (open) dropdown.dispatchEvent(new CustomEvent("dropdown:open"));
  }
  const closeAll = (except) =>
    dropdowns.forEach((d) => d !== except && d.classList.contains("is-open") && setDropdown(d, false));

  dropdowns.forEach((dropdown) => {
    const toggle = $("[data-dropdown-toggle]", dropdown);

    toggle.addEventListener("click", () => {
      const open = !dropdown.classList.contains("is-open");
      closeAll(dropdown);
      setDropdown(dropdown, open);
      if (open) $('[aria-checked="true"], .menu-item', dropdown)?.focus();
    });

    // Teclado: flechas entre opciones, Escape cierra y devuelve el foco.
    dropdown.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && dropdown.classList.contains("is-open")) {
        setDropdown(dropdown, false);
        toggle.focus();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const items = $$(".menu-item", dropdown);
        if (!items.length) return;
        e.preventDefault();
        const index = items.indexOf(document.activeElement);
        items[(index + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
      }
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-dropdown]")) closeAll();
  });

  /* ---------- Tema (opciones del menú) ---------- */
  Theme.onChange((pref) => {
    const icon = $("#themeIcon");
    if (icon) icon.textContent = Theme.ICONS[pref];
    $("#themeBtn")?.setAttribute("aria-label", `Tema: ${Theme.LABELS[pref]}. Cambiar tema`);
    $$("[data-theme-choice]").forEach((item) =>
      item.setAttribute("aria-checked", String(item.dataset.themeChoice === pref)),
    );
  });

  document.addEventListener("click", (e) => {
    const item = e.target.closest("[data-theme-choice]");
    if (!item) return;
    Theme.set(item.dataset.themeChoice);
    closeAll();
    $("#themeBtn")?.focus();
  });

  /* ---------- Teclado global: Ctrl/⌘+K busca, Escape cierra el menú móvil ---------- */
  const search = $("#global-search");
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && search) {
      e.preventDefault();
      search.focus();
      search.select();
    } else if (e.key === "Escape" && sidebar.classList.contains("is-open")) {
      setMobileMenu(false);
    }
  });
  if (search && navigator.platform.includes("Mac")) {
    $(".search__kbd").textContent = "⌘ K";
  }

  /* ---------- Pestañas: [data-tabs] > [role=tab][aria-controls] ---------- */
  $$("[data-tabs]").forEach((tablist) => {
    const tabs = $$("[role=tab]", tablist);
    const select = (tab) => {
      tabs.forEach((t) => {
        const selected = t === tab;
        t.setAttribute("aria-selected", String(selected));
        t.tabIndex = selected ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !selected;
      });
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(tab));
      tab.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const next = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
        select(next);
        next.focus();
      });
    });
  });

  /* ---------- Avisos flash: salida animada; los de éxito se van solos ---------- */
  const dismissFlash = (flash) => {
    if (!flash || flash.classList.contains("is-leaving")) return;
    flash.classList.add("is-leaving");
    flash.addEventListener("animationend", () => flash.remove(), { once: true });
  };

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-flash-close]")) dismissFlash(e.target.closest(".flash"));
  });

  document.querySelectorAll(".flash-success").forEach((flash) => {
    let timer;
    const start = () => (timer = setTimeout(() => dismissFlash(flash), 6000));
    flash.addEventListener("mouseenter", () => clearTimeout(timer));
    flash.addEventListener("mouseleave", start);
    start();
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
  const notifications = $("#notifications");
  const money = (n) => "₡" + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const relative = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

  function timeAgo(value) {
    const seconds = (new Date(value) - Date.now()) / 1000;
    for (const [unit, size] of [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]]) {
      if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
    }
    return "hace un momento";
  }

  function renderNotification(n) {
    const li = document.createElement("li");
    li.innerHTML =
      '<a class="notif-item"><span class="notif-item__icon material-symbols-rounded" aria-hidden="true"></span>' +
      '<span class="notif-item__body"><strong></strong><span class="notif-item__meta"></span></span></a>';
    const link = $("a", li);
    link.href = `/dashboard/orders/${n.orderId}`;
    const icon = $(".notif-item__icon", li);
    icon.textContent = n.icon;
    icon.classList.add(n.type);
    $("strong", li).textContent = n.message;
    $(".notif-item__meta", li).textContent =
      `${money(n.total)} · ${n.paymentMethod === "sinpe" ? "SINPE" : "Tarjeta"} · ${timeAgo(n.date)}`;
    return li;
  }

  async function loadNotifications() {
    if (!notifications) return;
    try {
      const res = await fetch("/dashboard/api/notifications", { headers: { Accept: "application/json" } });
      if (!res.ok) return;
      const data = await res.json();

      const badge = $("[data-notif-badge]", notifications);
      badge.textContent = data.actionable > 99 ? "99+" : data.actionable;
      badge.hidden = data.actionable === 0;
      $("[data-dropdown-toggle]", notifications).setAttribute(
        "aria-label",
        `Notificaciones: ${data.counts.pending} por cobrar, ${data.counts.to_ship} por enviar`,
      );
      $("[data-notif-summary]", notifications).textContent =
        `${data.counts.pending} por cobrar · ${data.counts.to_ship} por enviar`;

      const list = $("[data-notif-list]", notifications);
      list.replaceChildren(
        ...(data.items.length
          ? data.items.map(renderNotification)
          : [Object.assign(document.createElement("li"), { className: "notif-list__empty", textContent: "Sin novedades" })]),
      );
    } catch (err) {
      console.error("Notificaciones:", err.message);
    }
  }

  // El contador llega renderizado desde el servidor: la lista se pide solo al abrir
  // la campana, y el contador se refresca cada 2 min mientras la pestaña está visible.
  notifications?.addEventListener("dropdown:open", loadNotifications);
  setInterval(() => document.visibilityState === "visible" && loadNotifications(), 120_000);
})();
