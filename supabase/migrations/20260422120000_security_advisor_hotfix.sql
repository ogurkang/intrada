-- Security Advisor hotfix:
-- - public.ayy_sd_override RLS
-- - function search_path mutable uyarilari

-- ayy_sd_override: RLS + admin policy
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'ayy_sd_override'
  ) then
    execute 'alter table public.ayy_sd_override enable row level security';
    execute 'drop policy if exists ayy_sd_override_all_authenticated on public.ayy_sd_override';
    execute 'drop policy if exists ayy_sd_override_admin_all on public.ayy_sd_override';
    execute 'create policy ayy_sd_override_admin_all on public.ayy_sd_override for all to authenticated using (public.is_admin_like(auth.uid())) with check (public.is_admin_like(auth.uid()))';
  end if;
end
$$;

-- Function Search Path Mutable: belirtilen fonksiyonlar
do $$
declare
  fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'yerel_bilgi_arac_alt_tur_turu_kontrol',
        'app_link_calisan_ins'
      )
  loop
    execute format('alter function %s set search_path = public, pg_temp', fn);
  end loop;
end
$$;
