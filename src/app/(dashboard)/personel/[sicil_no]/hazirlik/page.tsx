import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PersonelHazirlikClient from '@/components/personel/PersonelHazirlikClient'
import { eslestirOgrenimId, kazancIcinOgrenimSec } from '@/lib/kazanc-ogrenim-sec'
import { sortTanimOgrenimByIsim } from '@/lib/ogrenim-sira'

export default async function PersonelHazirlikPage({
  params,
}: {
  params: Promise<{ sicil_no: string }>
}) {
  const { sicil_no: sicilParam } = await params
  const sicil_no = decodeURIComponent(sicilParam).trim()
  const supabase = await createClient()
  const [{ data: personel }, { data: ogrenimler }, { data: tanimOgrenim }, { data: unvanlar }] =
    await Promise.all([
      supabase
        .from('calisan')
        .select('sicil_no, public_id, ad_soyad, bilgisayar_kullaniyor, th_hizmet_baslangic, yuruttugu_unvan_id')
        .eq('sicil_no', sicil_no)
        .maybeSingle(),
      supabase
        .from('calisan_ogrenim')
        .select('ogrenim_turu, varsayilan, aktif, kayit_zamani')
        .eq('sicil_no', sicil_no),
      supabase.from('tanim_ogrenim').select('id, isim').eq('aktif', true),
      supabase.from('tanim_unvan').select('id, unvan_adi').eq('aktif', true).order('unvan_adi'),
    ])

  if (!personel) notFound()

  const tanimlar = sortTanimOgrenimByIsim(tanimOgrenim ?? [])
  const varsayilanSayisi = (ogrenimler ?? []).filter(o => o.varsayilan).length
  const kazancOgrenimi = kazancIcinOgrenimSec(ogrenimler ?? [])
  const eslesenOgrenimId = eslestirOgrenimId(kazancOgrenimi?.ogrenim_turu, tanimlar)
  const ogrenimTamam = varsayilanSayisi === 1 && eslesenOgrenimId != null
  const ogrenimAciklama =
    varsayilanSayisi === 0
      ? 'En az bir öğrenim kaydı ekleyin ve kazanca esas olanı Varsayılan seçin.'
      : varsayilanSayisi > 1
        ? 'Birden fazla Varsayılan öğrenim var. Yalnızca biri Varsayılan olmalıdır.'
        : eslesenOgrenimId == null
          ? 'Varsayılan öğrenim, aktif öğrenim tanımlarıyla eşleşmiyor.'
          : `Kazanca esas öğrenim: ${kazancOgrenimi?.ogrenim_turu ?? '—'}`

  return (
    <PersonelHazirlikClient
      personel={personel}
      unvanlar={unvanlar ?? []}
      ogrenimTamam={ogrenimTamam}
      ogrenimAciklama={ogrenimAciklama}
    />
  )
}
