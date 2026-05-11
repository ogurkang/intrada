import { createClient } from '@/lib/supabase/server'
import PersoneleGoreIzinListesiClient from '@/components/rapor/PersoneleGoreIzinListesiClient'
import {
  kadroBaslangic,
  kadroSatirAktifMi,
  type KadroRaporRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'

const MIN_YIL = 2000
const MAX_YIL = 2035

export default async function PersoneleGoreKullanilanIzinListesiPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>
}) {
  const sp = await searchParams
  const parsed = parseInt(sp.y ?? '', 10)
  const yil = Number.isFinite(parsed) ? Math.min(MAX_YIL, Math.max(MIN_YIL, parsed)) : new Date().getFullYear()

  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const [{ data: kadroRaw }, { data: calisanRaw }, { data: izinRaw }] = await Promise.all([
    supabase
      .from('kadro_hareketleri')
      .select('asil, kadro_mudurlugu, gorev_mudurlugu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
      .not('asil', 'is', null),
    supabase.from('calisan').select('sicil_no, ad_soyad'),
    supabase
      .from('izin_hareketleri')
      .select('sicil_no, tur, ayrilis, baslama, gun, durum')
      .neq('durum', 'İptal Edildi')
      .gte('ayrilis', `${yil}-01-01`)
      .lte('ayrilis', `${yil}-12-31`),
  ])

  const byAsil = new Map<string, KadroRaporRow[]>()
  for (const r of kadroRaw ?? []) {
    const asil = String(r.asil ?? '').trim()
    if (!asil) continue
    const list = byAsil.get(asil) ?? []
    list.push(r as KadroRaporRow)
    byAsil.set(asil, list)
  }

  const mudurlukBySicil = new Map<string, string>()
  for (const [sicil, rows] of byAsil) {
    const aktif = rows.filter(r => kadroSatirAktifMi(r, today))
    if (aktif.length === 0) {
      const sorted = [...rows].sort((a, b) => kadroBaslangic(b).localeCompare(kadroBaslangic(a)))
      const latest = sorted[0]
      if (latest) {
        mudurlukBySicil.set(sicil, String(latest.kadro_mudurlugu ?? latest.gorev_mudurlugu ?? '').trim())
      }
      continue
    }
    const secilen = aktif.reduce((a, b) => (kadroBaslangic(a) >= kadroBaslangic(b) ? a : b))
    mudurlukBySicil.set(sicil, String(secilen.kadro_mudurlugu ?? secilen.gorev_mudurlugu ?? '').trim())
  }

  const calisanBySicil = new Map<string, { sicil_no: string; ad_soyad: string }>()
  for (const c of calisanRaw ?? []) {
    calisanBySicil.set(c.sicil_no, { sicil_no: c.sicil_no, ad_soyad: c.ad_soyad })
  }

  function formatTarih(s: string | null | undefined): string {
    if (!s) return ''
    const d = s.slice(0, 10)
    const [y, m, g] = d.split('-')
    if (!y || !m || !g) return d
    return `${g}.${m}.${y}`
  }

  interface PersoneleGoreIzinSatirRaw {
    sicil_no: string
    ad_soyad: string
    mudurluk: string
    kayit_bilgisi: string
    tur: string
    gun: number
  }

  const satirlar: PersoneleGoreIzinSatirRaw[] = []
  for (const iz of izinRaw ?? []) {
    const sicil = String(iz.sicil_no ?? '').trim()
    if (!sicil) continue
    const gun = Number(iz.gun ?? 0)
    if (!Number.isFinite(gun) || gun <= 0) continue
    const calisan = calisanBySicil.get(sicil)
    if (!calisan) continue
    const mudurluk = mudurlukBySicil.get(sicil) ?? ''
    const ayrilis = formatTarih(iz.ayrilis)
    const baslama = formatTarih(iz.baslama)
    const kayit_bilgisi = ayrilis && baslama ? `${ayrilis} – ${baslama}` : ayrilis || baslama || '—'
    satirlar.push({
      sicil_no: sicil,
      ad_soyad: calisan.ad_soyad,
      mudurluk,
      kayit_bilgisi,
      tur: String(iz.tur ?? '').trim(),
      gun,
    })
  }

  satirlar.sort((a, b) => {
    const sicilCmp = a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true })
    if (sicilCmp !== 0) return sicilCmp
    const ayrilisA = a.kayit_bilgisi.slice(0, 10).split('.').reverse().join('')
    const ayrilisB = b.kayit_bilgisi.slice(0, 10).split('.').reverse().join('')
    return ayrilisA.localeCompare(ayrilisB)
  })

  const tumMudurlukler = [...new Set(satirlar.map(r => r.mudurluk).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'tr'),
  )
  const tumTurler = [...new Set(satirlar.map(r => r.tur).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'))

  return (
    <PersoneleGoreIzinListesiClient
      yil={yil}
      minYil={MIN_YIL}
      maxYil={MAX_YIL}
      satirlar={satirlar}
      tumMudurlukler={tumMudurlukler}
      tumTurler={tumTurler}
      raporBasePath="/rapor/personele-gore-kullanilan-izin-listesi"
      excelBasePath="/api/rapor/personele-gore-kullanilan-izin-listesi/excel"
    />
  )
}
