-- İSG tabloları: RLS açıkken politika eksikse yazma engellenir.
-- isg_tespit_oneri: UI ile RLS açılmış, politika yok → insert hatası.
-- isg_saglik_taramasi_*: RLS kapalı → Security Advisor uyarısı.

-- ─── Tespit / öneri ───────────────────────────────────────────────
alter table public.isg_tespit_oneri enable row level security;

drop policy if exists isg_tespit_oneri_select on public.isg_tespit_oneri;
drop policy if exists isg_tespit_oneri_write on public.isg_tespit_oneri;
drop policy if exists isg_tespit_oneri_insert on public.isg_tespit_oneri;
drop policy if exists isg_tespit_oneri_update on public.isg_tespit_oneri;
drop policy if exists isg_tespit_oneri_delete on public.isg_tespit_oneri;
drop policy if exists "Enable read access for all users" on public.isg_tespit_oneri;
drop policy if exists "Enable insert for authenticated users only" on public.isg_tespit_oneri;

create policy isg_tespit_oneri_select
  on public.isg_tespit_oneri
  for select
  to authenticated
  using (true);

create policy isg_tespit_oneri_write
  on public.isg_tespit_oneri
  for all
  to authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on public.isg_tespit_oneri to authenticated;
grant usage, select on sequence public.isg_tespit_oneri_id_seq to authenticated;

-- ─── Sağlık taraması (Security Advisor) ───────────────────────
alter table public.isg_saglik_taramasi_donem enable row level security;
alter table public.isg_saglik_taramasi_kayit enable row level security;

drop policy if exists isg_saglik_taramasi_donem_select on public.isg_saglik_taramasi_donem;
drop policy if exists isg_saglik_taramasi_donem_write on public.isg_saglik_taramasi_donem;
drop policy if exists isg_saglik_taramasi_kayit_select on public.isg_saglik_taramasi_kayit;
drop policy if exists isg_saglik_taramasi_kayit_write on public.isg_saglik_taramasi_kayit;

create policy isg_saglik_taramasi_donem_select
  on public.isg_saglik_taramasi_donem
  for select
  to authenticated
  using (true);

create policy isg_saglik_taramasi_donem_write
  on public.isg_saglik_taramasi_donem
  for all
  to authenticated
  using (true)
  with check (true);

create policy isg_saglik_taramasi_kayit_select
  on public.isg_saglik_taramasi_kayit
  for select
  to authenticated
  using (true);

create policy isg_saglik_taramasi_kayit_write
  on public.isg_saglik_taramasi_kayit
  for all
  to authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on public.isg_saglik_taramasi_donem to authenticated;
grant select, insert, update, delete on public.isg_saglik_taramasi_kayit to authenticated;
grant usage, select on sequence public.isg_saglik_taramasi_donem_id_seq to authenticated;
grant usage, select on sequence public.isg_saglik_taramasi_kayit_id_seq to authenticated;
