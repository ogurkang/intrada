-- Aynı performans hedefi + müdürlük, farklı faaliyetlerde tekrar bağlanabilir.
-- Aynı faaliyet altında aynı hedef + müdürlük yalnızca bir kez.
-- Supabase SQL editöründe bir kez çalıştırın.

drop index if exists public.uq_pp_hedef_mudurluk;

create unique index if not exists uq_pp_hedef_mudurluk_faaliyet
  on public.performans_programi_alt_program_hedef (faaliyet_id, alt_hedef_id, secilen_mudurluk)
  where faaliyet_id is not null;
