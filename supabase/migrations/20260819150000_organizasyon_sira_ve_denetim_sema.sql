-- Organizasyon birim sırası; Afet İşleri ve Risk Yönetimi Müdürlüğü aynı üst birim altında en alta alınır.
-- Denetim dönem menüsüne Organizasyon Şeması eklenir.

alter table public.tanim_organizasyon_birim
  add column if not exists sira_no integer not null default 0;

with sirali as (
  select
    b.id,
    row_number() over (
      partition by b.organizasyon_id, coalesce(b.ust_birim_id, 0)
      order by
        case b.birim_turu
          when 'baskan' then 0
          when 'baskan_yardimcisi' then 1
          else 2
        end,
        tm.mudurluk_adi nulls last,
        b.id
    ) as rn
  from public.tanim_organizasyon_birim b
  left join public.tanim_mudurluk tm on tm.id = b.mudurluk_id
)
update public.tanim_organizasyon_birim t
set sira_no = s.rn
from sirali s
where t.id = s.id;

update public.tanim_organizasyon_birim afet
set sira_no = (
  select coalesce(max(k.sira_no), 0) + 1
  from public.tanim_organizasyon_birim k
  where k.organizasyon_id = afet.organizasyon_id
    and k.ust_birim_id is not distinct from afet.ust_birim_id
    and k.id <> afet.id
)
from public.tanim_mudurluk tm
where tm.id = afet.mudurluk_id
  and lower(translate(tm.mudurluk_adi, 'İIıŞşĞğÜüÖöÇç', 'iiisggguuooocc'))
      like '%afet isleri ve risk yonetimi%';

insert into public.denetim_donem_menu
  (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
select
  d.id,
  null,
  'Organizasyon Şeması',
  'Aktif organizasyon yapısı ve müdür iletişim bilgileri.',
  'organizasyon-semasi',
  'hub',
  'organizasyon-semasi',
  'organizasyon',
  8
from public.denetim_donem d
where not exists (
  select 1
  from public.denetim_donem_menu m
  where m.donem_id = d.id
    and m.sistem_anahtari = 'organizasyon-semasi'
);

create or replace function public.denetim_donem_menu_seed(p_donem_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_karar bigint;
  v_mali bigint;
  v_perf bigint;
  v_ic bigint;
  v_ik bigint;
begin
  if exists (select 1 from public.denetim_donem_menu where donem_id = p_donem_id) then
    return;
  end if;

  insert into public.denetim_donem_menu
    (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
  values
    (p_donem_id, null, 'Karar Bilgileri', 'Encümen ve meclis kararları; aylık belge yükleme.',
     'karar-bilgileri', 'hub', 'karar-bilgileri', 'karar', 1)
  returning id into v_karar;

  insert into public.denetim_donem_menu
    (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
  values
    (p_donem_id, v_karar, 'Encümen Kararları', 'Aylık encümen karar belgeleri.',
     'encumen-kararlari', 'karar_ay', 'encumen-kararlari', 'encumen', 1),
    (p_donem_id, v_karar, 'Meclis Kararları', 'Aylık meclis karar belgeleri.',
     'meclis-kararlari', 'karar_ay', 'meclis-kararlari', 'meclis', 2);

  insert into public.denetim_donem_menu
    (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
  values
    (p_donem_id, null, 'Mali Bilgiler', 'Gelir tarifesi, kesin hesap ve bütçe.',
     'mali-bilgiler', 'hub', 'mali-bilgiler', 'mali', 2)
  returning id into v_mali;

  insert into public.denetim_donem_menu
    (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
  values
    (p_donem_id, v_mali, 'Gelir Tarifesi', 'Gelir tarifesi belgeleri.',
     'gelir-tarifesi', 'belge', 'gelir-tarifesi', 'gelir', 1),
    (p_donem_id, v_mali, 'Kesin Hesap', 'Kesin hesap belgeleri.',
     'kesin-hesap', 'belge', 'kesin-hesap', 'hesap', 2),
    (p_donem_id, v_mali, 'Bütçe', 'Bütçe belgeleri.',
     'butce', 'belge', 'butce', 'butce', 3);

  insert into public.denetim_donem_menu
    (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
  values
    (p_donem_id, null, 'Taşınmaz Bilgileri', 'Belediye taşınmazlarına ilişkin denetim bilgileri.',
     'tasinmaz-bilgileri', 'hub', 'tasinmaz-bilgileri', 'tasinmaz', 3);

  insert into public.denetim_donem_menu
    (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
  values
    (p_donem_id, null, 'Performans Bilgileri', 'Stratejik plan, performans programı ve faaliyet raporu.',
     'performans-bilgileri', 'hub', 'performans-bilgileri', 'performans', 4)
  returning id into v_perf;

  insert into public.denetim_donem_menu
    (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
  values
    (p_donem_id, v_perf, 'Stratejik Plan', 'Stratejik plan belgeleri.',
     'stratejik-plan', 'belge', 'stratejik-plan', 'stratejik', 1),
    (p_donem_id, v_perf, 'Performans Programı', 'Performans programı belgeleri.',
     'performans-programi', 'belge', 'performans-programi', 'program', 2),
    (p_donem_id, v_perf, 'Faaliyet Raporu', 'Faaliyet raporu belgeleri.',
     'faaliyet-raporu', 'belge', 'faaliyet-raporu', 'rapor', 3);

  insert into public.denetim_donem_menu
    (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
  values
    (p_donem_id, null, 'Yönetmelikler', 'Yönetmelik belgeleri.',
     'yonetmelikler', 'hub', 'yonetmelikler', 'yonetmelik', 5);

  insert into public.denetim_donem_menu
    (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
  values
    (p_donem_id, null, 'İç Kontrol Bilgileri', 'İKEP ve ek iç kontrol belge başlıkları.',
     'ic-kontrol-bilgileri', 'hub', 'ic-kontrol-bilgileri', 'ickontrol', 6)
  returning id into v_ic;

  insert into public.denetim_donem_menu
    (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
  values
    (p_donem_id, v_ic, 'İKEP', 'İç Kontrol Eylem Planı belgeleri.',
     'ikep', 'belge', 'ikep', 'ikep', 1);

  insert into public.denetim_donem_menu
    (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
  values
    (p_donem_id, null, 'İnsan Kaynakları Bilgileri', 'Sosyal denge, toplu iş sözleşmesi ve norm kadro.',
     'insan-kaynaklari-bilgileri', 'hub', 'insan-kaynaklari-bilgileri', 'insankaynaklari', 7)
  returning id into v_ik;

  insert into public.denetim_donem_menu
    (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
  values
    (p_donem_id, v_ik, 'Sosyal Denge', 'Sosyal denge sözleşmesi ve ilgili belgeler.',
     'sosyal-denge', 'belge', 'sosyal-denge', 'sosyaldenge', 1),
    (p_donem_id, v_ik, 'Toplu İş Sözleşmesi', 'Toplu iş sözleşmesi ve ilgili belgeler.',
     'toplu-is-sozlesmesi', 'belge', 'toplu-is-sozlesmesi', 'sozlesme', 2),
    (p_donem_id, v_ik, 'Norm Kadro', 'Norm kadro cetvelleri ve ilgili belgeler.',
     'norm-kadro', 'belge', 'norm-kadro', 'normkadro', 3);

  insert into public.denetim_donem_menu
    (donem_id, parent_id, baslik, aciklama, slug, sayfa_turu, sistem_anahtari, ikon, sira_no)
  values
    (p_donem_id, null, 'Organizasyon Şeması', 'Aktif organizasyon yapısı ve müdür iletişim bilgileri.',
     'organizasyon-semasi', 'hub', 'organizasyon-semasi', 'organizasyon', 8);
end;
$$;

notify pgrst, 'reload schema';
