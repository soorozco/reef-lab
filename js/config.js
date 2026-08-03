/* ═══════════════════════════════════════════════════════════════════════
   config.js — conexión a Supabase.

   La clave 'anon' está pensada para vivir en el cliente: es pública por
   diseño y lo que protege los datos son las políticas RLS de la base.
   La 'service_role' NO va aquí nunca: esa sí salta RLS y no debe salir
   del panel de Supabase.

   Rellena los dos valores desde  Project Settings → API.
   ═══════════════════════════════════════════════════════════════════════ */

const SUPABASE_URL      = 'PEGA_AQUI_TU_PROJECT_URL';   // https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = 'PEGA_AQUI_TU_ANON_KEY';      // eyJ...

const SUPABASE_LISTO =
  !SUPABASE_URL.startsWith('PEGA_AQUI') &&
  !SUPABASE_ANON_KEY.startsWith('PEGA_AQUI');
