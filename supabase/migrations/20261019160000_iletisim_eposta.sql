-- İletişim Yönetimi · kurumsal e-posta kutusu (IMAP 993 / SMTP 465).
-- Şifre tanımlar ekranından girilir. İmza metni, personel bilgilerinin altında yer alır.

create table if not exists public.iletisim_eposta_ayar (
  id smallint primary key default 1,
  adres text not null default 'insankaynaklari@adapazari.bel.tr',
  gorunen_ad text not null default 'Adapazarı Belediyesi İnsan Kaynakları ve Eğitim Müdürlüğü',
  imap_host text not null default 'mail.adapazari.bel.tr',
  imap_port integer not null default 993,
  smtp_host text not null default 'mail.adapazari.bel.tr',
  smtp_port integer not null default 465,
  sifre text null,
  imza_metin text not null default '',
  aktif boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint iletisim_eposta_ayar_tekil check (id = 1)
);

comment on table public.iletisim_eposta_ayar is
  'Kurumsal e-posta kutusu. Yalnızca admin erişebilir. imza_metin, gönderenin ad soyad, müdürlük ve unvanının altında durur.';

insert into public.iletisim_eposta_ayar (id)
values (1)
on conflict (id) do nothing;

alter table public.iletisim_eposta_ayar enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'iletisim_eposta_ayar'
      and policyname = 'iletisim_eposta_ayar_admin_all'
  ) then
    create policy iletisim_eposta_ayar_admin_all
    on public.iletisim_eposta_ayar
    for all
    to authenticated
    using (public.is_admin_like(auth.uid()))
    with check (public.is_admin_like(auth.uid()));
  end if;
end
$$;
