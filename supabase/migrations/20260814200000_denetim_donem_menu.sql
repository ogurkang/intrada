-- Denetim: dönem bazlı dinamik menü ağacı (Ana Alt Menü / Alt Menü)

create table if not exists public.denetim_donem_menu (
  id bigint generated always as identity primary key,
  donem_id bigint not null references public.denetim_donem(id) on delete cascade,
  parent_id bigint null references public.denetim_donem_menu(id) on delete cascade,
  baslik text not null,
  aciklama text null,
  slug text not null,
  sayfa_turu text not null check (sayfa_turu in ('hub', 'belge', 'karar_ay', 'tasinmaz')),
  sistem_anahtari text null,
  ikon text null,
  sira_no integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  created_by_email text null,
  constraint chk_denetim_donem_menu_baslik check (char_length(baslik) between 2 and 120)
);

create unique index if not exists uq_denetim_donem_menu_ad
  on public.denetim_donem_menu (donem_id, coalesce(parent_id, 0), lower(baslik));

create unique index if not exists uq_denetim_donem_menu_slug
  on public.denetim_donem_menu (donem_id, slug);

create unique index if not exists uq_denetim_donem_menu_sistem
  on public.denetim_donem_menu (donem_id, sistem_anahtari)
  where sistem_anahtari is not null;

create index if not exists idx_denetim_donem_menu_donem
  on public.denetim_donem_menu (donem_id, parent_id, sira_no);

alter table public.denetim_bolum_baslik
  add column if not exists menu_id bigint references public.denetim_donem_menu(id) on delete cascade;

alter table public.denetim_bolum_baslik
  drop constraint if exists denetim_bolum_baslik_bolum_check;

alter table public.denetim_bolum_baslik
  alter column bolum drop not null;

alter table public.denetim_bolum_baslik
  alter column alt_bolum drop not null;

alter table public.denetim_bolum_baslik
  add constraint denetim_bolum_baslik_bolum_check
  check (bolum is null or bolum in ('mali', 'performans', 'ic_kontrol', 'insan_kaynaklari'));

drop index if exists public.uq_denetim_bolum_baslik_ad;
create unique index if not exists uq_denetim_bolum_baslik_menu_ad
  on public.denetim_bolum_baslik (menu_id, lower(baslik))
  where menu_id is not null;
create unique index if not exists uq_denetim_bolum_baslik_eski_ad
  on public.denetim_bolum_baslik (donem_id, bolum, alt_bolum, lower(baslik))
  where menu_id is null;

alter table public.denetim_donem_menu enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'denetim_donem_menu' and policyname = 'denetim_donem_menu_select'
  ) then
    create policy denetim_donem_menu_select on public.denetim_donem_menu
      for select to authenticated using (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'denetim_donem_menu' and policyname = 'denetim_donem_menu_write'
  ) then
    create policy denetim_donem_menu_write on public.denetim_donem_menu
      for all to authenticated using (true) with check (true);
  end if;
end $$;

create or replace function public.denetim_donem_menu_seed(p_donem_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_karar bigint;
  v_mali bigint;
  v_perf bigint;
  v_ic bigint;
  v_ik bigint;
begin
  if exists (select 1 from public.denetim_donem_menu where donem_id = p_donem_id) then
    return;
  end if;

  insert into public.denetim_donem_menu
    (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
  values
    (p_donem_id, null, 'Karar Bilgileri', 'Encümen ve meclis kararları; aylık belge yükleme.',
     'karar-bilgileri', 'hub', 'karar-bilgileri', 'karar', 1)
  returning id into v_karar;

  insert into public.denetim_donem_menu
    (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
  values
    (p_donem_id, v_karar, 'Encümen Kararları', 'Aylık encümen karar belgeleri.',
     'encumen-kararlari', 'karar_ay', 'encumen-kararlari', 'encumen', 1),
    (p_donem_id, v_karar, 'Meclis Kararları', 'Aylık meclis karar belgeleri.',
     'meclis-kararlari', 'karar_ay', 'meclis-kararlari', 'meclis', 2);

  insert into public.denetim_donem_menu
    (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
  values
    (p_donem_id, null, 'Mali Bilgiler', 'Gelir tarifesi, kesin hesap ve bütçe.',
     'mali-bilgiler', 'hub', 'mali-bilgiler', 'mali', 2)
  returning id into v_mali;

  insert into public.denetim_donem_menu
    (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
  values
    (p_donem_id, v_mali, 'Gelir Tarifesi', 'Gelir tarifesi belgeleri.',
     'gelir-tarifesi', 'belge', 'gelir-tarifesi', 'gelir', 1),
    (p_donem_id, v_mali, 'Kesin Hesap', 'Kesin hesap belgeleri.',
     'kesin-hesap', 'belge', 'kesin-hesap', 'hesap', 2),
    (p_donem_id, v_mali, 'Bütçe', 'Bütçe belgeleri.',
     'butce', 'belge', 'butce', 'butce', 3);

  insert into public.denetim_donem_menu
    (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
  values
    (p_donem_id, null, 'Taşınmaz Bilgileri', 'Belediye taşınmazlarına ilişkin denetim bilgileri.',
     'tasinmaz-bilgileri', 'tasinmaz', 'tasinmaz-bilgileri', 'tasinmaz', 3);

  insert into public.denetim_donem_menu
    (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
  values
    (p_donem_id, null, 'Performans Bilgileri', 'Stratejik plan, performans programı ve faaliyet raporu.',
     'performans-bilgileri', 'hub', 'performans-bilgileri', 'performans', 4)
  returning id into v_perf;

  insert into public.denetim_donem_menu
    (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
  values
    (p_donem_id, v_perf, 'Stratejik Plan', 'Stratejik plan belgeleri.',
     'stratejik-plan', 'belge', 'stratejik-plan', 'stratejik', 1),
    (p_donem_id, v_perf, 'Performans Programı', 'Performans programı belgeleri.',
     'performans-programi', 'belge', 'performans-programi', 'program', 2),
    (p_donem_id, v_perf, 'Faaliyet Raporu', 'Faaliyet raporu belgeleri.',
     'faaliyet-raporu', 'belge', 'faaliyet-raporu', 'rapor', 3);

  insert into public.denetim_donem_menu
    (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
  values
    (p_donem_id, null, 'İç Kontrol Bilgileri', 'Yönetmelikler ve İKEP.',
     'ic-kontrol-bilgileri', 'hub', 'ic-kontrol-bilgileri', 'ickontrol', 5)
  returning id into v_ic;

  insert into public.denetim_donem_menu
    (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
  values
    (p_donem_id, v_ic, 'Yönetmelikler', 'Yönetmelik belgeleri.',
     'yonetmelikler', 'belge', 'yonetmelikler', 'yonetmelik', 1),
    (p_donem_id, v_ic, 'İKEP', 'İç Kontrol Eylem Planı belgeleri.',
     'ikep', 'belge', 'ikep', 'ikep', 2);

  insert into public.denetim_donem_menu
    (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
  values
    (p_donem_id, null, 'İnsan Kaynakları Bilgileri', 'Sosyal denge, toplu iş sözleşmesi ve norm kadro.',
     'insan-kaynaklari-bilgileri', 'hub', 'insan-kaynaklari-bilgileri', 'insankaynaklari', 6)
  returning id into v_ik;

  insert into public.denetim_donem_menu
    (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
  values
    (p_donem_id, v_ik, 'Sosyal Denge', 'Sosyal denge sözleşmesi ve ilgili belgeler.',
     'sosyal-denge', 'belge', 'sosyal-denge', 'sosyaldenge', 1),
    (p_donem_id, v_ik, 'Toplu İş Sözleşmesi', 'Toplu iş sözleşmesi ve ilgili belgeler.',
     'toplu-is-sozlesmesi', 'belge', 'toplu-is-sozlesmesi', 'sozlesme', 2),
    (p_donem_id, v_ik, 'Norm Kadro', 'Norm kadro cetvelleri ve ilgili belgeler.',
     'norm-kadro', 'belge', 'norm-kadro', 'normkadro', 3);
end;
$$;

create or replace function public.denetim_donem_menu_seed_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.denetim_donem_menu_seed(new.id);
  return new;
end;
$$;

drop trigger if exists trg_denetim_donem_menu_seed on public.denetim_donem;
create trigger trg_denetim_donem_menu_seed
  after insert on public.denetim_donem
  for each row execute function public.denetim_donem_menu_seed_trigger();

select public.denetim_donem_menu_seed(id)
from public.denetim_donem;

update public.denetim_bolum_baslik b
set menu_id = m.id
from public.denetim_donem_menu m
where b.menu_id is null
  and m.donem_id = b.donem_id
  and m.sistem_anahtari = b.alt_bolum
  and m.parent_id is not null;

notify pgrst, 'reload schema';
