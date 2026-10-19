-- E-posta eki tarayıcıdan Storage'a gider; sunucu gövde sınırı aradan çıkar. Üst sınır 20 MB.

insert into storage.buckets (id, name, public, file_size_limit)
values ('eposta-ek', 'eposta-ek', false, 20971520)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists eposta_ek_admin_select on storage.objects;
create policy eposta_ek_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'eposta-ek' and public.is_admin_like(auth.uid()));

drop policy if exists eposta_ek_admin_insert on storage.objects;
create policy eposta_ek_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'eposta-ek' and public.is_admin_like(auth.uid()));

drop policy if exists eposta_ek_admin_delete on storage.objects;
create policy eposta_ek_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'eposta-ek' and public.is_admin_like(auth.uid()));
