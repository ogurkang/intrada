-- KYS başlıkları için birden fazla belge kaydına izin ver
alter table public.kys_belge
  drop constraint if exists uq_kys_belge_baslik;

drop index if exists public.uq_kys_belge_baslik;

notify pgrst, 'reload schema';
