alter table public.terfi_donem_islem_log
  add column if not exists ogrenim_terfi boolean not null default false,
  add column if not exists ogrenim_olay text null
    check (ogrenim_olay is null or ogrenim_olay in ('hazirlik', 'yuksek_lisans', 'doktora'));
