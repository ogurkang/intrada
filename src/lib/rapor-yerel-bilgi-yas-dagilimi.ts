import {
  kadroBaslangic,
  kadroSatirAktifMi,
  type CalisanRaporRow,
  type FirmaRaporRow,
  type KadroRaporRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import type { StatuMatrisSatir } from '@/lib/rapor-statuye-gore-ogrenim-meslek'
import { yasCariYildan } from '@/lib/rapor-statuye-gore-yas'

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

export const YEREL_YAS_KOLONLARI = ['18-25', '26-35', '36-45', '46-55', '56-65', '65+'] as const

function yasEtiketi(yas: number | null): (typeof YEREL_YAS_KOLONLARI)[number] | null {
  if (yas === null || !Number.isFinite(yas)) return null
  if (yas >= 18 && yas <= 25) return '18-25'
  if (yas >= 26 && yas <= 35) return '26-35'
  if (yas >= 36 && yas <= 45) return '36-45'
  if (yas >= 46 && yas <= 55) return '46-55'
  if (yas >= 56 && yas <= 65) return '56-65'
  if (yas > 65) return '65+'
  return null
}

export function yerelBilgiYasDagilimiSnapshot(input: {
  D: string
  kadro: KadroRaporRow[]
  firma: FirmaRaporRow[]
  calisanBySicil: Map<string, CalisanRaporRow>
}): { kolonlar: string[]; satirlar: StatuMatrisSatir[] } {
  const { D, kadro, firma, calisanBySicil } = input
  const kolonlar = [...YEREL_YAS_KOLONLARI]
  const sayilar = new Array(kolonlar.length).fill(0)
  const colIx = (label: string) => kolonlar.indexOf(label)

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
    if (!secilen) continue
    const dogum = calisanBySicil.get(sicil)?.dogum_tarihi ?? null
    const etik = yasEtiketi(yasCariYildan(D, dogum))
    if (!etik) continue
    const i = colIx(etik)
    if (i >= 0) sayilar[i] += 1
  }

  for (const f of firma) {
    if (!firmaAktifGun(f, D)) continue
    const etik = yasEtiketi(yasCariYildan(D, f.dogum_tarihi ?? null))
    if (!etik) continue
    const i = colIx(etik)
    if (i >= 0) sayilar[i] += 1
  }

  return {
    kolonlar,
    satirlar: [{ statuEtiket: 'Toplam', sayilar }],
  }
}
