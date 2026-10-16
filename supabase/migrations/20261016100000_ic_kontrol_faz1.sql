-- İç Kontrol (İKEP) Faz 1: mevzuat ana verisi, plan, eylem, gerçekleşme, izleme dönemi,
-- belge sürümleri, rol atama ve değiştirilemez audit log.
-- Profili olmayan oturumlara bu tablolarda erişim verilmez.

-- ---------------------------------------------------------------------------
-- Mevzuat ana verisi (sürümlü)
-- ---------------------------------------------------------------------------
create table if not exists public.ick_mevzuat_surumu (
  id bigint generated always as identity primary key,
  kod text not null unique,
  ad text not null,
  resmi_gazete text not null default '',
  yururluk_tarihi date null,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ick_bilesen (
  id bigint generated always as identity primary key,
  surum_id bigint not null references public.ick_mevzuat_surumu (id) on delete restrict,
  kod text not null,
  ad text not null,
  sira integer not null,
  unique (surum_id, kod)
);

create table if not exists public.ick_standart (
  id bigint generated always as identity primary key,
  surum_id bigint not null references public.ick_mevzuat_surumu (id) on delete restrict,
  bilesen_id bigint not null references public.ick_bilesen (id) on delete restrict,
  no integer not null,
  ad text not null,
  aciklama text not null default '',
  unique (surum_id, no)
);

create table if not exists public.ick_genel_sart (
  id bigint generated always as identity primary key,
  surum_id bigint not null references public.ick_mevzuat_surumu (id) on delete restrict,
  standart_id bigint not null references public.ick_standart (id) on delete restrict,
  kod text not null,
  sira integer not null,
  metin text not null,
  unique (surum_id, kod)
);

create table if not exists public.ick_belge_turu (
  id bigint generated always as identity primary key,
  ad text not null unique,
  aciklama text not null default '',
  sira integer not null default 1,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Rol atama (rol + birim + geçerlilik)
-- ---------------------------------------------------------------------------
create table if not exists public.ick_rol_atama (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  rol text not null,
  mudurluk_id integer null references public.tanim_mudurluk (id) on delete restrict,
  baslangic date not null default current_date,
  bitis date null,
  aciklama text not null default '',
  created_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint ick_rol_atama_rol check (rol in ('koordinator', 'birim_yonetici', 'birim_irtibat', 'izleyici')),
  constraint ick_rol_atama_birim check ((rol in ('birim_yonetici', 'birim_irtibat')) = (mudurluk_id is not null)),
  constraint ick_rol_atama_tarih check (bitis is null or bitis >= baslangic)
);

create index if not exists ick_rol_atama_user_idx on public.ick_rol_atama (user_id);

-- ---------------------------------------------------------------------------
-- Plan
-- ---------------------------------------------------------------------------
create table if not exists public.ick_plan (
  id bigint generated always as identity primary key,
  surum_id bigint not null references public.ick_mevzuat_surumu (id) on delete restrict,
  kapsam text not null default 'idare',
  mudurluk_id integer null references public.tanim_mudurluk (id) on delete restrict,
  ad text not null,
  bas_yil integer not null,
  bit_yil integer not null,
  koordinator_mudurluk_id integer null references public.tanim_mudurluk (id) on delete restrict,
  durum text not null default 'taslak',
  onay_tarihi date null,
  onay_sayi text not null default '',
  bakanlik_gonderim_tarihi date null,
  aciklama text not null default '',
  kaynak text not null default 'sistem',
  created_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ick_plan_kapsam check (kapsam in ('idare', 'birim')),
  constraint ick_plan_kapsam_birim check ((kapsam = 'birim') = (mudurluk_id is not null)),
  constraint ick_plan_yil check (bit_yil >= bas_yil),
  constraint ick_plan_durum check (durum in ('taslak', 'kurulda', 'onay_bekliyor', 'yururlukte', 'tamamlandi', 'arsiv')),
  constraint ick_plan_kaynak check (kaynak in ('sistem', 'aktarim'))
);

create table if not exists public.ick_plan_versiyon (
  id bigint generated always as identity primary key,
  plan_id bigint not null references public.ick_plan (id) on delete restrict,
  versiyon_no integer not null,
  tur text not null default 'ilk',
  gerekce text not null default '',
  onay_tarihi date null,
  onay_sayi text not null default '',
  anlik jsonb not null default '{}'::jsonb,
  created_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (plan_id, versiyon_no),
  constraint ick_plan_versiyon_tur check (tur in ('ilk', 'revizyon'))
);

create table if not exists public.ick_genel_sart_degerlendirme (
  id bigint generated always as identity primary key,
  plan_id bigint not null references public.ick_plan (id) on delete cascade,
  genel_sart_id bigint not null references public.ick_genel_sart (id) on delete restrict,
  mevcut_durum text not null default '',
  guvence text not null default 'eylem_gerekli',
  aciklama text not null default '',
  unique (plan_id, genel_sart_id),
  constraint ick_gsd_guvence check (guvence in ('makul_guvence', 'eylem_gerekli'))
);

create table if not exists public.ick_aktarim (
  id bigint generated always as identity primary key,
  plan_id bigint not null references public.ick_plan (id) on delete restrict,
  dosya_adi text not null,
  dosya_sha256 text not null,
  satir_sayisi integer not null default 0,
  ham jsonb not null default '[]'::jsonb,
  ozet text not null default '',
  created_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Eylem
-- ---------------------------------------------------------------------------
create table if not exists public.ick_eylem (
  id bigint generated always as identity primary key,
  plan_id bigint not null references public.ick_plan (id) on delete restrict,
  genel_sart_id bigint not null references public.ick_genel_sart (id) on delete restrict,
  kod text not null,
  kod_norm text not null,
  sira integer not null default 1,
  ongorulen_eylem text not null,
  sorumlu_tur text not null default 'mudurluk',
  sorumlu_mudurluk_id integer null references public.tanim_mudurluk (id) on delete restrict,
  sorumlu_metin text not null default '',
  isbirligi_kapsam text not null default 'yok',
  isbirligi_metin text not null default '',
  cikti text not null default '',
  termin_tipi text not null default 'tek',
  termin_ilk date null,
  termin_guncel date null,
  termin_metin text not null default '',
  revizyon_notu text not null default '',
  aciklama text not null default '',
  durum text not null default 'baslanmadi',
  ilerleme numeric(5, 2) not null default 0,
  son_kesin_gerceklesme_id bigint null,
  kesinlesme_at timestamptz null,
  aktarim_id bigint null references public.ick_aktarim (id) on delete restrict,
  aktarim_satir integer null,
  created_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, kod_norm),
  constraint ick_eylem_sorumlu check (
    (sorumlu_tur = 'mudurluk' and sorumlu_mudurluk_id is not null)
    or (sorumlu_tur = 'ust_yonetim' and sorumlu_mudurluk_id is null)
  ),
  constraint ick_eylem_isbirligi_kapsam check (isbirligi_kapsam in ('yok', 'tum_mudurlukler', 'ilgili_mudurlukler')),
  constraint ick_eylem_termin_tipi check (termin_tipi in ('tek', 'yillik', 'alti_aylik', 'surekli')),
  constraint ick_eylem_termin check (termin_tipi = 'surekli' or (termin_ilk is not null and termin_guncel is not null)),
  constraint ick_eylem_durum check (durum in ('baslanmadi', 'devam', 'tamamlandi', 'iptal')),
  constraint ick_eylem_ilerleme check (ilerleme >= 0 and ilerleme <= 100),
  constraint ick_eylem_metin_bos check (char_length(trim(ongorulen_eylem)) > 0)
);

create index if not exists ick_eylem_plan_idx on public.ick_eylem (plan_id, sira);
create index if not exists ick_eylem_sorumlu_idx on public.ick_eylem (sorumlu_mudurluk_id);

create table if not exists public.ick_eylem_isbirligi (
  id bigint generated always as identity primary key,
  eylem_id bigint not null references public.ick_eylem (id) on delete cascade,
  mudurluk_id integer not null references public.tanim_mudurluk (id) on delete restrict,
  unique (eylem_id, mudurluk_id)
);

-- ---------------------------------------------------------------------------
-- Gerçekleşme (her gönderim ayrı satır; kesinleşen satır değişmez)
-- ---------------------------------------------------------------------------
create table if not exists public.ick_gerceklesme (
  id bigint generated always as identity primary key,
  eylem_id bigint not null references public.ick_eylem (id) on delete restrict,
  donem_yili integer null,
  beyan_durum text not null,
  beyan_ilerleme numeric(5, 2) not null default 0,
  calisma text not null,
  kanit_aciklama text not null default '',
  akis text not null default 'taslak',
  olusturan_id uuid null references auth.users (id) on delete set null,
  olusturan_ad text not null default '',
  gonderen_id uuid null references auth.users (id) on delete set null,
  gonderen_ad text not null default '',
  gonderim_at timestamptz null,
  karar_veren_id uuid null references auth.users (id) on delete set null,
  karar_veren_ad text not null default '',
  karar_at timestamptz null,
  iade_gerekcesi text not null default '',
  kanit_yeterlilik text null,
  istisna_gerekcesi text not null default '',
  degerlendirme text not null default '',
  sonuc text not null default '',
  kaynak text not null default 'sistem',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ick_gerceklesme_beyan check (beyan_durum in ('baslanmadi', 'devam', 'tamamlandi')),
  constraint ick_gerceklesme_ilerleme check (beyan_ilerleme >= 0 and beyan_ilerleme <= 100),
  constraint ick_gerceklesme_akis check (akis in ('taslak', 'incelemede', 'iade', 'kesinlesti')),
  constraint ick_gerceklesme_kanit check (kanit_yeterlilik is null or kanit_yeterlilik in ('yeterli', 'kismen', 'yetersiz')),
  constraint ick_gerceklesme_kaynak check (kaynak in ('sistem', 'aktarim')),
  constraint ick_gerceklesme_calisma_bos check (char_length(trim(calisma)) > 0),
  constraint ick_gerceklesme_iade_gerekce check (akis <> 'iade' or char_length(trim(iade_gerekcesi)) > 0),
  constraint ick_gerceklesme_kesin_kanit check (
    akis <> 'kesinlesti'
    or beyan_durum <> 'tamamlandi'
    or kanit_yeterlilik = 'yeterli'
    or char_length(trim(istisna_gerekcesi)) > 0
  )
);

create index if not exists ick_gerceklesme_eylem_idx on public.ick_gerceklesme (eylem_id, created_at desc);
create index if not exists ick_gerceklesme_akis_idx on public.ick_gerceklesme (akis);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ick_eylem_son_kesin_fk'
  ) then
    alter table public.ick_eylem
      add constraint ick_eylem_son_kesin_fk
      foreign key (son_kesin_gerceklesme_id) references public.ick_gerceklesme (id) on delete restrict;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- İzleme dönemi ve dönem sonu anlık görüntü
-- ---------------------------------------------------------------------------
create table if not exists public.ick_izleme_donemi (
  id bigint generated always as identity primary key,
  plan_id bigint not null references public.ick_plan (id) on delete restrict,
  yil integer not null,
  yari smallint not null,
  bas date not null,
  bit date not null,
  durum text not null default 'acik',
  kilitleyen_id uuid null references auth.users (id) on delete set null,
  kilit_at timestamptz null,
  aciklama text not null default '',
  created_at timestamptz not null default now(),
  unique (plan_id, yil, yari),
  constraint ick_izleme_donemi_yari check (yari in (1, 2)),
  constraint ick_izleme_donemi_durum check (durum in ('acik', 'kilitli')),
  constraint ick_izleme_donemi_tarih check (bit >= bas)
);

create table if not exists public.ick_izleme_anlik (
  id bigint generated always as identity primary key,
  donem_id bigint not null references public.ick_izleme_donemi (id) on delete restrict,
  eylem_id bigint not null references public.ick_eylem (id) on delete restrict,
  durum text not null,
  ilerleme numeric(5, 2) not null default 0,
  termin_tipi text not null,
  termin_guncel date null,
  termin_ilk date null,
  donemde_terminli boolean not null default false,
  gecikti boolean not null default false,
  gerceklesme_id bigint null references public.ick_gerceklesme (id) on delete restrict,
  calisma text not null default '',
  kanit_aciklama text not null default '',
  kanit_yeterlilik text null,
  degerlendirme text not null default '',
  sonuc text not null default '',
  kanit_sayisi integer not null default 0,
  created_at timestamptz not null default now(),
  unique (donem_id, eylem_id)
);

-- ---------------------------------------------------------------------------
-- Belge ve sürümleri (silinmez, pasife alınır)
-- ---------------------------------------------------------------------------
create table if not exists public.ick_belge (
  id bigint generated always as identity primary key,
  belge_turu_id bigint not null references public.ick_belge_turu (id) on delete restrict,
  plan_id bigint null references public.ick_plan (id) on delete restrict,
  eylem_id bigint null references public.ick_eylem (id) on delete restrict,
  gerceklesme_id bigint null references public.ick_gerceklesme (id) on delete restrict,
  baslik text not null,
  aktif boolean not null default true,
  pasif_gerekce text not null default '',
  created_by uuid null references auth.users (id) on delete set null,
  created_by_ad text not null default '',
  created_at timestamptz not null default now(),
  constraint ick_belge_tek_sahip check (num_nonnulls(plan_id, eylem_id, gerceklesme_id) = 1),
  constraint ick_belge_pasif check (aktif or char_length(trim(pasif_gerekce)) > 0)
);

create index if not exists ick_belge_eylem_idx on public.ick_belge (eylem_id);
create index if not exists ick_belge_gerceklesme_idx on public.ick_belge (gerceklesme_id);

create table if not exists public.ick_belge_versiyon (
  id bigint generated always as identity primary key,
  belge_id bigint not null references public.ick_belge (id) on delete restrict,
  versiyon integer not null,
  dosya_adi text not null,
  storage_path text not null unique,
  mime_type text null,
  boyut_byte bigint null,
  sha256 text not null,
  yukleyen_id uuid null references auth.users (id) on delete set null,
  yukleyen_ad text not null default '',
  created_at timestamptz not null default now(),
  unique (belge_id, versiyon)
);

-- ---------------------------------------------------------------------------
-- Audit log (yalnızca trigger yazar; güncelleme ve silme engelli)
-- ---------------------------------------------------------------------------
create table if not exists public.ick_audit_log (
  id bigint generated always as identity primary key,
  tablo text not null,
  kayit_id text not null,
  islem text not null,
  onceki jsonb null,
  sonraki jsonb null,
  actor_id uuid null,
  created_at timestamptz not null default now()
);

create index if not exists ick_audit_log_kayit_idx on public.ick_audit_log (tablo, kayit_id, created_at desc);

create or replace function public.ick_audit_yaz()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.ick_audit_log (tablo, kayit_id, islem, onceki, sonraki, actor_id)
  values (
    tg_table_name,
    coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id', ''),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
    auth.uid()
  );
  return coalesce(new, old);
end;
$$;

create or replace function public.ick_audit_degismez()
returns trigger
language plpgsql
as $$
begin
  raise exception 'İç kontrol audit kaydı değiştirilemez veya silinemez.';
end;
$$;

drop trigger if exists ick_audit_log_degismez on public.ick_audit_log;
create trigger ick_audit_log_degismez
  before update or delete on public.ick_audit_log
  for each row execute function public.ick_audit_degismez();

do $$
declare
  t text;
begin
  foreach t in array array[
    'ick_belge_turu', 'ick_rol_atama', 'ick_plan', 'ick_plan_versiyon', 'ick_genel_sart_degerlendirme',
    'ick_eylem', 'ick_eylem_isbirligi', 'ick_gerceklesme', 'ick_izleme_donemi', 'ick_belge',
    'ick_belge_versiyon', 'ick_aktarim'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.ick_audit_yaz()',
      t || '_audit', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Yetki fonksiyonları
-- ---------------------------------------------------------------------------
create or replace function public.ick_rol_var(p_uid uuid, p_rol text, p_mudurluk integer default null)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.ick_rol_atama r
    join public.app_profiles ap on ap.id = r.user_id and coalesce(ap.hesap_aktif, true)
    where r.user_id = p_uid
      and r.rol = p_rol
      and r.baslangic <= current_date
      and (r.bitis is null or r.bitis >= current_date)
      and (p_mudurluk is null or r.mudurluk_id = p_mudurluk)
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
    or exists (
      select 1
      from public.ick_rol_atama r
      join public.app_profiles ap on ap.id = r.user_id and coalesce(ap.hesap_aktif, true)
      where r.user_id = p_uid
        and r.baslangic <= current_date
        and (r.bitis is null or r.bitis >= current_date)
    );
$$;

create or replace function public.ick_koordinator(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.ick_rol_var(p_uid, 'koordinator', null);
$$;

create or replace function public.ick_birim_yetkili(p_uid uuid, p_mudurluk integer)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_mudurluk is not null
    and (
      public.ick_rol_var(p_uid, 'birim_yonetici', p_mudurluk)
      or public.ick_rol_var(p_uid, 'birim_irtibat', p_mudurluk)
    );
$$;

create or replace function public.ick_eylem_yazabilir(p_uid uuid, p_eylem bigint)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.ick_koordinator(p_uid)
    or exists (
      select 1 from public.ick_eylem e
      where e.id = p_eylem and public.ick_birim_yetkili(p_uid, e.sorumlu_mudurluk_id)
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
      select 1
      from public.ick_rol_atama r
      join public.app_profiles ap on ap.id = r.user_id and coalesce(ap.hesap_aktif, true)
      where r.user_id = p_uid
        and r.rol in ('birim_yonetici', 'birim_irtibat')
        and r.baslangic <= current_date
        and (r.bitis is null or r.bitis >= current_date)
    );
$$;

revoke all on function public.ick_yukleyebilir(uuid) from public;
grant execute on function public.ick_yukleyebilir(uuid) to authenticated;
revoke all on function public.ick_rol_var(uuid, text, integer) from public;
revoke all on function public.ick_okuyabilir(uuid) from public;
revoke all on function public.ick_koordinator(uuid) from public;
revoke all on function public.ick_birim_yetkili(uuid, integer) from public;
revoke all on function public.ick_eylem_yazabilir(uuid, bigint) from public;
grant execute on function public.ick_rol_var(uuid, text, integer) to authenticated;
grant execute on function public.ick_okuyabilir(uuid) to authenticated;
grant execute on function public.ick_koordinator(uuid) to authenticated;
grant execute on function public.ick_birim_yetkili(uuid, integer) to authenticated;
grant execute on function public.ick_eylem_yazabilir(uuid, bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- Gerçekleşme iş akışı kuralları
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

  if new.kaynak = 'aktarim' and tg_op = 'INSERT' and not public.ick_koordinator(auth.uid()) then
    raise exception 'Aktarım kaydını yalnızca iç kontrol koordinatörü oluşturabilir.';
  end if;

  select e.termin_tipi into v_termin_tipi from public.ick_eylem e where e.id = new.eylem_id;
  if v_termin_tipi in ('yillik', 'alti_aylik') and new.donem_yili is null then
    raise exception 'Tekrarlayan eylemde gerçekleşme yılı belirtilmelidir.';
  end if;

  new.updated_at := now();

  if new.akis = 'incelemede' and (tg_op = 'INSERT' or old.akis <> 'incelemede') then
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
      if not public.ick_koordinator(auth.uid()) then
        raise exception 'Karar yetkisi yalnızca iç kontrol koordinatöründedir.';
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

drop trigger if exists ick_gerceklesme_kural on public.ick_gerceklesme;
create trigger ick_gerceklesme_kural
  before insert or update or delete on public.ick_gerceklesme
  for each row execute function public.ick_gerceklesme_kural();

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
    where id = new.eylem_id;
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

create or replace function public.ick_belge_koruma()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (to_jsonb(new) - 'aktif' - 'pasif_gerekce') <> (to_jsonb(old) - 'aktif' - 'pasif_gerekce') then
    raise exception 'Belgede yalnızca pasife alma yapılır; yeni dosya yeni sürüm olarak yüklenir.';
  end if;
  if new.aktif and not old.aktif then
    raise exception 'Pasif belge yeniden etkinleştirilemez; yeniden yükleyin.';
  end if;
  if not new.aktif and old.aktif and old.gerceklesme_id is not null and not public.ick_koordinator(auth.uid()) and exists (
    select 1 from public.ick_gerceklesme g where g.id = old.gerceklesme_id and g.akis in ('incelemede', 'kesinlesti')
  ) then
    raise exception 'İncelemedeki veya kesinleşmiş bildirimin kanıtını yalnızca koordinatör pasife alır.';
  end if;
  return new;
end;
$$;

drop trigger if exists ick_belge_koruma on public.ick_belge;
create trigger ick_belge_koruma
  before update on public.ick_belge
  for each row execute function public.ick_belge_koruma();

drop trigger if exists ick_eylem_koruma on public.ick_eylem;
create trigger ick_eylem_koruma
  before insert or update on public.ick_eylem
  for each row execute function public.ick_eylem_koruma();

drop trigger if exists ick_gerceklesme_kesinlesti on public.ick_gerceklesme;
create trigger ick_gerceklesme_kesinlesti
  after insert or update on public.ick_gerceklesme
  for each row execute function public.ick_gerceklesme_kesinlesti();

-- ---------------------------------------------------------------------------
-- İzleme dönemi kilidi: o anki kesinleşmiş durumun görüntüsü alınır
-- ---------------------------------------------------------------------------
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
  if not public.ick_koordinator(auth.uid()) then
    raise exception 'Dönem kilidi yalnızca iç kontrol koordinatöründedir.';
  end if;

  select * into d from public.ick_izleme_donemi where id = p_donem_id for update;
  if not found then
    raise exception 'İzleme dönemi bulunamadı.';
  end if;
  if d.durum = 'kilitli' then
    raise exception 'Dönem zaten kilitli.';
  end if;

  insert into public.ick_izleme_anlik (
    donem_id, eylem_id, durum, ilerleme, termin_tipi, termin_guncel, termin_ilk,
    donemde_terminli, gecikti, gerceklesme_id, calisma, kanit_aciklama, kanit_yeterlilik,
    degerlendirme, sonuc, kanit_sayisi
  )
  select
    d.id,
    e.id,
    case
      when e.durum = 'iptal' then 'iptal'
      when e.termin_tipi in ('yillik', 'alti_aylik') then coalesce(gy.beyan_durum, 'baslanmadi')
      else e.durum
    end,
    case
      when e.termin_tipi in ('yillik', 'alti_aylik') then coalesce(gy.beyan_ilerleme, 0)
      else e.ilerleme
    end,
    e.termin_tipi,
    e.termin_guncel,
    e.termin_ilk,
    case
      when e.termin_tipi = 'tek' then e.termin_guncel between d.bas and d.bit
      when e.termin_tipi = 'yillik' then
        make_date(d.yil, extract(month from e.termin_ilk)::integer, 1) between date_trunc('month', d.bas)::date and d.bit
      when e.termin_tipi = 'alti_aylik' then true
      else false
    end,
    case
      when e.durum = 'iptal' then false
      when e.termin_tipi = 'tek' then e.termin_guncel <= d.bit and e.durum <> 'tamamlandi'
      when e.termin_tipi = 'yillik' then
        (make_date(d.yil, extract(month from e.termin_ilk)::integer, 1) + interval '1 month - 1 day')::date <= d.bit
        and coalesce(gy.beyan_durum, 'baslanmadi') <> 'tamamlandi'
      else false
    end,
    g.id,
    coalesce(g.calisma, ''),
    coalesce(g.kanit_aciklama, ''),
    g.kanit_yeterlilik,
    coalesce(g.degerlendirme, ''),
    coalesce(g.sonuc, ''),
    (
      select count(*)::integer from public.ick_belge b
      where b.aktif and (b.eylem_id = e.id or b.gerceklesme_id = g.id)
    )
  from public.ick_eylem e
  left join lateral (
    select x.* from public.ick_gerceklesme x
    where x.eylem_id = e.id and x.akis = 'kesinlesti' and x.donem_yili = d.yil
    order by x.karar_at desc nulls last, x.id desc
    limit 1
  ) gy on e.termin_tipi in ('yillik', 'alti_aylik')
  left join public.ick_gerceklesme g
    on g.id = case when e.termin_tipi in ('yillik', 'alti_aylik') then gy.id else e.son_kesin_gerceklesme_id end
  where e.plan_id = d.plan_id;

  get diagnostics v_adet = row_count;

  update public.ick_izleme_donemi
  set durum = 'kilitli', kilitleyen_id = auth.uid(), kilit_at = now()
  where id = d.id;

  return v_adet;
end;
$$;

revoke all on function public.ick_donem_kilitle(bigint) from public;
grant execute on function public.ick_donem_kilitle(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'ick_mevzuat_surumu', 'ick_bilesen', 'ick_standart', 'ick_genel_sart', 'ick_belge_turu',
    'ick_rol_atama', 'ick_plan', 'ick_plan_versiyon', 'ick_genel_sart_degerlendirme', 'ick_aktarim',
    'ick_eylem', 'ick_eylem_isbirligi', 'ick_gerceklesme', 'ick_izleme_donemi', 'ick_izleme_anlik',
    'ick_belge', 'ick_belge_versiyon', 'ick_audit_log'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
  end loop;

  -- Okuma: yönetici veya geçerli İKEP rolü olan profilli kullanıcı
  foreach t in array array[
    'ick_mevzuat_surumu', 'ick_bilesen', 'ick_standart', 'ick_genel_sart', 'ick_belge_turu',
    'ick_rol_atama', 'ick_plan', 'ick_plan_versiyon', 'ick_genel_sart_degerlendirme', 'ick_aktarim',
    'ick_eylem', 'ick_eylem_isbirligi', 'ick_gerceklesme', 'ick_izleme_donemi', 'ick_izleme_anlik',
    'ick_belge', 'ick_belge_versiyon'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.ick_okuyabilir(auth.uid()))',
      t || '_select', t
    );
  end loop;

  -- Mevzuat ana verisi: yalnızca yönetici
  foreach t in array array['ick_mevzuat_surumu', 'ick_bilesen', 'ick_standart', 'ick_genel_sart', 'ick_rol_atama']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_yaz', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin_like(auth.uid())) with check (public.is_admin_like(auth.uid()))',
      t || '_yaz', t
    );
  end loop;

  -- Plan yapısı: koordinatör
  foreach t in array array[
    'ick_belge_turu', 'ick_plan', 'ick_plan_versiyon', 'ick_genel_sart_degerlendirme', 'ick_aktarim',
    'ick_eylem', 'ick_eylem_isbirligi', 'ick_izleme_donemi'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_yaz', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.ick_koordinator(auth.uid())) with check (public.ick_koordinator(auth.uid()))',
      t || '_yaz', t
    );
  end loop;
end $$;

drop policy if exists ick_audit_log_select on public.ick_audit_log;
create policy ick_audit_log_select on public.ick_audit_log
  for select to authenticated
  using (
    public.is_admin_like(auth.uid())
    or public.ick_koordinator(auth.uid())
    or public.ick_rol_var(auth.uid(), 'izleyici', null)
  );

revoke insert, update, delete on public.ick_audit_log from authenticated, anon;
revoke insert, update, delete on public.ick_izleme_anlik from authenticated, anon;

-- Gerçekleşme: birim kendi eylemine taslak açar ve gönderir; karar koordinatörde
drop policy if exists ick_gerceklesme_insert on public.ick_gerceklesme;
create policy ick_gerceklesme_insert on public.ick_gerceklesme
  for insert to authenticated
  with check (
    public.ick_eylem_yazabilir(auth.uid(), eylem_id)
    and olusturan_id = auth.uid()
    and kaynak = 'sistem'
    and akis in ('taslak', 'incelemede')
  );

drop policy if exists ick_gerceklesme_koord_insert on public.ick_gerceklesme;
create policy ick_gerceklesme_koord_insert on public.ick_gerceklesme
  for insert to authenticated
  with check (public.ick_koordinator(auth.uid()) and olusturan_id = auth.uid());

drop policy if exists ick_gerceklesme_update on public.ick_gerceklesme;
create policy ick_gerceklesme_update on public.ick_gerceklesme
  for update to authenticated
  using (
    (public.ick_koordinator(auth.uid()) and akis = 'incelemede')
    or (olusturan_id = auth.uid() and akis in ('taslak', 'iade') and public.ick_eylem_yazabilir(auth.uid(), eylem_id))
  )
  with check (
    public.ick_koordinator(auth.uid())
    or (olusturan_id = auth.uid() and akis in ('taslak', 'incelemede'))
  );

drop policy if exists ick_gerceklesme_delete on public.ick_gerceklesme;
create policy ick_gerceklesme_delete on public.ick_gerceklesme
  for delete to authenticated
  using (olusturan_id = auth.uid() and akis = 'taslak');

-- Belge: eyleme yazabilen yükler; silme yok, pasife alma koordinatörde veya yükleyende
drop policy if exists ick_belge_insert on public.ick_belge;
create policy ick_belge_insert on public.ick_belge
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      public.ick_koordinator(auth.uid())
      or (eylem_id is not null and public.ick_eylem_yazabilir(auth.uid(), eylem_id))
      or (
        gerceklesme_id is not null
        and exists (
          select 1 from public.ick_gerceklesme g
          where g.id = gerceklesme_id
            and g.akis in ('taslak', 'iade')
            and public.ick_eylem_yazabilir(auth.uid(), g.eylem_id)
        )
      )
    )
  );

drop policy if exists ick_belge_update on public.ick_belge;
create policy ick_belge_update on public.ick_belge
  for update to authenticated
  using (public.ick_koordinator(auth.uid()) or created_by = auth.uid())
  with check (public.ick_koordinator(auth.uid()) or created_by = auth.uid());

drop policy if exists ick_belge_versiyon_insert on public.ick_belge_versiyon;
create policy ick_belge_versiyon_insert on public.ick_belge_versiyon
  for insert to authenticated
  with check (
    yukleyen_id = auth.uid()
    and exists (
      select 1 from public.ick_belge b
      where b.id = belge_id
        and b.aktif
        and (public.ick_koordinator(auth.uid()) or b.created_by = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: özel bucket; güncelleme ve silme politikası yok
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ick-belgeler',
  'ick-belgeler',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg'
  ]::text[]
)
on conflict (id) do nothing;

drop policy if exists ick_belge_storage_select on storage.objects;
create policy ick_belge_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'ick-belgeler' and public.ick_okuyabilir(auth.uid()));

drop policy if exists ick_belge_storage_insert on storage.objects;
create policy ick_belge_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ick-belgeler' and public.ick_yukleyebilir(auth.uid()));

-- ---------------------------------------------------------------------------
-- Tohum: Kamu İç Kontrol Standartları Tebliği (RG 26.12.2007 / 26738)
-- ---------------------------------------------------------------------------
insert into public.ick_mevzuat_surumu (kod, ad, resmi_gazete, yururluk_tarihi)
values ('KIKS-2007', 'Kamu İç Kontrol Standartları Tebliği', '26.12.2007 tarihli ve 26738 sayılı Resmî Gazete', '2007-12-26')
on conflict (kod) do nothing;

insert into public.ick_bilesen (surum_id, kod, ad, sira)
select s.id, v.kod, v.ad, v.sira
from public.ick_mevzuat_surumu s
cross join (values
  ('KOS', 'Kontrol Ortamı', 1),
  ('RDS', 'Risk Değerlendirme', 2),
  ('KFS', 'Kontrol Faaliyetleri', 3),
  ('BİS', 'Bilgi ve İletişim', 4),
  ('İS', 'İzleme', 5)
) as v (kod, ad, sira)
where s.kod = 'KIKS-2007'
on conflict (surum_id, kod) do nothing;

insert into public.ick_standart (surum_id, bilesen_id, no, ad, aciklama)
select s.id, b.id, v.no, v.ad, v.aciklama
from public.ick_mevzuat_surumu s
join (values
  ('KOS', 1, 'Etik Değerler ve Dürüstlük', 'Personel davranışlarını belirleyen kuralların personel tarafından bilinmesi sağlanmalıdır.'),
  ('KOS', 2, 'Misyon, Organizasyon Yapısı ve Görevler', 'İdarelerin misyonu ile birimlerin ve personelin görev tanımları yazılı olarak belirlenmeli, personele duyurulmalı ve idarede uygun bir organizasyon yapısı oluşturulmalıdır.'),
  ('KOS', 3, 'Personelin Yeterliliği ve Performansı', 'İdareler, personelin yeterliliği ve görevleri arasındaki uyumu sağlamalı, performansın değerlendirilmesi ve geliştirilmesine yönelik önlemler almalıdır.'),
  ('KOS', 4, 'Yetki Devri', 'İdarelerde yetkiler ve yetki devrinin sınırları açıkça belirlenmeli ve yazılı olarak bildirilmelidir. Devredilen yetkinin önemi ve riski dikkate alınarak yetki devri yapılmalıdır.'),
  ('RDS', 5, 'Planlama ve Programlama', 'İdareler, faaliyetlerini, amaç, hedef ve göstergelerini ve bunları gerçekleştirmek için ihtiyaç duydukları kaynakları içeren plan ve programlarını oluşturmalı ve duyurmalı, faaliyetlerinin plan ve programlara uygunluğunu sağlamalıdır.'),
  ('RDS', 6, 'Risklerin Belirlenmesi ve Değerlendirilmesi', 'İdareler, sistemli bir şekilde analizler yaparak amaç ve hedeflerinin gerçekleşmesini engelleyebilecek iç ve dış riskleri tanımlayarak değerlendirmeli ve alınacak önlemleri belirlemelidir.'),
  ('KFS', 7, 'Kontrol Stratejileri ve Yöntemleri', 'İdareler, hedeflerine ulaşmayı amaçlayan ve riskleri karşılamaya uygun kontrol strateji ve yöntemlerini belirlemeli ve uygulamalıdır.'),
  ('KFS', 8, 'Prosedürlerin Belirlenmesi ve Belgelendirilmesi', 'İdareler, faaliyetleri ile mali karar ve işlemleri için gerekli yazılı prosedürleri ve bu alanlara ilişkin düzenlemeleri hazırlamalı, güncellemeli ve ilgili personelin erişimine sunmalıdır.'),
  ('KFS', 9, 'Görevler Ayrılığı', 'Hata, eksiklik, yanlışlık, usulsüzlük ve yolsuzluk risklerini azaltmak için faaliyetler ile mali karar ve işlemlerin onaylanması, uygulanması, kaydedilmesi ve kontrol edilmesi görevleri personel arasında paylaştırılmalıdır.'),
  ('KFS', 10, 'Hiyerarşik Kontroller', 'Yöneticiler, iş ve işlemlerin prosedürlere uygunluğunu sistemli bir şekilde kontrol etmelidir.'),
  ('KFS', 11, 'Faaliyetlerin Sürekliliği', 'İdareler, faaliyetlerin sürekliliğini sağlamaya yönelik gerekli önlemleri almalıdır.'),
  ('KFS', 12, 'Bilgi Sistemleri Kontrolleri', 'İdareler, bilgi sistemlerinin sürekliliğini ve güvenilirliğini sağlamak için gerekli kontrol mekanizmaları geliştirmelidir.'),
  ('BİS', 13, 'Bilgi ve İletişim', 'İdareler, birimlerinin ve çalışanlarının performansının izlenebilmesi, karar alma süreçlerinin sağlıklı bir şekilde işleyebilmesi ve hizmet sunumunda etkinlik ve memnuniyetin sağlanması amacıyla uygun bir bilgi ve iletişim sistemine sahip olmalıdır.'),
  ('BİS', 14, 'Raporlama', 'İdarenin amaç, hedef, gösterge ve faaliyetleri ile sonuçları, saydamlık ve hesap verebilirlik ilkeleri doğrultusunda raporlanmalıdır.'),
  ('BİS', 15, 'Kayıt ve Dosyalama Sistemi', 'İdareler, gelen ve giden her türlü evrak dahil iş ve işlemlerin kaydedildiği, sınıflandırıldığı ve dosyalandığı kapsamlı ve güncel bir sisteme sahip olmalıdır.'),
  ('BİS', 16, 'Hata, Usulsüzlük ve Yolsuzlukların Bildirilmesi', 'İdareler, hata, usulsüzlük ve yolsuzlukların belirlenen bir düzen içinde bildirilmesini sağlayacak yöntemler oluşturmalıdır.'),
  ('İS', 17, 'İç Kontrolün Değerlendirilmesi', 'İdareler iç kontrol sistemini yılda en az bir kez değerlendirmelidir.'),
  ('İS', 18, 'İç Denetim', 'İdareler fonksiyonel olarak bağımsız bir iç denetim faaliyetini sağlamalıdır.')
) as v (bilesen_kod, no, ad, aciklama) on true
join public.ick_bilesen b on b.surum_id = s.id and b.kod = v.bilesen_kod
where s.kod = 'KIKS-2007'
on conflict (surum_id, no) do nothing;

insert into public.ick_genel_sart (surum_id, standart_id, kod, sira, metin)
select s.id, st.id, v.kod, v.sira, v.metin
from public.ick_mevzuat_surumu s
join (values
  (1, '1.1', 1, 'İç kontrol sistemi ve işleyişi yönetici ve personel tarafından sahiplenilmeli ve desteklenmelidir.'),
  (1, '1.2', 2, 'İdarenin yöneticileri iç kontrol sisteminin uygulanmasında personele örnek olmalıdırlar.'),
  (1, '1.3', 3, 'Etik kurallar bilinmeli ve tüm faaliyetlerde bu kurallara uyulmalıdır.'),
  (1, '1.4', 4, 'Faaliyetlerde dürüstlük, saydamlık ve hesap verebilirlik sağlanmalıdır.'),
  (1, '1.5', 5, 'İdarenin personeline ve hizmet verilenlere adil ve eşit davranılmalıdır.'),
  (1, '1.6', 6, 'İdarenin faaliyetlerine ilişkin tüm bilgi ve belgeler doğru, tam ve güvenilir olmalıdır.'),
  (2, '2.1', 1, 'İdarenin misyonu yazılı olarak belirlenmeli, duyurulmalı ve personel tarafından benimsenmesi sağlanmalıdır.'),
  (2, '2.2', 2, 'Misyonun gerçekleştirilmesini sağlamak üzere idare birimleri ve alt birimlerince yürütülecek görevler yazılı olarak tanımlanmalı ve duyurulmalıdır.'),
  (2, '2.3', 3, 'İdare birimlerinde personelin görevlerini ve bu görevlere ilişkin yetki ve sorumluluklarını kapsayan görev dağılım çizelgesi oluşturulmalı ve personele bildirilmelidir.'),
  (2, '2.4', 4, 'İdarenin ve birimlerinin teşkilat şeması olmalı ve buna bağlı olarak fonksiyonel görev dağılımı belirlenmelidir.'),
  (2, '2.5', 5, 'İdarenin ve birimlerinin organizasyon yapısı, temel yetki ve sorumluluk dağılımı, hesap verebilirlik ve uygun raporlama ilişkisini gösterecek şekilde olmalıdır.'),
  (2, '2.6', 6, 'İdarenin yöneticileri, faaliyetlerin yürütülmesinde hassas görevlere ilişkin prosedürleri belirlemeli ve personele duyurmalıdır.'),
  (2, '2.7', 7, 'Her düzeydeki yöneticiler verilen görevlerin sonucunu izlemeye yönelik mekanizmalar oluşturmalıdır.'),
  (3, '3.1', 1, 'İnsan kaynakları yönetimi, idarenin amaç ve hedeflerinin gerçekleşmesini sağlamaya yönelik olmalıdır.'),
  (3, '3.2', 2, 'İdarenin yönetici ve personeli görevlerini etkin ve etkili bir şekilde yürütebilecek bilgi, deneyim ve yeteneğe sahip olmalıdır.'),
  (3, '3.3', 3, 'Mesleki yeterliliğe önem verilmeli ve her görev için en uygun personel seçilmelidir.'),
  (3, '3.4', 4, 'Personelin işe alınması ile görevinde ilerleme ve yükselmesinde liyakat ilkesine uyulmalı ve bireysel performansı göz önünde bulundurulmalıdır.'),
  (3, '3.5', 5, 'Her görev için gerekli eğitim ihtiyacı belirlenmeli, bu ihtiyacı giderecek eğitim faaliyetleri her yıl planlanarak yürütülmeli ve gerektiğinde güncellenmelidir.'),
  (3, '3.6', 6, 'Personelin yeterliliği ve performansı bağlı olduğu yöneticisi tarafından en az yılda bir kez değerlendirilmeli ve değerlendirme sonuçları personel ile görüşülmelidir.'),
  (3, '3.7', 7, 'Performans değerlendirmesine göre performansı yetersiz bulunan personelin performansını geliştirmeye yönelik önlemler alınmalı, yüksek performans gösteren personel için ödüllendirme mekanizmaları geliştirilmelidir.'),
  (3, '3.8', 8, 'Personel istihdamı, yer değiştirme, üst görevlere atanma, eğitim, performans değerlendirmesi, özlük hakları gibi insan kaynakları yönetimine ilişkin önemli hususlar yazılı olarak belirlenmiş olmalı ve personele duyurulmalıdır.'),
  (4, '4.1', 1, 'İş akış süreçlerindeki imza ve onay mercileri belirlenmeli ve personele duyurulmalıdır.'),
  (4, '4.2', 2, 'Yetki devirleri, üst yönetici tarafından belirlenen esaslar çerçevesinde devredilen yetkinin sınırlarını gösterecek şekilde yazılı olarak belirlenmeli ve ilgililere bildirilmelidir.'),
  (4, '4.3', 3, 'Yetki devri, devredilen yetkinin önemi ile uyumlu olmalıdır.'),
  (4, '4.4', 4, 'Yetki devredilen personel görevin gerektirdiği bilgi, deneyim ve yeteneğe sahip olmalıdır.'),
  (4, '4.5', 5, 'Yetki devredilen personel, yetkinin kullanımına ilişkin olarak belli dönemlerde yetki devredene bilgi vermeli, yetki devreden ise bu bilgiyi aramalıdır.'),
  (5, '5.1', 1, 'İdareler, misyon ve vizyonlarını oluşturmak, stratejik amaçlar ve ölçülebilir hedefler saptamak, performanslarını ölçmek, izlemek ve değerlendirmek amacıyla katılımcı yöntemlerle stratejik plan hazırlamalıdır.'),
  (5, '5.2', 2, 'İdareler, yürütecekleri program, faaliyet ve projeleri ile bunların kaynak ihtiyacını, performans hedef ve göstergelerini içeren performans programı hazırlamalıdır.'),
  (5, '5.3', 3, 'İdareler, bütçelerini stratejik planlarına ve performans programlarına uygun olarak hazırlamalıdır.'),
  (5, '5.4', 4, 'Yöneticiler, faaliyetlerin ilgili mevzuat, stratejik plan ve performans programıyla belirlenen amaç ve hedeflere uygunluğunu sağlamalıdır.'),
  (5, '5.5', 5, 'Yöneticiler, görev alanları çerçevesinde idarenin hedeflerine uygun özel hedefler belirlemeli ve personeline duyurmalıdır.'),
  (5, '5.6', 6, 'İdarenin ve birimlerinin hedefleri, spesifik, ölçülebilir, ulaşılabilir, ilgili ve süreli olmalıdır.'),
  (6, '6.1', 1, 'İdareler, her yıl sistemli bir şekilde amaç ve hedeflerine yönelik riskleri belirlemelidir.'),
  (6, '6.2', 2, 'Risklerin gerçekleşme olasılığı ve muhtemel etkileri yılda en az bir kez analiz edilmelidir.'),
  (6, '6.3', 3, 'Risklere karşı alınacak önlemler belirlenerek eylem planları oluşturulmalıdır.'),
  (7, '7.1', 1, 'Her bir faaliyet ve riskleri için uygun kontrol strateji ve yöntemleri (düzenli gözden geçirme, örnekleme yoluyla kontrol, karşılaştırma, onaylama, raporlama, koordinasyon, doğrulama, analiz etme, yetkilendirme, gözetim, inceleme, izleme v.b.) belirlenmeli ve uygulanmalıdır.'),
  (7, '7.2', 2, 'Kontroller, gerekli hallerde, işlem öncesi kontrol, süreç kontrolü ve işlem sonrası kontrolleri de kapsamalıdır.'),
  (7, '7.3', 3, 'Kontrol faaliyetleri, varlıkların dönemsel kontrolünü ve güvenliğinin sağlanmasını kapsamalıdır.'),
  (7, '7.4', 4, 'Belirlenen kontrol yönteminin maliyeti beklenen faydayı aşmamalıdır.'),
  (8, '8.1', 1, 'İdareler, faaliyetleri ile mali karar ve işlemleri hakkında yazılı prosedürler belirlemelidir.'),
  (8, '8.2', 2, 'Prosedürler ve ilgili dokümanlar, faaliyet veya mali karar ve işlemin başlaması, uygulanması ve sonuçlandırılması aşamalarını kapsamalıdır.'),
  (8, '8.3', 3, 'Prosedürler ve ilgili dokümanlar, güncel, kapsamlı, mevzuata uygun ve ilgili personel tarafından anlaşılabilir ve ulaşılabilir olmalıdır.'),
  (9, '9.1', 1, 'Her faaliyet veya mali karar ve işlemin onaylanması, uygulanması, kaydedilmesi ve kontrolü görevleri farklı kişilere verilmelidir.'),
  (9, '9.2', 2, 'Personel sayısının yetersizliği nedeniyle görevler ayrılığı ilkesinin tam olarak uygulanamadığı idarelerin yöneticileri risklerin farkında olmalı ve gerekli önlemleri almalıdır.'),
  (10, '10.1', 1, 'Yöneticiler, prosedürlerin etkili ve sürekli bir şekilde uygulanması için gerekli kontrolleri yapmalıdır.'),
  (10, '10.2', 2, 'Yöneticiler, personelin iş ve işlemlerini izlemeli ve onaylamalı, hata ve usulsüzlüklerin giderilmesi için gerekli talimatları vermelidir.'),
  (11, '11.1', 1, 'Personel yetersizliği, geçici veya sürekli olarak görevden ayrılma, yeni bilgi sistemlerine geçiş, yöntem veya mevzuat değişiklikleri ile olağanüstü durumlar gibi faaliyetlerin sürekliliğini etkileyen nedenlere karşı gerekli önlemler alınmalıdır.'),
  (11, '11.2', 2, 'Gerekli hallerde usulüne uygun olarak vekil personel görevlendirilmelidir.'),
  (11, '11.3', 3, 'Görevinden ayrılan personelin, iş veya işlemlerinin durumunu ve gerekli belgeleri de içeren bir rapor hazırlaması ve bu raporu görevlendirilen personele vermesi yönetici tarafından sağlanmalıdır.'),
  (12, '12.1', 1, 'Bilgi sistemlerinin sürekliliğini ve güvenilirliğini sağlayacak kontroller yazılı olarak belirlenmeli ve uygulanmalıdır.'),
  (12, '12.2', 2, 'Bilgi sistemine veri ve bilgi girişi ile bunlara erişim konusunda yetkilendirmeler yapılmalı, hata ve usulsüzlüklerin önlenmesi, tespit edilmesi ve düzeltilmesini sağlayacak mekanizmalar oluşturulmalıdır.'),
  (12, '12.3', 3, 'İdareler bilişim yönetişimini sağlayacak mekanizmalar geliştirmelidir.'),
  (13, '13.1', 1, 'İdarelerde, yatay ve dikey iç iletişim ile dış iletişimi kapsayan etkili ve sürekli bir bilgi ve iletişim sistemi olmalıdır.'),
  (13, '13.2', 2, 'Yöneticiler ve personel, görevlerini yerine getirebilmeleri için gerekli ve yeterli bilgiye zamanında ulaşabilmelidir.'),
  (13, '13.3', 3, 'Bilgiler doğru, güvenilir, tam, kullanışlı ve anlaşılabilir olmalıdır.'),
  (13, '13.4', 4, 'Yöneticiler ve ilgili personel, performans programı ve bütçenin uygulanması ile kaynak kullanımına ilişkin diğer bilgilere zamanında erişebilmelidir.'),
  (13, '13.5', 5, 'Yönetim bilgi sistemi, yönetimin ihtiyaç duyduğu gerekli bilgileri ve raporları üretebilecek ve analiz yapma imkanı sunacak şekilde tasarlanmalıdır.'),
  (13, '13.6', 6, 'Yöneticiler, idarenin misyon, vizyon ve amaçları çerçevesinde beklentilerini görev ve sorumlulukları kapsamında personele bildirmelidir.'),
  (13, '13.7', 7, 'İdarenin yatay ve dikey iletişim sistemi personelin değerlendirme, öneri ve sorunlarını iletebilmelerini sağlamalıdır.'),
  (14, '14.1', 1, 'İdareler, her yıl, amaçları, hedefleri, stratejileri, varlıkları, yükümlülükleri ve performans programlarını kamuoyuna açıklamalıdır.'),
  (14, '14.2', 2, 'İdareler, bütçelerinin ilk altı aylık uygulama sonuçları, ikinci altı aya ilişkin beklentiler ve hedefler ile faaliyetlerini kamuoyuna açıklamalıdır.'),
  (14, '14.3', 3, 'Faaliyet sonuçları ve değerlendirmeler idare faaliyet raporunda gösterilmeli ve duyurulmalıdır.'),
  (14, '14.4', 4, 'Faaliyetlerin gözetimi amacıyla idare içinde yatay ve dikey raporlama ağı yazılı olarak belirlenmeli, birim ve personel, görevleri ve faaliyetleriyle ilgili hazırlanması gereken raporlar hakkında bilgilendirilmelidir.'),
  (15, '15.1', 1, 'Kayıt ve dosyalama sistemi, elektronik ortamdakiler dahil, gelen ve giden evrak ile idare içi haberleşmeyi kapsamalıdır.'),
  (15, '15.2', 2, 'Kayıt ve dosyalama sistemi kapsamlı ve güncel olmalı, yönetici ve personel tarafından ulaşılabilir ve izlenebilir olmalıdır.'),
  (15, '15.3', 3, 'Kayıt ve dosyalama sistemi, kişisel verilerin güvenliğini ve korunmasını sağlamalıdır.'),
  (15, '15.4', 4, 'Kayıt ve dosyalama sistemi belirlenmiş standartlara uygun olmalıdır.'),
  (15, '15.5', 5, 'Gelen ve giden evrak zamanında kaydedilmeli, standartlara uygun bir şekilde sınıflandırılmalı ve arşiv sistemine uygun olarak muhafaza edilmelidir.'),
  (15, '15.6', 6, 'İdarenin iş ve işlemlerinin kaydı, sınıflandırılması, korunması ve erişimini de kapsayan, belirlenmiş standartlara uygun arşiv ve dokümantasyon sistemi oluşturulmalıdır.'),
  (16, '16.1', 1, 'Hata, usulsüzlük ve yolsuzlukların bildirim yöntemleri belirlenmeli ve duyurulmalıdır.'),
  (16, '16.2', 2, 'Yöneticiler, bildirilen hata, usulsüzlük ve yolsuzluklar hakkında yeterli incelemeyi yapmalıdır.'),
  (16, '16.3', 3, 'Hata, usulsüzlük ve yolsuzlukları bildiren personele haksız ve ayırımcı bir muamele yapılmamalıdır.'),
  (17, '17.1', 1, 'İç kontrol sistemi, sürekli izleme veya özel bir değerlendirme yapma veya bu iki yöntem birlikte kullanılarak değerlendirilmelidir.'),
  (17, '17.2', 2, 'İç kontrolün eksik yönleri ile uygun olmayan kontrol yöntemlerinin belirlenmesi, bildirilmesi ve gerekli önlemlerin alınması konusunda süreç ve yöntem belirlenmelidir.'),
  (17, '17.3', 3, 'İç kontrolün değerlendirilmesine idarenin birimlerinin katılımı sağlanmalıdır.'),
  (17, '17.4', 4, 'İç kontrolün değerlendirilmesinde, yöneticilerin görüşleri, kişi ve/veya idarelerin talep ve şikâyetleri ile iç ve dış denetim sonucunda düzenlenen raporlar dikkate alınmalıdır.'),
  (17, '17.5', 5, 'İç kontrolün değerlendirilmesi sonucunda alınması gereken önlemler belirlenmeli ve bir eylem planı çerçevesinde uygulanmalıdır.'),
  (18, '18.1', 1, 'İç denetim faaliyeti İç Denetim Koordinasyon Kurulu tarafından belirlenen standartlara uygun bir şekilde yürütülmelidir.'),
  (18, '18.2', 2, 'İç denetim sonucunda idare tarafından alınması gerekli görülen önlemleri içeren eylem planı hazırlanmalı, uygulanmalı ve izlenmelidir.')
) as v (standart_no, kod, sira, metin) on true
join public.ick_standart st on st.surum_id = s.id and st.no = v.standart_no
where s.kod = 'KIKS-2007'
on conflict (surum_id, kod) do nothing;

insert into public.ick_belge_turu (ad, aciklama, sira) values
  ('Kanıt belgesi', 'Eylemin çıktısını gösteren belge.', 1),
  ('Resmî yazı', 'EBYS üzerinden gönderilen yazı.', 2),
  ('Olur / onay', 'Başkanlık oluru veya onay belgesi.', 3),
  ('Toplantı tutanağı', 'Kurul veya çalışma toplantısı tutanağı.', 4),
  ('Katılım kaydı', 'Eğitim veya bilgilendirme katılım listesi.', 5),
  ('Rapor', 'Analiz, değerlendirme veya izleme raporu.', 6),
  ('Diğer', 'Sınıflandırılmamış belge.', 99)
on conflict (ad) do nothing;

notify pgrst, 'reload schema';
