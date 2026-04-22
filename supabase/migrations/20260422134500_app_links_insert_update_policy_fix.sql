-- Fix: izin/personel hareketi trigger'lari app_links'e upsert yaparken
-- RLS nedeniyle INSERT/UPDATE engeline takiliyordu.
-- app_links tablosunda SELECT policy vardi, yazma policy yoktu.

alter table if exists public.app_links enable row level security;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'app_links'
  ) then
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'app_links'
        and policyname = 'app_links_insert_authenticated'
    ) then
      create policy app_links_insert_authenticated
      on public.app_links
      for insert
      to authenticated
      with check (true);
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'app_links'
        and policyname = 'app_links_update_authenticated'
    ) then
      create policy app_links_update_authenticated
      on public.app_links
      for update
      to authenticated
      using (true)
      with check (true);
    end if;
  end if;
end
$$;
