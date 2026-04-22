-- Supabase Security Advisor bulgularını kapatmak için:
-- 1) SECURITY DEFINER view uyarıları
-- 2) RLS disabled uyarıları

-- 1) View'larda SECURITY INVOKER kullan (definer uyarısını kapatır)
do $$
begin
  if exists (
    select 1
    from pg_views
    where schemaname = 'public' and viewname = 'personel_kadro_ozet'
  ) then
    execute 'alter view public.personel_kadro_ozet set (security_invoker = true)';
  end if;

  if exists (
    select 1
    from pg_views
    where schemaname = 'public' and viewname = 'aktif_personel'
  ) then
    execute 'alter view public.aktif_personel set (security_invoker = true)';
  end if;
end
$$;

-- 2) RLS'i etkinleştir
alter table if exists public.rapor_izin_excel_gecmis enable row level security;
alter table if exists public.app_links enable row level security;
alter table if exists public.terfi_donem enable row level security;
alter table if exists public.terfi_donem_islem_log enable row level security;
alter table if exists public.rmy_sd_override enable row level security;

-- 3) Mevcut uygulama akışını bozmadan policy ekle
-- app_links: public link çözümü için anon/authenticated SELECT açık kalmalı
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'app_links'
  ) then
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'app_links' and policyname = 'app_links_select_anon_auth'
    ) then
      create policy app_links_select_anon_auth
      on public.app_links
      for select
      to anon, authenticated
      using (true);
    end if;
  end if;
end
$$;

-- rapor_izin_excel_gecmis: yetkili kullanıcı işlemleri için authenticated tam erişim
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'rapor_izin_excel_gecmis'
  ) then
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'rapor_izin_excel_gecmis' and policyname = 'rapor_izin_excel_gecmis_all_authenticated'
    ) then
      create policy rapor_izin_excel_gecmis_all_authenticated
      on public.rapor_izin_excel_gecmis
      for all
      to authenticated
      using (true)
      with check (true);
    end if;
  end if;
end
$$;

-- terfi_donem: uygulama tarafındaki erişimleri kırmamak için authenticated tam erişim
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'terfi_donem'
  ) then
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'terfi_donem' and policyname = 'terfi_donem_all_authenticated'
    ) then
      create policy terfi_donem_all_authenticated
      on public.terfi_donem
      for all
      to authenticated
      using (true)
      with check (true);
    end if;
  end if;
end
$$;

-- terfi_donem_islem_log: uygulama tarafındaki erişimleri kırmamak için authenticated tam erişim
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'terfi_donem_islem_log'
  ) then
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'terfi_donem_islem_log' and policyname = 'terfi_donem_islem_log_all_authenticated'
    ) then
      create policy terfi_donem_islem_log_all_authenticated
      on public.terfi_donem_islem_log
      for all
      to authenticated
      using (true)
      with check (true);
    end if;
  end if;
end
$$;

-- rmy_sd_override: tablo varsa authenticated tam erişim
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'rmy_sd_override'
  ) then
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'rmy_sd_override' and policyname = 'rmy_sd_override_all_authenticated'
    ) then
      create policy rmy_sd_override_all_authenticated
      on public.rmy_sd_override
      for all
      to authenticated
      using (true)
      with check (true);
    end if;
  end if;
end
$$;
