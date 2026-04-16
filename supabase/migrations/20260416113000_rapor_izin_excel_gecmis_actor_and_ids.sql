alter table public.rapor_izin_excel_gecmis
add column if not exists actor_email text;

alter table public.rapor_izin_excel_gecmis
add column if not exists izin_ids jsonb not null default '[]'::jsonb;

-- Eski satırlar için güvenli varsayılan
update public.rapor_izin_excel_gecmis
set actor_email = coalesce(actor_email, '')
where actor_email is null;
