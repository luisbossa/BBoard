/* ============================================================
   FORMULARIO DE COLECCIÓN: ordenar productos (arrastrar o flechas),
   quitar y agregar. El orden se envía con los <input name="product_ids">
   en el orden en que quedan en la lista.
============================================================ */
(function () {
  const list = document.getElementById("collection-products");
  if (!list) return;

  const select = document.getElementById("add-product-select");
  const addBtn = document.getElementById("add-product-btn");
  const template = document.getElementById("product-row-template");
  const counter = document.querySelector("[data-count]");
  const emptyMsg = document.querySelector("[data-empty]");

  const refresh = () => {
    const n = list.children.length;
    counter.textContent = `(${n})`;
    emptyMsg.hidden = n > 0;
  };

  /* ---------- Flechas y quitar ---------- */
  list.addEventListener("click", (e) => {
    const item = e.target.closest(".sortable__item");
    if (!item) return;

    const move = e.target.closest("[data-move]")?.dataset.move;
    if (move === "up" && item.previousElementSibling) {
      list.insertBefore(item, item.previousElementSibling);
      e.target.closest("button").focus();
    } else if (move === "down" && item.nextElementSibling) {
      list.insertBefore(item.nextElementSibling, item);
      e.target.closest("button").focus();
    }

    if (e.target.closest("[data-remove]")) {
      // Vuelve a estar disponible en el selector.
      const option = new Option(item.querySelector(".sortable__title").textContent, item.dataset.id);
      option.dataset.image = item.querySelector("img").src;
      select.add(option);
      item.remove();
      refresh();
    }
  });

  /* ---------- Arrastrar para ordenar ---------- */
  let dragging = null;
  list.addEventListener("dragstart", (e) => {
    dragging = e.target.closest(".sortable__item");
    dragging?.classList.add("is-dragging");
    e.dataTransfer.effectAllowed = "move";
  });
  list.addEventListener("dragend", () => {
    dragging?.classList.remove("is-dragging");
    dragging = null;
  });
  list.addEventListener("dragover", (e) => {
    e.preventDefault();
    const target = e.target.closest(".sortable__item");
    if (!dragging || !target || target === dragging) return;
    const { top, height } = target.getBoundingClientRect();
    list.insertBefore(dragging, e.clientY < top + height / 2 ? target : target.nextSibling);
  });

  /* ---------- Agregar producto ---------- */
  addBtn.addEventListener("click", () => {
    const option = select.selectedOptions[0];
    if (!option?.value) {
      select.focus();
      return;
    }

    const row = template.content.firstElementChild.cloneNode(true);
    const name = option.textContent.trim().replace(/ \(oculto\)$/, "");
    row.dataset.id = option.value;
    row.querySelector("img").src = option.dataset.image;
    row.querySelector(".sortable__title").textContent = name;
    row.querySelector("input").value = option.value;

    const status = row.querySelector(".status");
    if (option.dataset.active === "false") {
      status.hidden = false;
      status.classList.add("inactive");
      status.textContent = "Oculto";
    } else if (option.dataset.stock === "0") {
      status.hidden = false;
      status.classList.add("cancelled");
      status.textContent = "Agotado";
    }

    list.appendChild(row);
    option.remove();
    select.value = "";
    refresh();
    row.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });

  refresh();
})();
