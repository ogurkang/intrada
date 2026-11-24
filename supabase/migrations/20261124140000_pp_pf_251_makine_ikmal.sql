-- PH 2.5.1 performans faaliyetleri 6–10 (kod 2.5.1.6 … 2.5.1.10)
-- yanlışlıkla Destek Hizmetleri bağındaydı; Makine İkmal Bakım ve Onarım’a taşınır.
-- Ayrıca aynı alt programdaki Destek / Makine bag satırlarının alt_hedef eşlemesi düzeltilir.

-- Destek bag → Destek SP alt hedef (16)
update public.performans_programi_alt_program_hedef
set alt_hedef_id = 16
where id = 41
  and secilen_mudurluk = 'Destek Hizmetleri Müdürlüğü'
  and alt_hedef_id is distinct from 16;

-- Makine bag → Makine SP alt hedef (17)
update public.performans_programi_alt_program_hedef
set alt_hedef_id = 17
where id = 64
  and secilen_mudurluk = 'Makine İkmal Bakım ve Onarım Müdürlüğü'
  and alt_hedef_id is distinct from 17;

-- Sıra 6–10 faaliyetleri (ve bağlı gösterge / ödenek kayıtları bag_id üzerinden) Makine bağina
update public.performans_programi_pf_faaliyet
set bag_id = 64
where id in (187, 188, 189, 190, 191)
  and bag_id = 41
  and sira_no between 6 and 10;
