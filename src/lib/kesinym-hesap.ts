/**
 * Kesinti Modülleri Hesap Motoru — RMY / IVY / IZY
 *
 * GAS kaynak: RaporluPersonelYeni.gs, IzinliVekillerYeni.gs, IzinliZabitalarYeni.gs
 *
 * Ortak mantık: "İlk seçim döneminden itibaren dönem zincirini yürüt"
 *   firstIdx → curIdx arası her dönem için:
 *     od = önceki dönemin SD'si  (firstIdx'te 0)
 *     kes = min(toplam/od, kapasite)
 *     sd  = max(0, toplam/od − kes)
 *
 * Gün hesabı farkları:
 *   RMY → takvim günü (ayrılış–başlama−1, dahil); izin.gun kullanılırsa o alınır
 *   IVY → tatil dışı hafta içi gün
 *   IZY → takvim günü
 *
 * Kapasite farkı:
 *   RMY/IVY → min(dönem_takvim_günü, 30)
 *   IZY     → dönem_takvim_günü (sınırsız)
 */

export type KesintimModul = 'rmy' | 'ivy' | 'izy'

// ─── Veri Tipleri ─────────────────────────────────────────────────────────────

export interface KesintimIzinRow {
  sira_no:  string
  sicil_no: string
  ad_soyad: string
  unvan:    string
  tur:      string
  ayrilis:  string | null   // iznin başlangıç tarihi
  baslama:  string | null   // işe dönüş tarihi (son izin günü + 1)
  gun:      number
}

export interface KesintimDonemRow {
  id:                  number
  baslangic_tarihi:    string
  bitis_tarihi:        string
  baslangic_tarihi_ms: number
  bitis_tarihi_ms:     number
  /** Kronolojik sıra indeksi (0-based) */
  idx:                 number
  /** Takvim gün sayısı (dahil) */
  takvimGun:           number
  /** Kapasite cap */
  kapasite:            number
}

export interface KesintimHesapSatir {
  sira_no:  string
  sicil_no: string
  ad_soyad: string
  unvan:    string
  tur:      string
  OD:       number
  /** RMY: Rapor günü; IVY/IZY: toplam izin günü */
  R:        number
  /** RMY: Refakatçi İzni günü; IVY/IZY: 0 */
  RR:       number
  /** RMY: Heyet Raporu günü; diğer: 0 */
  HR:       number
  K:        number
  SD:       number
  /** RMY: Yıllık kümülatif R+HR (Rapor Bakiyesi); diğer: 0 */
  RB:       number
  kategori: KesintimKategori
}

export interface KesintimPersonelOzet {
  seq:      number
  sicil_no: string
  ad_soyad: string
  unvan:    string
  OD:       number
  R:        number
  RR:       number
  HR:       number  // RMY: Heyet Raporu toplam; diğer: 0
  IZ:       number  // R + RR + HR (veya IVY/IZY için sadece R)
  K:        number
  SD:       number
  /** RMY: Yıllık kümülatif R+HR (kişi bazında son bakiye); diğer: 0 */
  RB:       number
}

export type KesintimKategori = 'Takipteki İzinler' | 'Dönemdeki İzinler' | 'Askıdaki İzinler'

export interface KesintimHesapSonucu {
  satirlar:    KesintimHesapSatir[]
  personeller: KesintimPersonelOzet[]
  takipteki:   KesintimPersonelOzet[]
  donemdeki:   KesintimPersonelOzet[]
  askidaki:    KesintimPersonelOzet[]
}

// ─── Tatil Yardımcıları ───────────────────────────────────────────────────────

interface TatilRange { basMs: number; bitMs: number }

export function buildTatilRangesKm(
  tatiller: { tatil_adi?: string | null; tatil_turu?: string | null; tatil_yapisi?: 'Yıllık Tatil' | 'Sabit Tatil' | null; tatil_baslangici: string; tatil_bitisi: string; durum: boolean }[],
  yilList: number[]
): TatilRange[] {
  const years = Array.from(new Set((yilList ?? []).filter(y => Number.isFinite(y)))).sort((a, b) => a - b)
  return tatiller
    .filter(t => t.durum)
    .flatMap(t => {
      const bSrc = new Date(t.tatil_baslangici)
      const eSrc = new Date(t.tatil_bitisi)
      const yapisi = t.tatil_yapisi ?? ((t.tatil_turu ?? '').toLowerCase().includes('dini') ? 'Yıllık Tatil' : 'Sabit Tatil')
      if (yapisi === 'Yıllık Tatil') {
        return [{ basMs: sod(bSrc), bitMs: new Date(eSrc.getFullYear(), eSrc.getMonth(), eSrc.getDate(), 23, 59, 59, 999).getTime() }]
      }
      // Sabit tatil: ilgili dönem yıllarına kopyala
      return years.map(y => {
        const b = new Date(y, bSrc.getMonth(), bSrc.getDate())
        const e = new Date(y, eSrc.getMonth(), eSrc.getDate())
        return { basMs: sod(b), bitMs: new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999).getTime() }
      })
    })
}

function isTatil(ms: number, tatiller: TatilRange[]): boolean {
  return tatiller.some(t => ms >= t.basMs && ms <= t.bitMs)
}

// ─── Tarih Yardımcıları ───────────────────────────────────────────────────────

function sod(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function parseD(s: string | null | undefined): Date | null {
  if (!s) return null
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3])
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

/** Takvim gün sayısı [basMs, bitMs] dahil */
function takvimDahil(basMs: number, bitMs: number): number {
  if (bitMs < basMs) return 0
  return Math.floor((bitMs - basMs) / 86_400_000) + 1
}

/** Tatil dışı hafta içi gün sayısı [basMs, bitMs] dahil */
function tatilDisiHaftaIci(basMs: number, bitMs: number, tatiller: TatilRange[]): number {
  if (bitMs < basMs) return 0
  let cnt = 0
  const cur = new Date(basMs)
  while (cur.getTime() <= bitMs) {
    const day = cur.getDay()
    const ms  = cur.getTime()
    if (day !== 0 && day !== 6 && !isTatil(ms, tatiller)) cnt++
    cur.setDate(cur.getDate() + 1)
  }
  return cnt
}

/** Overlap [a,b] ∩ [c,d] takvim günü */
function takvimOverlap(aBas: number, aBit: number, bBas: number, bBit: number): number {
  const s = Math.max(aBas, bBas)
  const e = Math.min(aBit, bBit)
  return takvimDahil(s, e)
}

/** Overlap [a,b] ∩ [c,d] tatil dışı hafta içi */
function tatilDisiOverlap(aBas: number, aBit: number, bBas: number, bBit: number, tatiller: TatilRange[]): number {
  const s = Math.max(aBas, bBas)
  const e = Math.min(aBit, bBit)
  return tatilDisiHaftaIci(s, e, tatiller)
}

// ─── İzin Toplam & Kesişim Gün ───────────────────────────────────────────────

interface GunFns {
  toplam: (startMs: number, lastMs: number, gunVal: number, tatiller: TatilRange[]) => number
  overlap: (startMs: number, lastMs: number, pBas: number, pBit: number, tatiller: TatilRange[]) => number
  kapasite: (takvimGun: number) => number
}

const GUN_FNS: Record<KesintimModul, GunFns> = {
  rmy: {
    toplam:   (s, l, g, _) => g > 0 ? g : takvimDahil(s, l),
    overlap:  (s, l, pB, pBi, _) => takvimOverlap(s, l, pB, pBi),
    kapasite: (tg) => Math.min(tg, 30),
  },
  ivy: {
    toplam:   (s, l, g, _) => g > 0 ? g : takvimDahil(s, l),
    overlap:  (s, l, pB, pBi, _) => takvimOverlap(s, l, pB, pBi),
    kapasite: (tg) => Math.min(tg, 30),
  },
  izy: {
    toplam:   (s, l, g, _) => g > 0 ? g : takvimDahil(s, l),
    overlap:  (s, l, pB, pBi, _) => takvimOverlap(s, l, pB, pBi),
    kapasite: (tg) => tg,  // IZY'de 30-gün cap yok
  },
}

// ─── Ana Hesap Motoru ─────────────────────────────────────────────────────────

export interface KesintimHesapParams {
  modul:     KesintimModul
  curId:     number
  donemler:  KesintimDonemRow[]
  /** Her izin sira_no için dahil olduğu en erken dönem id'si */
  ilkDonemIdBySiraNo: Record<string, number>
  izinler:   KesintimIzinRow[]
  tatiller:  { tatil_baslangici: string; tatil_bitisi: string; durum: boolean }[]
  /**
   * IZY: Yıllık Rapor Bakiyesi (30 gün) için sicilin yıldaki tüm R/HR izinleri.
   * Verilmezse yalnızca `izinler` içindeki R/HR kullanılır.
   */
  izyAnnualRhIzinler?: KesintimIzinRow[]
}

const IZY_YILLIK_RAPOR_LIMIT = 30

/** Sosyal Hak IZY: aylık kesinti üst sınırı (dönem takvim gününden bağımsız) */
export const SHAK_IZY_KESINTI_KAPASITE = 30

/** IZY R/HR izin süresi (takvim günü) */
export function izyRhToplamGun(iv: Pick<KesintimIzinRow, 'ayrilis' | 'baslama' | 'gun'>): number {
  const ayrilis = parseD(iv.ayrilis)
  const baslama = parseD(iv.baslama)
  if (!ayrilis || !baslama) return iv.gun > 0 ? iv.gun : 0
  const startMs = sod(ayrilis)
  const lastDate = new Date(sod(baslama))
  lastDate.setDate(lastDate.getDate() - 1)
  const lastMs = sod(lastDate)
  if (lastMs < startMs) return 0
  return iv.gun > 0 ? iv.gun : Math.floor((lastMs - startMs) / 86_400_000) + 1
}

/**
 * Bu izinden kesilecek gün: yıllık R+HR 30'u aştığında aşan kısım.
 * Bakiye zaten 30+ ise iznin tamamı kesintiye tabidir.
 */
export function computeIzyRhDeductAmount(bakiyeBefore: number, toplam: number): number {
  const excessBefore = Math.max(0, bakiyeBefore - IZY_YILLIK_RAPOR_LIMIT)
  const excessAfter  = Math.max(0, bakiyeBefore + toplam - IZY_YILLIK_RAPOR_LIMIT)
  return excessAfter - excessBefore
}

/** Her R/HR kaydı için işlenmeden önceki yıllık kümülatif bakiye */
export function buildIzyAnnualBakiyeBeforeMap(rhIzinler: KesintimIzinRow[]): Map<string, number> {
  const annualBakiyeBeforeSiraNo = new Map<string, number>()
  const annualBySicilYear = new Map<string, number>()
  const sorted = [...rhIzinler]
    .filter(iv => iv.tur === 'Rapor' || iv.tur === 'Heyet Raporu')
    .sort((a, b) => {
      const sc = a.sicil_no.localeCompare(b.sicil_no, 'tr')
      if (sc !== 0) return sc
      return (a.ayrilis ?? '').localeCompare(b.ayrilis ?? '')
    })
  for (const iv of sorted) {
    const year = (iv.ayrilis ?? '').slice(0, 4)
    if (!year) continue
    const key = `${iv.sicil_no}:${year}`
    const before = annualBySicilYear.get(key) ?? 0
    annualBakiyeBeforeSiraNo.set(iv.sira_no, before)
    annualBySicilYear.set(key, before + izyRhToplamGun(iv))
  }
  return annualBakiyeBeforeSiraNo
}

export function isIzyRhTur(tur: string): boolean {
  return tur === 'Rapor' || tur === 'Heyet Raporu'
}

/** Sicilin yılda belirli tarihe kadar (dahil) kümülatif R+HR gün toplamı */
export function izyRhPeakForSicilYear(
  rhIzinler: KesintimIzinRow[],
  sicil: string,
  year: string,
  bitisMs?: number,
): number {
  let sum = 0
  for (const iv of rhIzinler) {
    if (iv.sicil_no !== sicil || !isIzyRhTur(iv.tur)) continue
    if ((iv.ayrilis ?? '').slice(0, 4) !== year) continue
    if (bitisMs !== undefined) {
      const a = parseD(iv.ayrilis)
      if (!a || sod(a) > bitisMs) continue
    }
    sum += izyRhToplamGun(iv)
  }
  return sum
}

export interface IzyPersonPeriodKsd {
  OD: number
  K:  number
  SD: number
}

/** Sosyal Hak aylık dışa aktarım: K/SD yalnızca bu takvim penceresinde hesaplanır */
export interface IzyRhKsdWindow {
  baslangicMs: number
  bitisMs: number
  /** sosyal_hak_donem.id — dönem bazlı K override eşlemesi için */
  donemId?: number
}

/** SH dönemine ait manuel K/SD düzeltmesi (zincir taşıması için) */
export interface IzyRhKsdDonemOverride {
  sicil_no: string
  k_override: number
  sd_override?: number | null
}

function applyIzyRhKsdOverridesToMonth(
  monthResult: Map<string, IzyPersonPeriodKsd>,
  carryBySicil: Map<string, number>,
  overrides: IzyRhKsdDonemOverride[],
): void {
  for (const ov of overrides) {
    const sicil = String(ov.sicil_no).trim()
    const cur = monthResult.get(sicil)
    if (!cur) continue
    const k = Math.max(0, Math.floor(ov.k_override))
    const sd =
      ov.sd_override != null && Number.isFinite(ov.sd_override)
        ? Math.max(0, Math.floor(ov.sd_override))
        : Math.max(0, cur.K + cur.SD - k)
    monthResult.set(sicil, { OD: cur.OD, K: k, SD: sd })
    carryBySicil.set(sicil, sd)
  }
}

function izyRhDaysInRange(
  sicil: string,
  annualRhIzinler: KesintimIzinRow[],
  rangeStartMs: number,
  rangeEndMs: number,
): { days: number; years: Set<string> } {
  let days = 0
  const years = new Set<string>()
  for (const iv of annualRhIzinler) {
    if (iv.sicil_no !== sicil || !isIzyRhTur(iv.tur)) continue
    const a = parseD(iv.ayrilis)
    if (!a) continue
    const startMs = sod(a)
    if (startMs >= rangeStartMs && startMs <= rangeEndMs) {
      days += izyRhToplamGun(iv)
      years.add((iv.ayrilis ?? '').slice(0, 4))
    }
  }
  return { days, years }
}

function izyRhKsdStep(
  carryIn: number,
  rhDaysInPeriod: number,
  rbPeakEndMs: number,
  years: Set<string>,
  annualRhIzinler: KesintimIzinRow[],
  sicil: string,
  kapasite: number,
): { OD: number; K: number; SD: number } {
  let rbPeak = 0
  const yearsToCheck = years.size > 0 ? [...years] : [new Date(rbPeakEndMs).getFullYear().toString()]
  for (const year of yearsToCheck) {
    const peak = izyRhPeakForSicilYear(annualRhIzinler, sicil, year, rbPeakEndMs)
    if (peak > rbPeak) rbPeak = peak
  }

  const carry = carryIn
  let queue = 0
  let K = 0
  if (carry > 0) {
    queue = carry + rhDaysInPeriod
    K = Math.min(queue, kapasite)
  } else if (rbPeak > IZY_YILLIK_RAPOR_LIMIT) {
    queue = rbPeak
    K = Math.min(Math.max(0, queue - IZY_YILLIK_RAPOR_LIMIT), kapasite)
  }
  return { OD: carry, K, SD: queue - K }
}

function runIzyRhKsdWindow(
  carryBySicil: Map<string, number>,
  result: Map<string, IzyPersonPeriodKsd>,
  annualRhIzinler: KesintimIzinRow[],
  rangeStartMs: number,
  rangeEndMs: number,
  writeResult: boolean,
  /** Bu SH dönemine aktarılmış R/HR günleri (son ay satırında kuyruğa eklenir) */
  donemRhDaysBySicil?: Map<string, number>,
  /** Kesilen üst sınırı; verilmezse dönem takvim günü kullanılır */
  kesintiKapasite?: number,
): void {
  const periodGun = Math.floor((rangeEndMs - rangeStartMs) / 86_400_000) + 1
  const kapasite  = kesintiKapasite ?? periodGun
  const sicillerInPeriod = new Set<string>()
  for (const iv of annualRhIzinler) {
    if (!isIzyRhTur(iv.tur)) continue
    const a = parseD(iv.ayrilis)
    if (!a) continue
    const startMs = sod(a)
    if (startMs >= rangeStartMs && startMs <= rangeEndMs) {
      sicillerInPeriod.add(iv.sicil_no)
    }
  }
  if (donemRhDaysBySicil) {
    for (const [sicil, gun] of donemRhDaysBySicil) {
      if (gun > 0) sicillerInPeriod.add(sicil)
    }
  }
  // Yalnızca devir taşıyan personel de her ay işlenmeli (Haziran vb. yeni izin olmasa da K=30).
  for (const [sicil, carry] of carryBySicil) {
    if (carry > 0) sicillerInPeriod.add(sicil)
  }

  const processSicil = (sicil: string) => {
    let { days: rhDaysInPeriod, years } = izyRhDaysInRange(sicil, annualRhIzinler, rangeStartMs, rangeEndMs)
    const donemGun = donemRhDaysBySicil?.get(sicil) ?? 0
    if (donemGun > rhDaysInPeriod) rhDaysInPeriod = donemGun
    const carryIn = carryBySicil.get(sicil) ?? 0
    const { OD, K, SD } = izyRhKsdStep(carryIn, rhDaysInPeriod, rangeEndMs, years, annualRhIzinler, sicil, kapasite)
    carryBySicil.set(sicil, SD)
    if (writeResult) result.set(sicil, { OD, K, SD })
  }

  for (const sicil of sicillerInPeriod) processSicil(sicil)

  if (writeResult) {
    for (const [sicil, carry] of carryBySicil) {
      if (sicillerInPeriod.has(sicil) || carry <= 0) continue
      const K = Math.min(carry, kapasite)
      const SD = carry - K
      carryBySicil.set(sicil, SD)
      result.set(sicil, { OD: carry, K, SD })
    }
  }
}

/**
 * Sosyal Hak aylık dönem zinciri: Ocak→…→mevcut ay sırayla işlenir.
 * Mayıs OD = Nisan SD (33); IZY modül dönemleri bu hesapta kullanılmaz.
 * overridesByDonemId verilirse ara aylardaki K düzeltmesi sonraki aya SD→OD olarak yansır.
 */
export function computeIzyRhKsdForShakMonths(
  annualRhIzinler: KesintimIzinRow[],
  shakWindows: IzyRhKsdWindow[],
  /** Dışa aktarılan SH dönemine seçilmiş R/HR izin günleri (sicil → toplam gün) */
  currentDonemRhDaysBySicil?: Map<string, number>,
  overridesByDonemId?: Map<number, IzyRhKsdDonemOverride[]>,
): Map<string, IzyPersonPeriodKsd> {
  const carryBySicil = new Map<string, number>()
  const result = new Map<string, IzyPersonPeriodKsd>()
  if (shakWindows.length === 0) return result

  for (let wi = 0; wi < shakWindows.length; wi++) {
    const w = shakWindows[wi]
    const isLast = wi === shakWindows.length - 1
    const monthResult = new Map<string, IzyPersonPeriodKsd>()
    const ovs =
      w.donemId != null && overridesByDonemId ? overridesByDonemId.get(w.donemId) : undefined
    // Override varsa ara ayda da K/SD yazılmalı (carry düzeltmesi için)
    const writeResult = isLast || Boolean(ovs?.length)

    runIzyRhKsdWindow(
      carryBySicil,
      monthResult,
      annualRhIzinler,
      w.baslangicMs,
      w.bitisMs,
      writeResult,
      isLast ? currentDonemRhDaysBySicil : undefined,
      SHAK_IZY_KESINTI_KAPASITE,
    )

    if (ovs?.length) {
      applyIzyRhKsdOverridesToMonth(monthResult, carryBySicil, ovs)
    }

    if (isLast) {
      for (const [sicil, ksd] of monthResult) result.set(sicil, ksd)
    }
  }
  return result
}

/** Sosyal Hak: her ay için kişi bazlı K/SD zinciri (debug / doğrulama). */
export function computeIzyRhKsdShakMonthChain(
  annualRhIzinler: KesintimIzinRow[],
  shakWindows: IzyRhKsdWindow[],
): Map<string, IzyPersonPeriodKsd[]> {
  const carryBySicil = new Map<string, number>()
  const chainBySicil = new Map<string, IzyPersonPeriodKsd[]>()

  for (const w of shakWindows) {
    const monthResult = new Map<string, IzyPersonPeriodKsd>()
    runIzyRhKsdWindow(
      carryBySicil,
      monthResult,
      annualRhIzinler,
      w.baslangicMs,
      w.bitisMs,
      true,
      undefined,
      SHAK_IZY_KESINTI_KAPASITE,
    )
    for (const [sicil, ksd] of monthResult) {
      const list = chainBySicil.get(sicil) ?? []
      list.push(ksd)
      chainBySicil.set(sicil, list)
    }
  }
  return chainBySicil
}

/** Sosyal Hak yılı için dönem pencereleri (mevcut döneme kadar) */
export function buildShakWindowsForYear(
  donemler: { id?: number; baslangic_tarihi: string; bitis_tarihi: string }[],
  year: number,
  bitisMsLimit: number,
): IzyRhKsdWindow[] {
  return donemler
    .map(d => {
      const bas = parseD(d.baslangic_tarihi)
      const bit = parseD(d.bitis_tarihi)
      if (!bas || !bit) return null
      const basY = bas.getFullYear()
      const bitY = bit.getFullYear()
      const bitisMs = new Date(bit.getFullYear(), bit.getMonth(), bit.getDate(), 23, 59, 59, 999).getTime()
      const yilaAit = basY === year || bitY === year
      const limitGun = sod(new Date(bitisMsLimit))
      if (!yilaAit || sod(bit) > limitGun) return null
      return {
        baslangicMs: sod(bas),
        bitisMs,
        ...(d.id != null ? { donemId: d.id } : {}),
      }
    })
    .filter((w): w is IzyRhKsdWindow => w !== null)
    .sort((a, b) => a.baslangicMs - b.baslangicMs)
}

export function buildKesintimSonucFromSatirlar(
  satirlar: KesintimHesapSatir[],
  personelKapasite: number,
): KesintimHesapSonucu {
  return {
    satirlar,
    personeller: kisiOzetTopla(satirlar, personelKapasite),
    takipteki:   kisiOzetTopla(satirlar.filter(s => s.kategori === 'Takipteki İzinler'), personelKapasite),
    donemdeki:   kisiOzetTopla(satirlar.filter(s => s.kategori === 'Dönemdeki İzinler'), personelKapasite),
    askidaki:    kisiOzetTopla(satirlar.filter(s => s.kategori === 'Askıdaki İzinler'),  personelKapasite),
  }
}

/** Sosyal Hak devir satırı (döneme yeni izin yok, OD/K/SD zinciri devam ediyor) */
export const SHAK_IZY_DEVIR_SIRA_PREFIX = '__shak_devir__'

/** Sosyal Hak tarih aralığıyla en çok örtüşen modül dönemi */
export function pickGlobalCurDonemForShak(
  tumDonemler: KesintimDonemRow[],
  shakBasTarihi: string,
  shakBitTarihi: string,
  modul: KesintimModul,
): { globalCurDonem: KesintimDonemRow; donemler: KesintimDonemRow[] } {
  const shakBasMs = new Date(shakBasTarihi).setHours(0, 0, 0, 0)
  const shakBitMs = new Date(shakBitTarihi).setHours(23, 59, 59, 999)
  let globalCurDonem = tumDonemler[tumDonemler.length - 1]
  let maxOverlap = -1
  for (const p of tumDonemler) {
    const oS = Math.max(p.baslangic_tarihi_ms, shakBasMs)
    const oE = Math.min(p.bitis_tarihi_ms, shakBitMs)
    const ov = oE > oS ? oE - oS : -1
    if (ov > maxOverlap) { maxOverlap = ov; globalCurDonem = p }
  }
  if (maxOverlap < 0) {
    const vTg = Math.floor((shakBitMs - shakBasMs) / 86_400_000) + 1
    const virtualPeriod: KesintimDonemRow = {
      id: -999,
      baslangic_tarihi: shakBasTarihi,
      bitis_tarihi: shakBitTarihi,
      baslangic_tarihi_ms: shakBasMs,
      bitis_tarihi_ms: shakBitMs,
      idx: tumDonemler.length,
      takvimGun: vTg,
      kapasite: modul === 'izy' ? vTg : Math.min(vTg, 30),
    }
    return { globalCurDonem: virtualPeriod, donemler: [...tumDonemler, virtualPeriod] }
  }
  return { globalCurDonem, donemler: tumDonemler }
}

/** @deprecated pickGlobalCurDonemForShak kullanın */
export function pickIzyGlobalCurDonem(
  tumDonemler: KesintimDonemRow[],
  shakBasTarihi: string,
  shakBitTarihi: string,
): { globalCurDonem: KesintimDonemRow; donemler: KesintimDonemRow[] } {
  return pickGlobalCurDonemForShak(tumDonemler, shakBasTarihi, shakBitTarihi, 'izy')
}

/** Zincirde mevcut SH dönemine kadar olan dönem id'leri */
export function shakChainDonemIdsUpTo(
  donemler: { id: number; baslangic_tarihi: string; bitis_tarihi: string }[],
  shakYil: number,
  shakBitTarihi: string,
): number[] {
  return donemler
    .filter(d => {
      const basY = Number.parseInt(d.baslangic_tarihi.slice(0, 4), 10)
      const bitY = Number.parseInt(d.bitis_tarihi.slice(0, 4), 10)
      const yilaAit = basY === shakYil || bitY === shakYil
      return yilaAit && d.bitis_tarihi <= shakBitTarihi
    })
    .map(d => d.id)
}

function izyRhPeakAtMs(
  annualRhIzinler: KesintimIzinRow[],
  sicil: string,
  bitisMs: number,
): number {
  const years = new Set(
    annualRhIzinler
      .filter(iv => iv.sicil_no === sicil && isIzyRhTur(iv.tur))
      .map(iv => (iv.ayrilis ?? '').slice(0, 4))
      .filter(Boolean),
  )
  let peak = 0
  for (const year of years) {
    peak = Math.max(peak, izyRhPeakForSicilYear(annualRhIzinler, sicil, year, bitisMs))
  }
  return peak
}

/**
 * Döneme aktarılmış izni olmayan ama OD/K/SD zinciri devam eden personel için özet satırı.
 */
export function appendShakIzyCarryOnlySatirlar(
  satirlar: KesintimHesapSatir[],
  ksdBySicil: Map<string, IzyPersonPeriodKsd>,
  annualRhIzinler: KesintimIzinRow[],
  bitisMs?: number,
): KesintimHesapSatir[] {
  const rhSiciller = new Set(
    satirlar.filter(s => isIzyRhTur(s.tur) && !s.sira_no.startsWith(SHAK_IZY_DEVIR_SIRA_PREFIX)).map(s => s.sicil_no),
  )
  const personBySicil = new Map<string, { ad_soyad: string; unvan: string }>()
  for (const iv of annualRhIzinler) {
    if (!personBySicil.has(iv.sicil_no)) {
      personBySicil.set(iv.sicil_no, { ad_soyad: iv.ad_soyad, unvan: iv.unvan })
    }
  }

  const extra: KesintimHesapSatir[] = []
  for (const [sicil, ksd] of ksdBySicil) {
    if (rhSiciller.has(sicil)) continue
    if (ksd.OD === 0 && ksd.K === 0 && ksd.SD === 0) continue
    const person = personBySicil.get(sicil)
    if (!person) continue
    const rb = bitisMs !== undefined ? izyRhPeakAtMs(annualRhIzinler, sicil, bitisMs) : 0
    extra.push({
      sira_no: `${SHAK_IZY_DEVIR_SIRA_PREFIX}${sicil}`,
      sicil_no: sicil,
      ad_soyad: person.ad_soyad,
      unvan: person.unvan,
      tur: 'Rapor',
      OD: ksd.OD,
      R: 0,
      RR: 0,
      HR: 0,
      K: ksd.K,
      SD: ksd.SD,
      RB: rb,
      kategori: 'Dönemdeki İzinler',
    })
  }
  return extra.length > 0 ? [...satirlar, ...extra] : satirlar
}

/** Sosyal Hak önizleme / Excel: IZY K/SD + sabit 30 gün kesinti sınırı
 *
 * Üç kural birlikte uygulanır:
 * 1. Yıllık R/HR zinciri (Ocak→…→mevcut ay) — computeIzyRhKsdForShakMonths
 * 2. Önceki SH dönemlerinin IZY seçimleri annualRh'e dahil edilir (sosyal-hak-izy-hesap)
 * 3. Döneme izin aktarılmamış devir taşıyan personel — appendShakIzyCarryOnlySatirlar
 */
export function applyShakIzyKsdToSonuc(
  sonuc: KesintimHesapSonucu,
  annualRhIzinler: KesintimIzinRow[],
  shakWindows: IzyRhKsdWindow[],
  currentDonemRhDaysBySicil?: Map<string, number>,
  overridesByDonemId?: Map<number, IzyRhKsdDonemOverride[]>,
): KesintimHesapSonucu {
  const ksdBySicil = computeIzyRhKsdForShakMonths(
    annualRhIzinler,
    shakWindows,
    currentDonemRhDaysBySicil,
    overridesByDonemId,
  )
  let satirlar = applyIzyPersonPeriodKsd(sonuc.satirlar, ksdBySicil, annualRhIzinler)

  if (shakWindows.length > 0) {
    const bitisMs = shakWindows[shakWindows.length - 1].bitisMs
    const lastSiraBySicil = new Map<string, string>()
    const rhSatirlar = satirlar.filter(s => isIzyRhTur(s.tur))
    const izinBySn = new Map(annualRhIzinler.map(iv => [iv.sira_no, iv]))
    const sorted = [...rhSatirlar].sort((a, b) => {
      const ia = izinBySn.get(a.sira_no)
      const ib = izinBySn.get(b.sira_no)
      return (ia?.ayrilis ?? '').localeCompare(ib?.ayrilis ?? '')
    })
    for (const s of sorted) lastSiraBySicil.set(s.sicil_no, s.sira_no)

    satirlar = satirlar.map(s => {
      if (!isIzyRhTur(s.tur) || !ksdBySicil.has(s.sicil_no)) return s
      if (s.sira_no !== lastSiraBySicil.get(s.sicil_no)) return s
      const peak = izyRhPeakAtMs(annualRhIzinler, s.sicil_no, bitisMs)
      return peak > 0 ? { ...s, RB: peak } : s
    })

    satirlar = appendShakIzyCarryOnlySatirlar(satirlar, ksdBySicil, annualRhIzinler, bitisMs)
  }

  return buildKesintimSonucFromSatirlar(satirlar, SHAK_IZY_KESINTI_KAPASITE)
}

/** IZY modül dönem zinciri (native IZY ekranı / kesintimHesapla) */
export function computeIzyRhKsdBySicilForPeriod(
  donemler: KesintimDonemRow[],
  curPeriodId: number,
  annualRhIzinler: KesintimIzinRow[],
): Map<string, IzyPersonPeriodKsd> {
  const idxById = new Map(donemler.map(d => [d.id, d.idx]))
  const byIdx = new Map(donemler.map(d => [d.idx, d]))
  const curIdx = idxById.get(curPeriodId) ?? -1
  if (curIdx < 0) return new Map()

  const carryBySicil = new Map<string, number>()
  const result = new Map<string, IzyPersonPeriodKsd>()

  for (let pi = 0; pi <= curIdx; pi++) {
    const p = byIdx.get(pi)!
    runIzyRhKsdWindow(
      carryBySicil,
      result,
      annualRhIzinler,
      p.baslangic_tarihi_ms,
      p.bitis_tarihi_ms,
      pi === curIdx,
    )
  }

  return result
}

/** IZY R/HR satırlarına dönem sonu kişi bazlı K/SD uygular (yalnızca son kayıt satırında gösterilir) */
export function applyIzyPersonPeriodKsd(
  satirlar: KesintimHesapSatir[],
  ksdBySicil: Map<string, IzyPersonPeriodKsd>,
  annualRhIzinler: KesintimIzinRow[],
): KesintimHesapSatir[] {
  const lastSiraBySicil = new Map<string, string>()
  const rhSatirlar = satirlar.filter(s => isIzyRhTur(s.tur))
  const izinBySn = new Map(annualRhIzinler.map(iv => [iv.sira_no, iv]))

  const sorted = [...rhSatirlar].sort((a, b) => {
    const ia = izinBySn.get(a.sira_no)
    const ib = izinBySn.get(b.sira_no)
    return (ia?.ayrilis ?? '').localeCompare(ib?.ayrilis ?? '')
  })
  for (const s of sorted) {
    lastSiraBySicil.set(s.sicil_no, s.sira_no)
  }

  return satirlar.map(s => {
    if (!isIzyRhTur(s.tur)) return s
    const ksd = ksdBySicil.get(s.sicil_no)
    if (!ksd) return { ...s, OD: 0, K: 0, SD: 0 }
    if (s.sira_no !== lastSiraBySicil.get(s.sicil_no)) {
      return { ...s, OD: 0, K: 0, SD: 0 }
    }
    return { ...s, OD: ksd.OD, K: ksd.K, SD: ksd.SD }
  })
}

function kisiOzetTopla(
  satirlar: KesintimHesapSatir[],
  curKapasite: number
): KesintimPersonelOzet[] {
  const map = new Map<string, { p: Omit<KesintimPersonelOzet, 'seq'>; kapasite: number }>()

  for (const s of satirlar) {
    const ex = map.get(s.sicil_no)
    if (!ex) {
      map.set(s.sicil_no, {
        p: { sicil_no: s.sicil_no, ad_soyad: s.ad_soyad, unvan: s.unvan, OD: s.OD, R: s.R, RR: s.RR, HR: s.HR, IZ: s.R + s.RR + s.HR, K: s.K, SD: s.SD, RB: s.RB },
        kapasite: curKapasite,
      })
    } else {
      ex.p.OD += s.OD
      ex.p.R  += s.R
      ex.p.RR += s.RR
      ex.p.HR += s.HR
      ex.p.IZ += s.R + s.RR + s.HR
      ex.p.K  += s.K
      ex.p.SD += s.SD
      // RB: son (maksimum) bakiye değerini göster
      if (s.RB > ex.p.RB) ex.p.RB = s.RB
    }
  }

  // Kişi bazında kapasite aşımını SD'ye taşı
  const arr: KesintimPersonelOzet[] = []
  let seq = 1
  for (const { p, kapasite } of map.values()) {
    if (p.K > kapasite) {
      const asan = p.K - kapasite
      p.K = kapasite
      p.SD += asan
    }
    arr.push({ seq: seq++, ...p })
  }

  arr.sort((a, b) => {
    const na = parseInt(a.sicil_no) || 0
    const nb = parseInt(b.sicil_no) || 0
    return na !== nb ? na - nb : a.sicil_no.localeCompare(b.sicil_no)
  })
  arr.forEach((p, i) => { p.seq = i + 1 })
  return arr
}

/** Refakatçi İzni ile eski Refakatçi Raporu tur değerleri — eşanlamlı */
function isRefakatci(tur: string): boolean {
  return tur === 'Refakatçi Raporu' || tur === 'Refakatçi İzni'
}

export function kesintimHesapla(params: KesintimHesapParams): KesintimHesapSonucu {
  const { modul, curId, donemler, ilkDonemIdBySiraNo, izinler, tatiller, izyAnnualRhIzinler } = params
  const fns = GUN_FNS[modul]
  const yilList = donemler.flatMap(d => {
    const y1 = Number.parseInt(String(d.baslangic_tarihi ?? '').slice(0, 4), 10)
    const y2 = Number.parseInt(String(d.bitis_tarihi ?? '').slice(0, 4), 10)
    return [y1, y2].filter(n => Number.isFinite(n))
  })
  const tatilRanges = buildTatilRangesKm(tatiller, yilList)

  // Dönem id → index haritası
  const idxById = new Map(donemler.map(d => [d.id, d.idx]))
  const byIdx   = new Map(donemler.map(d => [d.idx, d]))
  const curIdx  = idxById.get(curId) ?? -1
  const curDonem = byIdx.get(curIdx)
  if (curIdx < 0 || !curDonem) return { satirlar: [], personeller: [], takipteki: [], donemdeki: [], askidaki: [] }

  // ─── Yıllık Rapor Bakiyesi ön-işleme (sadece IZY) ────────────────────────
  const annualBakiyeBeforeSiraNo =
    modul === 'izy'
      ? buildIzyAnnualBakiyeBeforeMap(izyAnnualRhIzinler ?? izinler)
      : new Map<string, number>()
  // ─────────────────────────────────────────────────────────────────────────

  const izinBySiraNo = new Map(izinler.map(iz => [iz.sira_no, iz]))
  let satirlar: KesintimHesapSatir[] = []

  for (const [siraNo, ilkDonemId] of Object.entries(ilkDonemIdBySiraNo)) {
    const firstIdx = idxById.get(ilkDonemId) ?? -1
    if (firstIdx < 0 || curIdx < firstIdx) continue

    const iv = izinBySiraNo.get(siraNo)
    if (!iv) continue

    const ayrilis = parseD(iv.ayrilis)
    const baslama = parseD(iv.baslama)
    if (!ayrilis || !baslama) continue

    const startMs  = sod(ayrilis)
    const lastDate = new Date(sod(baslama))
    lastDate.setDate(lastDate.getDate() - 1)
    const lastMs = sod(lastDate)
    if (lastMs < startMs) continue

    const toplam = fns.toplam(startMs, lastMs, iv.gun, tatilRanges)
    if (toplam <= 0) continue

    const isRH = modul === 'izy' && isIzyRhTur(iv.tur)
    const bakiyeBefore  = isRH ? (annualBakiyeBeforeSiraNo.get(siraNo) ?? 0) : 0
    const annualRBValue = isRH ? bakiyeBefore + toplam : 0
    const deductAmount  = isRH ? 0 : toplam

    let prevSD = 0
    let curRow: { OD: number; R: number; RR: number; HR: number; K: number; SD: number; RB: number } | null = null

    for (let pi = firstIdx; pi <= curIdx; pi++) {
      const p = byIdx.get(pi)!
      const kapasite = fns.kapasite(p.takvimGun)
      let od = 0, rBilgi = 0, rrBilgi = 0, hrBilgi = 0, kes = 0, sd = 0

      if (pi === firstIdx) {
        if (isRH) {
          if (iv.tur === 'Heyet Raporu') hrBilgi = toplam
          else rBilgi = toplam
        } else {
          // ── Tüm modüller için standart mantık ──────────────────────────
          if (startMs > p.bitis_tarihi_ms) {
            od = 0; kes = 0; sd = toplam
          } else if (startMs >= p.baslangic_tarihi_ms) {
            const kesisim = fns.overlap(startMs, lastMs, p.baslangic_tarihi_ms, p.bitis_tarihi_ms, tatilRanges)
            kes = Math.min(kesisim, kapasite)
            sd  = Math.max(0, toplam - kes)
          } else {
            od = toplam
            if (lastMs > p.bitis_tarihi_ms) {
              kes = Math.min(od, kapasite); sd = Math.max(0, od - kes)
            } else if (lastMs >= p.baslangic_tarihi_ms) {
              kes = Math.min(od, kapasite); sd = Math.max(0, od - kes)
            } else {
              kes = od; sd = 0
            }
          }
          if (modul === 'rmy') {
            rBilgi  = iv.tur === 'Rapor'      ? (od > 0 ? od : toplam) : 0
            rrBilgi = isRefakatci(iv.tur)     ? (od > 0 ? od : toplam) : 0
          } else {
            rBilgi = od > 0 ? od : toplam
          }
        }
      } else if (!isRH) {
        od = prevSD
        if (od <= 0) { curRow = null; break }
        if (modul === 'rmy') {
          rBilgi  = iv.tur === 'Rapor'  ? od : 0
          rrBilgi = isRefakatci(iv.tur) ? od : 0
        } else {
          rBilgi = od
        }
        kes = Math.min(od, kapasite)
        sd  = Math.max(0, od - kes)
      } else if (iv.tur === 'Heyet Raporu') {
        hrBilgi = toplam
      } else {
        rBilgi = toplam
      }

      if (!isRH) prevSD = sd
      if (pi === curIdx) curRow = { OD: od, R: rBilgi, RR: rrBilgi, HR: hrBilgi, K: kes, SD: sd, RB: annualRBValue }
    }

    if (!curRow) continue

    const kategori: KesintimKategori =
      startMs > curDonem.bitis_tarihi_ms  ? 'Askıdaki İzinler'
      : startMs >= curDonem.baslangic_tarihi_ms ? 'Dönemdeki İzinler'
      : 'Takipteki İzinler'

    satirlar.push({
      sira_no:  iv.sira_no,
      sicil_no: iv.sicil_no,
      ad_soyad: iv.ad_soyad,
      unvan:    iv.unvan,
      tur:      iv.tur,
      OD: curRow.OD,
      R:  curRow.R,
      RR: curRow.RR,
      HR: curRow.HR,
      K:  curRow.K,
      SD: curRow.SD,
      RB: curRow.RB,
      kategori,
    })
  }

  if (modul === 'izy') {
    const rhKaynak = izyAnnualRhIzinler ?? izinler
    const ksdBySicil = computeIzyRhKsdBySicilForPeriod(donemler, curId, rhKaynak)
    satirlar = applyIzyPersonPeriodKsd(satirlar, ksdBySicil, rhKaynak)
  }

  return buildKesintimSonucFromSatirlar(satirlar, curDonem.kapasite)
}
