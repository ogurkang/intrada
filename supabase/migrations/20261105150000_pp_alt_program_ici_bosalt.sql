-- Bir kez çalıştırın.
-- Program ve alt program satırları durur. Alt programın içindeki hedef, faaliyet, gösterge, maliyet ve gerekçe silinir.

do $$
begin
  if to_regclass('public.performans_programi_pf_gosterge') is not null then
    delete from public.performans_programi_pf_gosterge;
  end if;
  if to_regclass('public.performans_programi_pf_faaliyet') is not null then
    delete from public.performans_programi_pf_faaliyet;
  end if;
  if to_regclass('public.performans_programi_ozel_faaliyet_butce') is not null then
    delete from public.performans_programi_ozel_faaliyet_butce;
  end if;
  if to_regclass('public.performans_programi_ozel_faaliyet') is not null then
    delete from public.performans_programi_ozel_faaliyet;
  end if;
  if to_regclass('public.performans_programi_faaliyet_butce') is not null then
    delete from public.performans_programi_faaliyet_butce;
  end if;
  if to_regclass('public.performans_programi_maliyet_log') is not null then
    delete from public.performans_programi_maliyet_log;
  end if;
  if to_regclass('public.performans_programi_veri_giris') is not null then
    delete from public.performans_programi_veri_giris;
  end if;
  if to_regclass('public.performans_programi_alt_program_hedef') is not null then
    delete from public.performans_programi_alt_program_hedef;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'performans_programi_alt_program'
      and column_name = 'gerekce'
  ) then
    update public.performans_programi_alt_program set gerekce = null;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'performans_programi_alt_program'
      and column_name = 'hedef'
  ) then
    update public.performans_programi_alt_program set hedef = null;
  end if;
end $$;
