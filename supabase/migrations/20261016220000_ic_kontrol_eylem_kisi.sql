-- İKEP: müdürlük koordinatörü ve müdürlük işlemcisi eylem bazında, sorumlu müdürlüğün
-- personelinden seçilir. Bildirimi yalnızca seçilen kişiler girer; koordinatöre
-- müdürlük koordinatörü gönderir.

create table if not exists public.ick_eylem_kisi (
  id bigint generated always as identity primary key,
  eylem_id bigint not null references public.ick_eylem (id) on delete cascade,
  rol text not null,
  sicil_no text not null,
  ad_soyad text not null default '',
  created_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint ick_eylem_kisi_rol check (rol in ('mudurluk_koordinatoru', 'mudurluk_islemcisi')),
  unique (eylem_id, sicil_no)
);
create index if not exists ick_eylem_kisi_sicil on public.ick_eylem_kisi (sicil_no);

comment on table public.ick_eylem_kisi is 'Eylemin müdürlük koordinatörleri ve müdürlük işlemcileri.';

drop trigger if exists ick_eylem_kisi_audit on public.ick_eylem_kisi;
create trigger ick_eylem_kisi_audit
  after insert or update or delete on public.ick_eylem_kisi
  for each row execute function public.ick_audit_yaz();

-- Tanımlar ekranındaki müdürlük bazlı seçimler, o müdürlüğün açık eylemlerine taşınır
insert into public.ick_eylem_kisi (eylem_id, rol, sicil_no, ad_soyad, created_by)
select e.id, 'mudurluk_koordinatoru', mk.sicil_no, mk.ad_soyad, mk.created_by
from public.ick_mudurluk_koordinator mk
join public.ick_eylem e
  on e.sorumlu_tur = 'mudurluk'
 and e.sorumlu_mudurluk_id = mk.mudurluk_id
 and e.durum not in ('iptal', 'devredildi')
on conflict (eylem_id, sicil_no) do nothing;

-- ---------------------------------------------------------------------------
-- Yetki fonksiyonları
-- ---------------------------------------------------------------------------

/** Kullanıcının eylemdeki rolü; kişi hâlâ sorumlu müdürlükte görevli olmalı */
create or replace function public.ick_eylem_rolu(p_uid uuid, p_eylem bigint)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select k.rol
  from public.ick_eylem_kisi k
  join public.ick_eylem e on e.id = k.eylem_id
  where k.eylem_id = p_eylem
    and k.sicil_no = public.ick_kullanici_sicil(p_uid)
    and e.sorumlu_tur = 'mudurluk'
    and e.sorumlu_mudurluk_id in (select public.ick_sicil_mudurlukleri(k.sicil_no))
    and not public.ick_plan_koordinatoru(p_uid, e.plan_id)
  order by case k.rol when 'mudurluk_koordinatoru' then 0 else 1 end
  limit 1;
$$;

create or replace function public.ick_mudurluk_koordinatoru(p_uid uuid, p_mudurluk integer)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_mudurluk is not null and exists (
    select 1
    from public.ick_eylem_kisi k
    join public.ick_eylem e on e.id = k.eylem_id
    where k.rol = 'mudurluk_koordinatoru'
      and e.sorumlu_mudurluk_id = p_mudurluk
      and k.sicil_no = public.ick_kullanici_sicil(p_uid)
      and p_mudurluk in (select public.ick_sicil_mudurlukleri(k.sicil_no))
  );
$$;

create or replace function public.ick_islemci(p_uid uuid, p_mudurluk integer)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_mudurluk is not null and exists (
    select 1
    from public.ick_eylem_kisi k
    join public.ick_eylem e on e.id = k.eylem_id
    where k.rol = 'mudurluk_islemcisi'
      and e.sorumlu_mudurluk_id = p_mudurluk
      and k.sicil_no = public.ick_kullanici_sicil(p_uid)
      and p_mudurluk in (select public.ick_sicil_mudurlukleri(k.sicil_no))
  );
$$;

/** Bildirim taslağı girebilir: eylemde seçilen kişiler; üst yönetim eyleminde plan koordinatörü */
create or replace function public.ick_eylem_yazabilir(p_uid uuid, p_eylem bigint)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.ick_eylem e
    where e.id = p_eylem
      and (
        (e.sorumlu_tur = 'mudurluk' and public.ick_eylem_rolu(p_uid, e.id) is not null)
        or (e.sorumlu_tur = 'ust_yonetim' and public.ick_plan_koordinatoru(p_uid, e.plan_id))
      )
  );
$$;

/** Bildirimi koordinatöre gönderir: eylemin müdürlük koordinatörü; üst yönetim eyleminde plan koordinatörü */
create or replace function public.ick_eylem_gonderebilir(p_uid uuid, p_eylem bigint)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.ick_eylem e
    where e.id = p_eylem
      and (
        (e.sorumlu_tur = 'mudurluk' and public.ick_eylem_rolu(p_uid, e.id) = 'mudurluk_koordinatoru')
        or (e.sorumlu_tur = 'ust_yonetim' and public.ick_plan_koordinatoru(p_uid, e.plan_id))
      )
  );
$$;

create or replace function public.ick_okuyabilir(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_admin_like(p_uid)
    or public.ick_koordinator(p_uid)
    or public.ick_izleyici(p_uid)
    or public.ick_menu_acik(p_uid)
    or exists (select 1 from public.ick_eylem_kisi k where k.sicil_no = public.ick_kullanici_sicil(p_uid));
$$;

create or replace function public.ick_yukleyebilir(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.ick_koordinator(p_uid)
    or exists (select 1 from public.ick_eylem_kisi k where k.sicil_no = public.ick_kullanici_sicil(p_uid));
$$;

create or replace function public.ick_yetkim()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_sicil text := public.ick_kullanici_sicil(auth.uid());
begin
  return jsonb_build_object(
    'sicil', v_sicil,
    'koordinator_planlar', coalesce((
      select jsonb_agg(distinct k.plan_id) from public.ick_plan_koordinator k where k.sicil_no = v_sicil
    ), '[]'::jsonb),
    'izleyici', public.ick_izleyici(v_uid),
    'menu', public.ick_menu_acik(v_uid),
    'mudurlukler', coalesce((select jsonb_agg(x) from public.ick_sicil_mudurlukleri(v_sicil) x), '[]'::jsonb),
    'eylem_rolleri', coalesce((
      select jsonb_agg(jsonb_build_object('eylem', k.eylem_id, 'rol', k.rol, 'mudurluk', e.sorumlu_mudurluk_id))
      from public.ick_eylem_kisi k
      join public.ick_eylem e on e.id = k.eylem_id
      where v_sicil is not null
        and k.sicil_no = v_sicil
        and e.sorumlu_tur = 'mudurluk'
        and e.sorumlu_mudurluk_id in (select public.ick_sicil_mudurlukleri(v_sicil))
        and not public.ick_plan_koordinatoru(v_uid, e.plan_id)
    ), '[]'::jsonb),
    'okuyabilir', public.ick_okuyabilir(v_uid)
  );
end;
$$;

-- Personel listesine İç Kontrol menü yetkisi eklenir (dönüş tipi değiştiği için yeniden oluşturulur)
drop function if exists public.ick_mudurluk_personeli(integer);
create function public.ick_mudurluk_personeli(p_mudurluk_id integer)
returns table (sicil text, ad text, unvan text, hesap_var boolean, menu_acik boolean)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_ad text;
begin
  if not (public.is_admin_like(auth.uid()) or public.ick_koordinator(auth.uid())) then
    raise exception 'Personel listesini yönetici veya iç kontrol koordinatörü görür.';
  end if;
  select m.mudurluk_adi into v_ad from public.tanim_mudurluk m where m.id = p_mudurluk_id;
  if v_ad is null then
    return;
  end if;
  return query
  with k as (
    select kh.asil::text as s, coalesce(nullif(trim(kh.gorev_unvani), ''), kh.kadro_unvani, '') as u, 1 as oncelik
    from public.kadro_hareketleri kh
    where kh.ayrilis_tarihi is null
      and nullif(trim(kh.asil::text), '') is not null
      and public.ick_metin_norm(coalesce(nullif(trim(kh.gorev_mudurlugu), ''), kh.kadro_mudurlugu)) = public.ick_metin_norm(v_ad)
    union all
    select kh.vekil::text, 'Vekil: ' || coalesce(nullif(trim(kh.kadro_unvani), ''), kh.gorev_unvani, ''), 2
    from public.kadro_hareketleri kh
    where kh.ayrilis_tarihi is null
      and nullif(trim(kh.vekil::text), '') is not null
      and public.ick_metin_norm(coalesce(nullif(trim(kh.gorev_mudurlugu), ''), kh.kadro_mudurlugu)) = public.ick_metin_norm(v_ad)
    union all
    select fc.sicil_no::text, 'ADABEL', 3
    from public.firma_calisanlar fc
    where fc.ayrilis_tarihi is null
      and nullif(trim(fc.sicil_no::text), '') is not null
      and public.ick_metin_norm(fc.gorev_mudurlugu) = public.ick_metin_norm(v_ad)
  ),
  tekil as (
    select distinct on (k.s) k.s, k.u from k order by k.s, k.oncelik
  )
  select
    t.s,
    coalesce(
      (select c.ad_soyad from public.calisan c where c.sicil_no::text = t.s limit 1),
      (select f.ad_soyad from public.firma_calisanlar f where f.sicil_no::text = t.s limit 1),
      t.s
    )::text,
    t.u::text,
    exists (select 1 from public.app_profiles ap where nullif(trim(ap.sicil_no::text), '') = t.s and coalesce(ap.hesap_aktif, true)),
    exists (
      select 1 from public.app_profiles ap
      where nullif(trim(ap.sicil_no::text), '') = t.s
        and coalesce(ap.hesap_aktif, true)
        and ((ap.menu_izinleri ->> 'icKontrolYonetimi') = 'true' or public.is_admin_like(ap.id))
    )
  from tekil t;
end;
$$;

revoke all on function public.ick_eylem_rolu(uuid, bigint) from public;
revoke all on function public.ick_mudurluk_personeli(integer) from public;
grant execute on function public.ick_eylem_rolu(uuid, bigint) to authenticated;
grant execute on function public.ick_mudurluk_personeli(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: kişileri planın koordinatörü seçer
-- ---------------------------------------------------------------------------
alter table public.ick_eylem_kisi enable row level security;

drop policy if exists ick_eylem_kisi_select on public.ick_eylem_kisi;
create policy ick_eylem_kisi_select on public.ick_eylem_kisi
  for select to authenticated
  using (public.ick_okuyabilir(auth.uid()));

drop policy if exists ick_eylem_kisi_yaz on public.ick_eylem_kisi;
create policy ick_eylem_kisi_yaz on public.ick_eylem_kisi
  for all to authenticated
  using (exists (select 1 from public.ick_eylem e where e.id = eylem_id and public.ick_plan_koordinatoru(auth.uid(), e.plan_id)))
  with check (exists (select 1 from public.ick_eylem e where e.id = eylem_id and public.ick_plan_koordinatoru(auth.uid(), e.plan_id)));

grant select, insert, update, delete on public.ick_eylem_kisi to authenticated;

-- ---------------------------------------------------------------------------
-- Devirde eylemin kişileri yeni eyleme kopyalanır
-- ---------------------------------------------------------------------------
create or replace function public.ick_eylem_kisi_devir()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.onceki_eylem_id is not null then
    insert into public.ick_eylem_kisi (eylem_id, rol, sicil_no, ad_soyad, created_by)
    select new.id, k.rol, k.sicil_no, k.ad_soyad, auth.uid()
    from public.ick_eylem_kisi k
    where k.eylem_id = new.onceki_eylem_id
    on conflict (eylem_id, sicil_no) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists ick_eylem_kisi_devir on public.ick_eylem;
create trigger ick_eylem_kisi_devir
  after insert on public.ick_eylem
  for each row execute function public.ick_eylem_kisi_devir();

notify pgrst, 'reload schema';
