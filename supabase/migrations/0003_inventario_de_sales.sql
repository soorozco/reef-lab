-- ═══════════════════════════════════════════════════════════════════════
-- Inventario de sales
--
-- El catálogo de sales sirve para quien compra a granel. Quien dosifica con
-- productos comerciales premezclados no tiene ninguna de esas sales, y aun
-- así la app le pedía confirmar hidratos y le avisaba de grados industriales
-- de cosas que no posee.
--
-- 'tengo' marca cuáles están de verdad en el estante. Arranca en false: el
-- catálogo pasa a ser referencia y cada quien declara lo que compró.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.salts add column if not exists tengo boolean not null default false;

-- Si una sal ya está usada por alguna solución en modo receta, es que sí se tiene.
update public.salts s
   set tengo = true
 where exists (
   select 1 from public.solutions x
    where x.user_id = s.user_id
      and x.salt_id = s.id
      and coalesce(x.modo,'receta') = 'receta'
 );
