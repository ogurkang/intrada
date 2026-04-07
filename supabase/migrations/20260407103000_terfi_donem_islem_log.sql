create table if not exists public.terfi_donem_islem_log (
  id bigserial primary key,
  donem_id bigint not null references public.terfi_donem(id) on delete cascade,
  sicil_no text not null references public.calisan(sicil_no) on delete cascade,
  terfi_id bigint not null references public.terfi_hareketleri(id) on delete cascade,
  onceki jsonb not null,
  sonraki jsonb not null,
  islem_tarihi timestamptz not null default now(),
  geri_alindi boolean not null default false,
  geri_alma_tarihi timestamptz null
);

create index if not exists idx_terfi_donem_islem_log_donem
  on public.terfi_donem_islem_log(donem_id, islem_tarihi desc);

create index if not exists idx_terfi_donem_islem_log_sicil
  on public.terfi_donem_islem_log(sicil_no, islem_tarihi desc);
