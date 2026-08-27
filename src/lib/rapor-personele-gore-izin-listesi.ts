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
  ayrilis: string
  baslama: string
  tur: string
  durum: string
  gun: number
  mudur: boolean
  unvan: string
}

export interface IzinHareketRaporRow {
  sicil_no: string | null
  tur: string | null
  ayrilis: string | null
  baslama: string | null
  gun: number | null
  durum: string | null
}

function unvandaMuduruVar(k: Pick<KadroRaporRow, 'kadro_unvani' | 'gorev_unvani'>): boolean {
  const ku = String(k.kadro_unvani ?? '').toLocaleLowerCase('tr-TR')
  const gu = String(k.gorev_unvani ?? '').toLocaleLowerCase('tr-TR')
  return ku.includes('müdürü') || gu.includes('müdürü')
}

function mudurUnvaniSec(k: Pick<KadroRaporRow, 'kadro_unvani' | 'gorev_unvani'>): string {
  const ku = String(k.kadro_unvani ?? '').trim()
  const gu = String(k.gorev_unvani ?? '').trim()
  const has = (s: string) => s.toLocaleLowerCase('tr-TR').includes('müdürü')
  if (gu && has(gu)) return gu
  if (ku && has(ku)) return ku
  return ''
}

function genelUnvan(k: Pick<KadroRaporRow, 'kadro_unvani' | 'gorev_unvani'>): string {
  return String(k.gorev_unvani ?? '').trim() || String(k.kadro_unvani ?? '').trim()
}

export function gruplaPersoneleGoreIzinSatirlari(satirlar: PersoneleGoreIzinSatir[]): {
  sira: number
  sicil_no: string
  ad_soyad: string
  unvan: string
  toplamGun: number
  kayitlar: PersoneleGoreIzinSatir[]
}[] {
  const sira: string[] = []
  const bySicil = new Map<string, PersoneleGoreIzinSatir[]>()
  for (const r of satirlar) {
    const list = bySicil.get(r.sicil_no)
    if (!list) {
      sira.push(r.sicil_no)
      bySicil.set(r.sicil_no, [r])
    } else {
      list.push(r)
    }
  }
  return sira.map((sicil, i) => {
    const kayitlar = bySicil.get(sicil) ?? []
    const ilk = kayitlar[0]
    return {
      sira: i + 1,
      sicil_no: sicil,
      ad_soyad: ilk?.ad_soyad ?? '',
      unvan: ilk?.unvan ?? '',
      toplamGun: kayitlar.reduce((s, x) => s + x.gun, 0),
      kayitlar,
    }
  })
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
  const kadroBySicil = new Map<string, KadroRaporRow>()
  for (const [sicil, rows] of byAsil) {
    const aktif = rows.filter(r => kadroSatirAktifMi(r, D))
    const secilen =
      aktif.length === 0
        ? [...rows].sort((a, b) => kadroBaslangic(b).localeCompare(kadroBaslangic(a)))[0]
        : aktif.reduce((a, b) => (kadroBaslangic(a) >= kadroBaslangic(b) ? a : b))
    if (!secilen) continue
    kadroBySicil.set(sicil, secilen)
    mudurlukBySicil.set(sicil, String(secilen.kadro_mudurlugu ?? secilen.gorev_mudurlugu ?? '').trim())
  }

  const mudurSiciller = new Set<string>()
  const unvanBySicil = new Map<string, string>()
  for (const r of kadro ?? []) {
    if (!unvandaMuduruVar(r)) continue
    const unvan = mudurUnvaniSec(r)
    const asil = String(r.asil ?? '').trim()
    const vekil = String(r.vekil ?? '').trim()
    if (asil) {
      mudurSiciller.add(asil)
      if (unvan && !unvanBySicil.has(asil)) unvanBySicil.set(asil, unvan)
    }
    if (vekil) {
      mudurSiciller.add(vekil)
      if (unvan) unvanBySicil.set(vekil, unvan)
      const mud = String(r.kadro_mudurlugu ?? r.gorev_mudurlugu ?? '').trim()
      if (mud && !mudurlukBySicil.has(vekil)) mudurlukBySicil.set(vekil, mud)
      if (!kadroBySicil.has(vekil)) kadroBySicil.set(vekil, r)
    }
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
    const ayrilis = formatTarih(iz.ayrilis) || '—'
    const baslama = formatTarih(iz.baslama) || '—'
    out.push({
      sicil_no: sicil,
      ad_soyad: calisan.ad_soyad,
      mudurluk,
      ayrilis,
      baslama,
      tur: String(iz.tur ?? '').trim(),
      durum: String(iz.durum ?? '').trim() || '—',
      gun,
      mudur: mudurSiciller.has(sicil),
      unvan: unvanBySicil.get(sicil) || (kadroBySicil.get(sicil) ? genelUnvan(kadroBySicil.get(sicil)!) : ''),
    })
  }

  out.sort((a, b) => {
    const sicilCmp = a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true })
    if (sicilCmp !== 0) return sicilCmp
    const ayrilisA = a.ayrilis.split('.').reverse().join('')
    const ayrilisB = b.ayrilis.split('.').reverse().join('')
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
      q = q.or('asil.not.is.null,vekil.not.is.null')
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
        'asil, vekil, kadro_mudurlugu, gorev_mudurlugu, kadro_unvani, gorev_unvani, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu',
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
