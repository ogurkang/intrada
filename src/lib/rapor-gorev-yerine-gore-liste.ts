import type { KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'

export type GorevYerineGoreKaynak = 'kadro' | 'firma'

export interface GorevYerineGoreListeSatir {
  kaynak: GorevYerineGoreKaynak
  sicil_no: string | null
  ad_soyad: string
  mudurluk: string
  konum: string
  cinsiyet: string
  unvan: string
  statu: string
  fiili_gorev: string
}

function normMudStr(v: string | null | undefined): string {
  return String(v ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr-TR')
}

/** Tanımlar > Müdürlük: müdürlük adı (normalize) → konum metni */
export function mudurlukKonumMetniHaritasi(
  tanimlar: { mudurluk_adi: string; konum: string }[],
): Map<string, string> {
  const m = new Map<string, string>()
  for (const r of tanimlar) {
    const k = String(r.konum ?? '').trim()
    if (!k) continue
    m.set(normMudStr(r.mudurluk_adi), k)
  }
  return m
}

export function mudurlukKonumGoster(harita: Map<string, string>, mudRaw: string | null | undefined): string {
  const mud = String(mudRaw ?? '').trim()
  if (!mud) return '—'
  return harita.get(normMudStr(mud)) ?? '—'
}

/** Görev Bilgileri kuralı: önce personel kartındaki görev yeri, yoksa kadro görev müdürlüğü */
export function fiiliGorevKadro(
  calisanGorevYeri: string | null | undefined,
  kadroGorevMudurlugu: string | null | undefined,
): string {
  const gy = String(calisanGorevYeri ?? '').trim()
  if (gy) return gy
  const gm = String(kadroGorevMudurlugu ?? '').trim()
  return gm || '—'
}

export function fiiliGorevFirma(gorevMudurlugu: string | null | undefined): string {
  const gm = String(gorevMudurlugu ?? '').trim()
  return gm || '—'
}

function cinsiyetGoster(c: string | null | undefined): string {
  const v = String(c ?? '').trim()
  return v || '—'
}

export type KadroGenis = KadroRaporRow & { gorev_unvani?: string | null }

export type GorevYerineGoreListeKayit =
  | {
      kind: 'kadro'
      sicil_no: string
      ad_soyad: string
      cinsiyet: string | null
      gorev_yeri: string | null
      statuEtiket: string
      kadro: KadroGenis
    }
  | {
      kind: 'firma'
      sicil_no: string | null
      ad_soyad: string
      cinsiyet: string | null
      gorev_mudurlugu: string | null
      gorevi: string | null
      statuEtiket: string
    }

export function gorevYerineGoreListeSatirUret(
  mudKonum: Map<string, string>,
  row: GorevYerineGoreListeKayit,
): GorevYerineGoreListeSatir {
  if (row.kind === 'kadro') {
    const mudurluk = String(row.kadro.kadro_mudurlugu ?? '').trim() || '—'
    return {
      kaynak: 'kadro',
      sicil_no: row.sicil_no,
      ad_soyad: row.ad_soyad,
      mudurluk,
      konum: mudurlukKonumGoster(mudKonum, row.kadro.kadro_mudurlugu),
      cinsiyet: cinsiyetGoster(row.cinsiyet),
      unvan: String(row.kadro.gorev_unvani ?? '').trim() || '—',
      statu: row.statuEtiket,
      fiili_gorev: fiiliGorevKadro(row.gorev_yeri, row.kadro.gorev_mudurlugu),
    }
  }
  const mudurluk = String(row.gorev_mudurlugu ?? '').trim() || '—'
  return {
    kaynak: 'firma',
    sicil_no: row.sicil_no,
    ad_soyad: row.ad_soyad,
    mudurluk,
    konum: mudurlukKonumGoster(mudKonum, row.gorev_mudurlugu),
    cinsiyet: cinsiyetGoster(row.cinsiyet),
    unvan: String(row.gorevi ?? '').trim() || '—',
    statu: row.statuEtiket,
    fiili_gorev: fiiliGorevFirma(row.gorev_mudurlugu),
  }
}
