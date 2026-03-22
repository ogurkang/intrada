/**
 * Mal bildirimi Excel şablonu — GAS BildirimModulu.gs malBildirimSablonHucreEslestir_ ile aynı hücre eşlemesi.
 * Supabase kaydı (snake_case / UI alanları) GAS nesne alanlarına normalize edilir.
 */
import type { Worksheet } from 'exceljs'

/** 1 = sadece üst form (görsel şablon: Görevi/Sicil/TC/Net Maaş/x5). 2 = eski tam doldurma. */
export type MalExcelAsama = 1 | 2

/** `varsayilan`: şablondaki sabit satır numaraları. `coksatir`: bölüm başına göre kümülatif kaydırma (fazla satırda sonraki bölümler aşağı kayar). */
export type MalExcelExportModu = 'varsayilan' | 'coksatir'

type JsonSatir = Record<string, string>

/**
 * TR metin: "45.789,25" → 45789.25
 * DB / JSON ondalık: "45789.25" veya number → aynı değer (noktaları silme!)
 */
export function malMaasParse(s: string | number | null | undefined): number {
  if (s == null || s === '') return 0
  if (typeof s === 'number') return Number.isFinite(s) ? s : 0
  const t = String(s).trim()
  if (t.includes(',')) {
    const tr = t.replace(/\./g, '').replace(',', '.')
    const n = parseFloat(tr)
    return Number.isFinite(n) ? n : 0
  }
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : 0
}

export function malFormatTrNumber(n: number): string {
  if (!Number.isFinite(n)) return ''
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)
}

function str(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

function toArr(v: unknown): JsonSatir[] {
  return Array.isArray(v) ? (v as JsonSatir[]) : []
}

/** Kimlik: ilk satır ana, kalanlar ek (GAS malKimlikUnpack_ benzeri) */
function unpackKimlik(raw: unknown): { kimlik: JsonSatir; kimlikEkler: JsonSatir[] } {
  const arr = toArr(raw)
  if (arr.length === 0) {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const o = raw as Record<string, unknown>
      if (o.primary || o.kimlik || o.ekler || o.kimlikEkler) {
        const primary = (o.primary ?? o.kimlik ?? {}) as JsonSatir
        const ekler = (Array.isArray(o.ekler) ? o.ekler : Array.isArray(o.kimlikEkler) ? o.kimlikEkler : []) as JsonSatir[]
        return { kimlik: normalizeKimlikRow(primary), kimlikEkler: ekler.map(normalizeKimlikRow) }
      }
      return { kimlik: normalizeKimlikRow(raw as JsonSatir), kimlikEkler: [] }
    }
    return { kimlik: {}, kimlikEkler: [] }
  }
  return { kimlik: normalizeKimlikRow(arr[0]), kimlikEkler: arr.slice(1).map(normalizeKimlikRow) }
}

function normalizeKimlikRow(r: JsonSatir): JsonSatir {
  return {
    adSoyad: str(r.adSoyad ?? r.ad_soyad),
    tckn: str(r.tckn),
    dogumTarihi: str(r.dogumTarihi ?? r.dogum_tarihi),
    dogumYeri: str(r.dogumYeri ?? r.dogum_yeri),
    yakinlik: str(r.yakinlik),
  }
}

function mapKooperatif(s: JsonSatir) {
  const adYeri = str(s.adYeri) || [str(s.adi), str(s.il)].filter(Boolean).join(' - ')
  return {
    adYeri,
    hisseDegeri: str(s.hisseDegeri ?? s.hisse_degeri),
    uyelikTarihi: str(s.uyelikTarihi ?? s.edinme),
    hissedarTc: str(s.hissedarTc ?? s.hissedar_tc),
  }
}

function mapTasit(s: JsonSatir) {
  return {
    tasitCinsi: str(s.tasitCinsi ?? s.tur),
    plakaNo: str(s.plakaNo ?? s.plaka),
    markaModel: str(s.markaModel ?? s.marka),
    modelYili: str(s.modelYili ?? s.yil),
    edinmeDegeri: str(s.edinmeDegeri ?? s.deger),
    edinmeTarihi: str(s.edinmeTarihi),
    sahibiTc: str(s.sahibiTc ?? s.sahibi_tc),
  }
}

function mapDiger(s: JsonSatir) {
  return {
    tasinirCinsi: str(s.tasinirCinsi ?? s.tur),
    modelYili: str(s.modelYili ?? s.yil),
    edinmeDegeri: str(s.edinmeDegeri ?? s.deger),
    edinmeTarihi: str(s.edinmeTarihi),
    sahibiTc: str(s.sahibiTc ?? s.sahibi_tc),
  }
}

function mapBanka(s: JsonSatir) {
  const miktarN = malMaasParse(str(s.miktar ?? s.tutar))
  const kurN = malMaasParse(str(s.guncelKur ?? s.guncel_kur ?? '1'))
  const degerN = miktarN * kurN
  return {
    nitelik: str(s.nitelik ?? s.kurum),
    cinsi: str(s.cinsi ?? s.tur),
    miktar: miktarN > 0 ? malFormatTrNumber(miktarN) : str(s.miktar ?? s.tutar),
    guncelKur: kurN > 0 ? malFormatTrNumber(kurN) : str(s.guncelKur ?? s.guncel_kur ?? '1'),
    deger: degerN > 0 ? malFormatTrNumber(degerN) : str(s.deger ?? ''),
    sahibiTc: str(s.sahibiTc ?? s.sahibi_tc),
  }
}

function mapAltin(s: JsonSatir) {
  const miktarN = malMaasParse(str(s.miktar ?? s.tutar))
  const kurN = malMaasParse(str(s.guncelKur ?? s.guncel_kur ?? '1'))
  const degerN = miktarN * kurN
  return {
    cinsi: str(s.cinsi ?? s.cins ?? s.tur),
    turu: str(s.turu ?? s.tur ?? s.birim),
    miktar: miktarN > 0 ? malFormatTrNumber(miktarN) : str(s.miktar ?? ''),
    guncelKur: kurN > 0 ? malFormatTrNumber(kurN) : str(s.guncelKur ?? s.guncel_kur ?? '1'),
    deger: degerN > 0 ? malFormatTrNumber(degerN) : str(s.deger ?? ''),
    sahibiTc: str(s.sahibiTc ?? s.sahibi_tc),
  }
}

function mapBorc(s: JsonSatir) {
  const miktarN = malMaasParse(str(s.miktar ?? s.tutar))
  const kurN = malMaasParse(str(s.guncelKur ?? s.guncel_kur ?? '1'))
  const degerN = miktarN * kurN
  const borclu = str(s.borclu ?? s.borclu_adi_soyad)
  const alacakli = str(s.alacakli ?? s.alacakli_adi_soyad)
  return {
    borclu,
    alacakli,
    birimi: str(s.birimi ?? s.birim),
    miktar: miktarN > 0 ? malFormatTrNumber(miktarN) : str(s.miktar ?? ''),
    guncelKur: kurN > 0 ? malFormatTrNumber(kurN) : str(s.guncelKur ?? s.guncel_kur ?? '1'),
    deger: degerN > 0 ? malFormatTrNumber(degerN) : str(s.deger ?? ''),
  }
}

function hucreYaz(ws: Worksheet, col: string, row: number, val: string | number | null | undefined) {
  ws.getCell(`${col}${row}`).value = val == null || val === '' ? '' : val
}

/** Excel’in sayıya çevirip bozmasını önlemek için metin (@) formatında yazar (TR para, TCKN). */
function hucreYazMetin(ws: Worksheet, adres: string, val: string | null | undefined) {
  const c = ws.getCell(adres)
  if (val == null || val === '') {
    c.value = ''
    return
  }
  c.value = val
  c.numFmt = '@'
}

/** gg.aa.yyyy (Excel / form uyumu) */
function formatTarihTrGunAyYil(iso: string | null | undefined): string {
  if (!iso) return ''
  const s = String(iso).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split('-')
    return `${d}.${m}.${y}`
  }
  return s
}

function formatDogumExcelHucre(s: string | null | undefined): string {
  if (!s) return ''
  const t = String(s).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return formatTarihTrGunAyYil(t)
  return t
}

type KimlikExcelSatir = {
  adSoyad: string
  dogumTarihi: string
  dogumYeri: string
  yakinlik: string
  tckn: string
}

/** kimlik_json: [{ ad_soyad, dogum_tarihi, dogum_yeri, yakinlik, tckn }, ...] */
function kimlikJsonToExcelSatirlar(raw: unknown): KimlikExcelSatir[] {
  const arr = toArr(raw)
  const out: KimlikExcelSatir[] = []
  for (const r of arr) {
    const adSoyad = str(r.ad_soyad ?? r.adSoyad)
    const dogumRaw = str(r.dogum_tarihi ?? r.dogumTarihi)
    const dogumYeri = str(r.dogum_yeri ?? r.dogumYeri)
    const yakinlik = str(r.yakinlik)
    const tckn = str(r.tckn)
    if (!adSoyad && !tckn && !dogumYeri && !yakinlik) continue
    out.push({
      adSoyad,
      dogumTarihi: formatDogumExcelHucre(dogumRaw),
      dogumYeri,
      yakinlik,
      tckn,
    })
  }
  return out
}

/** Bölüm-2: satır 17+ — A sıra, C cinsi, D adres, L hisse miktarı, N değer, R edinme tarihi, U malik TCKN */
type TasinmazExcelSatir = {
  cins: string
  adres: string
  hisse: string
  deger: string
  edinmeTr: string
  malikTc: string
}

function tasinmazJsonToExcelSatirlar(tasinmazRaw: unknown, kimlikRaw: unknown): TasinmazExcelSatir[] {
  const kimlikArr = toArr(kimlikRaw)
  const arr = toArr(tasinmazRaw)
  const out: TasinmazExcelSatir[] = []
  for (const item of arr) {
    const r = item as Record<string, string>
    const cins = str(r.tasinmaz_cinsi ?? r.cins)
    const adres = str(r.adres ?? r.adresi)
    const hisse = str(r.hisse_miktari ?? r.hissesi ?? r.metrekare)
    const deger = str(r.degeri ?? r.deger)
    const edinmeRaw = str(r.edinme_tarihi ?? r.edinme)
    if (!cins && !adres && !hisse && !deger && !edinmeRaw) continue
    let malikTc = str(r.malik_tc ?? r.malikTc)
    if (!malikTc) {
      const idx = Number(r.malik_kimlik_indeksi)
      if (Number.isFinite(idx) && idx >= 0 && idx < kimlikArr.length) {
        const k = kimlikArr[idx] as Record<string, string>
        malikTc = str(k?.tckn)
      }
    }
    out.push({
      cins,
      adres,
      hisse,
      deger,
      edinmeTr: formatTarihTrGunAyYil(edinmeRaw),
      malikTc,
    })
  }
  return out
}

/** Bölüm-3: A28+ sıra, C ad-yer (B:L birleşik bloğunun veri sütunu), N hisse değeri, R üyelik, V hissedar TCKN */
type KooperatifExcelSatir = {
  adiYeri: string
  hisseDegeri: string
  uyelikTr: string
  hissedarTc: string
}

function kooperatifJsonToExcelSatirlar(koopRaw: unknown, kimlikRaw: unknown): KooperatifExcelSatir[] {
  const kimlikArr = toArr(kimlikRaw)
  const arr = toArr(koopRaw)
  const out: KooperatifExcelSatir[] = []
  for (const item of arr) {
    const r = item as Record<string, string>
    const adiYeri = str(r.adi_yeri ?? r.ad_yeri ?? r.adYeri)
    const hisseDegeri = str(r.hisse_degeri ?? r.hisseDegeri)
    const uyelikRaw = str(r.uyelik_tarihi ?? r.uyelikTarihi)
    if (!adiYeri && !hisseDegeri && !uyelikRaw) continue
    let hissedarTc = str(r.hissedar_tc ?? r.hissedarTc)
    if (!hissedarTc) {
      const idx = Number(r.hissedar_kimlik_indeksi ?? r.hissedarKimlikIndeksi)
      if (Number.isFinite(idx) && idx >= 0 && idx < kimlikArr.length) {
        const k = kimlikArr[idx] as Record<string, string>
        hissedarTc = str(k?.tckn)
      }
    }
    out.push({
      adiYeri,
      hisseDegeri,
      uyelikTr: formatTarihTrGunAyYil(uyelikRaw),
      hissedarTc,
    })
  }
  return out
}

/** Bölüm-4A taşıt: satır 34+ — A sıra, C cins, D plaka, F marka-model, M model yılı, N edinme değeri, R edinme tarihi, T sahip TCKN */
function tasitJsonToExcelSatirlar(tasitRaw: unknown, kimlikRaw: unknown) {
  const kimlikArr = toArr(kimlikRaw)
  const arr = toArr(tasitRaw)
  const out: {
    cins: string
    plaka: string
    markaModel: string
    modelYili: string
    edinmeDegerFmt: string
    edinmeTr: string
    sahipTc: string
  }[] = []
  for (const item of arr) {
    const r = item as Record<string, unknown>
    const cins = str(r.tasit_cinsi ?? r.tasitCinsi ?? r.tur)
    const plaka = str(r.plaka_no ?? r.plakaNo ?? r.plaka)
    const markaModel = str(r.marka_model ?? r.markaModel ?? r.marka)
    const modelYili = str(r.model_yili ?? r.modelYili ?? r.yil)
    const edinmeRaw = str(r.edinme_tarihi ?? r.edinmeTarihi)
    const edNum = malMaasParse((r.edinme_degeri ?? r.edinmeDegeri ?? r.deger) as string | number | null | undefined)
    if (!cins && !plaka && !markaModel) continue
    let sahipTc = str(r.sahibi_tc ?? r.sahibiTc ?? r.sahip_tc)
    if (!sahipTc) {
      const idx = Number(r.sahip_kimlik_indeksi ?? r.sahipKimlikIndeksi)
      if (Number.isFinite(idx) && idx >= 0 && idx < kimlikArr.length) {
        const k = kimlikArr[idx] as Record<string, string>
        sahipTc = str(k?.tckn)
      }
    }
    out.push({
      cins,
      plaka,
      markaModel,
      modelYili,
      edinmeDegerFmt: edNum > 0 ? malFormatTrNumber(edNum) : '',
      edinmeTr: formatTarihTrGunAyYil(edinmeRaw),
      sahipTc,
    })
  }
  return out
}

/** Bölüm-4B diğer taşınır: satır 43+ — A sıra, C cins, J model yılı, N edinme değeri, R edinme tarihi, T sahip TCKN */
function digerTasinirJsonToExcelSatirlar(digerRaw: unknown, kimlikRaw: unknown) {
  const kimlikArr = toArr(kimlikRaw)
  const arr = toArr(digerRaw)
  const out: {
    cinsi: string
    modelYili: string
    edinmeDegerFmt: string
    edinmeTr: string
    sahipTc: string
  }[] = []
  for (const item of arr) {
    const r = item as Record<string, unknown>
    const cinsi = str(r.tasinir_cinsi ?? r.tasinirCinsi ?? r.tur)
    const modelYili = str(r.model_yili ?? r.modelYili ?? r.yil)
    const edinmeRaw = str(r.edinme_tarihi ?? r.edinmeTarihi)
    const edNum = malMaasParse((r.edinme_degeri ?? r.edinmeDegeri ?? r.deger) as string | number | null | undefined)
    if (!cinsi && !modelYili) continue
    let sahipTc = str(r.sahibi_tc ?? r.sahibiTc ?? r.sahip_tc)
    if (!sahipTc) {
      const idx = Number(r.sahip_kimlik_indeksi ?? r.sahipKimlikIndeksi)
      if (Number.isFinite(idx) && idx >= 0 && idx < kimlikArr.length) {
        const k = kimlikArr[idx] as Record<string, string>
        sahipTc = str(k?.tckn)
      }
    }
    out.push({
      cinsi,
      modelYili,
      edinmeDegerFmt: edNum > 0 ? malFormatTrNumber(edNum) : '',
      edinmeTr: formatTarihTrGunAyYil(edinmeRaw),
      sahipTc,
    })
  }
  return out
}

/** Bölüm-5 banka/menkul: satır 53+ — A sıra, B nitelik, D cinsi, H miktar, M güncel kur, O değer (miktar×kur), U sahip TCKN */
function bankaMenkulJsonToExcelSatirlar(bankaRaw: unknown, kimlikRaw: unknown) {
  const kimlikArr = toArr(kimlikRaw)
  const arr = toArr(bankaRaw)
  const out: {
    nitelik: string
    cinsi: string
    miktarFmt: string
    kurFmt: string
    degerFmt: string
    sahipTc: string
  }[] = []
  for (const item of arr) {
    const r = item as Record<string, unknown>
    const nitelik = str(r.nitelik)
    const cinsi = str(r.cins ?? r.cinsi)
    const miktarNum = malMaasParse((r.miktar ?? r.miktar_raw) as string | number | null | undefined)
    const kurNum = malMaasParse((r.guncel_kur ?? r.guncelKur) as string | number | null | undefined)
    const degerNum = miktarNum * kurNum
    if (!nitelik && !cinsi && miktarNum === 0 && kurNum === 0) continue
    let sahipTc = str(r.sahibi_tc ?? r.sahibiTc ?? r.sahip_tc)
    if (!sahipTc) {
      const idx = Number(r.sahip_kimlik_indeksi ?? r.sahipKimlikIndeksi)
      if (Number.isFinite(idx) && idx >= 0 && idx < kimlikArr.length) {
        const k = kimlikArr[idx] as Record<string, string>
        sahipTc = str(k?.tckn)
      }
    }
    out.push({
      nitelik,
      cinsi,
      miktarFmt: miktarNum > 0 ? malFormatTrNumber(miktarNum) : '',
      kurFmt: kurNum > 0 ? malFormatTrNumber(kurNum) : '',
      degerFmt: degerNum > 0 ? malFormatTrNumber(degerNum) : '',
      sahipTc,
    })
  }
  return out
}

/** Bölüm-6 altın/mücevher: satır 63+ — A sıra, B cinsi, D türü, I miktar, M güncel kur, O değer (miktar×kur), U sahip TCKN */
function altinMucevherJsonToExcelSatirlar(altinRaw: unknown, kimlikRaw: unknown) {
  const kimlikArr = toArr(kimlikRaw)
  const arr = toArr(altinRaw)
  const out: {
    cinsi: string
    turu: string
    miktarFmt: string
    kurFmt: string
    degerFmt: string
    sahipTc: string
  }[] = []
  for (const item of arr) {
    const r = item as Record<string, unknown>
    const cinsi = str(r.cinsi ?? r.cins)
    const turu = str(r.turu ?? r.tur)
    const miktarNum = malMaasParse((r.miktar ?? r.miktar_raw) as string | number | null | undefined)
    const kurNum = malMaasParse((r.guncel_kur ?? r.guncelKur) as string | number | null | undefined)
    const degerNum = miktarNum * kurNum
    if (!cinsi && !turu && miktarNum === 0 && kurNum === 0) continue
    let sahipTc = str(r.sahibi_tc ?? r.sahibiTc ?? r.sahip_tc)
    if (!sahipTc) {
      const idx = Number(r.sahip_kimlik_indeksi ?? r.sahipKimlikIndeksi)
      if (Number.isFinite(idx) && idx >= 0 && idx < kimlikArr.length) {
        const k = kimlikArr[idx] as Record<string, string>
        sahipTc = str(k?.tckn)
      }
    }
    out.push({
      cinsi,
      turu,
      miktarFmt: miktarNum > 0 ? malFormatTrNumber(miktarNum) : '',
      kurFmt: kurNum > 0 ? malFormatTrNumber(kurNum) : '',
      degerFmt: degerNum > 0 ? malFormatTrNumber(degerNum) : '',
      sahipTc,
    })
  }
  return out
}

/** Bölüm-7 borç-alacak: satır 69+ — A sıra, B borçlu, G alacaklı, M birim, N miktar, R kur, U tutar (miktar×kur) */
function borcAlacakJsonToExcelSatirlar(borcRaw: unknown) {
  const arr = toArr(borcRaw)
  const out: {
    borclu: string
    alacakli: string
    birimi: string
    miktarFmt: string
    kurFmt: string
    tutarFmt: string
  }[] = []
  for (const item of arr) {
    const r = item as Record<string, unknown>
    const borclu = str(r.borclu ?? r.borclu_adi_soyad)
    const alacakli = str(r.alacakli ?? r.alacakli_adi_soyad)
    const birimi = str(r.birimi ?? r.birim)
    const miktarNum = malMaasParse((r.miktar ?? r.miktar_raw) as string | number | null | undefined)
    const kurNum = malMaasParse((r.guncel_kur ?? r.guncelKur) as string | number | null | undefined)
    const tutarNum = miktarNum * kurNum
    if (!borclu && !alacakli && !birimi && miktarNum === 0 && kurNum === 0) continue
    out.push({
      borclu,
      alacakli,
      birimi,
      miktarFmt: miktarNum > 0 ? malFormatTrNumber(miktarNum) : '',
      kurFmt: kurNum > 0 ? malFormatTrNumber(kurNum) : '',
      tutarFmt: tutarNum > 0 ? malFormatTrNumber(tutarNum) : '',
    })
  }
  return out
}

/** Bölüm-8 haklar / diğer unsurlar: satır 76+ — A sıra, B unsur, M edinme şekli, U sahip TCKN */
function haklarJsonToExcelSatirlar(haklarRaw: unknown, kimlikRaw: unknown) {
  const kimlikArr = toArr(kimlikRaw)
  const arr = toArr(haklarRaw)
  const out: { unsur: string; edinmeSekli: string; sahipTc: string }[] = []
  for (const item of arr) {
    const r = item as Record<string, unknown>
    const unsur = str(r.unsur ?? r.tanim ?? r.tur)
    const edinmeSekli = str(r.edinme_sekli ?? r.edinmeSekli ?? r.edinme)
    let sahipTc = str(r.sahibi_tc ?? r.sahibiTc)
    if (!sahipTc) {
      const idx = Number(r.sahip_kimlik_indeksi ?? r.sahipKimlikIndeksi)
      if (Number.isFinite(idx) && idx >= 0 && idx < kimlikArr.length) {
        const k = kimlikArr[idx] as Record<string, string>
        sahipTc = str(k?.tckn)
      }
    }
    if (!unsur && !edinmeSekli && !sahipTc) continue
    out.push({ unsur, edinmeSekli, sahipTc })
  }
  return out
}

function listeYaz(
  ws: Worksheet,
  list: Record<string, string>[],
  startRow: number,
  colMap: Record<string, string>,
) {
  const arr = Array.isArray(list) ? list : []
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i] || {}
    const rr = startRow + i
    for (const key of Object.keys(colMap)) {
      const col = colMap[key]
      const v = item[key]
      hucreYaz(ws, col, rr, v == null ? '' : String(v))
    }
  }
}

export interface MalExcelPersonelBilgi {
  adSoyad: string
  tckn: string
  kadroUnvani: string
  gorevUnvani: string
}

/** Şablonda bölümler arası ayrılan satır sayıları (taşınmaz 17–27 = 11 satır vb.) */
const RES_COK_SATIR = {
  kimlik: 8,
  tasinmaz: 11,
  kooperatif: 6,
  tasit: 9,
  diger: 10,
  banka: 10,
  altin: 6,
  borc: 7,
  haklar: 4,
} as const

/** Şablonda taşınmaz bloğunun ilk satırı (kimlik 8–15 sonrası boşlukla 17). */
const COK_FIRST_TASINMAZ = 17

function malBildirimAsama1CokSatirli(
  ws: Worksheet,
  kayit: {
    sicil_no: string
    son_net_maas: number | null
    aciklama: string | null
    beyan_turu: string | null
    onay_tarihi: string | null
    kimlik_json: unknown
    tasinmaz_json: unknown
    kooperatif_json: unknown
    tasitlar_json: unknown
    diger_tasinirlar_json: unknown
    banka_menkul_json: unknown
    altin_mucevher_json: unknown
    borc_alacak_json: unknown
    haklar_json: unknown
  },
  p: MalExcelPersonelBilgi,
  sonNetFmt: string,
  sonNetX5: string,
) {
  hucreYaz(ws, 'G', 2, p.gorevUnvani || p.kadroUnvani)
  hucreYaz(ws, 'G', 3, kayit.sicil_no)
  hucreYazMetin(ws, 'U3', p.tckn)
  hucreYazMetin(ws, 'D5', sonNetFmt)
  hucreYazMetin(ws, 'T5', sonNetX5)

  const kimlikSatirlar = kimlikJsonToExcelSatirlar(kayit.kimlik_json)
  kimlikSatirlar.forEach((row, i) => {
    const rr = 8 + i
    hucreYaz(ws, 'A', rr, String(i + 1))
    hucreYazMetin(ws, `C${rr}`, row.adSoyad)
    hucreYazMetin(ws, `I${rr}`, row.dogumTarihi)
    hucreYazMetin(ws, `M${rr}`, row.dogumYeri)
    hucreYazMetin(ws, `Q${rr}`, row.yakinlik)
    hucreYazMetin(ws, `T${rr}`, row.tckn)
  })

  const Lk = kimlikSatirlar.length
  /*
   * Kimlik (8–15) ile taşınmaz (17) arasında şablonda 1 boş satır (16) vardır.
   * Eski shift formülü (len−8) bu boşluğu yok saydığı için 9. kimlikte taşınmaz 18’den
   * başlıyor, sonraki bölümler 1 satır kayıyor ve kooperatif/taşıt üst üste biniyordu.
   * 8’den az kimlik satırıyken boşluk korunur; 9. satır bu boşluğu doldurur, taşınmaz 17’den başlar.
   */
  let nextRow = Math.max(
    COK_FIRST_TASINMAZ,
    8 + Lk + (Lk < RES_COK_SATIR.kimlik ? 1 : 0),
  )

  const tasinmSatirlar = tasinmazJsonToExcelSatirlar(kayit.tasinmaz_json, kayit.kimlik_json)
  tasinmSatirlar.forEach((tRow, i) => {
    const rr = nextRow + i
    hucreYaz(ws, 'A', rr, String(i + 1))
    hucreYazMetin(ws, `C${rr}`, tRow.cins)
    hucreYazMetin(ws, `D${rr}`, tRow.adres)
    hucreYazMetin(ws, `L${rr}`, tRow.hisse)
    hucreYazMetin(ws, `N${rr}`, tRow.deger)
    hucreYazMetin(ws, `R${rr}`, tRow.edinmeTr)
    hucreYazMetin(ws, `U${rr}`, tRow.malikTc)
  })
  nextRow += tasinmSatirlar.length

  const koopSatirlar = kooperatifJsonToExcelSatirlar(kayit.kooperatif_json, kayit.kimlik_json)
  koopSatirlar.forEach((kRow, i) => {
    const rr = nextRow + i
    hucreYaz(ws, 'A', rr, String(i + 1))
    hucreYazMetin(ws, `C${rr}`, kRow.adiYeri)
    hucreYazMetin(ws, `N${rr}`, kRow.hisseDegeri)
    hucreYazMetin(ws, `R${rr}`, kRow.uyelikTr)
    hucreYazMetin(ws, `V${rr}`, kRow.hissedarTc)
  })
  nextRow += koopSatirlar.length

  const tasitSatirlar = tasitJsonToExcelSatirlar(kayit.tasitlar_json, kayit.kimlik_json)
  tasitSatirlar.forEach((row, i) => {
    const rr = nextRow + i
    hucreYaz(ws, 'A', rr, String(i + 1))
    hucreYazMetin(ws, `C${rr}`, row.cins)
    hucreYazMetin(ws, `D${rr}`, row.plaka)
    hucreYazMetin(ws, `F${rr}`, row.markaModel)
    hucreYazMetin(ws, `M${rr}`, row.modelYili)
    hucreYazMetin(ws, `N${rr}`, row.edinmeDegerFmt)
    hucreYazMetin(ws, `R${rr}`, row.edinmeTr)
    hucreYazMetin(ws, `T${rr}`, row.sahipTc)
  })
  nextRow += tasitSatirlar.length

  const digerSatirlar = digerTasinirJsonToExcelSatirlar(kayit.diger_tasinirlar_json, kayit.kimlik_json)
  digerSatirlar.forEach((row, i) => {
    const rr = nextRow + i
    hucreYaz(ws, 'A', rr, String(i + 1))
    hucreYazMetin(ws, `C${rr}`, row.cinsi)
    hucreYazMetin(ws, `J${rr}`, row.modelYili)
    hucreYazMetin(ws, `N${rr}`, row.edinmeDegerFmt)
    hucreYazMetin(ws, `R${rr}`, row.edinmeTr)
    hucreYazMetin(ws, `T${rr}`, row.sahipTc)
  })
  nextRow += digerSatirlar.length

  const bankaSatirlar = bankaMenkulJsonToExcelSatirlar(kayit.banka_menkul_json, kayit.kimlik_json)
  bankaSatirlar.forEach((row, i) => {
    const rr = nextRow + i
    hucreYaz(ws, 'A', rr, String(i + 1))
    hucreYazMetin(ws, `B${rr}`, row.nitelik)
    hucreYazMetin(ws, `D${rr}`, row.cinsi)
    hucreYazMetin(ws, `H${rr}`, row.miktarFmt)
    hucreYazMetin(ws, `M${rr}`, row.kurFmt)
    hucreYazMetin(ws, `O${rr}`, row.degerFmt)
    hucreYazMetin(ws, `U${rr}`, row.sahipTc)
  })
  nextRow += bankaSatirlar.length

  const altinSatirlar = altinMucevherJsonToExcelSatirlar(kayit.altin_mucevher_json, kayit.kimlik_json)
  altinSatirlar.forEach((row, i) => {
    const rr = nextRow + i
    hucreYaz(ws, 'A', rr, String(i + 1))
    hucreYazMetin(ws, `B${rr}`, row.cinsi)
    hucreYazMetin(ws, `D${rr}`, row.turu)
    hucreYazMetin(ws, `I${rr}`, row.miktarFmt)
    hucreYazMetin(ws, `M${rr}`, row.kurFmt)
    hucreYazMetin(ws, `O${rr}`, row.degerFmt)
    hucreYazMetin(ws, `U${rr}`, row.sahipTc)
  })
  nextRow += altinSatirlar.length

  const borcSatirlar = borcAlacakJsonToExcelSatirlar(kayit.borc_alacak_json)
  borcSatirlar.forEach((row, i) => {
    const rr = nextRow + i
    hucreYaz(ws, 'A', rr, String(i + 1))
    hucreYazMetin(ws, `B${rr}`, row.borclu)
    hucreYazMetin(ws, `G${rr}`, row.alacakli)
    hucreYazMetin(ws, `M${rr}`, row.birimi)
    hucreYazMetin(ws, `N${rr}`, row.miktarFmt)
    hucreYazMetin(ws, `R${rr}`, row.kurFmt)
    hucreYazMetin(ws, `U${rr}`, row.tutarFmt)
  })
  nextRow += borcSatirlar.length

  const haklarSatirlar = haklarJsonToExcelSatirlar(kayit.haklar_json, kayit.kimlik_json)
  const firstHaklarRow = nextRow
  haklarSatirlar.forEach((row, i) => {
    const rr = firstHaklarRow + i
    hucreYaz(ws, 'A', rr, String(i + 1))
    hucreYazMetin(ws, `B${rr}`, row.unsur)
    hucreYazMetin(ws, `M${rr}`, row.edinmeSekli)
    hucreYazMetin(ws, `U${rr}`, row.sahipTc)
  })
  /* Şablonda haklar için 4 satır (76–79) ayrılmış; satır yoksa bile açıklama 80’de kalmalı. */
  nextRow = firstHaklarRow + Math.max(haklarSatirlar.length, RES_COK_SATIR.haklar)

  const aciklama = str(kayit.aciklama)
  if (aciklama) hucreYazMetin(ws, `A${nextRow}`, aciklama)

  hucreYazMetin(ws, `U${nextRow + 1}`, p.adSoyad || '')
  hucreYazMetin(ws, `U${nextRow + 2}`, formatTarihTrGunAyYil(kayit.onay_tarihi))
  hucreYazMetin(ws, `U${nextRow + 3}`, str(kayit.beyan_turu))
}

/**
 * Supabase mal_bildirimi satırı + personel/kadro bilgisi ile şablona yazar (GAS malBildirimSablonHucreEslestir_).
 */
export function malBildirimSablonHucreEslestir(
  ws: Worksheet,
  kayit: {
    sicil_no: string
    son_net_maas: number | null
    aciklama: string | null
    beyan_turu: string | null
    onay_tarihi: string | null
    kimlik_json: unknown
    tasinmaz_json: unknown
    kooperatif_json: unknown
    tasitlar_json: unknown
    diger_tasinirlar_json: unknown
    banka_menkul_json: unknown
    altin_mucevher_json: unknown
    borc_alacak_json: unknown
    haklar_json: unknown
  },
  p: MalExcelPersonelBilgi,
  asama: MalExcelAsama = 1,
  mod: MalExcelExportModu = 'varsayilan',
) {
  const sonNet =
    kayit.son_net_maas == null ? null : malMaasParse(kayit.son_net_maas as string | number)
  const sonNetFmt = sonNet != null && sonNet > 0 ? malFormatTrNumber(sonNet) : ''
  const sonNetX5 = sonNet != null && sonNet > 0 ? malFormatTrNumber(sonNet * 5) : ''

  /* Aşama 1 — şablon: G2 görev, G3 sicil, U3 TC, D5 net maaş, T5 ×5; Bölüm-1 satır 8+; A80 açıklama; U81–U83 onay */
  if (asama === 1) {
    if (mod === 'coksatir') {
      malBildirimAsama1CokSatirli(ws, kayit, p, sonNetFmt, sonNetX5)
      return
    }
    hucreYaz(ws, 'G', 2, p.gorevUnvani || p.kadroUnvani)
    hucreYaz(ws, 'G', 3, kayit.sicil_no)
    hucreYazMetin(ws, 'U3', p.tckn)
    hucreYazMetin(ws, 'D5', sonNetFmt)
    hucreYazMetin(ws, 'T5', sonNetX5)

    const kimlikSatirlar = kimlikJsonToExcelSatirlar(kayit.kimlik_json)
    kimlikSatirlar.forEach((row, i) => {
      const rr = 8 + i
      hucreYaz(ws, 'A', rr, String(i + 1))
      hucreYazMetin(ws, `C${rr}`, row.adSoyad)
      hucreYazMetin(ws, `I${rr}`, row.dogumTarihi)
      hucreYazMetin(ws, `M${rr}`, row.dogumYeri)
      hucreYazMetin(ws, `Q${rr}`, row.yakinlik)
      hucreYazMetin(ws, `T${rr}`, row.tckn)
    })

    const aciklama = str(kayit.aciklama)
    if (aciklama) hucreYazMetin(ws, 'A80', aciklama)

    hucreYazMetin(ws, 'U81', p.adSoyad || '')
    hucreYazMetin(ws, 'U82', formatTarihTrGunAyYil(kayit.onay_tarihi))
    hucreYazMetin(ws, 'U83', str(kayit.beyan_turu))

    const tasinmSatirlar = tasinmazJsonToExcelSatirlar(kayit.tasinmaz_json, kayit.kimlik_json)
    tasinmSatirlar.forEach((tRow, i) => {
      const rr = 17 + i
      hucreYaz(ws, 'A', rr, String(i + 1))
      hucreYazMetin(ws, `C${rr}`, tRow.cins)
      hucreYazMetin(ws, `D${rr}`, tRow.adres)
      hucreYazMetin(ws, `L${rr}`, tRow.hisse)
      hucreYazMetin(ws, `N${rr}`, tRow.deger)
      hucreYazMetin(ws, `R${rr}`, tRow.edinmeTr)
      hucreYazMetin(ws, `U${rr}`, tRow.malikTc)
    })

    const koopSatirlar = kooperatifJsonToExcelSatirlar(kayit.kooperatif_json, kayit.kimlik_json)
    koopSatirlar.forEach((kRow, i) => {
      const rr = 28 + i
      hucreYaz(ws, 'A', rr, String(i + 1))
      hucreYazMetin(ws, `C${rr}`, kRow.adiYeri)
      hucreYazMetin(ws, `N${rr}`, kRow.hisseDegeri)
      hucreYazMetin(ws, `R${rr}`, kRow.uyelikTr)
      hucreYazMetin(ws, `V${rr}`, kRow.hissedarTc)
    })

    const tasitSatirlar = tasitJsonToExcelSatirlar(kayit.tasitlar_json, kayit.kimlik_json)
    tasitSatirlar.forEach((row, i) => {
      const rr = 34 + i
      hucreYaz(ws, 'A', rr, String(i + 1))
      hucreYazMetin(ws, `C${rr}`, row.cins)
      hucreYazMetin(ws, `D${rr}`, row.plaka)
      hucreYazMetin(ws, `F${rr}`, row.markaModel)
      hucreYazMetin(ws, `M${rr}`, row.modelYili)
      hucreYazMetin(ws, `N${rr}`, row.edinmeDegerFmt)
      hucreYazMetin(ws, `R${rr}`, row.edinmeTr)
      hucreYazMetin(ws, `T${rr}`, row.sahipTc)
    })

    const digerSatirlar = digerTasinirJsonToExcelSatirlar(kayit.diger_tasinirlar_json, kayit.kimlik_json)
    digerSatirlar.forEach((row, i) => {
      const rr = 43 + i
      hucreYaz(ws, 'A', rr, String(i + 1))
      hucreYazMetin(ws, `C${rr}`, row.cinsi)
      hucreYazMetin(ws, `J${rr}`, row.modelYili)
      hucreYazMetin(ws, `N${rr}`, row.edinmeDegerFmt)
      hucreYazMetin(ws, `R${rr}`, row.edinmeTr)
      hucreYazMetin(ws, `T${rr}`, row.sahipTc)
    })

    const bankaSatirlar = bankaMenkulJsonToExcelSatirlar(kayit.banka_menkul_json, kayit.kimlik_json)
    bankaSatirlar.forEach((row, i) => {
      const rr = 53 + i
      hucreYaz(ws, 'A', rr, String(i + 1))
      hucreYazMetin(ws, `B${rr}`, row.nitelik)
      hucreYazMetin(ws, `D${rr}`, row.cinsi)
      hucreYazMetin(ws, `H${rr}`, row.miktarFmt)
      hucreYazMetin(ws, `M${rr}`, row.kurFmt)
      hucreYazMetin(ws, `O${rr}`, row.degerFmt)
      hucreYazMetin(ws, `U${rr}`, row.sahipTc)
    })

    const altinSatirlar = altinMucevherJsonToExcelSatirlar(kayit.altin_mucevher_json, kayit.kimlik_json)
    altinSatirlar.forEach((row, i) => {
      const rr = 63 + i
      hucreYaz(ws, 'A', rr, String(i + 1))
      hucreYazMetin(ws, `B${rr}`, row.cinsi)
      hucreYazMetin(ws, `D${rr}`, row.turu)
      hucreYazMetin(ws, `I${rr}`, row.miktarFmt)
      hucreYazMetin(ws, `M${rr}`, row.kurFmt)
      hucreYazMetin(ws, `O${rr}`, row.degerFmt)
      hucreYazMetin(ws, `U${rr}`, row.sahipTc)
    })

    const borcSatirlar = borcAlacakJsonToExcelSatirlar(kayit.borc_alacak_json)
    borcSatirlar.forEach((row, i) => {
      const rr = 69 + i
      hucreYaz(ws, 'A', rr, String(i + 1))
      hucreYazMetin(ws, `B${rr}`, row.borclu)
      hucreYazMetin(ws, `G${rr}`, row.alacakli)
      hucreYazMetin(ws, `M${rr}`, row.birimi)
      hucreYazMetin(ws, `N${rr}`, row.miktarFmt)
      hucreYazMetin(ws, `R${rr}`, row.kurFmt)
      hucreYazMetin(ws, `U${rr}`, row.tutarFmt)
    })

    const haklarSatirlar = haklarJsonToExcelSatirlar(kayit.haklar_json, kayit.kimlik_json)
    haklarSatirlar.forEach((row, i) => {
      const rr = 76 + i
      hucreYaz(ws, 'A', rr, String(i + 1))
      hucreYazMetin(ws, `B${rr}`, row.unsur)
      hucreYazMetin(ws, `M${rr}`, row.edinmeSekli)
      hucreYazMetin(ws, `U${rr}`, row.sahipTc)
    })
    return
  }

  const { kimlik: k, kimlikEkler } = unpackKimlik(kayit.kimlik_json)
  const kimlikEk = kimlikEkler.slice(0, 8)
  const tasinmazlar = tasinmazJsonToExcelSatirlar(kayit.tasinmaz_json, kayit.kimlik_json)
    .slice(0, 11)
    .map(r => ({
      cins: r.cins,
      adresi: r.adres,
      hissesi: r.hisse,
      degeri: r.deger,
      edinmeTarihi: r.edinmeTr,
      malikTc: r.malikTc,
    }))
  const kooperatifler = toArr(kayit.kooperatif_json).map(mapKooperatif).slice(0, 6)
  const tasitlar = toArr(kayit.tasitlar_json).map(mapTasit).slice(0, 9)
  const diger = toArr(kayit.diger_tasinirlar_json).map(mapDiger).slice(0, 10)
  const banka = toArr(kayit.banka_menkul_json).map(mapBanka).slice(0, 10)
  const altin = toArr(kayit.altin_mucevher_json).map(mapAltin).slice(0, 20)
  const borc = toArr(kayit.borc_alacak_json).map(mapBorc).slice(0, 20)
  const haklar = haklarJsonToExcelSatirlar(kayit.haklar_json, kayit.kimlik_json)
    .slice(0, 20)
    .map(r => ({
      unsur: r.unsur,
      edinmeSekli: r.edinmeSekli,
      sahibiTc: r.sahipTc,
    }))

  hucreYaz(ws, 'G', 2, p.kadroUnvani || p.gorevUnvani)
  hucreYaz(ws, 'G', 3, kayit.sicil_no)
  hucreYaz(ws, 'U', 3, k.tckn || p.tckn)
  hucreYaz(ws, 'C', 7, k.adSoyad || p.adSoyad)
  hucreYaz(ws, 'I', 7, k.dogumTarihi)
  hucreYaz(ws, 'M', 7, k.dogumYeri)
  hucreYaz(ws, 'Q', 7, 'Kendisi')
  hucreYaz(ws, 'T', 7, k.tckn || p.tckn)
  hucreYaz(ws, 'G', 4, sonNetFmt)
  hucreYaz(ws, 'K', 4, sonNetX5)

  listeYaz(ws, kimlikEk, 8, {
    adSoyad: 'C',
    dogumTarihi: 'I',
    dogumYeri: 'M',
    yakinlik: 'Q',
    tckn: 'T',
  })

  listeYaz(ws, tasinmazlar.length ? tasinmazlar : [{}], 17, {
    cins: 'C',
    adresi: 'D',
    hissesi: 'L',
    degeri: 'N',
    edinmeTarihi: 'R',
    malikTc: 'U',
  })

  listeYaz(ws, kooperatifler.length ? kooperatifler : [{}], 27, {
    adYeri: 'C',
    hisseDegeri: 'L',
    uyelikTarihi: 'R',
    hissedarTc: 'T',
  })

  listeYaz(ws, tasitlar, 34, {
    tasitCinsi: 'C',
    plakaNo: 'D',
    markaModel: 'F',
    modelYili: 'M',
    edinmeDegeri: 'N',
    edinmeTarihi: 'R',
    sahibiTc: 'T',
  })

  listeYaz(ws, diger, 43, {
    tasinirCinsi: 'C',
    modelYili: 'J',
    edinmeDegeri: 'N',
    edinmeTarihi: 'R',
    sahibiTc: 'T',
  })

  listeYaz(ws, banka, 53, {
    nitelik: 'B',
    cinsi: 'D',
    miktar: 'H',
    guncelKur: 'M',
    deger: 'O',
    sahibiTc: 'U',
  })

  listeYaz(ws, altin, 63, {
    cinsi: 'B',
    turu: 'D',
    miktar: 'I',
    guncelKur: 'M',
    deger: 'O',
    sahibiTc: 'U',
  })

  listeYaz(ws, borc, 69, {
    borclu: 'B',
    alacakli: 'G',
    birimi: 'M',
    miktar: 'N',
    guncelKur: 'R',
    deger: 'U',
  })

  listeYaz(ws, haklar, 76, {
    unsur: 'B',
    edinmeSekli: 'M',
    sahibiTc: 'U',
  })

  hucreYaz(ws, 'A', 79, str(kayit.aciklama))
}
