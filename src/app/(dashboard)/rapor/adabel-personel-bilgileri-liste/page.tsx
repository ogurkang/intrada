import { createClient } from '@/lib/supabase/server'
import AdabelPersonelBilgileriListeClient, {
  type AdabelPersonelBilgileriTabVerisi,
} from '@/components/rapor/AdabelPersonelBilgileriListeClient'
import { filterOutHiddenSystemByEmail } from '@/lib/godmode-calisan'
import { periyotSonGunu, type RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'
import { adabelPersonelBilgileriListeSnapshot } from '@/lib/rapor-adabel-personel-bilgileri-liste'

const AYLAR_TR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
]

function sonGunuMetin(D: string): string {
  const [y, m, d] = D.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const MIN_YIL = 2000
const MAX_YIL = 2035

export default async function AdabelPersonelBilgileriListePage({
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
  const { data: kayitlarRaw } = await supabase
    .from('firma_calisanlar')
    .select(
      'sicil_no, ad_soyad, tckn, cinsiyet, dogum_tarihi, ogrenim, telefon, e_posta, kuruma_giris_tarihi, gorev_mudurlugu, gorevi, ayrilis_tarihi',
    )

  const kayitlar = filterOutHiddenSystemByEmail(kayitlarRaw ?? [])

  const periyotlar: RaporPeriyot[] = ['yillik', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const tabs: AdabelPersonelBilgileriTabVerisi[] = periyotlar.map(p => {
    const D = periyotSonGunu(yil, p)
    const satirlar = adabelPersonelBilgileriListeSnapshot({ D, kayitlar })
    const label = p === 'yillik' ? 'YILLIK' : AYLAR_TR[(p as number) - 1]
    return {
      periyot: p,
      label,
      sonGunuEtiket: sonGunuMetin(D),
      satirlar,
    }
  })

  return (
    <AdabelPersonelBilgileriListeClient
      yil={yil}
      minYil={MIN_YIL}
      maxYil={MAX_YIL}
      tabs={tabs}
      raporBasePath="/rapor/adabel-personel-bilgileri-liste"
      excelBasePath="/api/rapor/adabel-personel-bilgileri-liste/excel"
    />
  )
}
