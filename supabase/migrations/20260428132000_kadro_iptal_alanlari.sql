alter table if exists public.kadro_hareketleri
  add column if not exists iptal_karar_tarihi date,
  add column if not exists iptal_karar_no text;

comment on column public.kadro_hareketleri.iptal_karar_tarihi is
  'Bu alan doluysa kadro kaydı iptal kabul edilir.';

comment on column public.kadro_hareketleri.iptal_karar_no is
  'Bu alan doluysa kadro kaydı iptal kabul edilir.';

alter table public.kadro_hareketleri
  drop constraint if exists kadro_iptal_personel_ck;

alter table public.kadro_hareketleri
  add constraint kadro_iptal_personel_ck
  check (
    not (
      (iptal_karar_tarihi is not null or iptal_karar_no is not null)
      and
      (asil is not null or vekil is not null)
    )
  );
