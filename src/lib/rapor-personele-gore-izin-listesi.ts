import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { fetchAllIzinHareketleriForKullanilanRapor } from '@/lib/izin-hareketleri-load'
import {
  kadroBaslangic,
  kadroSatirAktifMi,
  type KadroRaporRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'

export interface PersoneleGoreIzinSatir {
  sicil_no: string
  ad_soyad: string
  mudurluk: string
  kayit_bilgisi: string
  tur: string
  gun: number
}

export interface IzinHareketRaporRow {
  sicil_no: string | null
  tur: string | null
  ayrilis: string | null
  baslama: string | null
  gun: number | null
  durum: string | null
}

function formatTarih(s: string | null | undefined): string {
  if (!s) return ''
  const d = s.slice(0, 10)
  const [y, m, g] = d.split('-')
  if (!y || !m || !g) return d
  return `${g}.${m}.${y}`
}

export function buildPersoneleGoreIzinListesi(input: {
  D: string
  kadro: KadroRaporRow[]
  calisanBySicil: Map<string, { sicil_no: string; ad_soyad: string }>
  izinRows: IzinHareketRaporRow[]
}): PersoneleGoreIzinSatir[] {
  const { D, kadro, calisanBySicil, izinRows } = input

  const byAsil = new Map<string, KadroRaporRow[]>()
  for (const r of kadro ?? []) {
    const asil = String(r.asil ?? '').trim()
    if (!asil) continue
    const list = byAsil.get(asil) ?? []
    list.push(r)
    byAsil.set(asil, list)
  }

  const mudurlukBySicil = new Map<string, string>()
  for (const [sicil, rows] of byAsil) {
    const aktif = rows.filter(r => kadroSatirAktifMi(r, D))
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

  const out: PersoneleGoreIzinSatir[] = []
  for (const iz of izinRows ?? []) {
    const sicil = String(iz.sicil_no ?? '').trim()
    if (!sicil) continue
    if (iz.durum === 'İptal Edildi') continue
    const gun = Number(iz.gun ?? 0)
    if (!Number.isFinite(gun) || gun <= 0) continue
    const calisan = calisanBySicil.get(sicil)
    if (!calisan) continue
    const mudurluk = mudurlukBySicil.get(sicil) ?? ''
    const ayrilis = formatTarih(iz.ayrilis)
    const baslama = formatTarih(iz.baslama)
    const kayit_bilgisi = ayrilis && baslama ? `${ayrilis} – ${baslama}` : ayrilis || baslama || '—'
    out.push({
      sicil_no: sicil,
      ad_soyad: calisan.ad_soyad,
      mudurluk,
      kayit_bilgisi,
      tur: String(iz.tur ?? '').trim(),
      gun,
    })
  }

  out.sort((a, b) => {
    const sicilCmp = a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true })
    if (sicilCmp !== 0) return sicilCmp
    const ayrilisA = a.kayit_bilgisi.slice(0, 10).split('.').reverse().join('')
    const ayrilisB = b.kayit_bilgisi.slice(0, 10).split('.').reverse().join('')
    return ayrilisA.localeCompare(ayrilisB)
  })

  return out
}

const SAYFA = 1000

async function fetchAllSelect<T>(
  supabase: SupabaseClient<Database>,
  table: 'kadro_hareketleri' | 'calisan',
  select: string,
): Promise<T[]> {
  let from = 0
  const all: T[] = []
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + SAYFA - 1)
    if (table === 'kadro_hareketleri') {
      q = q.not('asil', 'is', null)
    }
    const { data, error } = await q
    if (error) throw new Error(error.message)
    if (!data?.length) break
    all.push(...(data as T[]))
    if (data.length < SAYFA) break
    from += SAYFA
  }
  return all
}

export async function yuklePersoneleGoreKullanilanIzinListesi(
  supabase: SupabaseClient<Database>,
  yil: number,
): Promise<{ satirlar: PersoneleGoreIzinSatir[]; hata?: string }> {
  try {
    const [kadro, calisanRaw, izinRes] = await Promise.all([
      fetchAllSelect<KadroRaporRow>(
        supabase,
        'kadro_hareketleri',
        'asil, kadro_mudurlugu, gorev_mudurlugu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu',
      ),
      fetchAllSelect<{ sicil_no: string; ad_soyad: string }>(supabase, 'calisan', 'sicil_no, ad_soyad'),
      fetchAllIzinHareketleriForKullanilanRapor(supabase, yil),
    ])
    if (izinRes.error) return { satirlar: [], hata: izinRes.error }

    const calisanBySicil = new Map<string, { sicil_no: string; ad_soyad: string }>()
    for (const c of calisanRaw) calisanBySicil.set(c.sicil_no, c)

    const today = new Date().toISOString().slice(0, 10)
    const satirlar = buildPersoneleGoreIzinListesi({
      D: today,
      kadro,
      calisanBySicil,
      izinRows: izinRes.data,
    })
    return { satirlar }
  } catch (err) {
    return { satirlar: [], hata: err instanceof Error ? err.message : 'Rapor yüklenemedi.' }
  }
}
