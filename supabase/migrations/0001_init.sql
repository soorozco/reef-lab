-- ═══════════════════════════════════════════════════════════════════════
-- Reef Lab — esquema inicial
--
-- Un usuario = un acuario. Todo cuelga de auth.uid() y toda tabla lleva RLS,
-- así que la clave anon puede vivir en el cliente público sin exponer nada:
-- sin sesión de Google no se lee ni se escribe una sola fila.
-- ═══════════════════════════════════════════════════════════════════════

-- ── ajustes del acuario: una fila por usuario ──
create table if not exists public.aquariums (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  nombre         text        not null default 'Mi arrecife',
  volumen_bruto  numeric     not null default 175,
  volumen_neto   numeric     not null default 140,
  objetivos      jsonb       not null default '{"kh":8.0,"ca":430,"mg":1350,"sal":35}'::jsonb,
  targets        jsonb       not null default '{}'::jsonb,
  cambio_semanal numeric     not null default 20,
  mg_ratio       numeric     not null default 4.4,
  hora_a         text        not null default '08:00',
  hora_b         text        not null default '20:00',
  hora_mg        text        not null default '14:00',
  alerta_dias    integer     not null default 7,
  sal_unidad     text        not null default 'ppt',
  updated_at     timestamptz not null default now()
);

-- ── sales del catálogo (el usuario ajusta hidrato, grado, proveedor) ──
create table if not exists public.salts (
  id            text        not null,
  user_id       uuid        not null references auth.users(id) on delete cascade,
  compuesto     text        not null,
  estado        text        not null default 'desconocido',
  grado         text        not null default 'desconocido',
  coa           boolean     not null default false,
  proveedor     text        default '',
  fecha_compra  date,
  updated_at    timestamptz not null default now(),
  primary key (user_id, id),
  constraint salts_estado_chk check (estado in ('confirmado_hidratado','confirmado_anhidro','desconocido')),
  constraint salts_grado_chk  check (grado  in ('alimenticio','reactivo','tecnico','desconocido'))
);

-- ── soluciones madre ──
create table if not exists public.solutions (
  id          text        not null,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  nombre      text        not null,
  salt_id     text        not null,
  gramos      numeric     not null,
  volumen_ml  numeric     not null,
  fecha       date        not null,
  restante_ml numeric     not null default 0,
  horneado    boolean     not null default false,
  updated_at  timestamptz not null default now(),
  primary key (user_id, id),
  constraint solutions_gramos_chk check (gramos > 0),
  constraint solutions_vol_chk    check (volumen_ml > 0)
);

-- ── mediciones. 'v' es jsonb porque la lista de parámetros puede crecer ──
create table if not exists public.measurements (
  id         text        not null,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  fecha      date        not null,
  v          jsonb       not null default '{}'::jsonb,
  kits       jsonb       not null default '{}'::jsonb,
  note       text        default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists measurements_user_fecha_idx on public.measurements (user_id, fecha desc);

-- ── dosis registradas: alimentan el cálculo de consumo real ──
create table if not exists public.doses (
  id          text        not null,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  fecha       date        not null,
  solution_id text        not null,
  ml          numeric     not null,
  correccion  boolean     not null default false,
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists doses_user_fecha_idx on public.doses (user_id, fecha desc);

-- ── mantenimiento y cambios de agua ──
create table if not exists public.maintenance (
  id         text        not null,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  fecha      date        not null,
  tipo       text        not null default 'otro',
  cant       numeric,
  unidad     text        default 'L',
  marca      text        default '',
  nota       text        default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists maintenance_user_fecha_idx on public.maintenance (user_id, fecha desc);

-- ── corales y su bitácora ──
create table if not exists public.corals (
  id         text        not null,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  nombre     text        not null,
  especie    text        default '',
  tipo       text        default 'otro',
  estado     text        default 'bien',
  fecha      date,
  ubic       text        default '',
  nota       text        default '',
  photo      text,                       -- ruta dentro del bucket 'fotos'
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.coral_log (
  id         text        not null,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  coral_id   text        not null,
  fecha      date        not null,
  estado     text,
  talla      numeric,
  nota       text        default '',
  photo      text,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists coral_log_user_coral_idx on public.coral_log (user_id, coral_id, fecha);

-- ═══════════════════ Row Level Security ═══════════════════
-- Sin esto la clave anon publicada dejaría leer todo. Con esto, cada quien
-- solo alcanza sus propias filas.

alter table public.aquariums   enable row level security;
alter table public.salts       enable row level security;
alter table public.solutions   enable row level security;
alter table public.measurements enable row level security;
alter table public.doses       enable row level security;
alter table public.maintenance enable row level security;
alter table public.corals      enable row level security;
alter table public.coral_log   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['aquariums','salts','solutions','measurements','doses','maintenance','corals','coral_log']
  loop
    execute format('drop policy if exists %I_own on public.%I', t, t);
    execute format($f$
      create policy %I_own on public.%I
        for all
        using (user_id = (select auth.uid()))
        with check (user_id = (select auth.uid()))
    $f$, t, t);
  end loop;
end $$;

-- ═══════════════════ updated_at automático ═══════════════════
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['aquariums','salts','solutions','measurements','doses','maintenance','corals','coral_log']
  loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format('create trigger %I_touch before update on public.%I
                    for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

-- ═══════════════════ alta de usuario ═══════════════════
-- Al entrar por primera vez con Google se crea el acuario y se precarga
-- el catálogo de sales, para que la app no arranque vacía.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.aquariums (user_id) values (new.id)
    on conflict (user_id) do nothing;

  insert into public.salts (id, user_id, compuesto, estado) values
    ('sal_nahco3', new.id, 'nahco3', 'confirmado_anhidro'),
    ('sal_na2co3', new.id, 'na2co3', 'confirmado_anhidro'),
    ('sal_cacl2',  new.id, 'cacl2',  'desconocido'),
    ('sal_mgcl2',  new.id, 'mgcl2',  'desconocido'),
    ('sal_mgso4',  new.id, 'mgso4',  'desconocido')
    on conflict (user_id, id) do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════════════ Storage: fotos de corales ═══════════════════
-- Bucket privado. Cada usuario solo toca la carpeta que lleva su uid.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists fotos_own_select on storage.objects;
drop policy if exists fotos_own_insert on storage.objects;
drop policy if exists fotos_own_update on storage.objects;
drop policy if exists fotos_own_delete on storage.objects;

create policy fotos_own_select on storage.objects for select
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy fotos_own_insert on storage.objects for insert
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy fotos_own_update on storage.objects for update
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy fotos_own_delete on storage.objects for delete
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
