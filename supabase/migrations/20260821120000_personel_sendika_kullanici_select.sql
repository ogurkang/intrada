-- Personel kendi sendika kaydını görebilsin; tanim_sendika join için okunabilir olsun.

drop policy if exists personel_sendika_select on public.personel_sendika;
create policy personel_sendika_select on public.personel_sendika
  for select to authenticated
  using (
    public.is_admin_like(auth.uid())
    or not exists (select 1 from public.app_profiles ap where ap.id = auth.uid())
    or sicil_no in (select ap.sicil_no from public.app_profiles ap where ap.id = auth.uid())
  );

drop policy if exists tanim_sendika_select on public.tanim_sendika;
create policy tanim_sendika_select on public.tanim_sendika
  for select to authenticated
  using (true);
