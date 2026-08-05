-- ═══════════════════════════════════════════════════════════════════════
-- Soluciones definidas por potencia conocida
--
-- Hasta ahora una solución era "X gramos de tal sal en Y ml". Eso sirve
-- para las que uno prepara a granel, pero no para un producto comercial
-- premezclado, donde lo que se conoce es cuánto sube cada ml.
--
-- modo = 'receta'   → gramos + salt_id (como antes)
-- modo = 'potencia' → sube ref_delta unidades con ref_ml ml en ref_litros
-- ═══════════════════════════════════════════════════════════════════════

alter table public.solutions add column if not exists modo       text    not null default 'receta';
alter table public.solutions add column if not exists tipo       text;              -- alk | ca | mg
alter table public.solutions add column if not exists ref_delta  numeric;
alter table public.solutions add column if not exists ref_ml     numeric;
alter table public.solutions add column if not exists ref_litros numeric;
alter table public.solutions add column if not exists nota       text default '';
alter table public.solutions add column if not exists receta     text default '';  -- preset con instrucciones propias

-- en modo potencia no hay sal ni gramos
alter table public.solutions alter column salt_id drop not null;
alter table public.solutions alter column gramos  drop not null;

alter table public.solutions drop constraint if exists solutions_gramos_chk;
alter table public.solutions drop constraint if exists solutions_vol_chk;
alter table public.solutions drop constraint if exists solutions_modo_chk;
alter table public.solutions drop constraint if exists solutions_coherencia_chk;

alter table public.solutions
  add constraint solutions_modo_chk check (modo in ('receta','potencia'));

alter table public.solutions
  add constraint solutions_vol_chk check (volumen_ml > 0);

-- cada modo exige sus propios campos
alter table public.solutions
  add constraint solutions_coherencia_chk check (
    (modo = 'receta'   and salt_id is not null and gramos > 0)
    or
    (modo = 'potencia' and tipo in ('alk','ca','mg')
                       and ref_delta > 0 and ref_ml > 0 and ref_litros > 0)
  );
