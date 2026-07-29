import type { KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import { performansMudurUnvaniMi } from '@/lib/performans-unvan'
import { trNormalize } from '@/lib/turkce-search'
import type { PersonelKonumCtx } from '@/lib/personel-gorev-konum'
import { personelKonumMetni } from '@/lib/personel-gorev-konum'
import { etkinYerleskeId } from '@/lib/yerleske-adresi'

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

/** Asıl/vekil tüm kadrolarda «… Müdürü» unvanı varsa onu kullan (vekil müdürler için). */
export function gorevYerineGoreListeUnvanSec(
  kadroRows: Array<{ gorev_unvani?: string | null; kadro_unvani?: string | null }>,
  fallback: string | null | undefined,
): string {
  for (const r of kadroRows) {
    for (const uv of [r.gorev_unvani, r.kadro_unvani]) {
      const u = String(uv ?? '').trim()
      if (u && performansMudurUnvaniMi(u)) return u
    }
  }
  const fb = String(fallback ?? '').trim()
  return fb || '—'
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

/** Tanımlar > Müdürlük yerleşke eşlemesi: müdürlük adı (normalize) → konum metni */
export { mudurlukKonumMetniHaritasi } from '@/lib/mudurluk-konum'

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
      yerleske_adresi_id?: number | null
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
      yerleske_adresi_id?: number | null
    }

export function gorevYerineGoreListeSatirUret(
  konumCtx: PersonelKonumCtx,
  row: GorevYerineGoreListeKayit,
): GorevYerineGoreListeSatir {
  if (row.kind === 'kadro') {
    const mudurluk = String(row.kadro.kadro_mudurlugu ?? '').trim() || '—'
    const konumMudurluk =
      String(row.kadro.gorev_mudurlugu ?? '').trim() || String(row.kadro.kadro_mudurlugu ?? '').trim()
    const yId = etkinYerleskeId(
      konumCtx.yerleskeHarita,
      konumMudurluk,
      row.yerleske_adresi_id ?? null,
    )
    return {
      kayit_key: row.kayit_key,
      kaynak: 'kadro',
      sicil_no: row.sicil_no,
      ad_soyad: row.ad_soyad,
      mudurluk,
      konum: personelKonumMetni(konumCtx, {
        gorevYeri: row.gorev_yeri,
        gorevMudurlugu: konumMudurluk,
        yerleskeId: yId,
      }),
      cinsiyet: cinsiyetGoster(row.cinsiyet),
      unvan: String(row.kadro.gorev_unvani ?? '').trim() || '—',
      statu: row.statuEtiket,
      fiili_gorev: fiiliGorevKadro(row.gorev_yeri, row.kadro.gorev_mudurlugu),
    }
  }
  const mudurluk = String(row.gorev_mudurlugu ?? '').trim() || '—'
  const yId = etkinYerleskeId(
    konumCtx.yerleskeHarita,
    row.gorev_mudurlugu,
    row.yerleske_adresi_id ?? null,
  )
  return {
    kayit_key: row.kayit_key,
    kaynak: 'firma',
    sicil_no: row.sicil_no,
    ad_soyad: row.ad_soyad,
    mudurluk,
    konum: personelKonumMetni(konumCtx, {
      gorevMudurlugu: row.gorev_mudurlugu,
      yerleskeId: yId,
    }),
    cinsiyet: cinsiyetGoster(row.cinsiyet),
    unvan: String(row.gorevi ?? '').trim() || '—',
    statu: row.statuEtiket,
    fiili_gorev: fiiliGorevFirma(row.gorev_mudurlugu),
  }
}
