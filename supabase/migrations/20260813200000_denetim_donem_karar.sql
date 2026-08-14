-- Denetim dönemleri + karar belgeleri (encümen/meclis aylık)

create table if not exists public.denetim_donem (
  id bigint generated always as identity primary key,
  sira_no integer not null,
  donem_adi text not null,
  baslangic_tarihi date not null,
  bitis_tarihi date not null,
  durum text not null default 'Açık' check (durum in ('Açık', 'Kapalı')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  created_by_email text null,
  constraint denetim_donem_tarih_chk check (bitis_tarihi >= baslangic_tarihi)
);

comment on table public.denetim_donem is
  'Denetim Yönetimi dönemleri. Açık dönem varken yeni dönem açılamaz.';

create unique index if not exists uq_denetim_donem_sira_no on public.denetim_donem (sira_no);
create index if not exists idx_denetim_donem_durum on public.denetim_donem (durum);

-- En fazla bir açık dönem
create unique index if not exists uq_denetim_donem_tek_acik
  on public.denetim_donem ((1))
  where durum = 'Açık';

create table if not exists public.denetim_karar_belge (
  id bigint generated always as identity primary key,
  donem_id bigint not null references public.denetim_donem(id) on delete cascade,
  karar_turu text not null check (karar_turu in ('encumen', 'meclis')),
  ay smallint not null check (ay >= 1 and ay <= 12),
  sorumlu_birim text null,
  dosya_adi text not null,
  storage_path text not null,
  mime_type text null,
  boyut_byte bigint null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  created_by_email text null
);

comment on table public.denetim_karar_belge is
  'Encümen / Meclis karar belgeleri — dönem + ay bazlı.';

create unique index if not exists uq_denetim_karar_donem_tur_ay
  on public.denetim_karar_belge (donem_id, karar_turu, ay);

create index if not exists idx_denetim_karar_belge_donem
  on public.denetim_karar_belge (donem_id, karar_turu, ay);

alter table public.denetim_donem enable row level security;
alter table public.denetim_karar_belge enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'denetim_donem' and policyname = 'denetim_donem_select'
  ) then
    create policy denetim_donem_select on public.denetim_donem
      for select to authenticated using (true);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'denetim_donem' and policyname = 'denetim_donem_write'
  ) then
    create policy denetim_donem_write on public.denetim_donem
      for all to authenticated using (true) with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'denetim_karar_belge' and policyname = 'denetim_karar_belge_select'
  ) then
    create policy denetim_karar_belge_select on public.denetim_karar_belge
      for select to authenticated using (true);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'denetim_karar_belge' and policyname = 'denetim_karar_belge_write'
  ) then
    create policy denetim_karar_belge_write on public.denetim_karar_belge
      for all to authenticated using (true) with check (true);
  end if;
end $$;

-- Karar belgeleri için aynı bucket kullanılır (denetim-belgeler)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'denetim-belgeler',
  'denetim-belgeler',
  false,
  15728640,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroEnabled.12'
  ]::text[]
)
on conflict (id) do nothing;
