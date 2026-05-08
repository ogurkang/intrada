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
  /** RMY: Refakatçi Raporu günü; IVY/IZY: 0 */
  RR:       number
  K:        number
  SD:       number
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
  IZ:       number  // R + RR (veya IVY/IZY için sadece R)
  K:        number
  SD:       number
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
        p: { sicil_no: s.sicil_no, ad_soyad: s.ad_soyad, unvan: s.unvan, OD: s.OD, R: s.R, RR: s.RR, IZ: s.R + s.RR, K: s.K, SD: s.SD },
        kapasite: curKapasite,
      })
    } else {
      ex.p.OD += s.OD
      ex.p.R  += s.R
      ex.p.RR += s.RR
      ex.p.IZ += s.R + s.RR
      ex.p.K  += s.K
      ex.p.SD += s.SD
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

export function kesintimHesapla(params: KesintimHesapParams): KesintimHesapSonucu {
  const { modul, curId, donemler, ilkDonemIdBySiraNo, izinler, tatiller } = params
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

    let prevSD = 0
    let curRow: { OD: number; R: number; RR: number; K: number; SD: number } | null = null

    for (let pi = firstIdx; pi <= curIdx; pi++) {
      const p = byIdx.get(pi)!
      const kapasite = fns.kapasite(p.takvimGun)
      let od = 0, rBilgi = 0, rrBilgi = 0, kes = 0, sd = 0

      if (pi === firstIdx) {
        if (startMs > p.bitis_tarihi_ms) {
          // f) ileri tarihli — henüz gelmemiş
          od = 0; kes = 0; sd = toplam
        } else if (startMs >= p.baslangic_tarihi_ms) {
          // a/b) dönem içinde başlayan
          const kesisim = fns.overlap(startMs, lastMs, p.baslangic_tarihi_ms, p.bitis_tarihi_ms, tatilRanges)
          kes = Math.min(kesisim, kapasite)
          sd  = Math.max(0, toplam - kes)
        } else {
          // c/d/e) dönemden önce başlayan
          od = toplam
          if (lastMs > p.bitis_tarihi_ms) {
            // c) dönem sonrasına sarkan
            kes = Math.min(od, kapasite); sd = Math.max(0, od - kes)
          } else if (lastMs >= p.baslangic_tarihi_ms) {
            // d) dönem içinde biten
            kes = Math.min(od, kapasite); sd = Math.max(0, od - kes)
          } else {
            // e) dönem öncesinde bitmiş (gecikmiş rapor)
            kes = od; sd = 0
          }
        }
        if (modul === 'rmy') {
          rBilgi  = iv.tur === 'Rapor'                 ? ((od > 0 ? od : toplam)) : 0
          rrBilgi = iv.tur === 'Refakatçi Raporu'      ? ((od > 0 ? od : toplam)) : 0
        } else {
          rBilgi = (od > 0 ? od : toplam)
        }
      } else {
        od = prevSD
        if (od <= 0) { curRow = null; break }
        if (modul === 'rmy') {
          rBilgi  = iv.tur === 'Rapor'            ? od : 0
          rrBilgi = iv.tur === 'Refakatçi Raporu' ? od : 0
        } else {
          rBilgi = od
        }
        kes = Math.min(od, kapasite)
        sd  = Math.max(0, od - kes)
      }

      prevSD = sd
      if (pi === curIdx) curRow = { OD: od, R: rBilgi, RR: rrBilgi, K: kes, SD: sd }
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
      K:  curRow.K,
      SD: curRow.SD,
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
