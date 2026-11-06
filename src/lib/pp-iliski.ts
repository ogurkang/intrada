export const PP_BIRIMLER = ['Yüzde', 'Adet', 'Kişi', 'Gün', 'Hektar', 'Ton', 'Metre', 'Metrekare', 'Saat'] as const

export type PpPhSecenek = {
  id: number
  etiket: string
  ad: string
  kod: string
  mudurluk: string
}

export type PpGostergeGirdi = {
  ad: string
  birim: string
  aciklama: string
  hesaplama: string
  t2: number | null
  t1plan: number | null
  t1son: number | null
  thedef: number | null
  t1tahmin: number | null
  t2tahmin: number | null
}

export type PpFaaliyetGirdi = {
  ad: string
  gostergeler: PpGostergeGirdi[]
}

export function ppKodTemiz(kod: string): string {
  return kod
    .replace(/sa|sh|ph/gi, '')
    .replace(/[^0-9.]/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '')
}

export function ppPerformansYol(amacKodu: string, hedefKodu: string, phKodu: string): string {
  const ph = ppKodTemiz(phKodu)
  if (ph.includes('.')) return ph
  const hedef = ppKodTemiz(hedefKodu)
  const amac = ppKodTemiz(amacKodu)
  if (hedef.includes('.')) return [hedef, ph].filter(Boolean).join('.')
  return [amac, hedef, ph].filter(Boolean).join('.')
}

export function ppFaaliyetKodu(phYol: string, sira: number): string {
  return phYol ? `${phYol}.${sira}` : String(sira)
}

export function ppGostergeKodu(faaliyetKodu: string, sira: number): string {
  return `${faaliyetKodu}.${sira}`
}

export function ppParaOku(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '')
  if (!t) return null
  const n = Number(t.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function ppParaYaz(n: number | null): string {
  if (n == null) return ''
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(n)
}
