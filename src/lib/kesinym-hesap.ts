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
  const satirlar: KesintimHesapSatir[] = []

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

    const isRH = modul === 'izy' && (iv.tur === 'Rapor' || iv.tur === 'Heyet Raporu')
    const bakiyeBefore  = isRH ? (annualBakiyeBeforeSiraNo.get(siraNo) ?? 0) : 0
    const deductAmount  = isRH ? computeIzyRhDeductAmount(bakiyeBefore, toplam) : toplam
    const annualRBValue = isRH ? bakiyeBefore + toplam : 0

    let prevSD = 0
    let curRow: { OD: number; R: number; RR: number; HR: number; K: number; SD: number; RB: number } | null = null

    for (let pi = firstIdx; pi <= curIdx; pi++) {
      const p = byIdx.get(pi)!
      const kapasite = fns.kapasite(p.takvimGun)
      let od = 0, rBilgi = 0, rrBilgi = 0, hrBilgi = 0, kes = 0, sd = 0

      if (pi === firstIdx) {
        if (isRH) {
          // ── IZY: R / HR — yıllık 30 gün sonrası deductAmount kesilir ─────
          if (startMs > p.bitis_tarihi_ms) {
            kes = 0
            sd = deductAmount
          } else if (startMs >= p.baslangic_tarihi_ms) {
            kes = Math.min(deductAmount, kapasite)
            sd  = Math.max(0, deductAmount - kes)
          } else {
            od = deductAmount
            kes = Math.min(od, kapasite)
            sd  = Math.max(0, od - kes)
          }
          if (iv.tur === 'Heyet Raporu') {
            hrBilgi = od > 0 ? od : toplam
          } else {
            rBilgi = od > 0 ? od : toplam
          }
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
      } else {
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
      }

      prevSD = sd
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

  const kapasite = curDonem.kapasite
  const personeller = kisiOzetTopla(satirlar, kapasite)
  const takipteki   = kisiOzetTopla(satirlar.filter(s => s.kategori === 'Takipteki İzinler'), kapasite)
  const donemdeki   = kisiOzetTopla(satirlar.filter(s => s.kategori === 'Dönemdeki İzinler'), kapasite)
  const askidaki    = kisiOzetTopla(satirlar.filter(s => s.kategori === 'Askıdaki İzinler'),  kapasite)

  return { satirlar, personeller, takipteki, donemdeki, askidaki }
}
