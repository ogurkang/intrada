-- Aynı performans hedefi farklı müdürlüklerle tekrar bağlanabilir.
-- Aynı hedef + aynı müdürlük yalnızca bir kez.
-- Supabase SQL editöründe bir kez çalıştırın.

do $$
declare
  c name;
begin
  select con.conname into c
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'performans_programi_alt_program_hedef'
    and con.contype = 'u'
    and pg_get_constraintdef(con.oid) ilike '%alt_hedef_id%'
    and pg_get_constraintdef(con.oid) not ilike '%secilen_mudurluk%';
  if c is not null then
    execute format('alter table public.performans_programi_alt_program_hedef drop constraint %I', c);
  end if;
end $$;

create unique index if not exists uq_pp_hedef_mudurluk
  on public.performans_programi_alt_program_hedef (alt_program_id, alt_hedef_id, secilen_mudurluk);
