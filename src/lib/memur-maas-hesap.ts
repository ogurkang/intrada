/** Memur maaş ödenek senaryosu: cari yıl tabanı + CY+1…CY+3 zincirleme artış. */

export type MemurMaasOdenek = {
  id: number
  ekonomik_kod: string
  hesap_adi: string
  adim_1: string
  adim_2: string
  adim_3: string
  adim_4: string
}

export type MemurMaasOran = {
  yil1: number
  yil2: number
  yil3: number
}

export type MemurMaasSatir = {
  taban: number
  oran: MemurMaasOran
}

export type MemurMaasBelge = {
  cari_yil: number
  /** `${mudurluk}||${unvan}||${odenekId}` */
  satirlar: Record<string, MemurMaasSatir>
}

export type MemurMaasDonem = 'cari' | 'yil1' | 'yil2' | 'yil3'

function round2(n: number): number {
  return Math.round(Number((n * 100).toFixed(8))) / 100
}

function sayi(n: unknown): number {
  const x = typeof n === 'number' ? n : Number(n)
  return Number.isFinite(x) ? x : 0
}

function carpan(yuzde: number): number {
  return 1 + sayi(yuzde) / 100
}

export function bosOran(): MemurMaasOran {
  return { yil1: 0, yil2: 0, yil3: 0 }
}

export function memurMaasSatirAnahtari(mudurluk: string, unvan: string, odenekId: number): string {
  return `${mudurluk.trim()}||${unvan.trim()}||${odenekId}`
}

export function memurMaasSatirAl(
  belge: MemurMaasBelge,
  mudurluk: string,
  unvan: string,
  odenekId: number,
): MemurMaasSatir {
  const key = memurMaasSatirAnahtari(mudurluk, unvan, odenekId)
  const s = belge.satirlar[key]
  return {
    taban: sayi(s?.taban),
    oran: {
      yil1: sayi(s?.oran?.yil1),
      yil2: sayi(s?.oran?.yil2),
      yil3: sayi(s?.oran?.yil3),
    },
  }
}

/** Taban sıfırsa ve tutar sıfır değilse yüzde yoktur. */
export function yuzdeFromMiktar(baz: number, miktar: number): number | null {
  if (!baz) return miktar === 0 ? 0 : null
  return ((miktar / baz) - 1) * 100
}

/** CY+n oranı bir önceki yılın tutarının üzerine biner. `taban` genelde kişi × birim tutardır. */
export function memurMaasEtkinTutar(taban: number, oran: MemurMaasOran, donem: MemurMaasDonem): number {
  if (donem === 'cari') return round2(taban)
  const y1 = round2(taban * carpan(oran.yil1))
  if (donem === 'yil1') return y1
  const y2 = round2(y1 * carpan(oran.yil2))
  if (donem === 'yil2') return y2
  return round2(y2 * carpan(oran.yil3))
}

/** Salt okunur kişi × birim tutar (cari taban). */
export function memurMaasKisiTaban(birimTaban: number, kisiSayisi: number): number {
  return round2(sayi(birimTaban) * sayi(kisiSayisi))
}

export function memurMaasYilEtiketleri(cariYil: number): { cari: string; yil1: string; yil2: string; yil3: string } {
  const y = Number.isFinite(cariYil) && cariYil > 0 ? cariYil : new Date().getFullYear()
  return {
    cari: String(y),
    yil1: String(y + 1),
    yil2: String(y + 2),
    yil3: String(y + 3),
  }
}

export function varsayilanMemurMaasBelge(cariYil = new Date().getFullYear()): MemurMaasBelge {
  return { cari_yil: cariYil, satirlar: {} }
}

export function memurMaasBelgeCoz(raw: unknown): MemurMaasBelge | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Partial<MemurMaasBelge>
  const cari = sayi(b.cari_yil) || new Date().getFullYear()
  const satirlar: Record<string, MemurMaasSatir> = {}
  if (b.satirlar && typeof b.satirlar === 'object') {
    for (const [key, s] of Object.entries(b.satirlar)) {
      if (!s || typeof s !== 'object') continue
      satirlar[key] = {
        taban: sayi((s as MemurMaasSatir).taban),
        oran: {
          yil1: sayi((s as MemurMaasSatir).oran?.yil1),
          yil2: sayi((s as MemurMaasSatir).oran?.yil2),
          yil3: sayi((s as MemurMaasSatir).oran?.yil3),
        },
      }
    }
  }
  return { cari_yil: cari, satirlar }
}
