update public.stratejik_plan_gosterge
set birim =
  case birim
    when 'Yuzde' then 'Yüzde'
    when 'Kisi' then 'Kişi'
    when 'Gun' then 'Gün'
    else birim
  end;

alter table public.stratejik_plan_gosterge
drop constraint if exists stratejik_plan_gosterge_birim_ck;

alter table public.stratejik_plan_gosterge
add constraint stratejik_plan_gosterge_birim_ck
check (
  birim in ('Yüzde', 'Adet', 'Kişi', 'Gün', 'Hektar', 'Ton', 'Metre', 'Metrekare', 'Saat')
);
