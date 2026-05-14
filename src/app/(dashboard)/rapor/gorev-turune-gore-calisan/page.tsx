import { createClient } from '@/lib/supabase/server'
import GorevTuruneGoreCalisanClient from '@/components/rapor/GorevTuruneGoreCalisanClient'
import type { GorevTuruSatir } from '@/components/rapor/GorevTuruneGoreCalisanClient'
import {
  kadroBaslangic,
  kadroSatirAktifMi,
  type KadroRaporRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'

const HEDEF_TURLER = ['Geçici Görevlendirme', 'Kurum Görevlendirme']

function suresiGunHesapla(baslangic: string | null, bitis: string | null): number {
  if (!baslangic) return 0
  const s = new Date(baslangic)
  const b = bitis ? new Date(bitis) : new Date()
  if (isNaN(s.getTime()) || isNaN(b.getTime())) return 0
  const fark = Math.round((b.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, fark)
}

function formatTarih(s: string | null | undefined): string {
  if (!s) return '—'
  const d = String(s).slice(0, 10)
  const [y, m, g] = d.split('-')
  if (!y || !m || !g) return d
  return `${g}.${m}.${y}`
}

export default async function GorevTuruneGoreCalisanPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const [{ data: calisanRaw }, { data: kadroRaw }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('calisan')
      .select('sicil_no, ad_soyad, gorev_turu, gorev_turu_tarihi, gorev_turu_bitis_tarihi, gorev_turu_aciklama')
      .in('gorev_turu', HEDEF_TURLER),
    supabase
      .from('kadro_hareketleri')
      .select('asil, kadro_mudurlugu, gorev_mudurlugu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
      .not('asil', 'is', null),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calisanlar = (calisanRaw ?? []) as any[]

  // Müdürlük haritası
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
      if (latest) mudurlukBySicil.set(sicil, String(latest.kadro_mudurlugu ?? latest.gorev_mudurlugu ?? '').trim())
      continue
    }
    const secilen = aktif.reduce((a, b) => (kadroBaslangic(a) >= kadroBaslangic(b) ? a : b))
    mudurlukBySicil.set(sicil, String(secilen.kadro_mudurlugu ?? secilen.gorev_mudurlugu ?? '').trim())
  }

  const satirlar: GorevTuruSatir[] = (calisanlar ?? []).map(c => {
    const sicil = String(c.sicil_no ?? '').trim()
    const bitisTarihi: string | null = c.gorev_turu_bitis_tarihi ?? null
    const sure = suresiGunHesapla(c.gorev_turu_tarihi ?? null, bitisTarihi)
    return {
      sicil_no:     sicil,
      ad_soyad:     c.ad_soyad ?? sicil,
      mudurluk:     mudurlukBySicil.get(sicil) ?? '',
      gorev_turu:   c.gorev_turu ?? '',
      aciklama:     c.gorev_turu_aciklama ?? '',
      baslangic:    formatTarih(c.gorev_turu_tarihi),
      bitis:        formatTarih(bitisTarihi),
      sure_gun:     sure,
    }
  })

  satirlar.sort((a, b) => a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true }))

  const tumMudurlukler = [...new Set(satirlar.map(r => r.mudurluk).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'tr'),
  )

  return (
    <GorevTuruneGoreCalisanClient
      satirlar={satirlar}
      tumMudurlukler={tumMudurlukler}
      raporBasePath="/rapor/gorev-turune-gore-calisan"
      excelBasePath="/api/rapor/gorev-turune-gore-calisan/excel"
    />
  )
}
