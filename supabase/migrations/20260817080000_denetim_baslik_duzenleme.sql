-- Denetim: belge yüklenmeden önce de başlığa sorumlu birim atanabilsin

alter table public.denetim_bolum_baslik
  add column if not exists sorumlu_birim text;

update public.denetim_bolum_baslik b
set sorumlu_birim = d.sorumlu_birim
from public.denetim_bolum_belge d
where d.baslik_id = b.id
  and b.sorumlu_birim is null
  and d.sorumlu_birim is not null;

notify pgrst, 'reload schema';
