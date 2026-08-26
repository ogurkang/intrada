import { fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EgitimDetayClient, {
  type DonemBilgi, type EgitimKaydi, type PersonelSatir,
} from '@/components/egitim/EgitimDetayClient'
import { egitimEkle, egitimGuncelle, egitimSil, katilimciKaydet } from './actions'

interface Props {
  params: Promise<{ donem_id: string }>
}

export default async function EgitimDetayPage({ params }: Props) {
  const { donem_id: didStr } = await params
  const donem_id = parseInt(didStr, 10)
  if (isNaN(donem_id)) notFound()

  const supabase = await createClient()

  const [
    { data: donemRow },
    { data: egitimRaw },
    { data: katilimRaw },
    { data: kadroRaw },
    { data: calisanRaw },
  ] = await Promise.all([
    supabase.from('egitim_takvimi_donem').select('*').eq('id', donem_id).single(),
    supabase.from('egitim_takvimi_egitim').select('*').eq('donem_id', donem_id).order('egitim_baslangic'),
    supabase.from('egitim_istatistik_katilim').select('egitim_id, sicil_no').eq('donem_id', donem_id),
    fetchAllKadroHareketleri(supabase, 'asil, gorev_mudurlugu, kadro_mudurlugu', q => q.is('ayrilis_tarihi', null).not('asil', 'is', null)),
    supabase.from('calisan').select('sicil_no, ad_soyad'),
  ])

  if (!donemRow) notFound()

  const donem: DonemBilgi = {
    id:               donemRow.id,
    yil:              donemRow.yil,
    donem_adi:        donemRow.donem_adi,
    baslangic_tarihi: donemRow.baslangic_tarihi,
    bitis_tarihi:     donemRow.bitis_tarihi,
    durum:            donemRow.durum,
  }

  const egitimler: EgitimKaydi[] = (egitimRaw ?? []).map(e => ({
    id:               e.id,
    donem_id:         e.donem_id,
    egitim_adi:       e.egitim_adi,
    kanal:            e.kanal,
    kisa_ad:          e.kisa_ad,
    egitim_baslangic: e.egitim_baslangic,
    egitim_bitis:     e.egitim_bitis,
    sure_dakika:      e.sure_dakika ?? 0,
    program:          (e.program === 'Evet' ? 'Program' : e.program === 'Hayır' ? 'Diğer' : (e.program ?? 'Diğer')) as 'Program' | 'Diğer',
    katilimci_sayisi: e.katilimci_sayisi ?? 0,
  }))

  // Katılım map: egitim_id → sicil_no[]
  const katilimMap: Record<number, string[]> = {}
  ;(katilimRaw ?? []).forEach(k => {
    if (!katilimMap[k.egitim_id]) katilimMap[k.egitim_id] = []
    katilimMap[k.egitim_id].push(k.sicil_no)
  })

  // Aktif personel listesi
  const adMap: Record<string, string> = {}
  ;(calisanRaw ?? []).forEach(c => { if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })

  const mudMap: Record<string, string> = {}
  ;(kadroRaw ?? []).forEach(k => { if (k.asil) mudMap[k.asil] = k.gorev_mudurlugu ?? k.kadro_mudurlugu ?? '' })

  const sicilSeti = new Set((kadroRaw ?? []).map(k => k.asil).filter(Boolean) as string[])

  const tumPersonel: PersonelSatir[] = Array.from(sicilSeti).map(s => ({
    sicil_no: s,
    ad_soyad: adMap[s] ?? null,
    mudurluk: mudMap[s] ?? null,
  })).sort((a, b) => (a.ad_soyad ?? '').localeCompare(b.ad_soyad ?? '', 'tr'))

  return (
    <EgitimDetayClient
      donem={donem}
      egitimler={egitimler}
      tumPersonel={tumPersonel}
      katilimMap={katilimMap}
      onEkle={egitimEkle}
      onGuncelle={egitimGuncelle}
      onSil={egitimSil}
      onKatilimKaydet={katilimciKaydet}
    />
  )
}
