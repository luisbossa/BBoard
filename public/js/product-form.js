/* ============================================================
   FORMULARIO DE PRODUCTO: galería ordenable, vista previa de
   imágenes nuevas, coberturas (solo bikini) y stock.
============================================================ */
(function () {
  const form = document.getElementById("product-form");
  if (!form) return;

  /* ---------- Galería: quitar y arrastrar para ordenar ---------- */
  const gallery = document.getElementById("gallery");
  let dragging = null;

  gallery.addEventListener("click", (e) => {
    if (e.target.matches(".gallery-remove")) e.target.closest("li").remove();
  });
  gallery.addEventListener("dragstart", (e) => {
    dragging = e.target.closest("li");
    dragging?.classList.add("dragging");
  });
  gallery.addEventListener("dragend", () => {
    dragging?.classList.remove("dragging");
    dragging = null;
  });
  gallery.addEventListener("dragover", (e) => {
    e.preventDefault();
    const target = e.target.closest("li");
    if (!dragging || !target || target === dragging) return;
    const { left, width } = target.getBoundingClientRect();
    target.parentNode.insertBefore(dragging, e.clientX < left + width / 2 ? target : target.nextSibling);
  });

  /* ---------- Vista previa de imágenes nuevas ---------- */
  const fileInput = document.getElementById("new-images");
  const preview = document.getElementById("new-preview");
  const MAX = 4 * 1024 * 1024;

  fileInput.addEventListener("change", () => {
    preview.replaceChildren();
    const tooBig = [...fileInput.files].filter((f) => f.size > MAX);
    if (tooBig.length) {
      window.showToast(`${tooBig.map((f) => f.name).join(", ")} supera 4 MB`, true);
      fileInput.value = "";
      return;
    }
    [...fileInput.files].forEach((file) => {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.alt = file.name;
      preview.appendChild(img);
    });
  });

  /* ---------- Coberturas (solo bikini) ---------- */
  const typeSelect = document.getElementById("product-type");
  const stylesBox = document.getElementById("styles-box");
  const stylesList = document.getElementById("styles-list");

  typeSelect.addEventListener("change", () => {
    stylesBox.hidden = typeSelect.value !== "bikini";
  });
  document.getElementById("add-style").addEventListener("click", () => {
    stylesList.appendChild(document.getElementById("style-template").content.cloneNode(true));
  });
  stylesList.addEventListener("click", (e) => {
    if (e.target.matches("[data-remove-row]")) e.target.closest(".style-row").remove();
  });

  /* ---------- Stock: el número solo aplica si se controlan unidades ---------- */
  const stockInput = document.getElementById("stock-input");
  const syncStock = () => {
    stockInput.disabled = form.querySelector("[name=stock_mode]:checked")?.value !== "tracked";
  };
  form.querySelectorAll("[name=stock_mode]").forEach((r) => r.addEventListener("change", syncStock));
  syncStock();

  /* ---------- Envío: al menos una imagen ---------- */
  form.addEventListener("submit", (e) => {
    if (!gallery.children.length && !fileInput.files.length) {
      e.preventDefault();
      window.showToast("Agrega al menos una imagen", true);
      return;
    }
    form.querySelector("button[type=submit]").disabled = true;
  });
})();
