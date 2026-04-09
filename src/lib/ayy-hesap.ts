import { kayitKapatEsigiSonrasiMi, type AyyOncekiDonemEsik } from '@/lib/ayy-kayit-esik'

/**
 * AYY (Aylık Yemek Yeni) Hesap Motoru
 *
 * GAS AylikYemekYeni.gs kaynak alınarak TypeScript'e taşındı.
 * Temel sütunlar:
 *  OD  – Önceki dönemden devreden
 *  IZ  – Bu dönemde düşülen izin günü
 *  YG  – Yemekli gün sayısı (dönemin çalışma günü; zabıta için 30)
 *  K   – Alacağı yemek: zabıta dışı YG−IZ; zabıta 30−IZ’den türetilir (kalan ≥24 → K=24, 0<kalan<24 → K=kalan)
 *  SD  – Sonraki döneme devreden (takvim taşması + zabıtada IZ>30 ise YG aşımı)
 */

export type Kategori = 'Takipteki İzinler' | 'Dönemdeki İzinler' | 'Askıdaki İzinler'

export interface AyyIzinRow {
  sira_no:   string
  sicil_no:  string
  ad_soyad:  string
  tur:       string
  /** Ayrılış tarihi = iznin başlangıç tarihi (işten ayrıldığı gün) */
  ayrilis:   string | null
  /** Başlama tarihi = işe dönüş tarihi (son izin günü + 1) */
  baslama:   string | null
  gun:       number
  isZabita:  boolean
  unvan:     string
  /** `izin_hareketleri.kayit_tarihi` — arada kalan / kapatma eşiği için */
  kayit_tarihi?: string | null
}

/** Hesaplanan dönemin bir önceki AYY dönemi (arada kalan izin kuralı). */
export type AyyOncekiDonemKosulu = AyyOncekiDonemEsik

export interface AyyHesapSatir {
  sira_no:  string
  sicil_no: string
  ad_soyad: string
  unvan:    string
  tur:      string
  isZabita: boolean
  OD:       number
  IZ:       number
  hamIzin:  number
  YG:       number
  K:        number
  SD:       number
  kategori: Kategori
}

export interface AyyPersonelOzet {
  sira_no_seq: number
  sicil_no:    string
  ad_soyad:    string
  unvan:       string
  isZabita:    boolean
  OD:          number
  IZ:          number
  hamIzin:     number
  YG:          number
  K:           number
  SD:          number
}

export interface AyyHesapSonucu {
  satirlar:     AyyHesapSatir[]
  personeller:  AyyPersonelOzet[]
  takipteki:    AyyPersonelOzet[]
  donemdeki:    AyyPersonelOzet[]
  askidaki:     AyyPersonelOzet[]
  donemAktifGun: number
}

// ─── Yardımcı Tarih Fonksiyonları ─────────────────────────────────────────────

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

/** İzin son günü = baslama - 1 gün */
function izinSonGun(baslama: string | null): Date | null {
  const b = parseDate(baslama)
  if (!b) return null
  const son = new Date(b)
  son.setDate(son.getDate() - 1)
  return son
}

interface TatilRange { basMs: number; bitMs: number; isMehil: boolean }

function buildTatilRanges(tatiller: { tatil_adi: string; tatil_turu: string | null; tatil_baslangici: string; tatil_bitisi: string; durum: boolean }[]): TatilRange[] {
  return tatiller
    .filter(t => t.durum)
    .map(t => {
      const bas = parseDate(t.tatil_baslangici)
      const bit = parseDate(t.tatil_bitisi)
      if (!bas || !bit) return null
      const isMehil = t.tatil_adi.toLowerCase().includes('mehil') || (t.tatil_turu ?? '').toLowerCase().includes('mehil')
      return {
        basMs:    startOfDay(bas),
        bitMs:    new Date(bit.getFullYear(), bit.getMonth(), bit.getDate(), 23, 59, 59, 999).getTime(),
        isMehil,
      }
    })
    .filter((x): x is TatilRange => x !== null)
}

function isTatil(ms: number, ranges: TatilRange[], excludeMehil: boolean): boolean {
  for (const r of ranges) {
    if (ms >= r.basMs && ms <= r.bitMs) {
      if (excludeMehil && r.isMehil) continue // mehil = çalışma günü (yemek hesabında)
      return true
    }
  }
  return false
}

/** Hafta içi + tatil dışı gün sayısı. excludeMehil=true → mehil çalışma günü (YG için); false → mehil tatil (izin kesintisi için) */
function calismaGunSayisi(start: Date, end: Date, tatiller: TatilRange[], excludeMehil = true): number {
  const sMs = startOfDay(start)
  const eMs = startOfDay(end)
  if (eMs < sMs) return 0
  let count = 0
  const cur = new Date(sMs)
  while (cur.getTime() <= eMs) {
    const day = cur.getDay()
    const ms  = cur.getTime()
    if (day !== 0 && day !== 6 && !isTatil(ms, tatiller, excludeMehil)) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

/** Takvim günü sayısı (dahil) */
function takvimGunSayisi(start: Date, end: Date): number {
  const sMs = startOfDay(start)
  const eMs = startOfDay(end)
  if (eMs < sMs) return 0
  return Math.floor((eMs - sMs) / 86_400_000) + 1
}

function isMehilIzin(tur: string | null | undefined): boolean {
  return String(tur ?? '').toLowerCase().includes('mehil')
}

/** Kesinti günü: zabıta ve mehil izinlerde takvim; diğerlerinde çalışma günü. */
function izinKesintiGunSayisi(iv: AyyIzinRow, start: Date, end: Date, tatiller: TatilRange[]): number {
  if (iv.isZabita || isMehilIzin(iv.tur)) return takvimGunSayisi(start, end)
  return calismaGunSayisi(start, end, tatiller, false)
}

/** İzin için dönem aralığıyla örtüşen gün sayısı.
 * Zabıta + mehil izin: takvim günü. Diğer: hafta sonu + tatil (mehil dahil) hariç çalışma günü. */
function izinAralikGunSayisi(iv: AyyIzinRow, aralikBas: Date, aralikBit: Date, tatiller: TatilRange[]): number {
  const ayrilis = parseDate(iv.ayrilis)
  const sonGun  = izinSonGun(iv.baslama)
  if (!ayrilis || !sonGun) return 0

  const sBas = Math.max(startOfDay(ayrilis), startOfDay(aralikBas))
  const sBit = Math.min(startOfDay(sonGun),  startOfDay(aralikBit))
  if (sBit < sBas) return 0

  const s = new Date(sBas)
  const e = new Date(sBit)
  return izinKesintiGunSayisi(iv, s, e, tatiller)
}

/** Zabıta yemek alacağı: her zaman 30’dan IZ çıkarılır; kalan ≥24 ise K=24; 0<kalan<24 ise K=kalan; kalan ≤0 ise K=0. */
function zabitaYemekAlacagi(iz: number): number {
  const net = 30 - iz
  if (net >= 24) return 24
  if (net > 0) return net
  return 0
}

// ─── Personel Özet Birleştirme ────────────────────────────────────────────────

function satirlariPersoneldeTopla(
  satirlar: AyyHesapSatir[],
): AyyPersonelOzet[] {
  const map = new Map<string, Omit<AyyPersonelOzet, 'sira_no_seq'> & { gelecekSD: number; toplamK: number; mehilVar: boolean }>()

  for (const s of satirlar) {
    const mevcut = map.get(s.sicil_no)
    if (!mevcut) {
      map.set(s.sicil_no, {
        sicil_no: s.sicil_no,
        ad_soyad: s.ad_soyad,
        unvan:    s.unvan,
        isZabita: s.isZabita,
        OD:       s.OD,
        IZ:       s.IZ,
        hamIzin:  s.hamIzin ?? 0,
        YG:       s.YG,
        K:        0,
        SD:       0,
        gelecekSD: s.SD,
        toplamK: s.K,
        mehilVar: isMehilIzin(s.tur),
      })
    } else {
      mevcut.OD += s.OD
      mevcut.IZ += s.IZ
      mevcut.hamIzin += s.hamIzin ?? 0
      mevcut.gelecekSD += s.SD
      mevcut.toplamK += s.K
      mevcut.mehilVar = mevcut.mehilVar || isMehilIzin(s.tur)
    }
  }

  const arr: AyyPersonelOzet[] = []
  let seq = 1
  for (const p of map.values()) {
    const ham = Math.max(0, (p.YG || 0) - (p.IZ || 0))
    // Zabıta: 24 tabanı korunur; kesinti tabanı personelin toplam izinine göre belirlenir.
    // Bu sayede dönem öncesi başlayıp döneme dahil olan izinlerde (örn. 14 gün) eksik kesinti oluşmaz.
    const zabitaBazIzin = Math.max(p.IZ || 0, p.hamIzin || 0)
    const K = p.mehilVar ? Math.max(0, p.toplamK || 0) : (p.isZabita ? zabitaYemekAlacagi(zabitaBazIzin) : ham)
    const SD = (p.gelecekSD || 0) + Math.max(0, (p.IZ || 0) - (p.YG || 0))
    arr.push({ sira_no_seq: seq++, sicil_no: p.sicil_no, ad_soyad: p.ad_soyad, unvan: p.unvan, isZabita: p.isZabita, OD: p.OD, IZ: p.IZ, hamIzin: p.hamIzin ?? 0, YG: p.YG, K, SD })
  }

  // Sicil no'ya göre sırala
  arr.sort((a, b) => {
    const na = parseInt(a.sicil_no) || 0
    const nb = parseInt(b.sicil_no) || 0
    if (na !== nb) return na - nb
    return a.sicil_no.localeCompare(b.sicil_no)
  })
  arr.forEach((p, i) => { p.sira_no_seq = i + 1 })
  return arr
}

// ─── Ana Hesap Motoru ─────────────────────────────────────────────────────────

export interface AyyHesapParams {
  donemBas:    string
  donemBit:    string
  izinler:     AyyIzinRow[]
  tatiller:    { tatil_adi: string; tatil_turu: string | null; tatil_baslangici: string; tatil_bitisi: string; durum: boolean }[]
  /** Önceki dönem sonucundan gelen sira_no → SD map */
  odBySiraNo?: Record<string, number>
  /** Bu dönemin takvimsel önceki AYY dönemi; gecikmiş kayıt + takvimde önceki dönemde kalan izinler için */
  oncekiDonem?: AyyOncekiDonemKosulu
}

export function ayyHesapla(params: AyyHesapParams): AyyHesapSonucu {
  const { donemBas, donemBit, izinler, tatiller, odBySiraNo = {}, oncekiDonem } = params

  const bas = parseDate(donemBas)!
  const bit = parseDate(donemBit)!
  const basMs = startOfDay(bas)
  const bitMs = startOfDay(bit)

  const tatilRanges = buildTatilRanges(tatiller)

  // Dönem aktif gün sayısı (mehil hariç tutularak yemek hesabı)
  const donemAktifGun = calismaGunSayisi(bas, bit, tatilRanges, true)

  const satirlar: AyyHesapSatir[] = []
  const odYazildi = new Set<string>()

  for (const iv of izinler) {
    const ayrilis  = parseDate(iv.ayrilis)
    const sonGun   = izinSonGun(iv.baslama)
    if (!ayrilis) continue

    const startMs   = startOfDay(ayrilis)
    const sonGunMs  = sonGun ? startOfDay(sonGun) : null

    // Kategori belirleme
    const kategori: Kategori =
      startMs > bitMs ? 'Askıdaki İzinler'
      : (startMs >= basMs && startMs <= bitMs) ? 'Dönemdeki İzinler'
      : 'Takipteki İzinler'

    const yemekliGun = iv.isZabita ? 30 : donemAktifGun

    // Mevcut dönem gün sayısı
    const mevcutDonemGun = izinAralikGunSayisi(iv, bas, bit, tatilRanges)

    // Sonraki dönem gün sayısı (izin bitis tarihi dönem dışına taşıyorsa)
    let sonrakiDonemGun = 0
    if (sonGunMs !== null && sonGunMs > bitMs) {
      const sonrakiBas = new Date(bitMs + 86_400_000)
      const sonrakiBit = new Date(sonGunMs)
      sonrakiDonemGun = izinKesintiGunSayisi(iv, sonrakiBas, sonrakiBit, tatilRanges)
    }

    const od = odYazildi.has(iv.sira_no) ? 0 : (odBySiraNo[iv.sira_no] ?? 0)
    const tamDonemIci = startMs >= basMs && sonGunMs !== null && sonGunMs <= bitMs
    const tasinanFazla = tamDonemIci ? 0 : Math.max(0, od - (mevcutDonemGun + sonrakiDonemGun))

    let iz = mevcutDonemGun + tasinanFazla
    let sd = sonrakiDonemGun

    // "d ihtimali" — OD yokken dönem öncesi başlayıp bu dönemde biten izin:
    // tüm iznin süresi bu dönemde kesilir
    const dIhtimali = od <= 0 && startMs > 0 && startMs < basMs && sonGunMs !== null && sonGunMs >= basMs && sonGunMs <= bitMs
    if (dIhtimali) {
      const tBas = new Date(startMs)
      const tBit = new Date(sonGunMs)
      iz = izinKesintiGunSayisi(iv, tBas, tBit, tatilRanges)
      sd = 0
    }

    // Arada kalan: önceki dönem kapatıldıktan sonra kaydedilmiş; izin takvim olarak aktif dönemin
    // başlangıcından önce başlayıp bitiyor (yeni dönemle örtüşmüz) → IZ tam süre; kesinti zabıta/normal
    // (isZabita) izin süresine göre takvim veya çalışma günü ile hesaplanır (d ile aynı türetim).
    if (!dIhtimali && od <= 0 && oncekiDonem && iv.kayit_tarihi && sonGunMs !== null) {
      if (
        kayitKapatEsigiSonrasiMi(iv.kayit_tarihi, oncekiDonem) &&
        startMs < basMs &&
        sonGunMs < basMs
      ) {
        const tBas = new Date(startMs)
        const tBit = new Date(sonGunMs)
        iz = izinKesintiGunSayisi(iv, tBas, tBit, tatilRanges)
        sd = 0
      }
    }

    // Sıfır yüklü satırlar: askıdaki → atla; diğerleri → izin gün sayısını fallback olarak kullan
    // Fallback: Zabıta için takvim günü, diğerleri için çalışma günü (hafta sonu/tatil hariç)
    const sifirYuklu = iz <= 0 && sd <= 0 && od <= 0
    if (sifirYuklu && kategori === 'Askıdaki İzinler') continue
    if (sifirYuklu && (kategori === 'Takipteki İzinler' || kategori === 'Dönemdeki İzinler')) {
      const hesaplananIzin = sonGun
        ? izinKesintiGunSayisi(iv, ayrilis, sonGun, tatilRanges)
        : Math.max(0, iv.gun)
      iz = Math.min(hesaplananIzin, yemekliGun)
    }

    let K: number
    if (isMehilIzin(iv.tur)) {
      const donus = parseDate(iv.baslama)
      if (!donus) {
        K = 0
      } else {
        const calisBasMs = Math.max(startOfDay(donus), basMs)
        if (calisBasMs > bitMs) {
          K = 0
        } else {
          const calisBas = new Date(calisBasMs)
          K = iv.isZabita
            ? takvimGunSayisi(calisBas, bit)
            : calismaGunSayisi(calisBas, bit, tatilRanges, true)
        }
      }
      // Mehil izininde kesinti dönem kalan gün üzerinden kurulur.
      iz = Math.max(0, yemekliGun - K)
      if (sonGunMs !== null && sonGunMs > bitMs) {
        sd = takvimGunSayisi(new Date(bitMs + 86_400_000), new Date(sonGunMs))
      }
    } else {
      const zabitaBazIzin = Math.max(iz, iv.gun || 0)
      K = iv.isZabita ? zabitaYemekAlacagi(zabitaBazIzin) : Math.max(0, yemekliGun - iz)
    }

    satirlar.push({ sira_no: iv.sira_no, sicil_no: iv.sicil_no, ad_soyad: iv.ad_soyad, unvan: iv.unvan, tur: iv.tur, isZabita: iv.isZabita, OD: od, IZ: iz, hamIzin: iv.gun, YG: yemekliGun, K, SD: sd, kategori })
    odYazildi.add(iv.sira_no)
  }

  const personeller  = satirlariPersoneldeTopla(satirlar)
  const takipteki    = satirlariPersoneldeTopla(satirlar.filter(s => s.kategori === 'Takipteki İzinler'))
  const donemdeki    = satirlariPersoneldeTopla(satirlar.filter(s => s.kategori === 'Dönemdeki İzinler'))
  const askidaki     = satirlariPersoneldeTopla(satirlar.filter(s => s.kategori === 'Askıdaki İzinler'))

  return { satirlar, personeller, takipteki, donemdeki, askidaki, donemAktifGun }
}
