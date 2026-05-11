-- La policy advances_delete_admin ya permite a cualquier usuario con role='admin'
-- en profiles eliminar anticipos. El problema era que el admin hardcodeado en
-- getMyProfile.ts no tenia ese rol en la BD.
-- Esta migracion garantiza que su perfil tenga role='admin' correctamente.

update public.profiles
set role = 'admin'
where id = 'ad363af8-a3fc-43de-83c8-74f8ad53f500'
   or lower(email) = 'nalvez@southgenetics.com';
