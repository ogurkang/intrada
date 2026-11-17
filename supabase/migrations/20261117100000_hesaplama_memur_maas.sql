-- Memur maaş hesaplama senaryosu (JSON belge)
create table if not exists public.hesaplama_memur_maas (
  id integer primary key default 1 check (id = 1),
  belge jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.hesaplama_memur_maas enable row level security;

drop policy if exists hesaplama_memur_maas_select on public.hesaplama_memur_maas;
create policy hesaplama_memur_maas_select on public.hesaplama_memur_maas
  for select to authenticated using (true);

drop policy if exists hesaplama_memur_maas_upsert on public.hesaplama_memur_maas;
create policy hesaplama_memur_maas_upsert on public.hesaplama_memur_maas
  for all to authenticated using (true) with check (true);

insert into public.hesaplama_memur_maas (id, belge)
values (1, jsonb_build_object('cari_yil', extract(year from now())::int, 'satirlar', '{}'::jsonb))
on conflict (id) do nothing;
