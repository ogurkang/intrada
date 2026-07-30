import { filterOutGodmodeCalisan } from '@/lib/godmode-calisan'
import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'
import { fmtPersonelHareketTarih } from '@/lib/personel-hareket-belge'
import { periyotSonGunu, type KadroRaporRow, type RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'
import type { Tables } from '@/types/database'

type PH = Tables<'personel_hareketleri'>

export type GorevYeriDegisenPersonelSatir = {
  sicil_no: string
  ad_soyad: string
  eski_mudurluk: string
  yeni_mudurluk: string
  degisiklik_tarihi: string
  /** Sıralama için ISO yyyy-mm-dd */
  degisiklik_tarihi_iso: string
}

export function gorevYeriDegisenPeriyotAraligi(
  yil: number,
  periyot: RaporPeriyot,
): { bas: string; bit: string; D: string } {
  const D = periyotSonGunu(yil, periyot)
  if (periyot === 'yillik') return { bas: `${yil}-01-01`, bit: D, D }
  const ay = periyot as number
  const bas = `${yil}-${String(ay).padStart(2, '0')}-01`
  return { bas, bit: D, D }
}

function norm(s: string | null | undefined): string {
  return String(s ?? '').trim()
}

function hareketStatu(
  h: PH,
  kadroById: Map<number, { statu: string | null }>,
  kadroBySicil: Map<string, KadroRaporRow[]>,
  tarihIso: string,
): string | null {
  const kid = h.kadro_id
  if (kid != null) {
    const k = kadroById.get(kid)
    if (k?.statu) return k.statu
  }
  const sec = secilenKadroSatirAsil(kadroBySicil.get(h.sicil_no) ?? [], tarihIso)
  return sec?.statu ?? null
}

/** Statüye göre değişiklik tarihi (ISO). */
export function gorevYeriDegisenHareketTarihi(h: PH, statu: string | null): string | null {
  const s = norm(statu)
  if (s === 'İşçi' || s === 'Sözleşmeli') {
    return norm(h.kayit_tarihi) || norm(h.yururluk_tarihi) || norm(h.ise_baslama_tarihi) || norm(h.ayrilis_tarihi) || null
  }
  return norm(h.yururluk_tarihi) || norm(h.kayit_tarihi) || norm(h.ise_baslama_tarihi) || norm(h.ayrilis_tarihi) || null
}

function hareketUygunMu(h: PH): boolean {
  const eski = norm(h.eski_gorev_yeri)
  const yeni = norm(h.yeni_gorev_yeri)
  const ayrilis = norm(h.ayrilis_tarihi)
  if (ayrilis) return true
  if (!yeni) return false
  if (!eski) return true
  return eski.localeCompare(yeni, 'tr') !== 0
}

export function gorevYeriDegisenPersonelSnapshot(input: {
  yil: number
  periyot: RaporPeriyot
  hareketler: PH[]
  adBySicil: Map<string, string>
  adabelSiciller: Set<string>
  kadroById: Map<number, { statu: string | null }>
  kadroBySicil: Map<string, KadroRaporRow[]>
}): GorevYeriDegisenPersonelSatir[] {
  const { bas, bit } = gorevYeriDegisenPeriyotAraligi(input.yil, input.periyot)
  const out: GorevYeriDegisenPersonelSatir[] = []

  for (const h of input.hareketler) {
    const sicil = norm(h.sicil_no)
    if (!sicil || input.adabelSiciller.has(sicil) || !input.adBySicil.has(sicil)) continue
    if (!hareketUygunMu(h)) continue

    const statu = hareketStatu(h, input.kadroById, input.kadroBySicil, bit)
    const tarihIso = gorevYeriDegisenHareketTarihi(h, statu)
    if (!tarihIso || tarihIso < bas || tarihIso > bit) continue

    const eski = norm(h.eski_gorev_yeri)
    const yeniGorev = norm(h.yeni_gorev_yeri)
    const ayrilis = norm(h.ayrilis_tarihi)
    const ayrilisNedeni = norm(h.ayrilis_nedeni)

    let yeni_mudurluk: string
    if (ayrilis) {
      yeni_mudurluk = ayrilisNedeni || 'Ayrılış'
    } else {
      yeni_mudurluk = yeniGorev || '—'
    }

    out.push({
      sicil_no: sicil,
      ad_soyad: input.adBySicil.get(sicil) ?? sicil,
      eski_mudurluk: eski || '—',
      yeni_mudurluk,
      degisiklik_tarihi: fmtPersonelHareketTarih(tarihIso) || '—',
      degisiklik_tarihi_iso: tarihIso,
    })
  }

  out.sort(
    (a, b) =>
      b.degisiklik_tarihi_iso.localeCompare(a.degisiklik_tarihi_iso) ||
      a.ad_soyad.localeCompare(b.ad_soyad, 'tr') ||
      a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true }),
  )
  return out
}

export function calisanAdHaritasiOlustur(
  calisanRaw: { sicil_no: string; ad_soyad: string | null }[] | null | undefined,
): Map<string, string> {
  const map = new Map<string, string>()
  for (const c of filterOutGodmodeCalisan(calisanRaw ?? [])) {
    map.set(c.sicil_no, c.ad_soyad ?? c.sicil_no)
  }
  return map
}

export function kadroHaritalariOlustur(
  kadroRaw: { id?: number; asil: string | null; statu: string | null; kuruma_giris_tarihi: string | null; memuriyet_tarihi: string | null; ayrilis_tarihi: string | null; durumu: string | null; kadro_mudurlugu?: string | null; gorev_mudurlugu?: string | null }[],
): {
  kadroById: Map<number, { statu: string | null }>
  kadroBySicil: Map<string, KadroRaporRow[]>
} {
  const kadroById = new Map<number, { statu: string | null }>()
  const kadroBySicil = new Map<string, KadroRaporRow[]>()
  for (const r of kadroRaw) {
    if (r.id != null) kadroById.set(r.id, { statu: r.statu ?? null })
    if (!r.asil) continue
    const list = kadroBySicil.get(r.asil) ?? []
    list.push(r as KadroRaporRow)
    kadroBySicil.set(r.asil, list)
  }
  return { kadroById, kadroBySicil }
}
