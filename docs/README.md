# Documentación técnica — Rendición SG

Plataforma interna de SouthGenetics para carga, aprobación, pago y rendición de gastos y anticipos. Producción: https://rendicion.southgenetics.com

## Índice

| Documento | Contenido |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Resumen ejecutivo, stack, estructura de carpetas, modelo de dominio, auth/roles, integraciones, variables de entorno, deuda técnica. Incluye diagramas C4 (contexto/contenedor), paquetes, roles y despliegue. |
| [DATABASE.md](./DATABASE.md) | ERD completo, descripción tabla por tabla, políticas RLS, migraciones cronológicas, diagramas de estado (rendición, gasto, anticipo). |
| [FLOWS.md](./FLOWS.md) | Los 7 flujos de negocio paso a paso con diagramas: carga de gastos, revisión/aprobación, cierre con webhook a n8n/Odoo, pago, reapertura, anticipos, export a Excel. |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | n8n (todos los webhooks salientes/entrantes y payloads), Odoo (qué vive en el repo y qué no), Supabase Storage (buckets). |
| [ROLES.md](./ROLES.md) | Matriz rol × acción × pantalla, capas de enforcement (middleware/Server Actions/RLS), navegación por rol. |

## 10 hallazgos clave para el equipo

1. **Dos estados conviven en `weekly_reports`**: `status` (`open`/`closed`, contenedor) y `workflow_status` (`draft`→`submitted`→`needs_correction`→`approved`→`paid`, el flujo real). Toda la UI y los webhooks se basan en `workflow_status`.
2. **`payment_method` controla si hay asiento contable**: `corporate_card` setea `skipOdooEntry=true` y el nodo IF de n8n salta toda la cadena de Odoo; `employee_paid` es el único camino que genera `account.move`.
3. **El cierre de rendición puede ser automático**: cuando un admin aprueba el último gasto pendiente y todos quedan `approved`, `tryAutoFinalizeReportAfterAllExpensesApprovedAction` dispara el mismo cierre que la aprobación manual.
4. **`odoo_move_id` solo lo escribe n8n**, vía `PUT /api/reports/[id]/odoo-sync` con `SUPABASE_SERVICE_ROLE_KEY` — el código de Next.js nunca lo setea directamente, y ese endpoint no valida un secreto de origen.
5. **Riesgo de asiento duplicado**: reabrir una rendición (`ReopenReportButton`) no limpia `odoo_move_id` ni el `status` de los `expenses`; una rendición re-aprobada puede volver a disparar la creación de asiento en Odoo sin que el código detecte que ya existe uno.
6. **Todos los webhooks a n8n son fire-and-forget**: sin retry ni cola. Si la llamada HTTP falla, el estado en Postgres ya cambió y nadie se entera salvo revisión manual.
7. **El routing país/regional → `company_id` de Odoo no está en este repo**: vive enteramente en la configuración de n8n, fuera del alcance de esta documentación y de cualquier auditoría de código.
8. **`aprobador` nunca tiene alcance global**: su visibilidad de rendiciones, gastos y anticipos está acotada por `supervision_assignments`, reforzado tanto en Server Actions como en políticas RLS independientes.
9. **Existe una cuenta admin hardcodeada** (`nalvez@southgenetics.com` + un UUID fijo) en `getMyProfile.ts`, que se trata como `admin` sin pasar por `profiles.role` — punto de fragilidad si esa cuenta cambia.
10. **Hay un árbol de rutas duplicado** bajo `(dashboard)/dashboard/*` que espeja `(dashboard)/*` — parece una migración a medio terminar; conviene confirmar cuál es la canónica antes de modificar layout o navegación.

## Cómo se generó esta documentación

Basada en lectura directa del código (`src/`), tipos generados de Supabase (`src/types/database.ts`) y migraciones SQL (`supabase/migrations/`) al 2026-06-16. Donde el código no permitía confirmar un comportamiento (p. ej. lógica que vive solo en n8n), se marcó explícitamente como `[PENDIENTE: verificar]` en lugar de asumirlo.
