alter table if exists public.stratejik_plan_gosterge_veri_donem enable row level security;
alter table if exists public.stratejik_plan_gosterge_gerceklesme enable row level security;
alter table if exists public.stratejik_plan_veri_giris_yetki_mudurluk enable row level security;

drop policy if exists "sp_gosterge_veri_donem_select_auth" on public.stratejik_plan_gosterge_veri_donem;
create policy "sp_gosterge_veri_donem_select_auth"
on public.stratejik_plan_gosterge_veri_donem
for select
to authenticated
using (true);

drop policy if exists "sp_gosterge_veri_donem_insert_auth" on public.stratejik_plan_gosterge_veri_donem;
create policy "sp_gosterge_veri_donem_insert_auth"
on public.stratejik_plan_gosterge_veri_donem
for insert
to authenticated
with check (true);

drop policy if exists "sp_gosterge_veri_donem_update_auth" on public.stratejik_plan_gosterge_veri_donem;
create policy "sp_gosterge_veri_donem_update_auth"
on public.stratejik_plan_gosterge_veri_donem
for update
to authenticated
using (true)
with check (true);

drop policy if exists "sp_gosterge_gerceklesme_select_auth" on public.stratejik_plan_gosterge_gerceklesme;
create policy "sp_gosterge_gerceklesme_select_auth"
on public.stratejik_plan_gosterge_gerceklesme
for select
to authenticated
using (true);

drop policy if exists "sp_gosterge_gerceklesme_insert_auth" on public.stratejik_plan_gosterge_gerceklesme;
create policy "sp_gosterge_gerceklesme_insert_auth"
on public.stratejik_plan_gosterge_gerceklesme
for insert
to authenticated
with check (true);

drop policy if exists "sp_gosterge_gerceklesme_update_auth" on public.stratejik_plan_gosterge_gerceklesme;
create policy "sp_gosterge_gerceklesme_update_auth"
on public.stratejik_plan_gosterge_gerceklesme
for update
to authenticated
using (true)
with check (true);

drop policy if exists "sp_veri_giris_yetki_select_auth" on public.stratejik_plan_veri_giris_yetki_mudurluk;
create policy "sp_veri_giris_yetki_select_auth"
on public.stratejik_plan_veri_giris_yetki_mudurluk
for select
to authenticated
using (true);
