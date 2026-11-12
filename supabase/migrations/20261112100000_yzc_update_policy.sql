-- Yarı zamanlı çalışma: UPDATE RLS eksikti; güncelleme 0 satır dönüyordu.
do $$
declare
  tbl text := 'yari_zamanli_calisma_bildirimleri';
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = tbl and policyname = tbl || '_update'
  ) then
    execute format(
      'create policy %I on public.%I for update to authenticated using (
        public.is_admin_like(auth.uid())
        or not exists (select 1 from public.app_profiles ap where ap.id = auth.uid())
        or sicil_no in (select ap.sicil_no from public.app_profiles ap where ap.id = auth.uid())
      ) with check (
        public.is_admin_like(auth.uid())
        or not exists (select 1 from public.app_profiles ap where ap.id = auth.uid())
        or sicil_no in (select ap.sicil_no from public.app_profiles ap where ap.id = auth.uid())
      )',
      tbl || '_update', tbl
    );
  end if;
end
$$;
