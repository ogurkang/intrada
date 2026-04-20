/**
 * Statüye göre yaş dağılımı — yaş = anlık görüntü yılı − doğum yılı; aralıklar sabit sütunlar.
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
import { statuEtiketSirasi, type StatuMatrisSatir } from '@/lib/rapor-statuye-gore-ogrenim-meslek'

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

/** Sütun sırası (tabloda soldan sağa). */
export const YAS_DAGILIM_KOLONLARI = [
  '20–30',
  '31–40',
  '41–50',
  '51–60',
  '61–65',
  'Diğer',
  'Belirtilmemiş',
] as const

export type YasDagilimEtiket = (typeof YAS_DAGILIM_KOLONLARI)[number]

/** Anlık görüntü tarihinin yılı − doğum yılı. */
export function yasCariYildan(d: string, dogumTarihi: string | null | undefined): number | null {
  const yilD = parseInt(d.slice(0, 4), 10)
  if (!Number.isFinite(yilD)) return null
  if (dogumTarihi == null || String(dogumTarihi).trim() === '') return null
  const y = parseInt(String(dogumTarihi).trim().slice(0, 4), 10)
  if (!Number.isFinite(y)) return null
  return yilD - y
}

export function yasAralikEtiketi(yas: number | null): YasDagilimEtiket {
  if (yas === null) return 'Belirtilmemiş'
  if (yas < 20 || yas > 65) return 'Diğer'
  if (yas >= 20 && yas <= 30) return '20–30'
  if (yas >= 31 && yas <= 40) return '31–40'
  if (yas >= 41 && yas <= 50) return '41–50'
  if (yas >= 51 && yas <= 60) return '51–60'
  return '61–65'
}

export interface YasSnapshotResult {
  kolonlar: string[]
  satirlar: StatuMatrisSatir[]
}

export function statuYasSnapshot(input: {
  D: string
  tanimStatuler: TanimStatuRow[]
  kadro: KadroRaporRow[]
  firma: FirmaRaporRow[]
  calisanBySicil: Map<string, CalisanRaporRow>
}): YasSnapshotResult {
  const { D, tanimStatuler, kadro, firma, calisanBySicil } = input

  const statuSirali = statuEtiketSirasi(tanimStatuler)
  const etiketler = new Set(statuSirali)
  const kolonlar: string[] = [...YAS_DAGILIM_KOLONLARI]
  const colIx = (label: string) => kolonlar.indexOf(label)

  const bosSatir = (): number[] => new Array(kolonlar.length).fill(0)
  const say: Record<string, number[]> = {}
  for (const e of etiketler) say[e] = bosSatir()
  let diger = bosSatir()
  const firmaSatir = bosSatir()

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
    const dogum = calisanBySicil.get(sicil)?.dogum_tarihi ?? null
    const yas = yasCariYildan(D, dogum)
    const etik = yasAralikEtiketi(yas)
    const ci = colIx(etik)
    if (ci < 0) continue
    const hedef = stKey ? say[stKey] : diger
    hedef[ci] += 1
  }

  for (const f of firma) {
    if (!firmaAktifGun(f, D)) continue
    const yas = yasCariYildan(D, f.dogum_tarihi ?? null)
    const etik = yasAralikEtiketi(yas)
    const ci = colIx(etik)
    if (ci >= 0) firmaSatir[ci] += 1
  }

  const satirlar: StatuMatrisSatir[] = statuSirali.map(et => ({
    statuEtiket: et,
    sayilar: [...say[et]],
  }))

  if (diger.some(n => n > 0)) {
    satirlar.push({ statuEtiket: 'Tanımda olmayan statü', sayilar: diger })
  }

  satirlar.push({ statuEtiket: FIRMA_STATU_ETIKET, sayilar: firmaSatir })

  return { kolonlar, satirlar }
}
