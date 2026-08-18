-- KYS başlıkları için birden fazla belge kaydına izin ver
drop index if exists public.uq_kys_belge_baslik;

alter table public.kys_belge
  drop constraint if exists uq_kys_belge_baslik;

notify pgrst, 'reload schema';
