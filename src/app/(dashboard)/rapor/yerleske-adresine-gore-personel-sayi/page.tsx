import { createClient } from '@/lib/supabase/server'
import YerleskeAdresineGorePersonelSayiClient, {
  type YerleskePersonelSayiTabVerisi,
} from '@/components/rapor/YerleskeAdresineGorePersonelSayiClient'
import {
  gelenlerAyrilanlar,
  periyotSonGunu,
  type CalisanRaporRow,
  type FirmaRaporRow,
  type KadroRaporRow,
  type PersonelHareketRaporRow,
  type RaporPeriyot,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import { hazirlaStatuSirali } from '@/lib/statu-liste-siralama'
import { fetchMudurlukYerleskeTanimSatirlari } from '@/lib/yerleske-adresi'
import { yerleskePersonelSayiSnapshot } from '@/lib/rapor-yerleske-adresine-gore-personel-sayi'

const AYLAR_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

function sonGunuMetin(D: string): string {
  const [y, m, d] = D.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const MIN_YIL = 2000
const MAX_YIL = 2035

const RAPOR_ACIKLAMA =
  'Müdürlük–yerleşke tanım satırlarında, seçili anlık görüntü tarihinde aktif personel sayıları. Belediye personeli: Memur, Sözleşmeli, İşçi, Geçici İşçi, Meclis Üyesi, Stajyer ve Belediye Başkanı (unvan). Kadro personelde yerleşke, Görev Bilgileri kaydı; atanmamışsa müdürlüğün ilk yerleşkesi. ADABEL personelde görev müdürlüğünün ilk yerleşkesi kullanılır.'

export default async function YerleskeAdresineGorePersonelSayiPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>
}) {
  const sp = await searchParams
  const parsed = parseInt(sp.y ?? '', 10)
  const yil = Number.isFinite(parsed)
    ? Math.min(MAX_YIL, Math.max(MIN_YIL, parsed))
    : new Date().getFullYear()

  const supabase = await createClient()

  const [
    { data: tanimStatuRaw },
    { data: kadroRaw },
    { data: calisanRaw },
    { data: firmaRaw },
    { data: phAyrRaw },
    { data: phIseRaw },
    tanimSatirlar,
  ] = await Promise.all([
    supabase.from('tanim_statu').select('statu_adi, sira_no').eq('aktif', true),
    supabase
      .from('kadro_hareketleri')
      .select(
        'asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, gorev_mudurlugu, kadro_mudurlugu, gorev_unvani',
      )
      .not('asil', 'is', null),
    supabase.from('calisan').select('sicil_no, ad_soyad, cinsiyet, yerleske_adresi_id'),
    supabase
      .from('firma_calisanlar')
      .select('id, ad_soyad, cinsiyet, kuruma_giris_tarihi, ayrilis_tarihi, gorev_mudurlugu'),
    supabase
      .from('personel_hareketleri')
      .select('sicil_no, ayrilis_tarihi, ise_baslama_tarihi')
      .not('ayrilis_tarihi', 'is', null)
      .gte('ayrilis_tarihi', `${yil}-01-01`)
      .lte('ayrilis_tarihi', `${yil}-12-31`),
    supabase
      .from('personel_hareketleri')
      .select('sicil_no, ayrilis_tarihi, ise_baslama_tarihi')
      .not('ise_baslama_tarihi', 'is', null)
      .gte('ise_baslama_tarihi', `${yil}-01-01`)
      .lte('ise_baslama_tarihi', `${yil}-12-31`),
    fetchMudurlukYerleskeTanimSatirlari(supabase),
  ])

  const phSeen = new Set<string>()
  const personelHareketleri: PersonelHareketRaporRow[] = []
  for (const r of [...(phAyrRaw ?? []), ...(phIseRaw ?? [])]) {
    const key = `${r.sicil_no}|${String(r.ayrilis_tarihi ?? '')}|${String(r.ise_baslama_tarihi ?? '')}`
    if (phSeen.has(key)) continue
    phSeen.add(key)
    personelHareketleri.push({
      sicil_no: r.sicil_no,
      ayrilis_tarihi: r.ayrilis_tarihi,
      ise_baslama_tarihi: r.ise_baslama_tarihi,
    })
  }

  const { etiketler } = hazirlaStatuSirali(tanimStatuRaw ?? [])
  const kadro: KadroRaporRow[] = (kadroRaw ?? []) as KadroRaporRow[]
  const firma: FirmaRaporRow[] = (firmaRaw ?? []) as FirmaRaporRow[]

  const calisanBySicil = new Map<string, CalisanRaporRow>()
  for (const c of calisanRaw ?? []) {
    calisanBySicil.set(c.sicil_no, {
      sicil_no: c.sicil_no,
      ad_soyad: c.ad_soyad,
      cinsiyet: c.cinsiyet,
    })
  }

  const calisanYerleske = (calisanRaw ?? []).map(c => ({
    sicil_no: c.sicil_no,
    yerleske_adresi_id: (c as { yerleske_adresi_id?: number | null }).yerleske_adresi_id ?? null,
  }))

  const periyotlar: RaporPeriyot[] = ['yillik', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

  const tabs: YerleskePersonelSayiTabVerisi[] = periyotlar.map(p => {
    const D = periyotSonGunu(yil, p)
    const snap = yerleskePersonelSayiSnapshot({
      D,
      tanimSatirlar,
      kadro,
      firma,
      calisanYerleske,
      etiketler,
    })
    const { gelenler, ayrilanlar } = gelenlerAyrilanlar({
      periyot: p,
      yil,
      kadro,
      calisanBySicil,
      firma,
      personelHareketleri,
    })
    const label = p === 'yillik' ? 'YILLIK' : AYLAR_TR[(p as number) - 1]
    return {
      periyot: p,
      label,
      sonGunuEtiket: sonGunuMetin(D),
      satirlar: snap.satirlar,
      gelenler,
      ayrilanlar,
    }
  })

  return (
    <YerleskeAdresineGorePersonelSayiClient
      yil={yil}
      minYil={MIN_YIL}
      maxYil={MAX_YIL}
      tabs={tabs}
      aciklama={RAPOR_ACIKLAMA}
    />
  )
}
