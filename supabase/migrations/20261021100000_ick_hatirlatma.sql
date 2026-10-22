-- Tamamlanma tarihine 10 gün kala gönderilen SMS'in tekrarı olmasın.

create table if not exists public.ick_hatirlatma (
  id bigint generated always as identity primary key,
  eylem_id bigint not null references public.ick_eylem (id) on delete cascade,
  sicil_no text not null,
  gun date not null,
  created_at timestamptz not null default now(),
  unique (eylem_id, sicil_no, gun)
);

comment on table public.ick_hatirlatma is
  'İKEP tamamlanma hatırlatması. Aynı eylem, kişi ve gün için bir kez yazılır.';

alter table public.ick_hatirlatma enable row level security;
