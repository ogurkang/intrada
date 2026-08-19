-- Organizasyon Şeması ana alt menüsü kalkar; şema Harcama Yetkilileri sayfasında gösterilir.

delete from public.denetim_donem_menu
where sistem_anahtari = 'organizasyon-semasi'
   or slug = 'organizasyon-semasi';

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
end;
$$;
