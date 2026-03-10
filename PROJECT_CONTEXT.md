## Contexto general del proyecto

Este proyecto es una aplicación web llamada `expense-tracker` / `rendicion_gastos`, construida con **Next.js (App Router)**, **React** y **TypeScript**. Está orientada a la **carga, seguimiento y rendición de gastos**, probablemente para uso interno de la empresa *SouthGenetics* (por ejemplo, para que colaboradores registren gastos y luego puedan rendirlos / exportarlos).

- **Framework principal**: Next.js `16.1.6` (estructura `app/`).
- **Frontend**: React `19`, TypeScript, TailwindCSS `4` para estilos utilitarios.
- **UI components**: Se utilizan librerías de Radix UI (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-select`) y `lucide-react` para iconos.
- **Estado de sesión / backend-as-a-service**: Se usa **Supabase** (`@supabase/supabase-js` y `@supabase/ssr`) para autenticación, acceso a base de datos y lógica de servidor ligera.
- **Utilidades**:
  - `date-fns` para manejo de fechas.
  - `react-hot-toast` para notificaciones.
  - `xlsx` para importación/exportación de datos en Excel.

En general, la app corre con:

```bash
npm run dev
```

y se abre en `http://localhost:3000`.

---

## Dominio funcional (alto nivel)

La aplicación está centrada en el **ciclo de vida de los gastos**:

1. **Autenticación de usuarios**  
   - Existe un flujo de login bajo `src/app/(auth)/login/page.tsx`.  
   - La autenticación y gestión de sesión se manejan vía Supabase (credenciales en `.env.local`).

2. **Carga de gastos**  
   - Usuarios autenticados pueden cargar gastos asociando información típica: fecha, tipo de gasto, monto, descripción, etc.  
   - Es posible que se relacionen gastos con proyectos, campañas o centros de costo.

3. **Visualización y filtrado**  
   - La UI permite listar gastos, probablemente con filtros por fecha, usuario, categoría, proyecto, etc.
   - Se utilizan componentes de tabla / listas, junto con iconografía (`lucide-react`) y modales (`@radix-ui/react-dialog`) para editar y ver detalles.

4. **Rendición / Exportación**  
   - Con la dependencia `xlsx`, la app soporta **exportar listados de gastos a archivos Excel** (y eventualmente importar plantillas).
   - Esto permite generar reportes para contabilidad o administración.

5. **Notificaciones y feedback al usuario**  
   - `react-hot-toast` se usa para mostrar feedback rápido (éxito, error, validaciones).

---

## Arquitectura técnica (alto nivel)

- **Estructura de Next.js**  
  - Usa el **App Router** (`app/`), con rutas tipo `app/(auth)/login/page.tsx` para secciones especializadas.
  - Puede haber layouts compartidos para autenticados vs no autenticados (por ejemplo, grupos de rutas `(auth)` vs el resto de la app).

- **Integración con Supabase**  
  - Hay una instancia de Supabase inicializada con claves en variables de entorno definidas en `.env.local`.  
  - Se maneja:
    - Autenticación de usuario (login / logout, posiblemente registro).
    - Lectura y escritura en tablas de gastos, usuarios, etc.
  - En SSR, se usa `@supabase/ssr` para hidratar la sesión en el servidor y cliente.

- **Estilos y diseño**  
  - TailwindCSS `4` se utiliza para clases utilitarias de estilos.  
  - Se pueden usar helpers como `tailwind-merge` para combinar clases condicionalmente sin conflictos.

- **Componentes de UI**  
  - **Radix UI**: para popovers, selects, menús y modales accesibles.  
  - **Iconos**: `lucide-react` provee iconos para acciones (agregar, editar, eliminar, exportar, filtrar, etc.).

---

## Suposiciones importantes para otras IAs

Cuando otra IA vaya a trabajar sobre este proyecto, es útil que asuma lo siguiente (a menos que el código indique lo contrario):

1. **Tipo de proyecto**  
   - Es una **web interna o semi-interna** para gestionar rendición de gastos de una organización, no un producto público masivo.

2. **Flujo principal de usuario**  
   - Login → Carga de gastos → Visualización/edición → Exportación/descarga → (posible) aprobación o cierre de períodos.

3. **Tecnologías clave a respetar**  
   - Next.js App Router, React, TypeScript, TailwindCSS, Supabase.  
   - Mantener patrones idiomáticos de estas tecnologías (hooks, componentes funcionales, server components/client components según corresponda).

4. **Persistencia y seguridad**  
   - Todos los datos “serios” viven en Supabase (base de datos + auth).  
   - Es importante no exponer claves privadas ni lógica sensible en el cliente.

5. **Internacionalización / idioma**  
   - El proyecto y el dominio están orientados al contexto hispanohablante (por ejemplo, nombres como `rendicion_gastos`, posibles textos en español).

---

## Cómo usar este contexto en prompts

Cuando envíes prompts a otra IA, incluye este contexto y luego agrega tu pedido específico. Por ejemplo:

> *Contexto del proyecto:*  
> (Pegar todo el contenido de este archivo o un resumen relevante)  
>  
> *Tarea:*  
> Quiero que crees un componente de formulario para cargar un nuevo gasto que incluya campos de fecha, categoría, monto y comentario, siguiendo el estilo actual del proyecto y usando TailwindCSS y React.

También puedes referenciar rutas y archivos concretos del proyecto (por ejemplo, `src/app/(auth)/login/page.tsx`) para dar más precisión sobre dónde integrar nuevas funcionalidades.

