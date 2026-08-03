# Configurar Supabase + acceso con Google

Son cinco pasos. Los tres primeros solo los puedes hacer tú, porque implican
crear cuentas y manejar un secreto de OAuth.

> **Nunca me pases** la `service_role key` de Supabase ni el *Client Secret* de Google.
> El secreto de Google se pega directo en el panel de Supabase; yo no lo necesito.
> Lo único que sí va en el código es la **clave `anon`**, que está hecha para ser
> pública y queda protegida por las políticas RLS de la base.

---

## 1. Crear el proyecto de Supabase

1. Entra a https://supabase.com y crea un proyecto.
2. Región: **East US (North Virginia)** o la más cercana a México.
3. Guarda la contraseña de la base que te pida (no la necesito).
4. Cuando termine de aprovisionar, ve a **Project Settings → API** y anota:
   - **Project URL** — algo como `https://abcdefghijk.supabase.co`
   - **anon public** — una cadena larga que empieza con `eyJ...`

   El **project ref** es la parte `abcdefghijk` de la URL; lo usarás en el paso 2.

---

## 2. Crear las credenciales de Google

1. Entra a https://console.cloud.google.com y crea un proyecto (o usa uno tuyo).
2. **APIs y servicios → Pantalla de consentimiento de OAuth**
   - Tipo: **Externo**
   - Nombre de la app: `Reef Lab`
   - Correo de asistencia y de contacto: el tuyo
   - En *Usuarios de prueba* añade tu propio correo. Mientras la app esté en
     modo "Prueba" solo entran los correos de esa lista, que para uso personal
     es justo lo que quieres.
3. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**
   - Tipo: **Aplicación web**
   - Nombre: `Reef Lab web`
   - **Orígenes de JavaScript autorizados:**
     ```
     https://soorozco.github.io
     ```
   - **URI de redirección autorizados** (sustituye `TU-REF`):
     ```
     https://TU-REF.supabase.co/auth/v1/callback
     ```
4. Te dará un **Client ID** y un **Client Secret**. Cópialos.

---

## 3. Conectar Google con Supabase

1. En Supabase: **Authentication → Sign In / Providers → Google**
   - Actívalo y pega el **Client ID** y el **Client Secret** del paso 2.
   - Guarda.
2. En **Authentication → URL Configuration**:
   - **Site URL:**
     ```
     https://soorozco.github.io/reef-lab/
     ```
   - En **Redirect URLs** añade estas dos:
     ```
     https://soorozco.github.io/reef-lab/
     http://localhost:8123/
     ```
     La segunda es para poder probar en local.

---

## 4. Crear las tablas

1. En Supabase: **SQL Editor → New query**.
2. Pega **todo** el contenido de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) y ejecútalo.
3. Debe terminar sin errores. Crea las ocho tablas, activa RLS en todas,
   prepara el bucket de fotos y deja listo el alta automática de usuario.

Comprobación rápida: en **Table Editor** deben aparecer `aquariums`, `salts`,
`solutions`, `measurements`, `doses`, `maintenance`, `corals` y `coral_log`,
todas con el candado de *RLS enabled*.

---

## 5. Pasarme los dos valores

Pégame en el chat:

- La **Project URL**
- La clave **anon public**

Con eso configuro el cliente, lo subo a GitHub Pages y probamos el acceso con Google.

Si prefieres ponerlos tú, edita [`js/config.js`](js/config.js) y sustituye los
dos marcadores; el resto ya está escrito.

---

## Qué queda protegido

- Toda tabla tiene **RLS** con `user_id = auth.uid()`: aunque la clave `anon`
  esté en un repo público, sin iniciar sesión no se lee ni se escribe nada,
  y con sesión solo alcanzas tus propias filas.
- El bucket de fotos es **privado** y cada usuario solo puede tocar la carpeta
  que lleva su `uid`. Las imágenes se sirven con URLs firmadas de duración corta.
- El acceso queda limitado a los correos que pusiste como usuarios de prueba
  en la pantalla de consentimiento de Google.
