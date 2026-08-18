-- KYS başlık tablosuna kod alanı ekleniyor
alter table public.kys_baslik
  add column if not exists kod text null;

alter table public.kys_baslik
  add constraint chk_kys_baslik_kod check (kod is null or char_length(kod) between 1 and 40);

notify pgrst, 'reload schema';
