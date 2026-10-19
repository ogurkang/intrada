-- SMS gönderimi İletimX gateway'ine geçer.
-- Kullanıcı adı ve bayi kodu gönderimde kullaniciadi-bayikodu olur.

alter table public.iletisim_sms_ayar
  add column if not exists bayi_kodu text null;

comment on column public.iletisim_sms_ayar.bayi_kodu is
  'İletimX bayi kodu. Gönderimde kullanıcı adının sonuna tire ile eklenir.';

update public.iletisim_sms_ayar
set api_base_url = 'http://g3.iletimx.com/?anabayi=1'
where api_base_url ilike '%mesajpaketi.com%'
   or api_base_url ilike 'http://g.iletimx.com%';
