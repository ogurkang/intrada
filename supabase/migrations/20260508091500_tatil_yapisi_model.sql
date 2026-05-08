alter table public.tanim_izin_tatil
  add column if not exists tatil_yapisi text;

update public.tanim_izin_tatil
set tatil_yapisi = case
  when coalesce(lower(tatil_turu), '') like '%dini%'
    or coalesce(lower(tatil_adi), '') like '%ramazan%'
    or coalesce(lower(tatil_adi), '') like '%kurban%'
    then 'Yıllık Tatil'
  else 'Sabit Tatil'
end
where tatil_yapisi is null
   or tatil_yapisi not in ('Yıllık Tatil', 'Sabit Tatil');

alter table public.tanim_izin_tatil
  add constraint tanim_izin_tatil_tatil_yapisi_check
  check (tatil_yapisi in ('Yıllık Tatil', 'Sabit Tatil'));
