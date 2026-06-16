# Integraciones externas — Rendición SG

## 1. n8n

n8n vive fuera de este repo (`n8n.srv908725.hstgr.cloud`). El repo solo contiene un snippet exportado (`n8n/import-if-crear-asiento-odoo.json`) con el nodo IF que decide si crear el asiento Odoo, y el código que **dispara** los webhooks y **recibe** sus callbacks.

### 1.1 Webhooks salientes (app → n8n)

| Evento | Disparador en código | Variable de entorno | Payload (campos principales) |
|---|---|---|---|
| Ticket cargado (OCR) | `NewExpenseForm.tsx` tras INSERT de `expenses`, solo si el comprobante es imagen | `NEXT_PUBLIC_N8N_WEBHOOK_URL` (fallback hardcodeado a `/webhook/factura`) | `id`, `categoria`, `descripcion`, `monto`, `moneda`, `comprobante_url`, `fecha`, `rendicion_id`, `user_id`, `merchant_name` |
| Rendición enviada (nueva) | `submitReportAction.ts`, cuando `previousWorkflowStatus` no es `needs_correction` | `N8N_WEBHOOK_URL_NUEVA_RENDICION` | `reportId`, `employeeId/Name/Email`, `supervisorEmails`, `merchantList`, `excelBase64`, `excelName` |
| Rendición reenviada (corrección) | `submitReportAction.ts`, cuando `previousWorkflowStatus === 'needs_correction'` | `N8N_WEBHOOK_URL_RENDICION_CORREGIDA` | igual que arriba + `isResubmission: true` |
| Rendición devuelta | `returnReportAction.ts` | `N8N_WEBHOOK_URL_RENDICION_DEVUELTA` | `reportId`, `employeeEmail/Name`, `targetEmails` |
| Notificación de revisión | `NotifyReviewButton.tsx` → `sendReportReviewNotification.ts` | `NEXT_PUBLIC_N8N_NOTIFY_WEBHOOK_URL` (fallback `/webhook/notificaciones`) | `type: "noti_revision"`, `report_id`, `employee`, `supervisor`, `resumen_gastos` (totales por estado/moneda) |
| Rendición aprobada / cierre | `runReportApprovedClosure.ts` | `N8N_WEBHOOK_URL_APROBAR_CIERRE` (prioridad) o `N8N_WEBHOOK_URL_RENDICION_APROBADA` (fallback) | `reportId`, `paymentMethod`, **`skipOdooEntry`**, `expenseDetails[]`, `exchangeRates`, `isMulticurrency`, `closingDate`, `closedAt`, `pagadorEmails`/`pagadorEmailList`, `chusmaEmails`/`chusmaEmailList`, `excelBase64`, `excelName` |
| Rendición cerrada (notif. empleado) | `CloseReportButton.tsx` → `sendReportClosedNotification.ts` | `NEXT_PUBLIC_N8N_NOTIFY_WEBHOOK_URL` | `type: "noti_cierre_e"`, `report_id`, `employee`, `supervisors[]`, `excel {filename, contentType, base64}` |
| Rendición pagada | `payReportAction.ts` | `N8N_WEBHOOK_URL_RENDICION_PAGADA` | `reportId`, `amountPaid`, `paymentCurrency/Destination/ReceiptUrl`, `settlementDirection`, `settlementAmountUsd`, **`odooMoveId`**, `excelBase64` |
| Anticipo enviado | `advanceActions.ts:submitNewAdvanceAction` | `N8N_WEBHOOK_URL_ADVANCE_SUBMITTED` | `advanceId`, `employeeId/Name/Email`, `approverEmails`, `title`, `requestedAmount`, `currency` |
| Anticipo aprobado | `advanceActions.ts:approveAdvanceAction` | `N8N_WEBHOOK_URL_ADVANCE_APPROVED` | igual + `pagadorEmails`, `chusmaEmails` |
| Anticipo rechazado | `advanceActions.ts:rejectAdvanceAction` | `N8N_WEBHOOK_URL_ADVANCE_REJECTED` | igual + `rejectionReason` |
| Anticipo pagado | `advanceActions.ts:payAdvanceAction` | `N8N_WEBHOOK_URL_ADVANCE_PAID` | `advanceId`, `reportId` (rendición creada), `amount`, `paidAt`, `paymentReceiptUrl` |
| Nuevo usuario registrado | `src/app/api/webhook/new-user/route.ts` | `N8N_WEBHOOK_URL_NUEVO_USUARIO` | `userName`, `userEmail`, `userRole` (siempre `employee` al registrarse), `adminEmails` |

Todas estas llamadas son **fire-and-forget**: se hace `fetch` sin reintento ni cola; un error se loguea en consola pero no revierte la mutación de Postgres que ya ocurrió. `n8n_webhooks_log` existe como tabla de auditoría pero `[PENDIENTE: verificar]` si todos los webhooks escriben ahí o solo el de OCR de ticket.

### 1.2 Nodo clave del workflow "aprobar-cierre"

`n8n/import-if-crear-asiento-odoo.json` — snippet de un nodo **IF** (`n8n-nodes-base.if`, v2.2) llamado **"Crear asiento Odoo"**:

```
condición: {{ $json.body.paymentMethod }} !== "corporate_card"
```

Se inserta en la rama del workflow que recibe el webhook `aprobar-cierre`, antes de la cadena Auth Odoo → crear `account.move` → `action_post` → `PUT /odoo-sync`. Si la condición es falsa (`payment_method === 'corporate_card'`), esa rama completa se saltea y solo corre la rama de Excel + notificaciones por email. El resto del workflow (autenticación Odoo, nodos de envío de mail) **no está en este repo** — vive en la instancia de n8n.

### 1.3 Webhooks entrantes (n8n/externos → app)

| Endpoint | Método | Auth | Qué hace |
|---|---|---|---|
| `/api/webhook/n8n` | POST | Ninguna explícita — confía en el payload de n8n | Recibe `expense_id` + datos extraídos por OCR (`amount`, `date`, `merchant`, texto crudo); actualiza el `expense` y crea una notificación in-app |
| `/api/reports/[id]/odoo-sync` | PUT | `SUPABASE_SERVICE_ROLE_KEY` (cliente admin, sin validar quién llama) | Recibe `{ odooMoveId: number }`, valida que sea numérico finito, `UPDATE weekly_reports SET odoo_move_id` |

**Riesgo de seguridad:** ninguno de los dos endpoints valida un secreto/firma de origen — cualquiera que conozca la URL puede invocarlos. `odoo-sync` al menos requiere conocer un `reportId` válido; `[PENDIENTE: verificar]` si n8n firma las requests con algún header que la app debería (pero actualmente no) comprobar.

## 2. Odoo

La integración con Odoo **no tiene código en este repositorio**. Todo lo relativo a autenticación JSON-RPC, creación de `account.move`, `action_post` y el routing de país/región → `company_id` vive exclusivamente en la configuración de n8n. El único punto de contacto desde el código de la app es:

- **Entrada de datos:** el payload del webhook `aprobar-cierre` (`paymentMethod`, `skipOdooEntry`, `expenseDetails[]`, montos, moneda) — es lo que n8n usa para construir el asiento.
- **Confirmación:** `PUT /api/reports/[id]/odoo-sync` con el `odooMoveId` resultante, que se guarda en `weekly_reports.odoo_move_id`.
- El webhook de pago (`RENDICION_PAGADA`) reenvía `odooMoveId` (leído de `weekly_reports`) para que n8n pueda referenciarlo, por ejemplo al conciliar el pago contra el asiento ya creado.

`[PENDIENTE: verificar]` credenciales Odoo, URL de la instancia y lógica exacta de `company_id` por país — todo eso vive fuera del repo y no debe documentarse sin acceso a la configuración de n8n.

## 3. Supabase Storage

| Bucket | Contenido | Quién sube | Path |
|---|---|---|---|
| `comprobantes` | Tickets/comprobantes de gastos (imagen o PDF, máx. 10MB) | `TicketUploader.tsx` (al crear/editar un gasto) | `{user_id}/{timestamp}_{random}.{ext}` |
| `payment_receipts` | Comprobantes de pago de rendiciones y anticipos | `payReportAction.ts`, `advanceActions.ts:payAdvanceAction` | Rendición: `{reportId}/{timestamp}-{filename}` · Anticipo: `advances/{advanceId}/{timestamp}-{filename}` |

La migración `20260324_allow_pdf_in_comprobantes_bucket.sql` amplió los MIME types aceptados de solo imágenes a también `application/pdf`.

## 4. Variables de entorno de integraciones

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# n8n — OCR y notificaciones genéricas
NEXT_PUBLIC_N8N_WEBHOOK_URL
NEXT_PUBLIC_N8N_NOTIFY_WEBHOOK_URL

# n8n — ciclo de vida de rendiciones
N8N_WEBHOOK_URL_NUEVA_RENDICION
N8N_WEBHOOK_URL_RENDICION_CORREGIDA
N8N_WEBHOOK_URL_APROBAR_CIERRE
N8N_WEBHOOK_URL_RENDICION_APROBADA
N8N_WEBHOOK_URL_RENDICION_PAGADA
N8N_WEBHOOK_URL_RENDICION_DEVUELTA

# n8n — ciclo de vida de anticipos
N8N_WEBHOOK_URL_ADVANCE_SUBMITTED
N8N_WEBHOOK_URL_ADVANCE_APPROVED
N8N_WEBHOOK_URL_ADVANCE_REJECTED
N8N_WEBHOOK_URL_ADVANCE_PAID

# n8n — usuarios y fallback
N8N_WEBHOOK_URL_NUEVO_USUARIO
N8N_DEFAULT_CHUSMA_EMAIL
```

No se incluyen valores reales en ningún documento de `docs/` — solo nombres y propósito.
