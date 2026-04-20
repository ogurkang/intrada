import {
  kadroSatirAktifMi,
  type CalisanRaporRow,
  type FirmaRaporRow,
  type KadroRaporRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import {
  pickVarsayilanOgrenimKaydi,
  type CalisanOgrenimRaporSatir,
} from '@/lib/rapor-statuye-gore-ogrenim-meslek'

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

export interface MeslekSahibiListeSatir {
  sicil_no: string
  ad_soyad: string
  meslek_adi: string
}

function sicilKarsilastir(a: string, b: string): number {
  const ta = a.trim()
  const tb = b.trim()
  const na = parseInt(ta, 10)
  const nb = parseInt(tb, 10)
  if (Number.isFinite(na) && Number.isFinite(nb) && String(na) === ta && String(nb) === tb) return na - nb
  return ta.localeCompare(tb, 'tr', { numeric: true })
}

/** Önce meslek adı alfabetik (tr); aynı meslekte sicil küçükten büyüğe. */
export function meslekSahibiListeSirala(rows: MeslekSahibiListeSatir[]): MeslekSahibiListeSatir[] {
  return [...rows].sort((a, b) => {
    const cm = a.meslek_adi.localeCompare(b.meslek_adi, 'tr')
    if (cm !== 0) return cm
    return sicilKarsilastir(a.sicil_no, b.sicil_no)
  })
}

/** Anlık görüntü: meslek alanı dolu kadro (varsayılan öğrenim) + ADABEL Personeli. */
export function meslekSahibiListeSnapshot(input: {
  D: string
  kadro: KadroRaporRow[]
  calisanBySicil: Map<string, CalisanRaporRow>
  firma: FirmaRaporRow[]
  ogrenimBySicil: Map<string, CalisanOgrenimRaporSatir[]>
}): MeslekSahibiListeSatir[] {
  const { D, kadro, calisanBySicil, firma, ogrenimBySicil } = input
  const out: MeslekSahibiListeSatir[] = []

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
    const ogr = pickVarsayilanOgrenimKaydi(ogrenimBySicil.get(sicil) ?? [])
    const mTrim = String(ogr?.meslegi ?? '').trim()
    if (!mTrim) continue
    const ad = calisanBySicil.get(sicil)?.ad_soyad?.trim() || sicil
    out.push({ sicil_no: sicil, ad_soyad: ad, meslek_adi: mTrim })
  }

  for (const f of firma) {
    if (!firmaAktifGun(f, D)) continue
    const mTrim = String(f.meslegi ?? '').trim()
    if (!mTrim) continue
    const sicil = (f.sicil_no ?? '').trim() || '—'
    const ad = f.ad_soyad.trim() || `Firma #${f.id}`
    out.push({ sicil_no: sicil, ad_soyad: ad, meslek_adi: mTrim })
  }

  return meslekSahibiListeSirala(out)
}
