-- Müdürlük: zorunlu mu? Supabase SQL editöründe bir kez çalıştırın.

alter table public.tanim_mudurluk
  add column if not exists zorunlu_mu boolean not null default false;

comment on column public.tanim_mudurluk.zorunlu_mu is
  'Norm kadro yönetmeliğindeki zorunlu müdürlük / birim işareti.';
