function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return `${interval} año${interval > 1 ? "s" : ""} atrás`;

  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return `${interval} mes${interval > 1 ? "es" : ""} atrás`;

  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return `${interval} día${interval > 1 ? "s" : ""} atrás`;

  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `${interval} hora${interval > 1 ? "s" : ""} atrás`;

  interval = Math.floor(seconds / 60);
  if (interval >= 1)
    return `${interval} minuto${interval > 1 ? "s" : ""} atrás`;

  return "Hace unos segundos";
}

// Iconos según tipo de notificación
function getIcon(type) {
  switch (type) {
    case "order_paid":
      return "payments";
    case "order_completed":
      return "check_circle";
    default:
      return "shopping_cart";
  }
}

// Cargar notificaciones desde la API
async function loadNotifications() {
  try {
    const res = await fetch("/dashboard/notifications", {
      credentials: "include", // 👈 permite enviar cookies
    });

    if (!res.ok) throw new Error("No se pudo cargar las notificaciones");

    const data = await res.json();

    const list = document.querySelector(".notification-list");
    const badge = document.querySelector(".notification-badge");
    const subtitle = document.querySelector(".notification-header small");

    list.innerHTML = "";

    badge.textContent = data.length;
    subtitle.textContent = `${data.length} notificación${
      data.length !== 1 ? "es" : ""
    }`;

    data.forEach((n) => {
      const li = document.createElement("li");
      li.className = `notification-item unread ${n.type}`;

      li.innerHTML = `
        <span class="material-symbols-rounded">${getIcon(n.type)}</span>
        <div>
          <p><strong>${n.message}</strong></p>
          <small>
            Orden #${n.id} · ₡${Number(n.metadata.total).toLocaleString()} · 
            ${n.metadata.paymentMethod?.toUpperCase() || "—"} · 
            ${timeAgo(n.created_at)}
          </small>
        </div>
      `;

      list.appendChild(li);
    });
  } catch (err) {
    console.error("Error cargando notificaciones:", err.message);
  }
}

// Ejecutar al cargar la página
document.addEventListener("DOMContentLoaded", loadNotifications);
