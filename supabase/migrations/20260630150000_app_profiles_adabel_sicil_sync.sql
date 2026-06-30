-- ADABEL sicillerine 'A' öneki eklendiğinde (20260630130000), daha önce oluşturulmuş
-- app_profiles kayıtlarının sicil_no değeri eski (öneksiz) halinde kalmış olabilir.
-- Bu durumda kullanıcının "Personel Kartım" linki (/personel/{sicil}) ne calisan'da
-- ne de firma_calisanlar'da eşleşmediği için 404 döner.
--
-- Çözüm: ADABEL profillerinin sicil_no'sunu, e-posta eşleşmesi üzerinden güncel
-- (önekli) firma_calisanlar siciline eşitle. Kadro/belediye (calisan) profillerine dokunma.

update public.app_profiles ap
set sicil_no = sub.sicil_no,
    updated_at = now()
from (
  select distinct on (lower(btrim(f.e_posta)))
    lower(btrim(f.e_posta)) as email,
    f.sicil_no
  from public.firma_calisanlar f
  where f.e_posta is not null
    and btrim(f.e_posta) <> ''
    and f.sicil_no is not null
  order by lower(btrim(f.e_posta)), f.kayit_zamani desc
) sub
join auth.users u on lower(btrim(u.email::text)) = sub.email
where ap.id = u.id
  and ap.sicil_no is distinct from sub.sicil_no
  -- calisan'da karşılığı olan (kadro/belediye) profilleri koru:
  and not exists (select 1 from public.calisan c where c.sicil_no = ap.sicil_no);
