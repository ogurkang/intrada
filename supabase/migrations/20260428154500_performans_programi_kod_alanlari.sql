alter table public.performans_programi_alt_program
  add column if not exists kodu text;

update public.performans_programi_alt_program
set kodu = coalesce(nullif(trim(kodu), ''), 'AP')
where kodu is null or trim(kodu) = '';

alter table public.performans_programi_alt_program
  alter column kodu set not null;

alter table public.performans_programi_faaliyet
  add column if not exists kodu text;

update public.performans_programi_faaliyet
set kodu = coalesce(nullif(trim(kodu), ''), 'F')
where kodu is null or trim(kodu) = '';

alter table public.performans_programi_faaliyet
  alter column kodu set not null;
