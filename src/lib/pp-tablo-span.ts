/** Ardışık aynı anahtardaki satırlar için rowspan; 0 = üst hücreye dahil (çizme). */
export function ppSatirSpanlari<T>(satirlar: T[], anahtar: (s: T) => string): number[] {
  const spans = new Array(satirlar.length).fill(0)
  let i = 0
  while (i < satirlar.length) {
    const key = anahtar(satirlar[i]!)
    let j = i + 1
    while (j < satirlar.length && anahtar(satirlar[j]!) === key) j += 1
    spans[i] = j - i
    i = j
  }
  return spans
}
