/**
 * Statüye göre öğrenim durumu ve statüye göre meslek raporları —
 * anlık görüntü tarihi (D), kadro asıl + ADABEL Personeli.
 */

import {
  etiketAnahtari,
  kadroBaslangic,
  kadroSatirAktifMi,
  type CalisanRaporRow,
  type FirmaRaporRow,
  type KadroRaporRow,
  type TanimStatuRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import { FIRMA_STATU_ETIKET } from '@/lib/firma-statu-etiket'
import { ogrenimTuruSiraIndex } from '@/lib/ogrenim-sira'

function sliceD(s: string | null | undefined): string | null {
  if (!s) return null
  return String(s).slice(0, 10)
}

function firmaAktifGun(f: FirmaRaporRow, D: string): boolean {
  const bas = sliceD(f.kuruma_giris_tarihi) ?? '1900-01-01'
  const ay = sliceD(f.ayrilis_tarihi)
  if (bas > D) return false
  if (ay && ay <= D) return false
  return true
}

export interface CalisanOgrenimRaporSatir {
  sicil_no: string
  ogrenim_turu: string | null
  varsayilan: boolean
  aktif: boolean
  meslegi: string | null
}

/** Çalışanlar / öğrenim bildirimi ile uyumlu: önce varsayılan, yoksa aktif. */
export function pickVarsayilanOgrenimKaydi(rows: CalisanOgrenimRaporSatir[]): CalisanOgrenimRaporSatir | null {
  if (!rows.length) return null
  const v = rows.find(r => r.varsayilan)
  if (v) return v
  const a = rows.find(r => r.aktif)
  if (a) return a
  return null
}

/**
 * Statüye göre öğrenim raporu: **varsayılan** satırın düzeyi Lisans ise, aynı sicildeki **tüm** öğrenim
 * satırlarına bakılır (aktif/pasif ayrımı yok; YL/Doktora pasif kalmış olsa da sayılır). Lisans üstü en yüksek
 * düzey (Doktora > Yüksek Lisans) seçilir. Varsayılan yoksa veya Lisans değilse `pickVarsayilanOgrenimKaydi`.
 */
export function pickOgrenimKaydiStatuRaporu(
  rows: CalisanOgrenimRaporSatir[],
  tanimOgrenimIsimler: string[],
): CalisanOgrenimRaporSatir | null {
  if (!rows.length) return null

  const ogrenimSet = new Set(tanimOgrenimIsimler)

  const satirOgrenimIndeksi = (r: CalisanOgrenimRaporSatir): number => {
    const raw = r.ogrenim_turu
    const canon = raw ? etiketAnahtari(ogrenimSet, raw) : ''
    if (canon) return ogrenimTuruSiraIndex(canon)
    return ogrenimTuruSiraIndex(raw)
  }

  const varsayilanRow = rows.find(r => r.varsayilan)
  if (!varsayilanRow) {
    return pickVarsayilanOgrenimKaydi(rows)
  }

  const lisansIdx = ogrenimTuruSiraIndex('Lisans')
  const varsIdx = satirOgrenimIndeksi(varsayilanRow)
  if (varsIdx !== lisansIdx) {
    return pickVarsayilanOgrenimKaydi(rows)
  }

  let enIyi: CalisanOgrenimRaporSatir | null = null
  let enIyiIdx = -1
  for (const r of rows) {
    const ri = satirOgrenimIndeksi(r)
    if (ri > lisansIdx && ri > enIyiIdx) {
      enIyiIdx = ri
      enIyi = r
    }
  }

  return enIyi ?? varsayilanRow
}

export interface StatuMatrisSatir {
  statuEtiket: string
  sayilar: number[]
}

export interface OgrenimSnapshotResult {
  kolonlar: string[]
  satirlar: StatuMatrisSatir[]
  /** «Belirtilmemiş» sütununda sayılan kadro/ADABEL Personeli (ad soyad) */
  belirtilmemisListe: string[]
}

export interface MeslekSnapshotResult {
  kolonlar: string[]
  satirlar: StatuMatrisSatir[]
}

export function statuEtiketSirasi(tanimStatuler: TanimStatuRow[]): string[] {
  return [...tanimStatuler]
    .sort((a, b) => {
      const sa = a.sira_no ?? 9999
      const sb = b.sira_no ?? 9999
      if (sa !== sb) return sa - sb
      return (a.statu_adi || '').localeCompare(b.statu_adi || '', 'tr')
    })
    .map(t => t.statu_adi)
}

export function statuOgrenimSnapshot(input: {
  D: string
  tanimStatuler: TanimStatuRow[]
  /** Tanımlar > Öğrenim aktif isimleri (sıra listeye yansır) */
  tanimOgrenimIsimler: string[]
  kadro: KadroRaporRow[]
  firma: FirmaRaporRow[]
  ogrenimBySicil: Map<string, CalisanOgrenimRaporSatir[]>
  calisanBySicil: Map<string, CalisanRaporRow>
}): OgrenimSnapshotResult {
  const { D, tanimStatuler, tanimOgrenimIsimler, kadro, firma, ogrenimBySicil, calisanBySicil } = input

  const statuSirali = statuEtiketSirasi(tanimStatuler)
  const etiketler = new Set(statuSirali)
  const ogrenimSet = new Set(tanimOgrenimIsimler)
  const kolonlar = [...tanimOgrenimIsimler, 'Belirtilmemiş']
  const belIx = kolonlar.length - 1

  const bosSatir = (): number[] => new Array(kolonlar.length).fill(0)
  const say: Record<string, number[]> = {}
  for (const e of etiketler) say[e] = bosSatir()
  let diger = bosSatir()
  const firmaSatir = bosSatir()
  const belirtilmemisAdlar: string[] = []

  const idx = (label: string) => kolonlar.indexOf(label)

  const byAsil = new Map<string, KadroRaporRow[]>()
  for (const r of kadro) {
    if (!r.asil) continue
    const list = byAsil.get(r.asil) ?? []
    list.push(r)
    byAsil.set(r.asil, list)
  }

  for (const [sicil, rows] of byAsil) {
    const aktifRows = rows.filter(r => kadroSatirAktifMi(r, D))
    if (aktifRows.length === 0) continue
    const secilen = aktifRows.reduce((a, b) => (kadroBaslangic(a) >= kadroBaslangic(b) ? a : b))
    const stKey = etiketAnahtari(etiketler, secilen.statu)

    const ogrKayit = pickOgrenimKaydiStatuRaporu(ogrenimBySicil.get(sicil) ?? [], tanimOgrenimIsimler)
    const turRaw = ogrKayit?.ogrenim_turu ?? null
    const ogrenimEsles = turRaw ? etiketAnahtari(ogrenimSet, turRaw) : ''
    const ci = ogrenimEsles ? idx(ogrenimEsles) : belIx
    const hedef = stKey ? say[stKey] : diger
    if (ci >= 0) hedef[ci] += 1
    if (ci === belIx) {
      const ad = calisanBySicil.get(sicil)?.ad_soyad?.trim() || sicil
      belirtilmemisAdlar.push(ad)
    }
  }

  for (const f of firma) {
    if (!firmaAktifGun(f, D)) continue
    const turRaw = f.ogrenim ?? null
    const ogrenimEsles = turRaw ? etiketAnahtari(ogrenimSet, turRaw) : ''
    const ci = ogrenimEsles ? idx(ogrenimEsles) : belIx
    if (ci >= 0) firmaSatir[ci] += 1
    if (ci === belIx) {
      belirtilmemisAdlar.push(f.ad_soyad.trim() || `Firma #${f.id}`)
    }
  }

  const satirlar: StatuMatrisSatir[] = statuSirali.map(et => ({
    statuEtiket: et,
    sayilar: [...say[et]],
  }))

  if (diger.some(n => n > 0)) {
    satirlar.push({ statuEtiket: 'Tanımda olmayan statü', sayilar: diger })
  }

  satirlar.push({ statuEtiket: FIRMA_STATU_ETIKET, sayilar: firmaSatir })

  const belirtilmemisListe = [...new Set(belirtilmemisAdlar)].sort((a, b) => a.localeCompare(b, 'tr'))

  return { kolonlar, satirlar, belirtilmemisListe }
}

export function statuMeslekSnapshot(input: {
  D: string
  tanimStatuler: TanimStatuRow[]
  kadro: KadroRaporRow[]
  firma: FirmaRaporRow[]
  ogrenimBySicil: Map<string, CalisanOgrenimRaporSatir[]>
}): MeslekSnapshotResult {
  const { D, tanimStatuler, kadro, firma, ogrenimBySicil } = input

  const statuSirali = statuEtiketSirasi(tanimStatuler)
  const etiketler = new Set(statuSirali)
  /** Yatay eksen: tanımlı statüler + tanımsız kadro + firma sütunu */
  const kolonlar = [...statuSirali, 'Tanımda olmayan statü', FIRMA_STATU_ETIKET]
  const colIx = (label: string) => kolonlar.indexOf(label)

  const byAsil = new Map<string, KadroRaporRow[]>()
  for (const r of kadro) {
    if (!r.asil) continue
    const list = byAsil.get(r.asil) ?? []
    list.push(r)
    byAsil.set(r.asil, list)
  }

  /** tr küçük harf → ilk görülen gösterim metni */
  const meslekCanon = new Map<string, string>()

  for (const [sicil, rows] of byAsil) {
    const aktifRows = rows.filter(r => kadroSatirAktifMi(r, D))
    if (aktifRows.length === 0) continue
    const ogr = pickVarsayilanOgrenimKaydi(ogrenimBySicil.get(sicil) ?? [])
    const mTrim = String(ogr?.meslegi ?? '').trim()
    if (!mTrim) continue
    const low = mTrim.toLocaleLowerCase('tr-TR')
    if (!meslekCanon.has(low)) meslekCanon.set(low, mTrim)
  }

  for (const f of firma) {
    if (!firmaAktifGun(f, D)) continue
    const mTrim = String(f.meslegi ?? '').trim()
    if (!mTrim) continue
    const low = mTrim.toLocaleLowerCase('tr-TR')
    if (!meslekCanon.has(low)) meslekCanon.set(low, mTrim)
  }

  const meslekSatirlari = [...meslekCanon.values()].sort((a, b) => a.localeCompare(b, 'tr'))

  const bosSatir = (): number[] => new Array(kolonlar.length).fill(0)
  const say: Record<string, number[]> = {}
  for (const m of meslekSatirlari) say[m] = bosSatir()

  if (meslekSatirlari.length === 0) {
    return { kolonlar, satirlar: [] }
  }

  for (const [sicil, rows] of byAsil) {
    const aktifRows = rows.filter(r => kadroSatirAktifMi(r, D))
    if (aktifRows.length === 0) continue
    const secilen = aktifRows.reduce((a, b) => (kadroBaslangic(a) >= kadroBaslangic(b) ? a : b))
    const stKey = etiketAnahtari(etiketler, secilen.statu)
    const ogr = pickVarsayilanOgrenimKaydi(ogrenimBySicil.get(sicil) ?? [])
    const mTrim = String(ogr?.meslegi ?? '').trim()
    if (!mTrim) continue
    const low = mTrim.toLocaleLowerCase('tr-TR')
    const g = meslekCanon.get(low)
    if (g === undefined) continue
    const hedef = say[g]
    if (!hedef) continue
    const statuCol = stKey && etiketler.has(stKey) ? stKey : 'Tanımda olmayan statü'
    const ci = colIx(statuCol)
    if (ci >= 0) hedef[ci] += 1
  }

  for (const f of firma) {
    if (!firmaAktifGun(f, D)) continue
    const mTrim = String(f.meslegi ?? '').trim()
    if (!mTrim) continue
    const low = mTrim.toLocaleLowerCase('tr-TR')
    const g = meslekCanon.get(low)
    if (g === undefined) continue
    const hedef = say[g]
    if (!hedef) continue
    const ci = colIx(FIRMA_STATU_ETIKET)
    if (ci >= 0) hedef[ci] += 1
  }

  const satirlar: StatuMatrisSatir[] = meslekSatirlari.map(mes => ({
    statuEtiket: mes,
    sayilar: [...say[mes]],
  }))

  return { kolonlar, satirlar }
}
