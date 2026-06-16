# Flujos de negocio — Rendición SG

Cada flujo cita los archivos reales (Server Actions, componentes, API routes) y los webhooks de n8n que dispara. Estados y nombres coinciden con `docs/DATABASE.md` y `docs/ROLES.md`.

## 1. Creación de rendición y carga de gastos

**Archivos:** `src/components/reports/NewReportForm.tsx`, `src/components/expenses/NewExpenseForm.tsx`, `src/lib/n8n/sendExpenseWebhook.ts`.

```mermaid
flowchart TD
    A[Empleado abre /dashboard/reports/new] --> B[NewReportForm:\ntitle, week_start, week_end,\npayment_method, budget_max, budget_currency]
    B --> C[INSERT weekly_reports\nstatus=open, workflow_status=null/draft]
    C --> D[Empleado abre /dashboard/expenses/new]
    D --> E[NewExpenseForm: fecha, categoría,\nmonto, moneda, merchant, ticket]
    E --> F[Sube comprobante a Storage\nbucket comprobantes]
    F --> G[INSERT expenses\nstatus=pending, report_id]
    G --> H{Comprobante es imagen?}
    H -- Sí --> I[POST webhook factura/OCR\nNEXT_PUBLIC_N8N_WEBHOOK_URL]
    H -- No --> J[Fin de carga de este gasto]
    I --> K[n8n hace OCR y llama\nPOST /api/webhook/n8n]
    K --> L[UPDATE expenses:\namount, description, merchant_name,\nn8n_raw_data, ocr_extracted_text]
    G --> M{Más gastos?}
    M -- Sí --> D
```

La rendición queda en `status=open`, `workflow_status` implícitamente `draft` hasta que se envía a revisión (flujo 2).

## 2. Envío a revisión → aprobación de gastos → cierre de rendición

**Archivos:** `submitReportAction.ts`, `expenses/[id]/page.tsx` (`updateExpenseStatusAction`), `approveReportAction.ts` (`tryAutoFinalizeReportAfterAllExpensesApprovedAction`), `runReportApprovedClosure.ts`.

```mermaid
sequenceDiagram
    actor E as Empleado
    actor Ap as Aprobador
    participant App as Server Actions
    participant DB as Postgres

    E->>App: submitReportAction(reportId)
    App->>DB: COUNT expenses WHERE report_id=?
    alt 0 gastos
        App-->>E: Error "cargá al menos un gasto"
    else >=1 gasto
        App->>DB: UPDATE weekly_reports SET workflow_status='submitted'
        App->>App: Webhook NUEVA_RENDICION o RENDICION_CORREGIDA\n(según previousWorkflowStatus)
    end

    Ap->>App: updateExpenseStatusAction(expenseId, status, comment)
    App->>DB: SELECT report.workflow_status
    alt report.workflow_status != 'submitted'
        App-->>Ap: Error "rendición no enviada"
    else workflow_status == 'submitted'
        App->>DB: UPDATE expenses SET status, reviewed_by, reviewed_at,\nrejection_reason / supervisor_comment
        opt admin revisa el último gasto pendiente
            App->>App: tryAutoFinalizeReportAfterAllExpensesApprovedAction
            App->>DB: SELECT status FROM expenses WHERE report_id=?
            alt todos los gastos == approved
                App->>App: runReportApprovedClosure (ver flujo 3)
            else queda alguno pendiente/rechazado
                App-->>Ap: finalized=false, no-op
            end
        end
    end
```

Un gasto puede volver a `pending` si el empleado lo edita y reenvía tras un rechazo (`EditExpenseForm`, con `employee_response` obligatorio).

## 3. Aprobación de rendición → webhook n8n → emails + asiento Odoo

**Archivos:** `approveReportAction.ts`, `runReportApprovedClosure.ts`, `src/app/api/reports/[id]/odoo-sync/route.ts`, snippet `n8n/import-if-crear-asiento-odoo.json`.

```mermaid
sequenceDiagram
    actor Ap as Aprobador
    participant App as runReportApprovedClosure
    participant DB as Postgres
    participant N8N as n8n (aprobar-cierre)
    participant Odoo as Odoo
    participant Mail as Email

    Ap->>App: approveReportAction(reportId)
    App->>DB: SELECT expenses WHERE report_id=?
    alt algún gasto no está approved, o 0 gastos
        App-->>Ap: Error "hay gastos pendientes o rechazados"
    else todos approved
        App->>DB: UPDATE weekly_reports SET\nworkflow_status='approved', status='closed',\nclosed_by, closed_at
        App->>App: skipOdooEntry = (payment_method == 'corporate_card')
        App->>App: generateExcelExport(reportId) -> excelBase64
        App->>DB: SELECT email FROM profiles WHERE role IN ('pagador','chusmas')
        App->>N8N: POST webhook aprobar-cierre\n{reportId, paymentMethod, skipOdooEntry,\nexpenseDetails[], excelBase64, pagadorEmails, chusmaEmails, ...}

        N8N->>N8N: Nodo IF "Crear asiento Odoo":\npaymentMethod !== 'corporate_card'
        alt skipOdooEntry == false (employee_paid)
            N8N->>Odoo: Auth + crear account.move [PENDIENTE: verificar\nrouting país→company_id, vive en n8n]
            Odoo-->>N8N: move_id
            N8N->>Odoo: action_post (confirmar asiento)
            N8N->>App: PUT /api/reports/[id]/odoo-sync {odooMoveId}
            App->>DB: UPDATE weekly_reports SET odoo_move_id
        else skipOdooEntry == true (corporate_card)
            N8N->>N8N: Salta la cadena Odoo por completo
        end
        N8N->>Mail: Envía Excel + notificación a empleado,\npagadores y chusmas
    end
```

**Riesgos señalados:**
- El mapeo país/regional → `company_id` de Odoo **no está en este repo**: vive enteramente en la configuración de n8n. No hay forma de auditarlo desde el código de la app — `[PENDIENTE: verificar]` directamente en n8n.
- El webhook es fire-and-forget: si la llamada HTTP falla, el estado en Postgres (`approved`/`closed`) ya quedó actualizado y no hay reintento ni cola; la rendición queda "aprobada" sin notificación ni asiento Odoo hasta que alguien lo note manualmente.
- Si se reabre y se re-aprueba una rendición que ya tenía `odoo_move_id`, el código no verifica si ya existe un asiento antes de volver a llamar al webhook — riesgo de asiento contable duplicado.

## 4. Pago de rendición

**Archivos:** `src/components/reports/PayReportModal.tsx`, `src/actions/payReportAction.ts`.

```mermaid
sequenceDiagram
    actor Pg as Pagador
    participant Modal as PayReportModal
    participant App as payReportAction
    participant Storage as Supabase Storage
    participant DB as Postgres
    participant N8N as n8n (rendición pagada)

    Pg->>Modal: Completa paymentDate, amountPaid,\npaymentCurrency, paymentDestination, receiptFile
    Modal->>App: payReportAction(formData)
    App->>App: assertRole(['pagador','admin'])
    App->>Storage: Sube comprobante a bucket payment_receipts\npath {reportId}/{timestamp}-{filename}
    App->>DB: SELECT expenses no-rejected + advance_amount_usd
    opt rendición vinculada a un anticipo
        App->>App: calculateSettlement(totalUsd, advance_amount_usd)\n-> direction + amountUsd
    end
    App->>DB: UPDATE weekly_reports SET\nworkflow_status='paid', payment_date, amount_paid,\npayment_currency, payment_destination, payment_receipt_url,\nsettlement_direction, settlement_amount_usd
    App->>App: generateExcelExport(reportId) -> excelBase64
    App->>N8N: POST N8N_WEBHOOK_URL_RENDICION_PAGADA\n{reportId, amountPaid, settlementDirection,\nodooMoveId, excelBase64, pagadorEmails, aprobadorEmails, chusmaEmails}
```

`settlementDirection` puede ser `company_pays_employee`, `employee_returns_company` o `settled_zero`, según si el total gastado superó o no el anticipo recibido.

## 5. Reapertura de rendición (admin)

**Archivo:** `src/components/admin/ReopenReportButton.tsx`.

```mermaid
flowchart TD
    A[Admin ve rendición en submitted/needs_correction/approved/paid] --> B[Click Reabrir]
    B --> C{workflow_status actual}
    C -->|paid| D["Advertencia: no revierte\npago en Odoo ni en el anticipo asociado"]
    C -->|approved| E["Advertencia: vuelve al flujo\nde revisión"]
    C -->|needs_correction| F[Sin advertencia especial]
    D --> G[UPDATE weekly_reports SET\nstatus='open', closed_at=null, workflow_status='draft']
    E --> G
    F --> G
    G --> H["NO se resetea: odoo_move_id,\nstatus de expenses asociados"]
```

**Riesgo:** dejar `odoo_move_id` intacto significa que, si la rendición se vuelve a aprobar, el flujo de n8n no tiene forma de saber (desde este repo) que ya existe un asiento contable previo.

## 6. Anticipos: solicitud → aprobación → pago → vinculación con rendición → liquidación

**Archivos:** `src/actions/advanceActions.ts` (`submitNewAdvanceAction`, `approveAdvanceAction`, `rejectAdvanceAction`, `payAdvanceAction`), `src/lib/n8n/sendAdvanceWebhook.ts`.

```mermaid
sequenceDiagram
    actor E as Empleado
    actor Ap as Aprobador
    actor Pg as Pagador
    participant App as advanceActions
    participant DB as Postgres
    participant N8N as n8n

    E->>App: submitNewAdvanceAction(title, advanceDate, advanceEndDate,\nrequestedAmount, currency, description)
    App->>DB: SELECT supervision_assignments WHERE employee_id=E
    alt sin aprobador asignado
        App-->>E: Error "no hay aprobador asignado"
    else con aprobador asignado
        App->>DB: INSERT advances status='draft'
        App->>DB: UPDATE advances SET status='submitted', submitted_at
        App->>N8N: POST ADVANCE_SUBMITTED {advanceId, employeeName, approverEmails, ...}
    end

    Ap->>App: approveAdvanceAction / rejectAdvanceAction
    App->>App: assertRole [aprobador, admin] - si aprobador valida supervision_assignments
    alt aprueba
        App->>DB: UPDATE advances SET status='approved', approved_by, approved_at
        App->>N8N: POST ADVANCE_APPROVED {..., pagadorEmails, chusmaEmails}
    else rechaza (requiere rejection_reason)
        App->>DB: UPDATE advances SET status='rejected', rejection_reason
        App->>N8N: POST ADVANCE_REJECTED {...}
    end

    Pg->>App: payAdvanceAction(paymentDate, paidAmount, receiptFile)
    App->>App: assertRole(['pagador','admin'])
    alt ya estaba paid y con created_report_id
        App-->>Pg: idempotente, retorna createdReportId existente
    else approved -> paid
        App->>App: advanceAmountUsd = requested_amount / rate_to_usd(currency)
        alt no hay tipo de cambio para currency
            App-->>Pg: Error "no existe tipo de cambio"
        else hay tipo de cambio
            App->>Storage: sube comprobante a payment_receipts/advances/{advanceId}/...
            App->>DB: INSERT weekly_reports\n(payment_method='employee_paid', workflow_status='draft',\nadvance_id, advance_amount, advance_amount_usd,\nsettlement_direction='company_pays_employee')
            App->>DB: UPDATE advances SET status='paid', paid_by, paid_at,\ncreated_report_id=<nueva rendición>
            App->>N8N: POST ADVANCE_PAID {advanceId, reportId, ...}
        end
    end
```

La liquidación final ocurre cuando esa rendición automática se paga (flujo 4): `calculateSettlement` compara lo gastado contra `advance_amount_usd` y determina si la empresa le debe al empleado, viceversa, o si quedó saldado.

## 7. Exportación a Excel

**Archivos:** `src/lib/excelGenerator.ts` (`generateExcelExport`), `src/lib/excel/generateReport.ts` (`generateReportWorkbook`), `src/app/api/reports/export/route.ts`.

```mermaid
flowchart TD
    A["Trigger: submitReportAction,\nrunReportApprovedClosure, payReportAction\nó GET /api/reports/export?report_id=..."] --> B["generateExcelExport(reportId)"]
    B --> C[SELECT weekly_reports + profiles.full_name]
    B --> D[SELECT expenses ORDER BY expense_date ASC]
    B --> E[SELECT exchange_rates globales]
    E --> F[Merge: report.exchange_rates\nsobrescribe a los globales]
    C --> G[generateReportWorkbook]
    D --> G
    F --> G
    G --> H["Encabezado: título, empleado, período,\ncierre, budget_currency, payment_method, tipos de cambio"]
    G --> I["Filas: una por gasto NO rechazado,\ncon equivalente USD vía toUSD()"]
    G --> J["Subtotales por moneda +\nTOTAL en budget_currency si hay rates"]
    H --> K[Buffer .xlsx]
    I --> K
    J --> K
    K --> L{Origen de la llamada}
    L -->|Webhook a n8n| M["buffer.toString(base64) -> excelBase64 + excelName"]
    L -->|Descarga directa| N["Response: application/vnd.openxmlformats...\nContent-Disposition attachment"]
```
