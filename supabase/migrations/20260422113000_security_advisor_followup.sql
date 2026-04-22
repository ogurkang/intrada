-- Security Advisor follow-up:
-- - RLS enabled but no policy (personel_audit_log)
-- - RLS disabled (rmy_sd_override)
-- - Function search_path mutable uyarıları
-- - overly permissive "USING (true) / WITH CHECK (true)" policy uyarıları

-- Admin kontrol helper'ı (RLS policy içinde tekrar kullanılacak)
create or replace function public.is_admin_like(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.app_profiles ap
    where ap.id = p_uid
      and ap.rol = 'admin'
      and coalesce(ap.hesap_aktif, true) = true
  );
$$;

revoke all on function public.is_admin_like(uuid) from public;
grant execute on function public.is_admin_like(uuid) to authenticated;

-- personel_audit_log: RLS + policy
alter table if exists public.personel_audit_log enable row level security;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'personel_audit_log'
  ) then
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'personel_audit_log'
        and policyname = 'personel_audit_log_select_authenticated'
    ) then
      create policy personel_audit_log_select_authenticated
      on public.personel_audit_log
      for select
      to authenticated
      using (true);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'personel_audit_log'
        and policyname = 'personel_audit_log_insert_actor'
    ) then
      create policy personel_audit_log_insert_actor
      on public.personel_audit_log
      for insert
      to authenticated
      with check (actor_id is null or actor_id = auth.uid());
    end if;
  end if;
end
$$;

-- rmy_sd_override: RLS açık + admin erişimi
alter table if exists public.rmy_sd_override enable row level security;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'rmy_sd_override'
  ) then
    drop policy if exists rmy_sd_override_all_authenticated on public.rmy_sd_override;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'rmy_sd_override'
        and policyname = 'rmy_sd_override_admin_all'
    ) then
      create policy rmy_sd_override_admin_all
      on public.rmy_sd_override
      for all
      to authenticated
      using (public.is_admin_like(auth.uid()))
      with check (public.is_admin_like(auth.uid()));
    end if;
  end if;
end
$$;

-- app_profiles: "always true" yerine kullanıcı-kendi + admin
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'app_profiles'
  ) then
    drop policy if exists "app_profiles_select_auth" on public.app_profiles;
    drop policy if exists "app_profiles_insert_auth" on public.app_profiles;
    drop policy if exists "app_profiles_update_auth" on public.app_profiles;
    drop policy if exists "app_profiles_delete_auth" on public.app_profiles;

    create policy app_profiles_select_self_or_admin
    on public.app_profiles
    for select
    to authenticated
    using (id = auth.uid() or public.is_admin_like(auth.uid()));

    create policy app_profiles_insert_self_or_admin
    on public.app_profiles
    for insert
    to authenticated
    with check (id = auth.uid() or public.is_admin_like(auth.uid()));

    create policy app_profiles_update_self_or_admin
    on public.app_profiles
    for update
    to authenticated
    using (id = auth.uid() or public.is_admin_like(auth.uid()))
    with check (id = auth.uid() or public.is_admin_like(auth.uid()));

    create policy app_profiles_delete_admin
    on public.app_profiles
    for delete
    to authenticated
    using (public.is_admin_like(auth.uid()));
  end if;
end
$$;

-- rapor_izin_excel_gecmis: only owner (user_id) or admin
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'rapor_izin_excel_gecmis'
  ) then
    drop policy if exists rapor_izin_excel_gecmis_all_authenticated on public.rapor_izin_excel_gecmis;

    create policy rapor_izin_excel_gecmis_select_owner_or_admin
    on public.rapor_izin_excel_gecmis
    for select
    to authenticated
    using (user_id = auth.uid() or public.is_admin_like(auth.uid()));

    create policy rapor_izin_excel_gecmis_insert_owner_or_admin
    on public.rapor_izin_excel_gecmis
    for insert
    to authenticated
    with check (user_id = auth.uid() or public.is_admin_like(auth.uid()));

    create policy rapor_izin_excel_gecmis_update_owner_or_admin
    on public.rapor_izin_excel_gecmis
    for update
    to authenticated
    using (user_id = auth.uid() or public.is_admin_like(auth.uid()))
    with check (user_id = auth.uid() or public.is_admin_like(auth.uid()));

    create policy rapor_izin_excel_gecmis_delete_owner_or_admin
    on public.rapor_izin_excel_gecmis
    for delete
    to authenticated
    using (user_id = auth.uid() or public.is_admin_like(auth.uid()));
  end if;
end
$$;

-- terfi tabloları: admin erişimi
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'terfi_donem'
  ) then
    drop policy if exists terfi_donem_all_authenticated on public.terfi_donem;
    create policy terfi_donem_admin_all
    on public.terfi_donem
    for all
    to authenticated
    using (public.is_admin_like(auth.uid()))
    with check (public.is_admin_like(auth.uid()));
  end if;
end
$$;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'terfi_donem_islem_log'
  ) then
    drop policy if exists terfi_donem_islem_log_all_authenticated on public.terfi_donem_islem_log;
    create policy terfi_donem_islem_log_admin_all
    on public.terfi_donem_islem_log
    for all
    to authenticated
    using (public.is_admin_like(auth.uid()))
    with check (public.is_admin_like(auth.uid()));
  end if;
end
$$;

-- Bazı ortamlarda görülen terfi_donem_izin_log (veya ilterfi_donem_izin_log) için de admin policy
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'terfi_donem_izin_log'
  ) then
    execute 'alter table public.terfi_donem_izin_log enable row level security';
    execute 'drop policy if exists terfi_donem_izin_log_all_authenticated on public.terfi_donem_izin_log';
    execute 'create policy terfi_donem_izin_log_admin_all on public.terfi_donem_izin_log for all to authenticated using (public.is_admin_like(auth.uid())) with check (public.is_admin_like(auth.uid()))';
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'ilterfi_donem_izin_log'
  ) then
    execute 'alter table public.ilterfi_donem_izin_log enable row level security';
    execute 'drop policy if exists ilterfi_donem_izin_log_all_authenticated on public.ilterfi_donem_izin_log';
    execute 'create policy ilterfi_donem_izin_log_admin_all on public.ilterfi_donem_izin_log for all to authenticated using (public.is_admin_like(auth.uid())) with check (public.is_admin_like(auth.uid()))';
  end if;
end
$$;

-- Function Search Path Mutable uyarıları:
-- public schema altındaki ilgili fonksiyonların search_path'ini sabitle.
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
        'app_link_mal_bildirimi_ins',
        'app_link_firma_calisan_ins',
        'app_link_kadro_hareketi_ins',
        'app_link_personel_hareketi_ins',
        'app_link_izin_hareketi_ins',
        'yerel_bilgi_arac_alt_tur_kura_kontrol',
        'set_updated_at'
      )
  loop
    execute format('alter function %s set search_path = public, pg_temp', fn);
  end loop;
end
$$;
