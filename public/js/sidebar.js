const sidebar = document.querySelector(".sidebar");
const main = document.querySelector(".main");
const sidebarBtn = document.getElementById("sidebar-btn");

sidebarBtn.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  main.classList.toggle("sidebar-collapsed");
});

document.querySelectorAll(".sidebar-menu-dropdown").forEach((dropdown) => {
  dropdown.addEventListener("click", (e) => {
    e.preventDefault();

    const submenu = dropdown.nextElementSibling;
    const icon = dropdown.querySelector(".dropdown-icon");
    const isOpen = submenu.style.height && submenu.style.height !== "0px";

    // cerrar todos
    document
      .querySelectorAll(".sidebar-menu-dropdown-content")
      .forEach((menu) => {
        menu.style.height = "0px";
      });

    document.querySelectorAll(".dropdown-icon").forEach((i) => {
      i.classList.remove("active");
    });

    // abrir el actual
    if (!isOpen) {
      submenu.style.height = submenu.scrollHeight + "px";
      icon.classList.add("active");
    }
  });
});

// ===============================
// ACTIVO ÚNICO EN SIDEBAR
// ===============================
const sidebarLinks = document.querySelectorAll(".sidebar-menu a");

sidebarLinks.forEach((link) => {
  link.addEventListener("click", () => {
    // quitar active de todos
    sidebarLinks.forEach((l) => l.classList.remove("active"));

    // agregar active al clickeado
    link.classList.add("active");

    // si está dentro de un submenu, marcar también el padre
    const parentSubmenu = link.closest(".sidebar-submenu");
    if (parentSubmenu) {
      const parentLink = parentSubmenu.querySelector(".sidebar-menu-dropdown");
      if (parentLink) parentLink.classList.add("active");
    }
  });
});

// ===============================
// NOTIFICATION BTN
// ===============================
const notificationBtn = document.getElementById("notificationBtn");

notificationBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  notificationBtn.classList.toggle("active");
});

document.addEventListener("click", () => {
  notificationBtn.classList.remove("active");
});

/* ===============================
   TOGGLE DARK MODE
================================ */
const darkToggle = document.getElementById("darkmode-toggle");
const darkSwitch = darkToggle.querySelector(".darkmode-switch");
const body = document.body;

/* ===============================
   CARGAR ESTADO GUARDADO
================================ */
const isDark = localStorage.getItem("theme") === "dark";

if (isDark) {
  body.classList.add("dark");
  darkSwitch.classList.add("active");
}

darkToggle.addEventListener("click", (e) => {
  e.preventDefault();

  body.classList.toggle("dark");
  darkSwitch.classList.toggle("active");

  localStorage.setItem(
    "theme",
    body.classList.contains("dark") ? "dark" : "light"
  );
});
