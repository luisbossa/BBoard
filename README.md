# BBoard: panel administrativo de 100Puntadas

Panel interno para gestionar la tienda **100puntadas** (pedidos, clientes, productos y analíticas).
Comparte la base de datos **Neon (PostgreSQL)** con la tienda. ONVO Pay lo maneja la tienda; el panel
solo lee el resultado y aprueba los pagos SINPE.

```
Tienda (100puntadas Node)                 Panel (BBoard Node)
  checkout → INSERT orders (pending)        lee pedidos, clientes, analíticas
  webhook ONVO → orders.paid                aprueba SINPE → POST tienda /webhooks/sinpe-paid
  /webhooks/sinpe-paid → correo cliente     gestiona envío / entrega / cancelación
  (fase 6) lee products de Neon      ◄───   administra products, colecciones e imágenes (Vercel Blob)
                        └──────── Neon PostgreSQL ────────┘
```

## Estructura

```
api/index.js          entrada en Vercel        server.js   entrada local
app.js                configuración de Express (sin listen)
config/env.js         variables de entorno validadas
db/pool.js            conexión (+ pool.transaction)
db/migrations/*.sql   cambios de esquema versionados (solo aditivos)
scripts/              migrate · backup · seed-catalog · create-admin
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
npm run seed:catalog            # (una vez) copia data/catalog.js de la tienda a la DB
npm run dev                     # http://localhost:3001
```

| Script | Qué hace |
|---|---|
| `npm run backup` | Respaldo JSON de todas las tablas en `backups/` (ignorado por git) |
| `npm run migrate -- --status` | Lista migraciones aplicadas y pendientes |
| `npm run migrate -- --dry-run` | Prueba las pendientes y revierte (no guarda nada) |
| `npm run seed:catalog [-- --force]` | Inserta productos nuevos del catálogo; `--force` sobrescribe |
| `npm run create-admin -- usuario clave "Nombre" correo` | Crea o restablece un administrador |

**Antes de migrar en producción:** `npm run backup` y, si es posible, un branch de Neon.

## Roles

| Rol | Acceso |
|---|---|
| `admin` | Todo, incluidos los usuarios del panel |
| `manager` | Pedidos, productos, clientes y analíticas (lectura y escritura) |
| `user` | Solo lectura |

## Ciclo de un pedido

`pending` → `paid` → `shipped` → `delivered`; desde `pending` o `paid` se puede pasar a `cancelled`.
Cada cambio guarda su fecha (`paid_at`, `shipped_at`…) y queda en `user_activity` con el usuario que lo hizo.

## Despliegue (Vercel)

Variables: `DATABASE_URL`, `JWT_SECRET`, `APP_URL`, `STORE_URL`, `SINPE_WEBHOOK_SECRET` (igual al de la tienda),
`BLOB_READ_WRITE_TOKEN`, `MAIL_USER`, `MAIL_PASS`, `NODE_ENV=production`.
