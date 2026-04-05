/**
 * Statüye göre sayı durumu — anlık görüntü tarihinde aktif kadro + firma toplamı (cinsiyet ayrımı yok).
 */

import {
  etiketAnahtari,
  kadroBaslangic,
  kadroSatirAktifMi,
  type FirmaRaporRow,
  type KadroRaporRow,
  type TanimStatuRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import { statuEtiketSirasi } from '@/lib/rapor-statuye-gore-ogrenim-meslek'

function sliceD(s: string | null | undefined): string | null {
  if (!s) return null
  return String(s).slice(0, 10)
}

function firmaAktifGun(f: { kuruma_giris_tarihi: string | null; ayrilis_tarihi: string | null }, D: string): boolean {
  const bas = sliceD(f.kuruma_giris_tarihi) ?? '1900-01-01'
  const ay = sliceD(f.ayrilis_tarihi)
  if (bas > D) return false
  if (ay && ay <= D) return false
  return true
}

export interface StatuSayiSatir {
  statuEtiket: string
  sayi: number
}

export function statuSayiSnapshot(input: {
  D: string
  tanimStatuler: TanimStatuRow[]
  kadro: KadroRaporRow[]
  firma: FirmaRaporRow[]
}): { satirlar: StatuSayiSatir[] } {
  const { D, tanimStatuler, kadro, firma } = input
  const statuSirali = statuEtiketSirasi(tanimStatuler)
  const etiketler = new Set(statuSirali)

  const say: Record<string, number> = {}
  for (const e of etiketler) say[e] = 0
  let diger = 0

  const byAsil = new Map<string, KadroRaporRow[]>()
  for (const r of kadro) {
    if (!r.asil) continue
    const list = byAsil.get(r.asil) ?? []
    list.push(r)
    byAsil.set(r.asil, list)
  }

  for (const [, rows] of byAsil) {
    const aktif = rows.filter(r => kadroSatirAktifMi(r, D))
    if (aktif.length === 0) continue
    const secilen = aktif.reduce((a, b) => (kadroBaslangic(a) >= kadroBaslangic(b) ? a : b))
    const key = etiketAnahtari(etiketler, secilen.statu)
    if (key) say[key] += 1
    else diger += 1
  }

  const satirlar: StatuSayiSatir[] = statuSirali.map(et => ({
    statuEtiket: et,
    sayi: say[et] ?? 0,
  }))

  if (diger > 0) {
    satirlar.push({ statuEtiket: 'Tanımda olmayan statü', sayi: diger })
  }

  let firmaN = 0
  for (const f of firma) {
    if (firmaAktifGun(f, D)) firmaN += 1
  }
  satirlar.push({ statuEtiket: 'Firma Personel', sayi: firmaN })

  return { satirlar }
}
