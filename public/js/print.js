/* Imprime el ticket de un pedido: <button data-print> dentro de .order-ticket */
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-print]");
  if (!btn) return;

  const ticket = btn.closest(".order-ticket").cloneNode(true);
  ticket.querySelectorAll(".no-print").forEach((el) => el.remove());

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return window.showToast?.("Permite las ventanas emergentes para imprimir", true);

  const now = new Date();
  win.document.write(`<!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Orden de pedido</title>
        <link rel="stylesheet" href="/css/print.css" />
      </head>
      <body>
        <div class="print-page">
          <header class="print-header">
            <img src="/images/logo.png" class="print-logo" alt="100Puntadas" />
            <div class="print-header-info">
              <h1>Orden de pedido</h1>
              <span>Documento interno</span>
              <span>${now.toLocaleDateString("es-CR")}</span>
            </div>
          </header>
          <section class="print-content">${ticket.outerHTML}</section>
          <footer class="print-footer">
            <span>100Puntadas · Panel administrativo</span>
            <span>${now.toLocaleString("es-CR")}</span>
          </footer>
        </div>
      </body>
    </html>`);
  win.document.close();
  win.focus();

  // Espera a que carguen CSS e imágenes antes de imprimir.
  win.onload = () => {
    win.print();
    win.close();
  };
});
