create table if not exists public.stratejik_plan_gosterge_veri_donem (
  id bigserial primary key,
  stratejik_donem_id bigint not null references public.stratejik_plan_donem(id) on delete cascade,
  yil integer not null,
  ceyrek smallint not null check (ceyrek between 1 and 4),
  durum text not null default 'Kapalı' check (durum in ('Açık', 'Kapalı')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (stratejik_donem_id, yil, ceyrek)
);

create table if not exists public.stratejik_plan_gosterge_gerceklesme (
  id bigserial primary key,
  stratejik_donem_id bigint not null references public.stratejik_plan_donem(id) on delete cascade,
  gosterge_id bigint not null references public.stratejik_plan_gosterge(id) on delete cascade,
  yil integer not null,
  ceyrek smallint not null check (ceyrek between 1 and 4),
  gerceklesen numeric(14,2) not null default 0,
  mudurluk text null,
  created_by uuid null references auth.users(id),
  updated_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gosterge_id, yil, ceyrek)
);

create index if not exists idx_sp_gerceklesme_donem_yil_ceyrek
  on public.stratejik_plan_gosterge_gerceklesme (stratejik_donem_id, yil, ceyrek);

create table if not exists public.stratejik_plan_veri_giris_yetki_mudurluk (
  mudurluk_adi text primary key,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.stratejik_plan_veri_giris_yetki_mudurluk (mudurluk_adi, aktif)
values
  ('İnsan Kaynakları ve Eğitim Müdürlüğü', true),
  ('Strateji Geliştirme Müdürlüğü', true)
on conflict (mudurluk_adi) do update set aktif = excluded.aktif;
