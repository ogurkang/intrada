-- Hesaplama yönetimi · ADABEL personel maliyeti senaryosu (tek belge)

create table if not exists public.hesaplama_personel_maliyet (
  id smallint primary key default 1,
  belge jsonb not null,
  updated_at timestamptz not null default now(),
  constraint hesaplama_personel_maliyet_tek check (id = 1)
);

comment on table public.hesaplama_personel_maliyet is
  'ADABEL sendika pazarlığı personel maliyeti. Kalemler belgenin içindedir; bordro kaydı değildir.';

alter table public.hesaplama_personel_maliyet enable row level security;

do $$
declare
  tbl text := 'hesaplama_personel_maliyet';
  ok text := '(
        public.is_admin_like(auth.uid())
        or not exists (select 1 from public.app_profiles ap where ap.id = auth.uid())
        or exists (
          select 1 from public.app_profiles ap
          where ap.id = auth.uid()
            and coalesce(ap.menu_izinleri->>''hesaplamaYonetimi'', '''') in (''true'', ''t'')
        )
      )';
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = tbl and policyname = tbl || '_select'
  ) then
    execute format(
      'create policy %I on public.%I for select to authenticated using %s',
      tbl || '_select', tbl, ok
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = tbl and policyname = tbl || '_insert'
  ) then
    execute format(
      'create policy %I on public.%I for insert to authenticated with check %s',
      tbl || '_insert', tbl, ok
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = tbl and policyname = tbl || '_update'
  ) then
    execute format(
      'create policy %I on public.%I for update to authenticated using %s with check %s',
      tbl || '_update', tbl, ok, ok
    );
  end if;
end
$$;
