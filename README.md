# BBoard: panel administrativo de 100Puntadas

Panel interno para gestionar la tienda **100puntadas** (pedidos, clientes, productos y analíticas).
Comparte la base de datos **Neon (PostgreSQL)** con la tienda. ONVO Pay lo maneja la tienda; el panel
solo lee el resultado y aprueba los pagos SINPE.

```
Tienda (100puntadas Node)                 Panel (BBoard Node)
  checkout → INSERT orders (pending)        lee pedidos, clientes, analíticas
  webhook ONVO → orders.paid                aprueba SINPE → POST tienda /webhooks/sinpe-paid
  /webhooks/sinpe-paid → correo cliente     gestiona envío / entrega / cancelación
  lee products/collections (caché 30s) ◄─ administra products, colecciones e imágenes (Vercel Blob)
  checkout: valida stock, product_id      trigger en Neon: descuenta/devuelve stock al pagar/cancelar
                        └──────── Neon PostgreSQL ────────┘
```

## Estructura

```
api/index.js          entrada en Vercel        server.js   entrada local
app.js                configuración de Express (sin listen)
config/env.js         variables de entorno validadas
db/pool.js            conexión (+ pool.transaction)
db/migrations/*.sql   cambios de esquema versionados (solo aditivos)
scripts/              migrate · backup · create-admin
middlewares/          auth (sesión + roles) · flash · upload · errorHandler
routes/               authRoute (/, /reset) · dashboardRoute (/dashboard/*)
controllers/          un archivo por sección; solo HTTP (req/res)
services/             toda la lógica y el SQL, por dominio
utils/                format (₡, fechas, estados) · mailer · httpError
views/                layouts · partials · auth · orders · customers · products · users
public/               css (admin.css = componentes del panel) · js (panel.js común)
```

Regla: **controller → service → db**. Las vistas no consultan la base y los controladores no escriben SQL.

## Puesta en marcha

```bash
npm install
cp .env.example .env            # completar valores
npm run migrate                 # aplica migraciones pendientes
npm run dev                     # http://localhost:3001
```

| Script | Qué hace |
|---|---|
| `npm run backup` | Respaldo JSON de todas las tablas en `backups/` (ignorado por git) |
| `npm run migrate -- --status` | Lista migraciones aplicadas y pendientes |
| `npm run migrate -- --dry-run` | Prueba las pendientes y revierte (no guarda nada) |
| `npm run create-admin -- usuario clave "Nombre" correo` | Crea o restablece un administrador |
| `npm run icons` | Regenera `config/icons.json` (íconos que se piden a Google Fonts). Correrlo al usar un ícono nuevo; en desarrollo el servidor avisa si falta alguno |
| `npm run reconcile-onvo [-- --dry-run]` | Concilia pedidos con tarjeta contra ONVO |

**Antes de migrar en producción:** `npm run backup` y, si es posible, un branch de Neon.

## Roles

| Rol | Acceso |
|---|---|
| `admin` | Todo, incluidos los usuarios del panel |
| `manager` | Pedidos, productos, clientes y analíticas (lectura y escritura) |
| `user` | Solo lectura |

## Productos

El panel es la única fuente del catálogo: la tienda lee `products`, `product_images`, `product_sizes`,
`product_styles` y `collections` de Neon.

- **Ocultar** (`active = false`): desaparece de la tienda, se conserva. **Eliminar**: si tiene ventas, se oculta.
- **Stock**: vacío = bajo pedido; 0 = agotado. Un trigger (`004_stock_trigger.sql`) descuenta al pasar a pagado
  y devuelve al cancelar un pedido pagado.
- **Slug**: si se cambia, el anterior queda en `product_slug_redirects` y la tienda redirige (301).
- El `slug` también es el id que guarda el carrito del navegador; el checkout resuelve slugs anteriores con la misma tabla.

## Ciclo de un pedido

`pending` → `paid` → `shipped` → `delivered`; desde `pending` o `paid` se puede pasar a `cancelled`.
Cada cambio guarda su fecha (`paid_at`, `shipped_at`…) y queda en `user_activity` con el usuario que lo hizo.

## Despliegue (Vercel)

Variables: `DATABASE_URL`, `JWT_SECRET`, `APP_URL`, `STORE_URL`, `SINPE_WEBHOOK_SECRET` (igual al de la tienda),
`BLOB_READ_WRITE_TOKEN`, `MAIL_USER`, `MAIL_PASS`, `NODE_ENV=production`.
