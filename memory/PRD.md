# GymNite — PRD

## Original Problem Statement
Landing page + sistema de gestión "GymNite" con estética minimalismo dark + acentos morado neón. Carrusel hero, secciones (Beneficios, Sobre Nosotros, Registrarme — placeholder lorem ipsum). Dos niveles de usuario: No Suscrito (default) y Suscrito. Flujo de registro (Nombre, Email, Password) → subir comprobante de pago JPG → status "Pendiente" → admin aprueba para pasar a "Suscrito". Panel admin ultra-simplificado tipo Kanban/lista, ver comprobante + botón Aprobar. Stack: FastAPI + MongoDB + React (Tailwind, Shadcn UI, Framer Motion).

## Architecture
- **Backend**: FastAPI single-module (`/app/backend/server.py`). MongoDB via `motor`. JWT (PyJWT) in httpOnly cookies (`access_token`, `refresh_token`), `SameSite=None; Secure=True`. Bcrypt password hashing. Image storage: base64 inline in user document.
- **Frontend**: React 19 + Tailwind + Shadcn UI primitives, Framer Motion for transitions, sonner for toasts, lucide-react icons. Auth via React Context with `withCredentials: true`. Routing with `react-router-dom` v7.
- **Auth model**: JWT in cookies. Roles: `user`, `admin`. Statuses: `no_subscribed`, `pending`, `subscribed`.
- **Admin seeding**: on startup if no admin exists, seed `admin@gymnite.com` / `12345`.

## User Personas
1. **Visitante** — explora landing, decide registrarse.
2. **Usuario No Suscrito** — registrado, sube comprobante JPG.
3. **Usuario Pendiente** — esperando validación humana del admin.
4. **Usuario Suscrito** — pago aprobado, miembro activo.
5. **Administrador** — gestiona inscritos, ve comprobantes, aprueba/rechaza.

## Core Requirements (Static)
- Estética dark + morado neón con glow elegante (no ruidoso).
- Idioma: español (lorem ipsum hasta tener textos finales).
- Solo se aceptan imágenes JPG/JPEG hasta 5MB.
- Verificación humana en el admin antes de marcar Suscrito.
- Cuentas y datos seguros (JWT, bcrypt, cookies httpOnly).

## Implemented (2026-05-14)
- Backend endpoints completos: `/api/auth/{register,login,logout,me}`, `/api/receipts/upload`, `/api/admin/{users, users/{id}/receipt, users/{id}/approve, users/{id}/reject, stats}`.
- Admin auto-seed (`admin@gymnite.com` / `12345`).
- Frontend pages: Landing (hero carousel + Beneficios + Sobre Nosotros + CTA + Footer), Register, Login, Dashboard (status + upload JPG), Admin (stats + table + filters + search + receipt modal + approve/reject).
- Carrusel hero con Framer Motion + 4 imágenes Unsplash, dots indicadores.
- Status badges (No Suscrito / Pendiente / Suscrito), glow purple en CTAs.
- ProtectedRoute + GuestOnly routing guards.
- `data-testid` en todos los elementos interactivos.
- Bug fix: `/api/admin/users` ahora usa aggregation `$addFields` para computar `has_receipt` mientras excluye el blob base64.

## Implemented (2026-05-15) — Iteration 2: Admin enhancements
- Plan duration on approval: slider con valores 1, 3, 6, 12 meses dentro del modal de verificación de comprobante. Default 6 meses. Botón muestra `Aprobar suscripción · N meses`. Backend calcula `plan_started_at` y `plan_expires_at` (now + 30·N días).
- Manual users: nuevo endpoint `POST /api/admin/users/manual` (multipart) y dialog "Agregar usuario" en admin. Campos: nombre (req), email (opcional), comprobante JPG (opcional). Sin password_hash, marcado `manual: true`. Etiqueta "Manual" en tabla.
- Email index migrado a unique parcial (`partialFilterExpression { email: { $type: 'string' } }`) para soportar manual users sin email.
- Reject endpoint ahora también limpia los campos `plan_*`.
- Tabla admin: nueva columna "Plan" mostrando `N meses · vence DD-MM-YY` para suscritos.
- 30/30 backend pytest passing, frontend E2E 100%.

## Implemented (2026-05-15) — Iteration 3: Plan tiers + bank info
- Constantes compartidas en `/app/frontend/src/lib/plans.js`: `PLAN_TIERS` (1m $25 / 3m $69 / 6m $129 / 12m $230, popular=6m) y `BANK_INFO` (Banco Pichincha, cuenta 2212128683, titular Yuleidy Ilaquiche Vega, correo Yuleidytamiana56@outlook.com).
- Dashboard ahora muestra primero las 4 tarjetas de planes; al elegir una, transiciona a la sección "Datos para la transferencia" con los campos copiables del banco + área de upload.
- `POST /api/receipts/upload` acepta el campo Form `plan_months` (1/3/6/12). Persiste `requested_plan_months` en el user. Validación 400 para valores inválidos.
- Modal de aprobación admin muestra el plan solicitado por el usuario y el slider arranca en esa posición por defecto. Suma del precio en el resumen.
- Reject ahora también limpia `requested_plan_months`.
- 39/39 backend pytest passing, frontend E2E 100%. Bug crítico (`planByMonths` import faltante en Admin.js) detectado y corregido en este ciclo.

## Test Credentials
- See `/app/memory/test_credentials.md`.

## Backlog
**P1 (next iterations)**
- Reemplazar lorem ipsum con copy real cuando el usuario lo entregue.
- Tab/Vista Kanban opcional (drag entre columnas Pendiente/Suscrito).
- Notificaciones email al usuario cuando se aprueba/rechaza (Resend/SendGrid).
- Forgot password / reset flow.

**P2**
- Migrar comprobantes a object storage (S3-compatible) si crece el volumen.
- Roles adicionales (super-admin, recepción).
- Stripe integration para pago directo (sin comprobante manual).
- Multi-sede / planes de suscripción.
- Analytics admin (conversiones, churn).

## Next Action Items
- Recopilar el copy final del usuario para Beneficios / Sobre Nosotros / CTA.
- Decidir si se mantiene comprobante manual o se integra Stripe a futuro.
