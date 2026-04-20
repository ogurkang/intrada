/**
 * Müdürlük konumuna (İç / Dış) göre cinsiyet — tanim_mudurluk.konum ile eşleştirme.
 * Kadro ve ADABEL Personeli aynı İç/Dış mantığıyla sayılır; ayrı «ADABEL Personeli» satırı yoktur.
 */

import type {
  CalisanRaporRow,
  FirmaRaporRow,
  KadroRaporRow,
  StatuCinsiyetSatir,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import { kadroBaslangic, kadroSatirAktifMi } from '@/lib/rapor-statuye-gore-cinsiyet'

export interface TanimMudurlukKonumRow {
  mudurluk_adi: string
  konum: string
  sira_no: number | null
}

function normMudStr(v: string | null | undefined): string {
  return String(v ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr-TR')
}

/** Tanımdaki konum metnini İç / Dış olarak indirger */
function konumEtiket(konumRaw: string | null | undefined): 'İç' | 'Dış' | null {
  const t = String(konumRaw ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')
  if (t === 'iç') return 'İç'
  if (t === 'dış') return 'Dış'
  return null
}

/** mudurluk_adi (normalize) → İç | Dış */
export function mudurlukKonumHaritasi(tanimlar: TanimMudurlukKonumRow[]): Map<string, 'İç' | 'Dış'> {
  const m = new Map<string, 'İç' | 'Dış'>()
  for (const r of tanimlar) {
    const kn = konumEtiket(r.konum)
    if (!kn) continue
    m.set(normMudStr(r.mudurluk_adi), kn)
  }
  return m
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
  mudurlukKonum: Map<string, 'İç' | 'Dış'>
  kadro: KadroRaporRow[]
  calisanBySicil: Map<string, CalisanRaporRow>
  firma: FirmaRaporRow[]
}

function cinsiyetKolon(c: string | null | undefined): 'Kadın' | 'Erkek' | null {
  const v = String(c ?? '').trim()
  if (v === 'Kadın' || v === 'Kız') return 'Kadın'
  if (v === 'Erkek') return 'Erkek'
  return null
}

function konumBul(mudurlukKonum: Map<string, 'İç' | 'Dış'>, mudRaw: string): 'İç' | 'Dış' | undefined {
  const mud = String(mudRaw ?? '').trim()
  if (!mud) return undefined
  return mudurlukKonum.get(normMudStr(mud))
}

/**
 * Kadro + firma: görev müdürlüğü → tanim_mudurluk konumu (İç/Dış).
 * Konum eşleşmeyenler «Konum atanmamış» satırında + isim listesinde.
 */
export function konumCinsiyetSnapshot(input: KonumSnapshotInput): {
  satirlar: StatuCinsiyetSatir[]
  konumAtanmamisListe: string[]
} {
  const { D, mudurlukKonum, kadro, calisanBySicil, firma } = input

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
    const kon = konumBul(mudurlukKonum, mud)
    const cal = calisanBySicil.get(sicil)
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
    const kon = konumBul(mudurlukKonum, mud)

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
