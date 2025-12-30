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
