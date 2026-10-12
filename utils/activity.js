const fmt = require("./format");

/* ============================================================
   PRESENTACIÓN DE LA ACTIVIDAD — convierte un evento de la línea
   de tiempo (activityService.feed) en lo que muestra la vista:
   { icon, tone, actor, isSystem, text, target: { label, href }, detail }
   tone: accent | info | success | warning | danger | muted
============================================================ */
const STYLE = {
  order_received: ["shopping_bag", "info"],
  order_paid: ["payments", "success"],
  order_shipped: ["local_shipping", "info"],
  order_delivered: ["check_circle", "success"],
  order_cancelled: ["cancel", "danger"],
  order_notes: ["sticky_note_2", "muted"],
  product_created: ["add_box", "accent"],
  product_updated: ["edit", "muted"],
  product_deleted: ["delete", "danger"],
  product_activated: ["visibility", "success"],
  product_deactivated: ["visibility_off", "muted"],
  collection_created: ["collections_bookmark", "accent"],
  collection_updated: ["edit_note", "muted"],
  collection_deleted: ["delete", "danger"],
  collection_activated: ["visibility", "success"],
  collection_deactivated: ["visibility_off", "muted"],
  collection_reordered: ["swap_vert", "muted"],
  campaign_created: ["sell", "accent"],
  campaign_updated: ["sell", "muted"],
  campaign_deleted: ["delete", "danger"],
  campaign_deactivated: ["sell", "muted"],
  user_created: ["person_add", "accent"],
  user_updated: ["manage_accounts", "muted"],
  user_activated: ["how_to_reg", "success"],
  user_deactivated: ["person_off", "danger"],
};

function target(m) {
  if (m.orderId) return { label: `#${m.orderNumber || m.orderId}`, href: `/dashboard/orders/${m.orderId}` };
  if (m.productId) return { label: m.name || `#${m.productId}`, href: `/dashboard/products/${m.productId}/edit` };
  if (m.collectionId) return { label: m.name || `#${m.collectionId}`, href: `/dashboard/collections/${m.collectionId}/edit` };
  if (m.campaignId) return { label: m.name || `#${m.campaignId}`, href: `/dashboard/promotions/${m.campaignId}/edit` };
  if (m.userId) return { label: m.username || `#${m.userId}`, href: `/dashboard/users/${m.userId}/edit` };
  return null;
}

function present(event) {
  const m = event.metadata || {};
  const [icon, tone] = STYLE[event.action] || ["history", "muted"];

  // Pedido nuevo: lo "hace" la tienda, no un usuario.
  if (event.action === "order_received") {
    return {
      icon,
      tone,
      actor: "Tienda",
      isStore: true,
      text: "recibió un nuevo pedido",
      target: target(m),
      detail: [m.client, fmt.money(m.total), fmt.payment(m.method)].filter(Boolean).join(" · "),
    };
  }

  const detail = [];
  if (event.action === "collection_reordered") detail.push(m.direction === "up" ? "Subió una posición" : "Bajó una posición");
  if (m.from && event.action.startsWith("order_")) detail.push(`Antes: ${fmt.status(m.from)}`);

  return {
    icon,
    tone,
    actor: event.actor || "Sistema",
    isSystem: !event.user_id,
    text: fmt.ACTIVITY[event.action] || event.action,
    target: target(m),
    detail: detail.join(" · "),
    reason: m.reason || null,
  };
}

// "Hoy", "Ayer" o "lunes, 6 de octubre" (día calendario de Costa Rica).
function dayLabel(date) {
  const key = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Costa_Rica" });
  const today = key(new Date());
  const yesterday = key(Date.now() - 86400000);
  const day = key(date);
  if (day === today) return "Hoy";
  if (day === yesterday) return "Ayer";
  const label = new Date(date).toLocaleDateString("es-CR", {
    timeZone: "America/Costa_Rica",
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(day.slice(0, 4) !== today.slice(0, 4) && { year: "numeric" }),
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Agrupa eventos consecutivos por día: [{ label, items: [...] }]
function groupByDay(events) {
  const groups = [];
  for (const event of events) {
    const label = dayLabel(event.at);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(event);
    else groups.push({ label, items: [event] });
  }
  return groups;
}

const time = (date) =>
  new Date(date).toLocaleTimeString("es-CR", { timeZone: "America/Costa_Rica", hour: "numeric", minute: "2-digit" });

module.exports = { present, groupByDay, time };
