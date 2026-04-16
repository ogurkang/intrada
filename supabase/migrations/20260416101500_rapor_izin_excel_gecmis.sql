create table if not exists public.rapor_izin_excel_gecmis (
  id bigserial primary key,
  user_id uuid not null,
  yil integer not null,
  sira_bas integer not null,
  sira_bit integer not null,
  kayit_sayisi integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists rapor_izin_excel_gecmis_user_created_idx
  on public.rapor_izin_excel_gecmis (user_id, created_at desc);
