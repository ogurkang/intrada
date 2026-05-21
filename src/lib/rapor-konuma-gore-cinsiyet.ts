/**
 * Müdürlük konumuna (İç / Dış) göre cinsiyet — yerleşke eşlemesindeki konum ile eşleştirme.
 */

import type {
  FirmaRaporRow,
  KadroRaporRow,
  StatuCinsiyetSatir,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import { kadroBaslangic, kadroSatirAktifMi } from '@/lib/rapor-statuye-gore-cinsiyet'
import type { PersonelKonumCtx } from '@/lib/personel-gorev-konum'
import { personelKonumTipi } from '@/lib/personel-gorev-konum'
import {
  mudurlukKonumHaritasi,
  type MudurlukKonumTanimRow,
} from '@/lib/mudurluk-konum'
import { etkinYerleskeId } from '@/lib/yerleske-adresi'

export { mudurlukKonumHaritasi }

export interface CalisanKonumRaporRow {
  sicil_no: string
  ad_soyad: string
  cinsiyet: string | null
  gorev_yeri?: string | null
  yerleske_adresi_id?: number | null
}

function personelMudurlukKadro(k: KadroRaporRow): string {
  const g = String(k.gorev_mudurlugu ?? '').trim()
  const kd = String(k.kadro_mudurlugu ?? '').trim()
  return g || kd
}

function personelMudurlukFirma(f: FirmaRaporRow): string {
  return String(f.gorev_mudurlugu ?? '').trim()
}

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

export interface KonumSnapshotInput {
  D: string
  konumCtx: PersonelKonumCtx
  kadro: KadroRaporRow[]
  calisanBySicil: Map<string, CalisanKonumRaporRow>
  firma: FirmaRaporRow[]
}

function cinsiyetKolon(c: string | null | undefined): 'Kadın' | 'Erkek' | null {
  const v = String(c ?? '').trim()
  if (v === 'Kadın' || v === 'Kız') return 'Kadın'
  if (v === 'Erkek') return 'Erkek'
  return null
}

/**
 * Kadro + firma: şirket tanımı, yerleşke ataması veya müdürlük eşlemesinden konum (İç/Dış).
 */
export function konumCinsiyetSnapshot(input: KonumSnapshotInput): {
  satirlar: StatuCinsiyetSatir[]
  konumAtanmamisListe: string[]
} {
  const { D, konumCtx, kadro, calisanBySicil, firma } = input

  let icK = 0
  let icE = 0
  let disK = 0
  let disE = 0
  let belK = 0
  let belE = 0
  const belDetay: string[] = []

  const byAsil = new Map<string, KadroRaporRow[]>()
  for (const r of kadro) {
    if (!r.asil) continue
    const list = byAsil.get(r.asil) ?? []
    list.push(r)
    byAsil.set(r.asil, list)
  }

  function belEkleKadro(sicil: string, col: 'Kadın' | 'Erkek') {
    const cal = calisanBySicil.get(sicil)
    const ad = cal?.ad_soyad?.trim() || sicil
    belDetay.push(`${ad} (${col}) · sicil ${sicil}`)
  }

  function belEkleFirma(f: FirmaRaporRow, col: 'Kadın' | 'Erkek') {
    const ad = f.ad_soyad.trim() || `Firma #${f.id}`
    belDetay.push(`${ad} (${col}) · firma kaydı #${f.id}`)
  }

  for (const [sicil, rows] of byAsil) {
    const aktif = rows.filter(r => kadroSatirAktifMi(r, D))
    if (aktif.length === 0) continue
    const secilen = aktif.reduce((a, b) => (kadroBaslangic(a) >= kadroBaslangic(b) ? a : b))
    const mud = personelMudurlukKadro(secilen)
    const cal = calisanBySicil.get(sicil)
    const yId = etkinYerleskeId(
      konumCtx.yerleskeHarita,
      mud,
      cal?.yerleske_adresi_id ?? null,
    )
    const kon = personelKonumTipi(konumCtx, {
      gorevYeri: cal?.gorev_yeri,
      gorevMudurlugu: mud,
      yerleskeId: yId,
    })
    const col = cinsiyetKolon(cal?.cinsiyet)
    if (!col) continue

    if (kon === 'İç') {
      if (col === 'Kadın') icK += 1
      else icE += 1
    } else if (kon === 'Dış') {
      if (col === 'Kadın') disK += 1
      else disE += 1
    } else {
      if (col === 'Kadın') belK += 1
      else belE += 1
      belEkleKadro(sicil, col)
    }
  }

  for (const f of firma) {
    if (!firmaAktifGun(f, D)) continue
    const col = cinsiyetKolon(f.cinsiyet)
    if (!col) continue
    const mud = personelMudurlukFirma(f)
    const yId = etkinYerleskeId(
      konumCtx.yerleskeHarita,
      mud,
      f.yerleske_adresi_id ?? null,
    )
    const kon = personelKonumTipi(konumCtx, {
      gorevMudurlugu: mud,
      yerleskeId: yId,
    })

    if (kon === 'İç') {
      if (col === 'Kadın') icK += 1
      else icE += 1
    } else if (kon === 'Dış') {
      if (col === 'Kadın') disK += 1
      else disE += 1
    } else {
      if (col === 'Kadın') belK += 1
      else belE += 1
      belEkleFirma(f, col)
    }
  }

  const satirlar: StatuCinsiyetSatir[] = [
    { statuEtiket: 'İç', kadin: icK, erkek: icE },
    { statuEtiket: 'Dış', kadin: disK, erkek: disE },
  ]

  if (belK > 0 || belE > 0) {
    satirlar.push({ statuEtiket: 'Konum atanmamış', kadin: belK, erkek: belE })
  }

  belDetay.sort((a, b) => a.localeCompare(b, 'tr'))

  return {
    satirlar,
    konumAtanmamisListe: belDetay,
  }
}
