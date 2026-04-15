alter table public.app_profiles
add column if not exists hesap_aktif boolean not null default true;

comment on column public.app_profiles.hesap_aktif
is 'Kullanıcı hesabının uygulama erişimi açık mı? false ise dashboard erişimi engellenir.';
