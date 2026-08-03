/* ═══════════════════════════════════════════════════════════════════════
   config.js — conexión a Supabase.

   La clave 'anon' está pensada para vivir en el cliente: es pública por
   diseño y lo que protege los datos son las políticas RLS de la base.
   La 'service_role' NO va aquí nunca: esa sí salta RLS y no debe salir
   del panel de Supabase.

   Rellena los dos valores desde  Project Settings → API.
   ═══════════════════════════════════════════════════════════════════════ */

const SUPABASE_URL      = 'https://otcmolvbrcplgysqeqtc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90Y21vbHZicmNwbGd5c3FlcXRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MTY4ODYsImV4cCI6MjEwMTI5Mjg4Nn0.WJYectPuMxQLAo1DCBI1POagW8Nix7LegJVVr9NrAkk';

const SUPABASE_LISTO =
  !SUPABASE_URL.startsWith('PEGA_AQUI') &&
  !SUPABASE_ANON_KEY.startsWith('PEGA_AQUI');
