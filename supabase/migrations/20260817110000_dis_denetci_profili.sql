-- Dış denetçi: personel siciline bağlı olmayan, yalnızca Denetim modülünü
-- görüntüleyebilen uygulama profili.

alter table public.app_profiles
  alter column sicil_no drop not null,
  add column if not exists profil_turu text not null default 'personel',
  add column if not exists ad_soyad text,
  add column if not exists kurum_adi text,
  add column if not exists e_posta text;

alter table public.app_profiles
  drop constraint if exists app_profiles_rol_check;

alter table public.app_profiles
  add constraint app_profiles_rol_check
  check (rol in ('admin', 'kullanici', 'dis_denetci'));

alter table public.app_profiles
  drop constraint if exists app_profiles_profil_turu_check;

alter table public.app_profiles
  add constraint app_profiles_profil_turu_check
  check (profil_turu in ('personel', 'dis_denetci'));

alter table public.app_profiles
  drop constraint if exists app_profiles_dis_denetci_check;

alter table public.app_profiles
  add constraint app_profiles_dis_denetci_check
  check (
    (profil_turu = 'personel' and sicil_no is not null and rol in ('admin', 'kullanici'))
    or
    (
      profil_turu = 'dis_denetci'
      and sicil_no is null
      and rol = 'dis_denetci'
      and nullif(btrim(kullanici_adi), '') is not null
      and nullif(btrim(ad_soyad), '') is not null
      and nullif(btrim(kurum_adi), '') is not null
    )
  );

create unique index if not exists app_profiles_dis_denetci_kullanici_adi_key
  on public.app_profiles (upper(btrim(kullanici_adi)))
  where profil_turu = 'dis_denetci';

create unique index if not exists app_profiles_dis_denetci_eposta_key
  on public.app_profiles (lower(btrim(e_posta)))
  where profil_turu = 'dis_denetci' and e_posta is not null;

create or replace function public.app_profiles_sicil_gecerli()
returns trigger
language plpgsql
as $$
begin
  if new.profil_turu = 'dis_denetci' then
    if new.sicil_no is not null then
      raise exception 'Dış denetçi profiline sicil numarası atanamaz.';
    end if;
    return new;
  end if;

  if new.sicil_no is null then
    raise exception 'Personel profilinde sicil numarası boş olamaz.';
  end if;

  if not exists (select 1 from public.calisan c where c.sicil_no = new.sicil_no)
     and not exists (select 1 from public.firma_calisanlar f where f.sicil_no = new.sicil_no)
  then
    raise exception 'Sicil % personel veya ADABEL kayıtlarında bulunamadı.', new.sicil_no;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_app_profiles_sicil_gecerli on public.app_profiles;
create trigger trg_app_profiles_sicil_gecerli
  before insert or update of sicil_no, profil_turu on public.app_profiles
  for each row execute function public.app_profiles_sicil_gecerli();

-- Görüntüleme anındaki kimliği snapshot olarak sakla; profil sonradan değişse de
-- denetim izi aynı kalır.
alter table public.denetim_belge_goruntuleme
  add column if not exists viewed_by_username text,
  add column if not exists viewed_by_name text,
  add column if not exists viewed_by_institution text,
  add column if not exists viewed_by_profile_kind text;

-- Dış denetçinin Denetim tablolarına doğrudan Supabase istemcisiyle yazmasını da
-- engelleyen RLS yardımcısı.
create or replace function public.denetim_yazabilir()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.app_profiles p
    where p.id = auth.uid()
      and p.profil_turu = 'dis_denetci'
  );
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'denetim_menu',
    'denetim_belge',
    'denetim_donem',
    'denetim_karar_belge',
    'denetim_bolum_baslik',
    'denetim_bolum_belge',
    'denetim_donem_menu'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.denetim_yazabilir()) with check (public.denetim_yazabilir())',
      t || '_write', t
    );
  end loop;
end $$;

-- Görüntüleme kaydı yazılabilsin; diğer değişiklikler dış denetçiye kapalıdır.
drop policy if exists denetim_belge_goruntuleme_write on public.denetim_belge_goruntuleme;
create policy denetim_belge_goruntuleme_write
  on public.denetim_belge_goruntuleme
  for insert to authenticated
  with check (viewed_by = auth.uid());

notify pgrst, 'reload schema';
