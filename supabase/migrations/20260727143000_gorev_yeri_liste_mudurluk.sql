alter table public.rapor_gorev_yeri_liste_ayar
  add column if not exists mudurluk text null;

comment on column public.rapor_gorev_yeri_liste_ayar.mudurluk is
  'Kayıt anındaki müdürlük; müdürlük değişiminde sıralama güncellemesi için.';
