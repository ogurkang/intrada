-- Afet İşleri ve Risk Yönetimi Müdürlüğü: aynı üst birim altında en alta (esnek ad eşlemesi).
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
  and translate(lower(tm.mudurluk_adi), 'İIıŞşĞğÜüÖöÇç', 'iiisggguuooocc') like '%afet%'
  and translate(lower(tm.mudurluk_adi), 'İIıŞşĞğÜüÖöÇç', 'iiisggguuooocc') like '%risk%';
