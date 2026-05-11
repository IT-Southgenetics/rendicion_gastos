-- Fix: el rol service_role no recibio los GRANTs estandar de Supabase al crearse
-- estas tablas. Sin grants, ni siquiera la service_role key puede operar sobre la
-- tabla, porque rolbypassrls solo desactiva policies, no privilegios de tabla.
--
-- Sintoma: deleteAdvanceAction (que usa service role cuando esta SUPABASE_SERVICE_ROLE_KEY
-- configurada) devolvia "permission denied for table advances" incluso con la key correcta.

grant all on table public.advances to service_role;
grant all on table public.supervision_assignments to service_role;
grant all on table public.viewer_assignments to service_role;
