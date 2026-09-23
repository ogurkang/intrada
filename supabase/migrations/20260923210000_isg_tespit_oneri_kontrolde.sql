-- Tespit/öneri durumlarına «Kontrolde» (%75) aşaması eklenir.

alter table public.isg_tespit_oneri
  drop constraint if exists isg_tespit_oneri_durum_check;

alter table public.isg_tespit_oneri
  add constraint isg_tespit_oneri_durum_check
  check (durum in ('Planlandı', 'Devam Ediyor', 'Kontrolde', 'Tamamlandı'));
