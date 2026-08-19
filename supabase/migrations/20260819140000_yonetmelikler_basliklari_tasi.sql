-- 1) Yönetmelikler menüsü dönem kökünde hub kalsın (eski iç kontrol parent_id kalıntısı).
update public.denetim_donem_menu y
set parent_id = null,
    sayfa_turu = 'hub',
    updated_at = now()
where y.sistem_anahtari = 'yonetmelikler'
  and (y.parent_id is not null or y.sayfa_turu is distinct from 'hub');

-- 2) Yönetmelikler hub'ındaki (ve ic_kontrol/yonetmelikler etiketli) başlıkları
--    "Görev ve Çalışma Yönetmelikleri" alt menüsüne taşı; bolum=ic_kontrol etiketini kaldır.
update public.denetim_bolum_baslik b
set
  menu_id = t.hedef_id,
  bolum = null,
  alt_bolum = t.hedef_baslik,
  updated_at = now()
from (
  select
    y.donem_id,
    y.id as hub_id,
    c.id as hedef_id,
    c.baslik as hedef_baslik
  from public.denetim_donem_menu y
  join public.denetim_donem_menu c
    on c.parent_id = y.id
   and c.donem_id = y.donem_id
  where y.sistem_anahtari = 'yonetmelikler'
    and translate(
          lower(btrim(c.baslik)),
          'şşığıöüçŞŞIĞİÖÜÇ',
          'ssigioucSSIGIOUC'
        ) = 'gorev ve calisma yonetmelikleri'
) t
where b.donem_id = t.donem_id
  and (
    b.menu_id = t.hub_id
    or (
      coalesce(b.bolum, '') = 'ic_kontrol'
      and lower(btrim(coalesce(b.alt_bolum, ''))) = 'yonetmelikler'
    )
  );

notify pgrst, 'reload schema';
