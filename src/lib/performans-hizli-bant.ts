/** Hızlı puanlama bantları — kriter yıldızlarına deterministik dağıtım */

export type PerformansHizliBantKey =
  | 'cok_iyi'
  | 'iyi'
  | 'yeterli'
  | 'yetersiz'
  | 'cok_yetersiz'

export interface PerformansHizliBant {
  key: PerformansHizliBantKey
  etiket: string
  min: number
  max: number
}

export const PERFORMANS_HIZLI_BANDLAR: PerformansHizliBant[] = [
  { key: 'cok_iyi', etiket: 'Çok İyi', min: 90, max: 100 },
  { key: 'iyi', etiket: 'İyi', min: 75, max: 89 },
  { key: 'yeterli', etiket: 'Yeterli', min: 60, max: 74 },
  { key: 'yetersiz', etiket: 'Yetersiz', min: 35, max: 59 },
  { key: 'cok_yetersiz', etiket: 'Çok Yetersiz', min: 0, max: 34 },
]

function rastgeleTamSayi(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

/** Toplam yıldızı kriterlere rastgele dağıtır (her kriter 1–5). */
function yildizToplamiDagit(n: number, hedefToplam: number): number[] {
  const arr = Array.from({ length: n }, () => 1)
  let kalan = hedefToplam - n
  const sira = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5)
  let adim = 0
  while (kalan > 0 && adim < n * 20) {
    const idx = sira[adim % n]
    if (arr[idx] < 5) {
      arr[idx] += 1
      kalan -= 1
    }
    adim += 1
  }
  return arr.sort(() => Math.random() - 0.5)
}

/**
 * Band aralığından rastgele hedef toplam seçer; kriterlere değişken yıldız dağıtır.
 * Toplam = kriter yıldızlarının toplamı (max kriterSayisi × 5).
 */
export function performansHizliBantDagit(
  kriterIds: number[],
  bant: PerformansHizliBant,
): Record<number, number> {
  const n = kriterIds.length
  if (n === 0) return {}

  const minToplam = n * 1
  const maxToplam = n * 5
  const aralikMin = Math.max(minToplam, bant.min)
  const aralikMax = Math.min(maxToplam, bant.max)
  const hedef =
    aralikMin >= aralikMax
      ? aralikMin
      : rastgeleTamSayi(aralikMin, aralikMax)

  const dagitim = yildizToplamiDagit(n, hedef)
  const sonuc: Record<number, number> = {}
  kriterIds.forEach((id, i) => {
    sonuc[id] = dagitim[i] ?? 1
  })
  return sonuc
}

export function performansHizliBantBul(key: PerformansHizliBantKey): PerformansHizliBant | undefined {
  return PERFORMANS_HIZLI_BANDLAR.find(b => b.key === key)
}

export function performansHizliBantToplam(puanlar: Record<number, number>): number {
  return Object.values(puanlar).reduce((s, v) => s + (v || 0), 0)
}
