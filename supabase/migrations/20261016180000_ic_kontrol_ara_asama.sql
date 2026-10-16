-- İKEP ara aşama: roller personel ve organizasyondan gelir, izleme dönemleri plandan
-- otomatik oluşur, geciken eylemler tamamlanana dek dönemlerde kalır, tamamlanmayan
-- eylemler yeni plan yürürlüğe girdiğinde devredilir.

-- ---------------------------------------------------------------------------
-- Yeni sütunlar ve tablolar
-- ---------------------------------------------------------------------------
alter table public.ick_plan add column if not exists izleme_sikligi smallint not null default 2;
alter table public.ick_plan add column if not exists izleme_baslangic date null;
alter table public.ick_plan drop constraint if exists ick_plan_izleme_sikligi;
alter table public.ick_plan add constraint ick_plan_izleme_sikligi check (izleme_sikligi in (1, 2, 4));

comment on column public.ick_plan.izleme_sikligi is 'Yılda kaç izleme dönemi: 1, 2 veya 4.';
comment on column public.ick_plan.izleme_baslangic is 'Tekrarlayan eylemlerin dönemlere girmeye başladığı tarih; önceki dönemler aktarımla kapatılmıştır.';

alter table public.ick_eylem add column if not exists onceki_eylem_id bigint null references public.ick_eylem (id) on delete restrict;
alter table public.ick_eylem add column if not exists devir_notu text not null default '';
alter table public.ick_eylem add column if not exists devir_at timestamptz null;
alter table public.ick_eylem drop constraint if exists ick_eylem_durum;
alter table public.ick_eylem add constraint ick_eylem_durum check (durum in ('baslanmadi', 'devam', 'tamamlandi', 'iptal', 'devredildi'));

alter table public.ick_izleme_donemi add column if not exists siklik smallint not null default 2;
alter table public.ick_izleme_donemi drop constraint if exists ick_izleme_donemi_yari;
alter table public.ick_izleme_donemi add constraint ick_izleme_donemi_yari check (yari between 1 and 4);
comment on column public.ick_izleme_donemi.yari is 'Yıl içindeki dönem sırası (siklik 2 ise 1-2, 4 ise 1-4).';

alter table public.ick_izleme_anlik add column if not exists tekrar_yili integer null;
alter table public.ick_izleme_anlik add column if not exists kumulatif boolean not null default false;
alter table public.ick_izleme_anlik add column if not exists devreden boolean not null default false;
alter table public.ick_izleme_anlik add column if not exists gecikmeli_tamamlandi boolean not null default false;
alter table public.ick_izleme_anlik add column if not exists oran_disi boolean not null default false;

do $$
declare
  c text;
begin
  for c in
    select con.conname from pg_constraint con
    where con.conrelid = 'public.ick_izleme_anlik'::regclass and con.contype = 'u'
  loop
    execute format('alter table public.ick_izleme_anlik drop constraint %I', c);
  end loop;
end $$;
create unique index if not exists ick_izleme_anlik_tekil on public.ick_izleme_anlik (donem_id, eylem_id, coalesce(tekrar_yili, 0));

create table if not exists public.ick_plan_koordinator (
  id bigint generated always as identity primary key,
  plan_id bigint not null references public.ick_plan (id) on delete cascade,
  sicil_no text not null,
  ad_soyad text not null default '',
  created_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (plan_id, sicil_no)
);

create table if not exists public.ick_mudurluk_koordinator (
  id bigint generated always as identity primary key,
  mudurluk_id integer not null references public.tanim_mudurluk (id) on delete cascade,
  sicil_no text not null,
  ad_soyad text not null default '',
  created_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (mudurluk_id, sicil_no)
);

do $$
declare
  t text;
begin
  foreach t in array array['ick_plan_koordinator', 'ick_mudurluk_koordinator'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.ick_audit_yaz()',
      t || '_audit', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Kişi ve müdürlük eşleşmesi
-- ---------------------------------------------------------------------------
create or replace function public.ick_metin_norm(p text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(trim(translate(coalesce(p, ''), 'ÇĞİIÖŞÜÂÎÛçğıöşüâîû', 'cgiiosuaiucgiosuaiu')), '\s+', ' ', 'g'));
$$;

create or replace function public.ick_kullanici_sicil(p_uid uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select nullif(trim(ap.sicil_no::text), '')
  from public.app_profiles ap
  where ap.id = p_uid and coalesce(ap.hesap_aktif, true);
$$;

create or replace function public.ick_menu_acik(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select (ap.menu_izinleri ->> 'icKontrolYonetimi') = 'true'
    from public.app_profiles ap
    where ap.id = p_uid and coalesce(ap.hesap_aktif, true)
  ), false);
$$;

/** Personelin görev müdürlüğü (yoksa kadro müdürlüğü); kadro ve ADABEL kayıtlarından */
create or replace function public.ick_sicil_mudurlukleri(p_sicil text)
returns setof integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with adlar as (
    select coalesce(nullif(trim(kh.gorev_mudurlugu), ''), kh.kadro_mudurlugu) as ad
    from public.kadro_hareketleri kh
    where p_sicil is not null
      and kh.ayrilis_tarihi is null
      and (kh.asil::text = p_sicil or kh.vekil::text = p_sicil)
    union
    select fc.gorev_mudurlugu
    from public.firma_calisanlar fc
    where p_sicil is not null and fc.sicil_no::text = p_sicil and fc.ayrilis_tarihi is null
  )
  select distinct m.id::integer
  from public.tanim_mudurluk m
  join adlar a on a.ad is not null and public.ick_metin_norm(a.ad) = public.ick_metin_norm(m.mudurluk_adi);
$$;

-- ---------------------------------------------------------------------------
-- Yetki fonksiyonları (eski rol atama tablosu artık kullanılmaz)
-- ---------------------------------------------------------------------------
create or replace function public.ick_plan_koordinatoru(p_uid uuid, p_plan bigint)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.ick_plan_koordinator k
    where k.plan_id = p_plan and k.sicil_no = public.ick_kullanici_sicil(p_uid)
  );
$$;

create or replace function public.ick_koordinator(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.ick_plan_koordinator k
    where k.sicil_no = public.ick_kullanici_sicil(p_uid)
  );
$$;

create or replace function public.ick_mudurluk_koordinatoru(p_uid uuid, p_mudurluk integer)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_mudurluk is not null and exists (
    select 1 from public.ick_mudurluk_koordinator mk
    where mk.mudurluk_id = p_mudurluk
      and mk.sicil_no = public.ick_kullanici_sicil(p_uid)
      and p_mudurluk in (select public.ick_sicil_mudurlukleri(mk.sicil_no))
  );
$$;

create or replace function public.ick_islemci(p_uid uuid, p_mudurluk integer)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_mudurluk is not null
    and public.ick_menu_acik(p_uid)
    and p_mudurluk in (select public.ick_sicil_mudurlukleri(public.ick_kullanici_sicil(p_uid)));
$$;

/** Belediye başkanı ve başkan yardımcıları: aktif organizasyon veya kadro unvanından */
create or replace function public.ick_izleyici(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with s as (select public.ick_kullanici_sicil(p_uid) as sicil)
  select exists (
    select 1
    from s
    join public.tanim_organizasyon_birim b on b.personel_sicil_no::text = s.sicil
    join public.tanim_organizasyon o on o.id = b.organizasyon_id and o.aktif
    where b.birim_turu in ('baskan', 'baskan_yardimcisi')
  ) or exists (
    select 1
    from s
    join public.kadro_hareketleri kh
      on kh.ayrilis_tarihi is null and (kh.asil::text = s.sicil or kh.vekil::text = s.sicil)
    cross join lateral (
      select unnest(array[public.ick_metin_norm(kh.kadro_unvani), public.ick_metin_norm(kh.gorev_unvani)]) as u
    ) x
    where x.u = 'belediye baskani' or x.u like '%baskan yardimcisi%'
  );
$$;

create or replace function public.ick_birim_yetkili(p_uid uuid, p_mudurluk integer)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_mudurluk is not null
    and (public.ick_mudurluk_koordinatoru(p_uid, p_mudurluk) or public.ick_islemci(p_uid, p_mudurluk));
$$;

/** Bildirim taslağı girebilir: müdürlük personeli; plan koordinatörü kendi müdürlüğüne giremez */
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
        (e.sorumlu_tur = 'mudurluk'
          and public.ick_birim_yetkili(p_uid, e.sorumlu_mudurluk_id)
          and not public.ick_plan_koordinatoru(p_uid, e.plan_id))
        or (e.sorumlu_tur = 'ust_yonetim' and public.ick_plan_koordinatoru(p_uid, e.plan_id))
      )
  );
$$;

/** Bildirimi koordinatöre gönderir: müdürlük koordinatörü; üst yönetim eylemlerinde plan koordinatörü */
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
        (e.sorumlu_tur = 'mudurluk'
          and public.ick_mudurluk_koordinatoru(p_uid, e.sorumlu_mudurluk_id)
          and not public.ick_plan_koordinatoru(p_uid, e.plan_id))
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
    or exists (
      select 1 from public.ick_mudurluk_koordinator mk
      where mk.sicil_no = public.ick_kullanici_sicil(p_uid)
    );
$$;

create or replace function public.ick_yukleyebilir(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.ick_koordinator(p_uid)
    or exists (
      select 1 from public.ick_mudurluk_koordinator mk
      where mk.sicil_no = public.ick_kullanici_sicil(p_uid)
    )
    or (public.ick_menu_acik(p_uid) and exists (select public.ick_sicil_mudurlukleri(public.ick_kullanici_sicil(p_uid))));
$$;

/** Oturumdaki kullanıcının İKEP yetki özeti (ekranlar bunu kullanır) */
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
    'mudurluk_koordinatoru', coalesce((
      select jsonb_agg(distinct mk.mudurluk_id)
      from public.ick_mudurluk_koordinator mk
      where mk.sicil_no = v_sicil and mk.mudurluk_id in (select public.ick_sicil_mudurlukleri(v_sicil))
    ), '[]'::jsonb),
    'okuyabilir', public.ick_okuyabilir(v_uid)
  );
end;
$$;

/** Müdürlüğün görevdeki personeli (kadro asil/vekil ve ADABEL) */
create or replace function public.ick_mudurluk_personeli(p_mudurluk_id integer)
returns table (sicil text, ad text, unvan text, hesap_var boolean)
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
    exists (select 1 from public.app_profiles ap where nullif(trim(ap.sicil_no::text), '') = t.s and coalesce(ap.hesap_aktif, true))
  from tekil t;
end;
$$;

revoke all on function public.ick_kullanici_sicil(uuid) from public;
revoke all on function public.ick_menu_acik(uuid) from public;
revoke all on function public.ick_sicil_mudurlukleri(text) from public;
revoke all on function public.ick_plan_koordinatoru(uuid, bigint) from public;
revoke all on function public.ick_mudurluk_koordinatoru(uuid, integer) from public;
revoke all on function public.ick_islemci(uuid, integer) from public;
revoke all on function public.ick_izleyici(uuid) from public;
revoke all on function public.ick_eylem_gonderebilir(uuid, bigint) from public;
revoke all on function public.ick_yetkim() from public;
revoke all on function public.ick_mudurluk_personeli(integer) from public;
grant execute on function public.ick_kullanici_sicil(uuid) to authenticated;
grant execute on function public.ick_menu_acik(uuid) to authenticated;
grant execute on function public.ick_sicil_mudurlukleri(text) to authenticated;
grant execute on function public.ick_plan_koordinatoru(uuid, bigint) to authenticated;
grant execute on function public.ick_mudurluk_koordinatoru(uuid, integer) to authenticated;
grant execute on function public.ick_islemci(uuid, integer) to authenticated;
grant execute on function public.ick_izleyici(uuid) to authenticated;
grant execute on function public.ick_eylem_gonderebilir(uuid, bigint) to authenticated;
grant execute on function public.ick_yetkim() to authenticated;
grant execute on function public.ick_mudurluk_personeli(integer) to authenticated;

-- Eski rol atamaları yeni yapıya taşınır (varsa)
insert into public.ick_plan_koordinator (plan_id, sicil_no, ad_soyad)
select p.id, trim(ap.sicil_no::text), coalesce(ap.ad_soyad, '')
from public.ick_plan p
cross join public.ick_rol_atama r
join public.app_profiles ap on ap.id = r.user_id
where r.rol = 'koordinator'
  and r.baslangic <= current_date
  and (r.bitis is null or r.bitis >= current_date)
  and nullif(trim(ap.sicil_no::text), '') is not null
on conflict (plan_id, sicil_no) do nothing;

insert into public.ick_mudurluk_koordinator (mudurluk_id, sicil_no, ad_soyad)
select r.mudurluk_id, trim(ap.sicil_no::text), coalesce(ap.ad_soyad, '')
from public.ick_rol_atama r
join public.app_profiles ap on ap.id = r.user_id
where r.rol in ('birim_yonetici', 'birim_irtibat')
  and r.mudurluk_id is not null
  and r.baslangic <= current_date
  and (r.bitis is null or r.bitis >= current_date)
  and nullif(trim(ap.sicil_no::text), '') is not null
on conflict (mudurluk_id, sicil_no) do nothing;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.ick_plan_koordinator enable row level security;
alter table public.ick_mudurluk_koordinator enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'ick_belge_turu', 'ick_plan', 'ick_plan_versiyon', 'ick_genel_sart_degerlendirme', 'ick_aktarim',
    'ick_eylem', 'ick_eylem_isbirligi', 'ick_izleme_donemi'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_yaz', t);
  end loop;
  foreach t in array array['ick_plan_koordinator', 'ick_mudurluk_koordinator'] loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.ick_okuyabilir(auth.uid()))',
      t || '_select', t
    );
    execute format('drop policy if exists %I on public.%I', t || '_yaz', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin_like(auth.uid()) or public.ick_koordinator(auth.uid())) with check (public.is_admin_like(auth.uid()) or public.ick_koordinator(auth.uid()))',
      t || '_yaz', t
    );
  end loop;
  foreach t in array array['ick_genel_sart_degerlendirme', 'ick_aktarim', 'ick_eylem', 'ick_izleme_donemi'] loop
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.ick_plan_koordinatoru(auth.uid(), plan_id)) with check (public.ick_plan_koordinatoru(auth.uid(), plan_id))',
      t || '_yaz', t
    );
  end loop;
end $$;

create policy ick_belge_turu_yaz on public.ick_belge_turu
  for all to authenticated
  using (public.is_admin_like(auth.uid()) or public.ick_koordinator(auth.uid()))
  with check (public.is_admin_like(auth.uid()) or public.ick_koordinator(auth.uid()));

drop policy if exists ick_plan_insert on public.ick_plan;
create policy ick_plan_insert on public.ick_plan
  for insert to authenticated
  with check (public.is_admin_like(auth.uid()) or public.ick_koordinator(auth.uid()));

drop policy if exists ick_plan_update on public.ick_plan;
create policy ick_plan_update on public.ick_plan
  for update to authenticated
  using (public.is_admin_like(auth.uid()) or public.ick_plan_koordinatoru(auth.uid(), id))
  with check (public.is_admin_like(auth.uid()) or public.ick_plan_koordinatoru(auth.uid(), id));

create policy ick_plan_versiyon_yaz on public.ick_plan_versiyon
  for all to authenticated
  using (public.is_admin_like(auth.uid()) or public.ick_plan_koordinatoru(auth.uid(), plan_id))
  with check (public.is_admin_like(auth.uid()) or public.ick_plan_koordinatoru(auth.uid(), plan_id));

create policy ick_eylem_isbirligi_yaz on public.ick_eylem_isbirligi
  for all to authenticated
  using (exists (select 1 from public.ick_eylem e where e.id = eylem_id and public.ick_plan_koordinatoru(auth.uid(), e.plan_id)))
  with check (exists (select 1 from public.ick_eylem e where e.id = eylem_id and public.ick_plan_koordinatoru(auth.uid(), e.plan_id)));

drop policy if exists ick_audit_log_select on public.ick_audit_log;
create policy ick_audit_log_select on public.ick_audit_log
  for select to authenticated
  using (
    public.is_admin_like(auth.uid())
    or public.ick_koordinator(auth.uid())
    or public.ick_izleyici(auth.uid())
  );

drop policy if exists ick_gerceklesme_insert on public.ick_gerceklesme;
create policy ick_gerceklesme_insert on public.ick_gerceklesme
  for insert to authenticated
  with check (
    public.ick_eylem_yazabilir(auth.uid(), eylem_id)
    and olusturan_id = auth.uid()
    and kaynak = 'sistem'
    and akis = 'taslak'
  );

drop policy if exists ick_gerceklesme_koord_insert on public.ick_gerceklesme;
create policy ick_gerceklesme_koord_insert on public.ick_gerceklesme
  for insert to authenticated
  with check (
    kaynak = 'aktarim'
    and olusturan_id = auth.uid()
    and exists (select 1 from public.ick_eylem e where e.id = eylem_id and public.ick_plan_koordinatoru(auth.uid(), e.plan_id))
  );

drop policy if exists ick_gerceklesme_update on public.ick_gerceklesme;
create policy ick_gerceklesme_update on public.ick_gerceklesme
  for update to authenticated
  using (
    (akis = 'incelemede' and exists (
      select 1 from public.ick_eylem e where e.id = eylem_id and public.ick_plan_koordinatoru(auth.uid(), e.plan_id)
    ))
    or (
      akis in ('taslak', 'iade')
      and public.ick_eylem_yazabilir(auth.uid(), eylem_id)
      and (olusturan_id = auth.uid() or public.ick_eylem_gonderebilir(auth.uid(), eylem_id))
    )
  )
  with check (
    exists (select 1 from public.ick_eylem e where e.id = eylem_id and public.ick_plan_koordinatoru(auth.uid(), e.plan_id))
    or (public.ick_eylem_yazabilir(auth.uid(), eylem_id) and akis in ('taslak', 'incelemede'))
  );

drop policy if exists ick_gerceklesme_delete on public.ick_gerceklesme;
create policy ick_gerceklesme_delete on public.ick_gerceklesme
  for delete to authenticated
  using (
    akis = 'taslak'
    and (olusturan_id = auth.uid() or public.ick_eylem_gonderebilir(auth.uid(), eylem_id))
  );

drop policy if exists ick_belge_insert on public.ick_belge;
create policy ick_belge_insert on public.ick_belge
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      (eylem_id is not null and (
        public.ick_eylem_yazabilir(auth.uid(), eylem_id)
        or exists (select 1 from public.ick_eylem e where e.id = eylem_id and public.ick_plan_koordinatoru(auth.uid(), e.plan_id))
      ))
      or (
        gerceklesme_id is not null
        and exists (
          select 1 from public.ick_gerceklesme g
          join public.ick_eylem e on e.id = g.eylem_id
          where g.id = gerceklesme_id
            and (
              (g.akis in ('taslak', 'iade') and public.ick_eylem_yazabilir(auth.uid(), g.eylem_id))
              or (g.akis <> 'kesinlesti' and public.ick_plan_koordinatoru(auth.uid(), e.plan_id))
            )
        )
      )
      or (plan_id is not null and (public.is_admin_like(auth.uid()) or public.ick_plan_koordinatoru(auth.uid(), plan_id)))
    )
  );

-- ---------------------------------------------------------------------------
-- Gerçekleşme kuralları: gönderim müdürlük koordinatöründe, karar plan koordinatöründe
-- ---------------------------------------------------------------------------
create or replace function public.ick_gerceklesme_kural()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_kanit integer;
  v_termin_tipi text;
  v_plan bigint;
  v_eylem_durum text;
begin
  if tg_op = 'DELETE' then
    if old.akis <> 'taslak' then
      raise exception 'Yalnızca taslak gerçekleşme silinebilir.';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.akis = 'kesinlesti' then
      raise exception 'Kesinleşmiş gerçekleşme değiştirilemez.';
    end if;
    if old.eylem_id <> new.eylem_id
      or old.kaynak <> new.kaynak
      or old.olusturan_id is distinct from new.olusturan_id then
      raise exception 'Gerçekleşmenin eylemi, kaynağı ve oluşturanı değiştirilemez.';
    end if;
    if old.akis = 'incelemede' and (
      old.beyan_durum <> new.beyan_durum
      or old.beyan_ilerleme <> new.beyan_ilerleme
      or old.calisma <> new.calisma
      or old.kanit_aciklama <> new.kanit_aciklama
      or old.donem_yili is distinct from new.donem_yili
    ) then
      raise exception 'İncelemedeki bildirimin içeriği değiştirilemez; gerekiyorsa iade edilmelidir.';
    end if;
  end if;

  select e.termin_tipi, e.plan_id, e.durum into v_termin_tipi, v_plan, v_eylem_durum
  from public.ick_eylem e where e.id = new.eylem_id;

  if tg_op = 'INSERT' and v_eylem_durum in ('iptal', 'devredildi') then
    raise exception 'İptal edilen veya devredilen eyleme bildirim girilmez.';
  end if;

  if new.kaynak = 'aktarim' and tg_op = 'INSERT' and not public.ick_plan_koordinatoru(auth.uid(), v_plan) then
    raise exception 'Aktarım kaydını yalnızca bu planın iç kontrol koordinatörü oluşturabilir.';
  end if;

  if v_termin_tipi in ('yillik', 'alti_aylik') and new.donem_yili is null then
    raise exception 'Tekrarlayan eylemde gerçekleşme yılı belirtilmelidir.';
  end if;

  new.updated_at := now();

  if new.akis = 'incelemede' and (tg_op = 'INSERT' or old.akis <> 'incelemede') then
    if new.kaynak = 'sistem' and not public.ick_eylem_gonderebilir(auth.uid(), new.eylem_id) then
      raise exception 'Bildirimi koordinatöre müdürlük koordinatörü gönderir.';
    end if;
    if new.beyan_durum = 'tamamlandi' and new.kaynak = 'sistem' then
      select count(*) into v_kanit
      from public.ick_belge b
      where b.aktif
        and b.gerceklesme_id = new.id
        and exists (select 1 from public.ick_belge_versiyon v where v.belge_id = b.id);
      if v_kanit = 0 then
        raise exception 'Tamamlandı bildirimi için en az bir kanıt belgesi yüklenmelidir.';
      end if;
    end if;
    new.gonderen_id := coalesce(auth.uid(), new.gonderen_id);
    new.gonderim_at := now();
  end if;

  if new.akis in ('kesinlesti', 'iade') and (tg_op = 'INSERT' or old.akis <> new.akis) then
    if new.kaynak = 'sistem' then
      if tg_op = 'INSERT' or old.akis <> 'incelemede' then
        raise exception 'Yalnızca incelemedeki gerçekleşme için karar verilebilir.';
      end if;
      if not public.ick_plan_koordinatoru(auth.uid(), v_plan) then
        raise exception 'Karar yetkisi bu planın iç kontrol koordinatörlerindedir.';
      end if;
      if auth.uid() = new.gonderen_id or auth.uid() = new.olusturan_id then
        raise exception 'Görevler ayrılığı: kendi girdiğiniz veya gönderdiğiniz kaydı kesinleştiremez ya da iade edemezsiniz.';
      end if;
    end if;
    new.karar_veren_id := coalesce(auth.uid(), new.karar_veren_id);
    new.karar_at := now();
  end if;

  return new;
end;
$$;

create or replace function public.ick_gerceklesme_kesinlesti()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.akis = 'kesinlesti' and (tg_op = 'INSERT' or old.akis <> 'kesinlesti') then
    perform set_config('ick.kesinlesme', '1', true);
    update public.ick_eylem
    set durum = new.beyan_durum,
        ilerleme = case when new.beyan_durum = 'tamamlandi' then 100 else new.beyan_ilerleme end,
        son_kesin_gerceklesme_id = new.id,
        kesinlesme_at = coalesce(new.karar_at, now()),
        updated_at = now()
    where id = new.eylem_id and durum not in ('iptal', 'devredildi');
    perform set_config('ick.kesinlesme', '', true);
  end if;
  return new;
end;
$$;

create or replace function public.ick_eylem_koruma()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.durum <> 'baslanmadi' or new.ilerleme <> 0 or new.son_kesin_gerceklesme_id is not null then
      raise exception 'Yeni eylem başlanmadı durumunda açılır; durum kesinleşen gerçekleşmeden gelir.';
    end if;
    new.termin_guncel := coalesce(new.termin_guncel, new.termin_ilk);
    return new;
  end if;

  if coalesce(current_setting('ick.devir', true), '') = '1' then
    new.updated_at := now();
    return new;
  end if;

  if old.durum = 'devredildi' then
    raise exception 'Yeni plana devredilen eylem değiştirilemez.';
  end if;
  if new.onceki_eylem_id is distinct from old.onceki_eylem_id
    or new.devir_notu <> old.devir_notu
    or new.devir_at is distinct from old.devir_at then
    raise exception 'Devir bilgisi değiştirilemez.';
  end if;

  if old.termin_ilk is not null and new.termin_ilk is distinct from old.termin_ilk then
    raise exception 'Eylemin ilk termini değiştirilemez; güncel termin revizyonla değişir.';
  end if;
  if new.termin_guncel is distinct from old.termin_guncel
    and (char_length(trim(new.revizyon_notu)) = 0 or new.revizyon_notu = old.revizyon_notu) then
    raise exception 'Termin değişikliği için revizyon gerekçesi yazılmalıdır.';
  end if;

  if coalesce(current_setting('ick.kesinlesme', true), '') <> '1' then
    if new.son_kesin_gerceklesme_id is distinct from old.son_kesin_gerceklesme_id
      or new.kesinlesme_at is distinct from old.kesinlesme_at
      or new.ilerleme <> old.ilerleme then
      raise exception 'Eylem ilerlemesi yalnızca kesinleşen gerçekleşmeyle değişir.';
    end if;
    if new.durum <> old.durum then
      if new.durum = 'iptal' then
        if char_length(trim(new.revizyon_notu)) = 0 or new.revizyon_notu = old.revizyon_notu then
          raise exception 'Eylem iptali için revizyon gerekçesi yazılmalıdır.';
        end if;
      elsif not (old.durum = 'iptal' and new.durum = coalesce(
        (select g.beyan_durum from public.ick_gerceklesme g where g.id = old.son_kesin_gerceklesme_id), 'baslanmadi'
      )) then
        raise exception 'Eylem durumu yalnızca kesinleşen gerçekleşmeyle değişir.';
      end if;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- İzleme dönemleri plandan otomatik oluşur
-- ---------------------------------------------------------------------------
create or replace function public.ick_plan_donem_uret()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  y integer;
  k integer;
  ay integer;
begin
  if tg_op = 'UPDATE'
    and new.izleme_sikligi <> old.izleme_sikligi
    and exists (select 1 from public.ick_izleme_donemi d where d.plan_id = new.id and d.durum = 'kilitli' and d.siklik <> new.izleme_sikligi) then
    raise exception 'Kilitli izleme dönemi olan planın izleme sıklığı değiştirilemez.';
  end if;

  delete from public.ick_izleme_donemi d
  where d.plan_id = new.id
    and d.durum = 'acik'
    and (d.siklik <> new.izleme_sikligi or d.yil < new.bas_yil or d.yil > new.bit_yil)
    and not exists (select 1 from public.ick_izleme_anlik a where a.donem_id = d.id);

  ay := 12 / new.izleme_sikligi;
  for y in new.bas_yil .. new.bit_yil loop
    for k in 1 .. new.izleme_sikligi loop
      insert into public.ick_izleme_donemi (plan_id, yil, yari, siklik, bas, bit)
      values (
        new.id, y, k, new.izleme_sikligi,
        make_date(y, (k - 1) * ay + 1, 1),
        (make_date(y, k * ay, 1) + interval '1 month - 1 day')::date
      )
      on conflict (plan_id, yil, yari) do nothing;
    end loop;
  end loop;
  return new;
end;
$$;

drop trigger if exists ick_plan_donem_uret on public.ick_plan;
create trigger ick_plan_donem_uret
  after insert or update of bas_yil, bit_yil, izleme_sikligi on public.ick_plan
  for each row execute function public.ick_plan_donem_uret();

update public.ick_izleme_donemi set siklik = 2 where siklik is null;
update public.ick_plan set izleme_sikligi = izleme_sikligi;

-- ---------------------------------------------------------------------------
-- Dönem hesabı: canlı rapor ve kilit görüntüsü aynı kuralı kullanır
--  * Tek seferlik eylem termininin düştüğü dönemde görünür; tamamlanmadıysa
--    sonraki dönemlere "gecikmiş" olarak taşınır, tamamlandığı dönemde son kez görünür.
--  * Yıllık eylemin her yılki oluşumu ayrı satırdır; altı aylık izlemeli eylem
--    o yılın her döneminde görünür. Plan izleme başlangıcından önceki oluşumlar alınmaz.
--  * Sürekli eylem her dönem görünür, gerçekleşme oranına katılmaz.
--  * İptal ve devredilen eylemler kapsam dışıdır (devir dönem sonundan sonraysa önceki durumu sayılır).
-- ---------------------------------------------------------------------------
create or replace function public.ick_donem_hesapla(p_donem_id bigint)
returns table (
  eylem_id bigint,
  tekrar_yili integer,
  durum text,
  ilerleme numeric,
  termin_tipi text,
  termin_guncel date,
  termin_ilk date,
  kapsam boolean,
  kumulatif boolean,
  devreden boolean,
  gecikti boolean,
  gecikmeli_tamamlandi boolean,
  oran_disi boolean,
  gerceklesme_id bigint,
  calisma text,
  kanit_aciklama text,
  kanit_yeterlilik text,
  degerlendirme text,
  sonuc text,
  kanit_sayisi integer
)
language sql
stable
set search_path = public, pg_temp
as $$
  with d as (
    select x.* from public.ick_izleme_donemi x where x.id = p_donem_id
  ),
  p as (
    select pl.* from public.ick_plan pl join d on d.plan_id = pl.id
  ),
  o as (
    select e.id as eid, null::integer as ty, e.termin_guncel as od
    from public.ick_eylem e join d on e.plan_id = d.plan_id
    where e.termin_tipi in ('tek', 'surekli')
    union all
    select e.id, y.y::integer,
      (make_date(y.y::integer, extract(month from e.termin_guncel)::integer, 1) + interval '1 month - 1 day')::date
    from public.ick_eylem e
    join d on e.plan_id = d.plan_id
    cross join p
    cross join lateral generate_series(p.bas_yil, d.yil) as y(y)
    where e.termin_tipi in ('yillik', 'alti_aylik') and e.termin_guncel is not null
  ),
  h as (
    select
      e.*,
      o.ty,
      o.od,
      g.id as g_id,
      g.beyan_durum as g_durum,
      g.beyan_ilerleme as g_ilerleme,
      g.calisma as g_calisma,
      g.kanit_aciklama as g_kanit,
      g.kanit_yeterlilik as g_yeterlilik,
      g.degerlendirme as g_degerlendirme,
      g.sonuc as g_sonuc,
      case when g.kaynak = 'aktarim' then null else (g.karar_at at time zone 'Europe/Istanbul')::date end as tamam_tarih,
      d.bas as d_bas,
      d.bit as d_bit,
      d.yil as d_yil,
      p.izleme_baslangic as p_bas
    from o
    join public.ick_eylem e on e.id = o.eid
    cross join d
    cross join p
    left join lateral (
      select x.* from public.ick_gerceklesme x
      where x.akis = 'kesinlesti'
        and (
          (o.ty is null and x.id = e.son_kesin_gerceklesme_id)
          or (o.ty is not null and x.eylem_id = e.id and x.donem_yili = o.ty)
        )
      order by x.karar_at desc nulls last, x.id desc
      limit 1
    ) g on true
    where not (o.ty is not null and p.izleme_baslangic is not null and o.od < p.izleme_baslangic)
  ),
  s as (
    select
      h.*,
      case
        when h.durum = 'iptal' then 'iptal'
        when h.durum = 'devredildi' and (h.devir_at is null or (h.devir_at at time zone 'Europe/Istanbul')::date <= h.d_bit) then 'devredildi'
        when h.ty is not null then coalesce(h.g_durum, 'baslanmadi')
        when h.durum = 'devredildi' then coalesce(h.g_durum, 'baslanmadi')
        else h.durum
      end as etkin
    from h
  ),
  t as (
    select
      s.*,
      s.etkin not in ('iptal', 'devredildi') as aktif,
      s.etkin = 'tamamlandi' as tamam
    from s
  )
  select
    t.id,
    t.ty,
    t.etkin,
    case
      when t.etkin = 'tamamlandi' then 100::numeric
      when t.ty is not null then coalesce(t.g_ilerleme, 0)
      else t.ilerleme
    end,
    t.termin_tipi,
    t.termin_guncel,
    t.termin_ilk,
    t.aktif and (
      t.termin_tipi = 'surekli'
      or (t.termin_tipi = 'alti_aylik' and t.ty = t.d_yil)
      or (t.termin_tipi <> 'alti_aylik' and t.od between t.d_bas and t.d_bit)
      or (t.od < t.d_bas and (not t.tamam or coalesce(t.tamam_tarih, t.od) >= t.d_bas))
    ),
    t.aktif and t.termin_tipi <> 'surekli' and (t.od <= t.d_bit or (t.termin_tipi = 'alti_aylik' and t.ty = t.d_yil)),
    t.aktif and t.termin_tipi <> 'surekli' and t.od < t.d_bas
      and not (t.termin_tipi = 'alti_aylik' and t.ty = t.d_yil)
      and (not t.tamam or coalesce(t.tamam_tarih, t.od) >= t.d_bas),
    t.aktif and not t.tamam and t.termin_tipi <> 'surekli' and t.od < current_date and t.od <= t.d_bit,
    t.tamam and t.tamam_tarih is not null and t.tamam_tarih > t.od,
    t.termin_tipi = 'surekli',
    t.g_id,
    coalesce(t.g_calisma, ''),
    coalesce(t.g_kanit, ''),
    t.g_yeterlilik,
    coalesce(t.g_degerlendirme, ''),
    coalesce(t.g_sonuc, ''),
    (
      select count(*)::integer from public.ick_belge b
      where b.aktif and (b.eylem_id = t.id or (t.g_id is not null and b.gerceklesme_id = t.g_id))
    )
  from t;
$$;

revoke all on function public.ick_donem_hesapla(bigint) from public;
grant execute on function public.ick_donem_hesapla(bigint) to authenticated;

create or replace function public.ick_donem_anlik_yaz(p_donem_id bigint, p_yalniz_aktarim boolean)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_adet integer;
begin
  insert into public.ick_izleme_anlik (
    donem_id, eylem_id, tekrar_yili, durum, ilerleme, termin_tipi, termin_guncel, termin_ilk,
    donemde_terminli, kumulatif, devreden, gecikti, gecikmeli_tamamlandi, oran_disi,
    gerceklesme_id, calisma, kanit_aciklama, kanit_yeterlilik, degerlendirme, sonuc, kanit_sayisi
  )
  select
    p_donem_id, h.eylem_id, h.tekrar_yili, h.durum, h.ilerleme, h.termin_tipi, h.termin_guncel, h.termin_ilk,
    h.kapsam, h.kumulatif, h.devreden, h.gecikti, h.gecikmeli_tamamlandi, h.oran_disi,
    h.gerceklesme_id, h.calisma, h.kanit_aciklama, h.kanit_yeterlilik, h.degerlendirme, h.sonuc, h.kanit_sayisi
  from public.ick_donem_hesapla(p_donem_id) h
  where not p_yalniz_aktarim
    or exists (select 1 from public.ick_gerceklesme g where g.id = h.gerceklesme_id and g.kaynak = 'aktarim');
  get diagnostics v_adet = row_count;
  return v_adet;
end;
$$;

revoke all on function public.ick_donem_anlik_yaz(bigint, boolean) from public;

create or replace function public.ick_donem_kilitle(p_donem_id bigint)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  d public.ick_izleme_donemi%rowtype;
  v_adet integer;
begin
  select * into d from public.ick_izleme_donemi where id = p_donem_id for update;
  if not found then
    raise exception 'İzleme dönemi bulunamadı.';
  end if;
  if not public.ick_plan_koordinatoru(auth.uid(), d.plan_id) then
    raise exception 'Dönemi bu planın iç kontrol koordinatörü kapatır.';
  end if;
  if d.durum = 'kilitli' then
    raise exception 'Dönem zaten kapatılmış.';
  end if;
  if d.bit >= current_date then
    raise exception 'Dönem bitmeden kapatılamaz.';
  end if;

  v_adet := public.ick_donem_anlik_yaz(d.id, false);

  update public.ick_izleme_donemi
  set durum = 'kilitli', kilitleyen_id = auth.uid(), kilit_at = now()
  where id = d.id;

  return v_adet;
end;
$$;

revoke all on function public.ick_donem_kilitle(bigint) from public;
grant execute on function public.ick_donem_kilitle(bigint) to authenticated;

/** Aktarımla gelen geçmiş yılların dönemlerini tamamlandı olarak kapatır */
create or replace function public.ick_donem_aktarim_kapat(p_plan_id bigint, p_son_yil integer)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  d record;
  v_adet integer := 0;
begin
  if not public.ick_plan_koordinatoru(auth.uid(), p_plan_id) then
    raise exception 'Bu işlem bu planın iç kontrol koordinatöründedir.';
  end if;
  for d in
    select x.id from public.ick_izleme_donemi x
    where x.plan_id = p_plan_id and x.durum = 'acik' and x.yil <= p_son_yil and x.bit < current_date
    order by x.bas
    for update
  loop
    perform public.ick_donem_anlik_yaz(d.id, true);
    update public.ick_izleme_donemi
    set durum = 'kilitli', kilitleyen_id = auth.uid(), kilit_at = now()
    where id = d.id;
    v_adet := v_adet + 1;
  end loop;
  update public.ick_plan
  set izleme_baslangic = make_date(p_son_yil + 1, 1, 1)
  where id = p_plan_id and (izleme_baslangic is null or izleme_baslangic < make_date(p_son_yil + 1, 1, 1));
  return v_adet;
end;
$$;

revoke all on function public.ick_donem_aktarim_kapat(bigint, integer) from public;
grant execute on function public.ick_donem_aktarim_kapat(bigint, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Devir: yeni plan yürürlüğe girdiğinde önceki planın tamamlanmayan eylemleri gelir
-- ---------------------------------------------------------------------------
create or replace function public.ick_plan_devir()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  onceki public.ick_plan%rowtype;
  e public.ick_eylem%rowtype;
  v_gs bigint;
  v_no integer;
  v_bilesen text;
  v_kod text;
  v_yeni bigint;
  v_t date;
  v_sira integer;
  v_durum_metin text;
begin
  if new.durum <> 'yururlukte' or old.durum = 'yururlukte' then
    return new;
  end if;

  select * into onceki
  from public.ick_plan pl
  where pl.id <> new.id
    and pl.kapsam = new.kapsam
    and pl.mudurluk_id is not distinct from new.mudurluk_id
    and pl.bit_yil < new.bas_yil
  order by pl.bit_yil desc, pl.id desc
  limit 1;
  if not found then
    return new;
  end if;

  select coalesce(max(x.sira), 0) into v_sira from public.ick_eylem x where x.plan_id = new.id;

  for e in
    select * from public.ick_eylem x
    where x.plan_id = onceki.id and x.durum in ('baslanmadi', 'devam')
    order by x.sira, x.id
  loop
    select g2.id into v_gs
    from public.ick_genel_sart g1
    join public.ick_genel_sart g2 on g2.kod = g1.kod and g2.surum_id = new.surum_id
    where g1.id = e.genel_sart_id;
    if v_gs is null then
      continue;
    end if;

    v_bilesen := split_part(e.kod_norm, ' ', 1);
    select coalesce(max(nullif(regexp_replace(split_part(x.kod_norm, ' ', 2), '\D', '', 'g'), '')::integer), 0) + 1
    into v_no
    from public.ick_eylem x
    where x.plan_id = new.id and split_part(x.kod_norm, ' ', 1) = v_bilesen;
    v_kod := v_bilesen || ' ' || lpad(v_no::text, 2, '0');

    if e.termin_tipi in ('yillik', 'alti_aylik') then
      v_t := (make_date(new.bas_yil, extract(month from e.termin_guncel)::integer, 1) + interval '1 month - 1 day')::date;
    else
      v_t := e.termin_guncel;
    end if;
    v_sira := v_sira + 1;
    v_durum_metin := case
      when e.durum = 'devam' then 'devam ediyor (%' || round(e.ilerleme)::text || ')'
      else 'başlanmadı'
    end;

    insert into public.ick_eylem (
      plan_id, genel_sart_id, kod, kod_norm, sira, ongorulen_eylem, sorumlu_tur, sorumlu_mudurluk_id, sorumlu_metin,
      isbirligi_kapsam, isbirligi_metin, cikti, termin_tipi, termin_ilk, termin_guncel, termin_metin, aciklama,
      onceki_eylem_id, devir_notu, created_by
    )
    values (
      new.id, v_gs, v_kod, v_kod, v_sira, e.ongorulen_eylem, e.sorumlu_tur, e.sorumlu_mudurluk_id, e.sorumlu_metin,
      e.isbirligi_kapsam, e.isbirligi_metin, e.cikti, e.termin_tipi,
      case when e.termin_tipi = 'tek' then coalesce(e.termin_ilk, v_t) else v_t end,
      v_t, e.termin_metin, e.aciklama,
      e.id,
      format('Önceki eylem planından (%s, %s-%s). Devir anındaki durum: %s.', e.kod_norm, onceki.bas_yil, onceki.bit_yil, v_durum_metin),
      auth.uid()
    )
    returning id into v_yeni;

    insert into public.ick_eylem_isbirligi (eylem_id, mudurluk_id)
    select v_yeni, i.mudurluk_id from public.ick_eylem_isbirligi i where i.eylem_id = e.id;

    perform set_config('ick.devir', '1', true);
    update public.ick_eylem
    set durum = 'devredildi',
        devir_at = now(),
        devir_notu = format('%s planına %s koduyla devredildi.', new.ad, v_kod)
    where id = e.id;
    perform set_config('ick.devir', '', true);
  end loop;

  if onceki.durum = 'yururlukte' then
    update public.ick_plan set durum = 'tamamlandi', updated_at = now() where id = onceki.id;
  end if;
  return new;
end;
$$;

drop trigger if exists ick_plan_devir on public.ick_plan;
create trigger ick_plan_devir
  after update of durum on public.ick_plan
  for each row execute function public.ick_plan_devir();

notify pgrst, 'reload schema';
