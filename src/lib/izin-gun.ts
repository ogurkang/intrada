/**
 * İzin günü hesaplama - GAS IzinHareketleri.gs kurallarına uyumlu.
 * Yıllık İzin: Zabıta (Zabıta Memuru, Zabıta Amiri, Zabıta Komiseri) → takvim günü
 * Yıllık İzin (diğer): Statüye göre izin kuralı + tatil listesi
 * Yıllık İzin dışı: Basit takvim günü
 */

const ZABITA_UNVANLARI = ['Zabıta Memuru', 'Zabıta Amiri', 'Zabıta Komiseri']

export interface IzinGunSonuc {
  gun: number
  bilgiler: string[]
  /** Devam niteliğindeki izinde: güncellenmiş ayrılış tarihi (önceki izinin başlama tarihi) */
  ayrilisGuncel?: string
}

function parseTarih(s: string | null): Date | null {
  if (!s || typeof s !== 'string') return null
  const t = s.trim()
  if (!t) return null
  // gg.aa.yyyy formatı (örn. 16.03.2026) için dönüşüm
  const ggAayyyy = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  const isoStr = ggAayyyy
    ? `${ggAayyyy[3]}-${ggAayyyy[2]!.padStart(2, '0')}-${ggAayyyy[1]!.padStart(2, '0')}`
    : t
  const d = new Date(isoStr)
  return isNaN(d.getTime()) ? null : d
}

/** Basit takvim günü: ayrılış–başlama arası gün sayısı (başlama hariç) */
export function gunBasitHesapla(ayrilisStr: string, baslamaStr: string): IzinGunSonuc {
  const baslangic = parseTarih(ayrilisStr)
  const bitis = parseTarih(baslamaStr)
  if (!baslangic || !bitis || bitis.getTime() <= baslangic.getTime()) {
    return { gun: 0, bilgiler: [] }
  }
  const d = new Date(baslangic.getFullYear(), baslangic.getMonth(), baslangic.getDate())
  const bitisDate = new Date(bitis.getFullYear(), bitis.getMonth(), bitis.getDate())
  let count = 0
  while (d.getTime() < bitisDate.getTime()) {
    count++
    d.setDate(d.getDate() + 1)
  }
  return { gun: count, bilgiler: [] }
}

interface TatilAralik {
  baslangic: Date
  bitis: Date
  tatilAdi: string
}

export interface IzinKural {
  statu: string
  cumartesi: boolean | null
  pazar: boolean | null
  haftaici_tatil: boolean | null
  tatil_haftasonu: boolean | null
}

/** Tarihi yerel gece yarısına normalize et (timezone karşılaştırması için) */
function tarihNorm(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function tarihTatilVeHaftasonu(
  tarih: Date,
  tatilRanges: TatilAralik[]
): { haftasonu: boolean; cumartesi: boolean; pazar: boolean; haftaiciTatil: boolean; tatilHaftasonu: boolean } {
  const gun = tarih.getDay()
  const cumartesi = gun === 6
  const pazar = gun === 0
  const haftasonu = cumartesi || pazar
  let haftaiciTatil = false
  let tatilHaftasonu = false
  const tNorm = tarihNorm(tarih)
  for (const r of tatilRanges) {
    if (tNorm >= tarihNorm(r.baslangic) && tNorm <= tarihNorm(r.bitis)) {
      if (haftasonu) tatilHaftasonu = true
      else haftaiciTatil = true
      break
    }
  }
  return { haftasonu, cumartesi, pazar, haftaiciTatil, tatilHaftasonu }
}

function tarihTatilAdi(tarih: Date, tatilRanges: TatilAralik[]): string | null {
  const tNorm = tarihNorm(tarih)
  for (const r of tatilRanges) {
    if (tNorm >= tarihNorm(r.baslangic) && tNorm <= tarihNorm(r.bitis)) {
      return r.tatilAdi || null
    }
  }
  return null
}

/** Yıllık İzin için kural/tatil uygulayarak gün hesapla (Zabıta değilse) */
export function gunYillikIzinHesapla(
  ayrilisStr: string,
  baslamaStr: string,
  kural: IzinKural | null,
  tatilRanges: TatilAralik[]
): IzinGunSonuc {
  const baslangic = parseTarih(ayrilisStr)
  const bitis = parseTarih(baslamaStr)
  if (!baslangic || !bitis || bitis.getTime() <= baslangic.getTime()) {
    return { gun: 0, bilgiler: [] }
  }
  let count = 0
  const tatilSayilmayacak: Record<string, boolean> = {}
  const d = new Date(baslangic.getFullYear(), baslangic.getMonth(), baslangic.getDate())
  const bitisDate = new Date(bitis.getFullYear(), bitis.getMonth(), bitis.getDate())

  while (d.getTime() < bitisDate.getTime()) {
    const info = tarihTatilVeHaftasonu(d, tatilRanges)
    let hakAzalir = true
    let hangiTatil: string | null = null
    if (info.tatilHaftasonu && kural) {
      hakAzalir = kural.tatil_haftasonu === true
      hangiTatil = tarihTatilAdi(d, tatilRanges)
    } else if (info.haftaiciTatil && kural) {
      hakAzalir = kural.haftaici_tatil === true
      hangiTatil = tarihTatilAdi(d, tatilRanges)
    } else if (info.cumartesi && kural) {
      hakAzalir = kural.cumartesi === true
    } else if (info.pazar && kural) {
      hakAzalir = kural.pazar === true
    }
    if (hakAzalir) count++
    else if (hangiTatil) tatilSayilmayacak[hangiTatil] = true
    d.setDate(d.getDate() + 1)
  }

  const bilgiler: string[] = []
  for (const tatilAdi of Object.keys(tatilSayilmayacak)) {
    if (tatilAdi) bilgiler.push(`${tatilAdi} yıllık izninizden sayılmayacaktır.`)
  }
  return { gun: count, bilgiler }
}

/**
 * Verilen tarihin "hak azalır" (izin süresinden sayılır) olup olmadığını döndürür.
 * Devam niteliği kontrolü için: true = hafta sonu/tatil (çalışılmayan gün), false = iş günü
 */
export function gunHakAzalir(
  tarih: Date,
  kural: IzinKural | null,
  tatilRanges: TatilAralik[]
): boolean {
  const info = tarihTatilVeHaftasonu(tarih, tatilRanges)
  if (!kural) return info.cumartesi || info.pazar
  if (info.tatilHaftasonu) return kural.tatil_haftasonu === true
  if (info.haftaiciTatil) return kural.haftaici_tatil === true
  if (info.cumartesi) return kural.cumartesi === true
  if (info.pazar) return kural.pazar === true
  return false
}

/** Sicilin görev unvanı Zabıta mı? */
export function zabitaUnvaniMi(gorevUnvani: string | null): boolean {
  if (!gorevUnvani) return false
  const gu = String(gorevUnvani).trim()
  return ZABITA_UNVANLARI.includes(gu)
}
