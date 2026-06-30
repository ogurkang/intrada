-- Organizasyon birimlerine özel birim türleri: Belediye Başkanı / Başkan Yardımcısı
-- Müdürlük dışındaki birimlerde mudurluk_id boş kalır.

alter table public.tanim_organizasyon_birim
  alter column mudurluk_id drop not null;

alter table public.tanim_organizasyon_birim
  add column if not exists birim_turu text not null default 'mudurluk';

comment on column public.tanim_organizasyon_birim.birim_turu is 'Birim türü: mudurluk | baskan | baskan_yardimcisi';

-- Tür ile mudurluk_id tutarlılığı
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chk_org_birim_turu') then
    alter table public.tanim_organizasyon_birim
      add constraint chk_org_birim_turu check (
        (birim_turu = 'mudurluk' and mudurluk_id is not null)
        or (birim_turu in ('baskan', 'baskan_yardimcisi') and mudurluk_id is null)
      );
  end if;
end
$$;

-- Bir organizasyonda en fazla bir "Belediye Başkanı" ve bir "Başkan Yardımcısı" birimi olsun.
create unique index if not exists uq_org_birim_ozel
  on public.tanim_organizasyon_birim (organizasyon_id, birim_turu)
  where mudurluk_id is null;
