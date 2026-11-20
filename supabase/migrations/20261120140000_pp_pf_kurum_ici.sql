-- Performans faaliyeti ödenek teklifinde «Kurum İçi» işaretleme.
alter table public.performans_programi_pf_faaliyet
  add column if not exists kurum_ici boolean not null default false;
