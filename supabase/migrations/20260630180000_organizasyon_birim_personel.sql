-- Başkan Yardımcısı birimi belirli bir kişiye bağlanabilsin; çoklu yardımcı desteği.

alter table public.tanim_organizasyon_birim
  add column if not exists personel_sicil_no text null;

comment on column public.tanim_organizasyon_birim.personel_sicil_no is 'Makam birimine (özellikle başkan yardımcısı) atanan personelin sicil_no değeri.';

-- Eski tekil index'i kaldır: başkan yardımcısı artık çoklu olabilir.
drop index if exists public.uq_org_birim_ozel;

-- Bir organizasyonda en fazla bir Belediye Başkanı birimi olsun.
create unique index if not exists uq_org_baskan
  on public.tanim_organizasyon_birim (organizasyon_id)
  where birim_turu = 'baskan';

-- Aynı başkan yardımcısı kişisi aynı organizasyona iki kez eklenmesin.
create unique index if not exists uq_org_baskan_yrd_personel
  on public.tanim_organizasyon_birim (organizasyon_id, personel_sicil_no)
  where birim_turu = 'baskan_yardimcisi';
