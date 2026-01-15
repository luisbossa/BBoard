let approveResolve = null;

async function approveOrder(button) {
  const id = button.dataset.orderId;

  // 👉 reemplazo del confirm()
  const confirmed = await openApproveModal();
  if (!confirmed) return;

  try {
    const res = await fetch(`/dashboard/orders/${id}/approve`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    if (!data.ok) {
      showApproveMsg(data.message || "Error al aprobar el pago", true);
      return;
    }

    showApproveMsg("Pago aprobado correctamente");

    // =============================
    // ACTUALIZAR TARJETA / TICKET
    // =============================
    const ticket = document.querySelector(
      `.order-ticket[data-order-id="${id}"]`
    );

    if (ticket) {
      // 1️⃣ cambiar badge a PAID
      const statusBadge = ticket.querySelector(".status");
      if (statusBadge) {
        statusBadge.textContent = "paid";
        statusBadge.classList.remove("pending");
        statusBadge.classList.add("paid");
      }

      // 2️⃣ eliminar botón aprobar
      const approveBtn = ticket.querySelector(".btn-action.approve");
      if (approveBtn) approveBtn.remove();
    }

    // =============================
    // ACTUALIZAR TABLA RECIENTE
    // =============================
    const row = document.querySelector(`tr[data-order-id="${id}"]`);

    if (row) {
      const statusEl = row.querySelector("[data-status]");

      if (statusEl) {
        statusEl.textContent = "paid";
        statusEl.classList.remove("order-ready", "order-shipped");
        statusEl.classList.add("order-paid");
      }
    }
  } catch (err) {
    showApproveMsg("Error de conexión con el servidor", true);
  }
}

function openApproveModal() {
  const modal = document.getElementById("approve-modal");
  modal.classList.remove("hidden");

  return new Promise((resolve) => {
    approveResolve = resolve;
  });
}

document.getElementById("approve-cancel").onclick = () => {
  document.getElementById("approve-modal").classList.add("hidden");
  approveResolve(false);
};

document.getElementById("approve-confirm").onclick = () => {
  document.getElementById("approve-modal").classList.add("hidden");
  approveResolve(true);
};

function showApproveMsg(text, isError = false) {
  const msg = document.getElementById("approve-msg");
  msg.textContent = text;
  msg.classList.remove("hidden", "error");

  if (isError) msg.classList.add("error");

  setTimeout(() => {
    msg.classList.add("hidden");
  }, 3000);
}
