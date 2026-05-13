import type { KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import { trNormalize } from '@/lib/turkce-search'

/** Unvan metnine göre satır vurgusu (UI + Excel aynı sıra önceliği). */
export type GorevYerineGoreUnvanVurgu = 'belediye_baskani' | 'baskan_yardimci' | 'mudur' | null

/** trNormalize sonrası «müdürü» eşlemesi (sadece bu kelimeye göre yeşil). */
const MUDURU_NORM = 'muduru'

/**
 * Öncelik: Başkan yardımcısı (unvan) → turuncu; Belediye Başkanı (unvan) → mavi.
 * Yeşil: yalnızca «müdürü» — önce Unvanı, yoksa Fiili Görevi (normalize metinde `muduru` alt dizisi).
 */
export function gorevYerineGoreUnvanVurgu(
  unvan: string | null | undefined,
  fiiliGorev?: string | null | undefined,
): GorevYerineGoreUnvanVurgu {
  const u = String(unvan ?? '').trim()
  if (u && u !== '—') {
    const n = trNormalize(u)
    if (n.includes('yardimci') && n.includes('baskan')) return 'baskan_yardimci'
    if (n.includes('belediye') && n.includes('baskan')) return 'belediye_baskani'
    if (n.includes(MUDURU_NORM)) return 'mudur'
  }
  const f = String(fiiliGorev ?? '').trim()
  if (f && f !== '—' && trNormalize(f).includes(MUDURU_NORM)) return 'mudur'
  return null
}

export function gorevYerineGoreUnvanSatirClass(v: GorevYerineGoreUnvanVurgu): string {
  switch (v) {
    case 'belediye_baskani':
      return 'bg-sky-100'
    case 'baskan_yardimci':
      return 'bg-orange-100'
    case 'mudur':
      return 'bg-emerald-100'
    default:
      return ''
  }
}

/** xlsx-js-style fgColor.rgb (FF yok). */
export function gorevYerineGoreUnvanExcelRgb(v: GorevYerineGoreUnvanVurgu): string | null {
  switch (v) {
    case 'belediye_baskani':
      return 'DBEAFE'
    case 'baskan_yardimci':
      return 'FFEDD5'
    case 'mudur':
      return 'D1FAE5'
    default:
      return null
  }
}

export type GorevYerineGoreKaynak = 'kadro' | 'firma'

export interface GorevYerineGoreListeSatir {
  kayit_key: string
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

/** Tanımlar > Şirket: şirket adı (normalize) → konum metni */
export function sirketKonumMetniHaritasi(
  tanimlar: { sirket_adi: string; konum: string }[],
): Map<string, string> {
  const m = new Map<string, string>()
  for (const r of tanimlar) {
    const k = String(r.konum ?? '').trim()
    if (!k) continue
    m.set(normMudStr(r.sirket_adi), k)
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
      kayit_key: string
      kind: 'kadro'
      sicil_no: string
      ad_soyad: string
      cinsiyet: string | null
      gorev_yeri: string | null
      statuEtiket: string
      kadro: KadroGenis
    }
  | {
      kayit_key: string
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
    const konumMudurluk = String(row.kadro.gorev_mudurlugu ?? '').trim() || String(row.kadro.kadro_mudurlugu ?? '').trim()
    return {
      kayit_key: row.kayit_key,
      kaynak: 'kadro',
      sicil_no: row.sicil_no,
      ad_soyad: row.ad_soyad,
      mudurluk,
      konum: mudurlukKonumGoster(mudKonum, konumMudurluk),
      cinsiyet: cinsiyetGoster(row.cinsiyet),
      unvan: String(row.kadro.gorev_unvani ?? '').trim() || '—',
      statu: row.statuEtiket,
      fiili_gorev: fiiliGorevKadro(row.gorev_yeri, row.kadro.gorev_mudurlugu),
    }
  }
  const mudurluk = String(row.gorev_mudurlugu ?? '').trim() || '—'
  return {
    kayit_key: row.kayit_key,
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
