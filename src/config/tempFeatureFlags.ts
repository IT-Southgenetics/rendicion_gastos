/**
 * Comportamiento temporal en gastos / comprobantes.
 *
 * Para VOLVER al comportamiento anterior (producción): poné ambos en `false`.
 * No hace falta revertir commits ni buscar en el historial.
 */
export const TEMP_ALLOW_MULTIPLE_EXPENSE_RECEIPTS = true;

/** Si es `true`, se puede editar monto y datos aunque el gasto esté pending/approved (sin bloqueo por estado). */
export const TEMP_ALLOW_UNRESTRICTED_EXPENSE_EDIT = true;
