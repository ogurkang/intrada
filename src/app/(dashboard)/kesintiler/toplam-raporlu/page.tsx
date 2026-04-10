import { createClient } from '@/lib/supabase/server'
import ToplamRaporluMemurlarClient, { type ToplamRaporluSatir } from '@/components/kesintiler/ToplamRaporluMemurlarClient'
import { getCariYilAraligi } from '@/lib/tarih'

/** Zabıta Müdürlüğü adı */
const ZABITA_MUDURLUGU = 'Zabıta Müdürlüğü'

export default async function ToplamRaporluMemurlarPage() {
  const supabase = await createClient()
  const cariYil = getCariYilAraligi()
  const { yil, baslangic: yilBas, bitis: yilSon } = cariYil
  const yilBasMs = yilBas.getTime()
  const yilSonMs = yilSon.getTime()

  // 1. Zabıta Müdürlüğü'nde aktif personel (kadro_hareketleri: ayrılış boş, gorev/kadro müdürlüğü = Zabıta)
  const { data: kadroRaw } = await supabase
    .from('kadro_hareketleri')
    .select('asil, vekil, gorev_mudurlugu, kadro_mudurlugu, ayrilis_tarihi')
    .is('ayrilis_tarihi', null)

  const zabitaSiciller = new Set<string>()
  for (const k of kadroRaw ?? []) {
    const mud = (k.gorev_mudurlugu ?? k.kadro_mudurlugu ?? '').trim()
    if (mud !== ZABITA_MUDURLUGU) continue
    const sicil = (k.asil ?? k.vekil ?? '').trim()
    if (sicil) zabitaSiciller.add(sicil)
  }

  if (zabitaSiciller.size === 0) {
    return (
      <ToplamRaporluMemurlarClient
        yil={yil}
        baslangicStr={cariYil.baslangicStr}
        bitisStr={cariYil.bitisStr}
        satirlar={[]}
      />
    )
  }

  // 2. İzin hareketleri: Rapor + Heyet Raporu, İptal Edildi hariç
  const { data: izinRaw } = await supabase
    .from('izin_hareketleri')
    .select('sicil_no, tur, ayrilis, baslama, gun')
    .in('sicil_no', Array.from(zabitaSiciller))
    .neq('durum', 'İptal Edildi')
    .in('tur', ['Rapor', 'Heyet Raporu'])

  // 3. Cari yıl içindeki rapor/heyet günlerini hesapla (takvim günü, Başlama günü hariç - GAS mantığı)
  const raporGunBySicil: Record<string, number> = {}
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  for (const iz of izinRaw ?? []) {
    const ayrilisDate = iz.ayrilis ? new Date(iz.ayrilis) : null
    const baslamaDate = iz.baslama ? new Date(iz.baslama) : null
    if (!ayrilisDate || !baslamaDate || isNaN(ayrilisDate.getTime()) || isNaN(baslamaDate.getTime())) continue
    ayrilisDate.setHours(0, 0, 0, 0)
    baslamaDate.setHours(0, 0, 0, 0)
    const leaveStartMs = ayrilisDate.getTime()
    const leaveEndExMs = baslamaDate.getTime() // baslama = işe dönüş, son izin günü = baslama-1
    const lastDayOfLeave = new Date(leaveEndExMs - MS_PER_DAY)
    lastDayOfLeave.setHours(0, 0, 0, 0)
    const s = Math.max(leaveStartMs, yilBasMs)
    const e = Math.min(lastDayOfLeave.getTime(), yilSonMs)
    if (e < s) continue
    let gun = Math.floor((e - s) / MS_PER_DAY) + 1
    if (iz.gun && iz.gun > 0) gun = Math.min(gun, iz.gun)
    raporGunBySicil[iz.sicil_no] = (raporGunBySicil[iz.sicil_no] ?? 0) + Math.max(0, gun)
  }

  // 4. En az 1 gün rapor/heyet alanları filtrele, azalan sırala
  const sicillerWithRapor = Array.from(zabitaSiciller).filter(s => (raporGunBySicil[s] ?? 0) >= 1)
  sicillerWithRapor.sort((a, b) => (raporGunBySicil[b] ?? 0) - (raporGunBySicil[a] ?? 0))

  // 5. Ad soyad al
  const { data: calisanRaw } = await supabase
    .from('calisan')
    .select('sicil_no, ad_soyad')
    .in('sicil_no', sicillerWithRapor)

  const adMap: Record<string, string> = {}
  for (const c of calisanRaw ?? []) {
    if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no
  }

  const satirlar: ToplamRaporluSatir[] = sicillerWithRapor.map((sicil, i) => ({
    siraNo: i + 1,
    sicil_no: sicil,
    ad_soyad: adMap[sicil] ?? sicil,
    rapor_gun: raporGunBySicil[sicil] ?? 0,
  }))

  return (
    <ToplamRaporluMemurlarClient
      yil={yil}
      baslangicStr={cariYil.baslangicStr}
      bitisStr={cariYil.bitisStr}
      satirlar={satirlar}
    />
  )
}
