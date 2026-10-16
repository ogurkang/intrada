-- Anket: aynı tarayıcıdan ikinci cevap kuralı.
-- true: çerez ikinci gönderimi keser (mevcut davranış).
-- false: aynı tarayıcıdan birden fazla cevap alınır.

alter table public.anketler
  add column if not exists tek_tarayici boolean not null default true;

comment on column public.anketler.tek_tarayici is
  'true ise aynı tarayıcıdan bir kez cevap alınır. false ise aynı tarayıcıdan birden fazla cevap alınır.';
