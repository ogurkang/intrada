alter table public.tanim_unvan
  add column if not exists destek_yardimci_birim boolean not null default false;

comment on column public.tanim_unvan.destek_yardimci_birim is
  '2006/10344 I sayılı cetvel B dipnot 3 hariç tutulan destek/yardımcı hizmet birimi müdür unvanı. İşaretliyse TH kariyerli müdüre +1300 yan ödeme uygulanmaz.';
