import { createClient } from '@/lib/supabase/server'
import MaasOncesiIzinliMudurlerClient, {
  type MaasOncesiTabVerisi,
} from '@/components/rapor/MaasOncesiIzinliMudurlerClient'

const MIN_YIL = 2020
const MAX_YIL = 2035

const AY_TAM = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

function izinOrtusumu(ayrilis: string, baslama: string, yil: number, ay: number): boolean {
  const pad = String(ay).padStart(2, '0')
  return ayrilis <= `${yil}-${pad}-14` && baslama > `${yil}-${pad}-10`
}

export default async function MaasOncesiIzinliMudurlerPage({
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

  // Tüm aktif kadro kayıtları
  const { data: kadroRaw } = await supabase
    .from('kadro_hareketleri')
    .select('asil, vekil, kadro_unvani, gorev_unvani, ayrilis_tarihi')
    .is('ayrilis_tarihi', null)
    .not('asil', 'is', null)

  // Sicil → unvan haritası
  const sicilUnvanMap = new Map<string, string>()
  for (const k of kadroRaw ?? []) {
    if (k.asil) {
      const unvan = (k.gorev_unvani || k.kadro_unvani || '').trim()
      if (unvan) sicilUnvanMap.set(String(k.asil), unvan)
    }
  }

  // Müdür kadroları: unvanda 'müdürü' geçenler
  const mudurMap = new Map<string, { unvan: string; vekilSicil: string | null }>()
  for (const k of kadroRaw ?? []) {
    const sicil = String(k.asil ?? '').trim()
    if (!sicil) continue
    const ku = (k.kadro_unvani ?? '').toLocaleLowerCase('tr-TR')
    const gu = (k.gorev_unvani ?? '').toLocaleLowerCase('tr-TR')
    if (!ku.includes('müdürü') && !gu.includes('müdürü')) continue
    if (!mudurMap.has(sicil)) {
      mudurMap.set(sicil, {
        unvan: (k.gorev_unvani || k.kadro_unvani || '').trim(),
        vekilSicil: k.vekil ? String(k.vekil).trim() : null,
      })
    }
  }

  const mudurSicilList = [...mudurMap.keys()]

  // İzin kayıtları (seçili yıl — 10-14 aralığına isabet edenler için yeterli)
  let izinRaw: { sicil_no: string | null; tur: string | null; ayrilis: string | null; baslama: string | null; vekalet: string | null }[] = []
  if (mudurSicilList.length > 0) {
    const { data } = await supabase
      .from('izin_hareketleri')
      .select('sicil_no, tur, ayrilis, baslama, vekalet')
      .neq('durum', 'İptal Edildi')
      .in('sicil_no', mudurSicilList)
      .lte('ayrilis', `${yil}-12-31`)
      .gte('baslama', `${yil}-01-01`)
    izinRaw = data ?? []
  }

  // Çalışan adları (yalnızca müdürler — vekalet artık izin kaydındaki metin alanından geliyor)
  const adMap: Record<string, string> = {}
  if (mudurSicilList.length > 0) {
    const { data: calisanlar } = await supabase
      .from('calisan')
      .select('sicil_no, ad_soyad')
      .in('sicil_no', mudurSicilList)
    ;(calisanlar ?? []).forEach(c => {
      if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no
    })
  }

  // Her ay için satır hesapla
  function satirlariHesapla(ay: number) {
    const filtered = izinRaw.filter(i =>
      i.sicil_no && i.ayrilis && i.baslama &&
      izinOrtusumu(i.ayrilis!, i.baslama!, yil, ay)
    )
    return filtered
      .map(i => {
        const mudur = mudurMap.get(i.sicil_no!)
        if (!mudur) return null
        return {
          sicil_no:       i.sicil_no!,
          ad_soyad:       adMap[i.sicil_no!] ?? i.sicil_no!,
          unvan:          mudur.unvan,
          ayrilis:        i.ayrilis!,
          baslama:        i.baslama!,
          vekil_ad_soyad: (i.vekalet ?? '').trim() || '—',
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        const an = parseInt(a!.sicil_no, 10)
        const bn = parseInt(b!.sicil_no, 10)
        return isNaN(an) || isNaN(bn)
          ? a!.sicil_no.localeCompare(b!.sicil_no, 'tr')
          : an - bn
      }) as MaasOncesiTabVerisi['satirlar'][number][]
  }

  // Tab listesi: YILLIK + 12 ay
  const tabs: MaasOncesiTabVerisi[] = [
    // YILLIK: tüm ayları düz liste olarak (ay bilgisi de eklenir)
    {
      ay: 'yillik' as const,
      label: 'YILLIK',
      satirlar: Array.from({ length: 12 }, (_, i) => i + 1).flatMap(m =>
        satirlariHesapla(m).map(s => ({ ...s, _ay: m }))
      ),
    },
    ...Array.from({ length: 12 }, (_, i) => ({
      ay: i + 1,
      label: AY_TAM[i],
      satirlar: satirlariHesapla(i + 1),
    })),
  ]

  return (
    <MaasOncesiIzinliMudurlerClient
      yil={yil}
      minYil={MIN_YIL}
      maxYil={MAX_YIL}
      tabs={tabs}
    />
  )
}
