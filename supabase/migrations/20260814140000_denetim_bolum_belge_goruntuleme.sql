-- Denetim: dinamik bölüm başlıkları, başlık belgeleri ve görüntüleme geçmişi

create table if not exists public.denetim_bolum_baslik (
  id bigint generated always as identity primary key,
  donem_id bigint not null references public.denetim_donem(id) on delete cascade,
  bolum text not null check (bolum in ('mali', 'performans', 'ic_kontrol')),
  baslik text not null,
  aciklama text null,
  sistem_anahtari text null,
  sira_no integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  created_by_email text null
);

create unique index if not exists uq_denetim_bolum_baslik_sistem
  on public.denetim_bolum_baslik (donem_id, bolum, sistem_anahtari)
  where sistem_anahtari is not null;

create unique index if not exists uq_denetim_bolum_baslik_ad
  on public.denetim_bolum_baslik (donem_id, bolum, lower(baslik));

create index if not exists idx_denetim_bolum_baslik_donem
  on public.denetim_bolum_baslik (donem_id, bolum, sira_no);

create table if not exists public.denetim_bolum_belge (
  id bigint generated always as identity primary key,
  baslik_id bigint not null references public.denetim_bolum_baslik(id) on delete cascade,
  sorumlu_birim text null,
  dosya_adi text not null,
  storage_path text not null,
  mime_type text null,
  boyut_byte bigint null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  created_by_email text null,
  constraint uq_denetim_bolum_belge_baslik unique (baslik_id)
);

create table if not exists public.denetim_belge_goruntuleme (
  id bigint generated always as identity primary key,
  belge_turu text not null check (belge_turu in ('karar', 'bolum')),
  belge_id bigint not null,
  viewed_by uuid null references auth.users(id) on delete set null,
  viewed_by_email text null,
  viewed_at timestamptz not null default now()
);

create index if not exists idx_denetim_belge_goruntuleme_belge
  on public.denetim_belge_goruntuleme (belge_turu, belge_id, viewed_at desc);

create index if not exists idx_denetim_belge_goruntuleme_kullanici
  on public.denetim_belge_goruntuleme (viewed_by, viewed_at desc);

alter table public.denetim_bolum_baslik enable row level security;
alter table public.denetim_bolum_belge enable row level security;
alter table public.denetim_belge_goruntuleme enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['denetim_bolum_baslik', 'denetim_bolum_belge', 'denetim_belge_goruntuleme']
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = t and policyname = t || '_select'
    ) then
      execute format(
        'create policy %I on public.%I for select to authenticated using (true)',
        t || '_select', t
      );
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = t and policyname = t || '_write'
    ) then
      execute format(
        'create policy %I on public.%I for all to authenticated using (true) with check (true)',
        t || '_write', t
      );
    end if;
  end loop;
end $$;

create or replace function public.denetim_varsayilan_basliklari_ekle(p_donem_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.denetim_bolum_baslik
    (donem_id, bolum, baslik, aciklama, sistem_anahtari, sira_no)
  values
    (p_donem_id, 'mali', 'Gelir Tarifesi', 'Mali bilgiler kapsamında gelir tarifesi.', 'gelir-tarifesi', 1),
    (p_donem_id, 'mali', 'Kesin Hesap', 'Mali bilgiler kapsamında kesin hesap.', 'kesin-hesap', 2),
    (p_donem_id, 'mali', 'Bütçe', 'Mali bilgiler kapsamında bütçe.', 'butce', 3),
    (p_donem_id, 'performans', 'Stratejik Plan', 'Performans bilgileri kapsamında stratejik plan.', 'stratejik-plan', 1),
    (p_donem_id, 'performans', 'Performans Programı', 'Performans bilgileri kapsamında performans programı.', 'performans-programi', 2),
    (p_donem_id, 'performans', 'Faaliyet Raporu', 'Performans bilgileri kapsamında faaliyet raporu.', 'faaliyet-raporu', 3),
    (p_donem_id, 'ic_kontrol', 'Yönetmelikler', 'İç kontrol kapsamında yönetmelikler.', 'yonetmelikler', 1),
    (p_donem_id, 'ic_kontrol', 'İKEP', 'İç Kontrol Eylem Planı belgeleri.', 'ikep', 2)
  on conflict do nothing;
end;
$$;

create or replace function public.denetim_donem_baslik_seed_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.denetim_varsayilan_basliklari_ekle(new.id);
  return new;
end;
$$;

drop trigger if exists trg_denetim_donem_baslik_seed on public.denetim_donem;
create trigger trg_denetim_donem_baslik_seed
  after insert on public.denetim_donem
  for each row execute function public.denetim_donem_baslik_seed_trigger();

select public.denetim_varsayilan_basliklari_ekle(id)
from public.denetim_donem;
