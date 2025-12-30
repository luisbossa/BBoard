function printOrder(btn) {
  const ticket = btn.closest(".order-ticket");

  const printWindow = window.open("", "_blank", "width=900,height=700");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Orden de Pedido</title>
        <link rel="stylesheet" href="/css/print.css" />
      </head>
      <body>
        <div class="print-page">

          <header class="print-header">
            <img src="/images/logo.png" class="print-logo" />
            <div class="print-header-info">
              <h1>Orden de Pedido</h1>
              <span>Documento interno</span>
              <span>${new Date().toLocaleDateString()}</span>
            </div>
          </header>

          <section class="print-content">
            ${ticket.outerHTML}
          </section>

          <footer class="print-footer">
            <span>BBOARD · Sistema de gestión</span>
            <span>${new Date().toLocaleString()}</span>
          </footer>

        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 400);
}
