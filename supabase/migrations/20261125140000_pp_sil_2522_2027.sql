-- 2027 performans programı PH 2.5.2 altındaki 2.5.2.2 (sira_no=2) performans faaliyeti silinir.
-- Bağlı göstergeler / ödenekler FK cascade ile düşer.

delete from public.performans_programi_pf_faaliyet f
using public.performans_programi_alt_program_hedef b,
      public.performans_programi_alt_program a,
      public.performans_programi_program p
where f.id = 186
  and f.bag_id = 42
  and f.sira_no = 2
  and f.bag_id = b.id
  and b.alt_program_id = a.id
  and a.program_id = p.id
  and p.yil = 2027;
