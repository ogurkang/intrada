import type { TcmbFaizSatir } from '@/lib/kanuni-faiz'

export const TCMB_REESKONT_URL =
  'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Temel+Faaliyetler/Para+Politikasi/Reeskont+ve+Avans+Faiz+Oranlari'

/** Sayfa okunamazsa kullanılan tablo. Son satır 20.12.2025. */
export const TCMB_REESKONT_YEDEK: TcmbFaizSatir[] = [
  ['1990-01-01', 40, 45],
  ['1990-09-20', 43, 48.25],
  ['1990-11-23', 45, 50.75],
  ['1991-02-15', 48, 54.5],
  ['1994-01-27', 56, 65],
  ['1994-04-21', 79, 98],
  ['1994-07-12', 70, 85],
  ['1994-07-27', 63, 75],
  ['1994-10-01', 55, 64],
  ['1995-06-10', 52, 60],
  ['1995-08-01', 50, 57],
  ['1997-08-02', 67, 80],
  ['1999-12-30', 60, 70],
  ['2002-05-17', 55, 64],
  ['2003-06-14', 50, 57],
  ['2003-10-08', 43, 48],
  ['2004-06-15', 38, 42],
  ['2005-01-13', 32, 35],
  ['2005-05-25', 28, 30],
  ['2005-12-20', 23, 25],
  ['2006-12-20', 27, 29],
  ['2007-12-28', 25, 27],
  ['2009-04-09', 19, 20],
  ['2009-06-12', 18, 19],
  ['2009-12-22', 15, 16],
  ['2010-12-30', 14, 15],
  ['2011-12-29', 17, 17.75],
  ['2012-06-19', 16, 16.5],
  ['2012-12-20', 13.5, 13.75],
  ['2013-06-21', 9.5, 11],
  ['2013-12-27', 10.25, 11.75],
  ['2014-12-14', 9, 10.5],
  ['2016-12-31', 8.75, 9.75],
  ['2018-06-29', 18.5, 19.5],
  ['2019-10-11', 17.25, 18.25],
  ['2019-12-21', 12.75, 13.75],
  ['2020-06-13', 9, 10],
  ['2020-12-19', 15.75, 16.75],
  ['2021-12-31', 14.75, 15.75],
  ['2022-12-31', 9.75, 10.75],
  ['2023-06-24', 15.75, 16.75],
  ['2023-09-01', 25.75, 26.75],
  ['2023-09-28', 30.75, 31.75],
  ['2023-11-01', 35.75, 36.75],
  ['2023-12-01', 40.75, 41.75],
  ['2023-12-23', 43.25, 44.25],
  ['2024-04-01', 50.75, 51.75],
  ['2024-12-28', 48.25, 49.25],
  ['2025-03-08', 43.25, 44.25],
  ['2025-09-17', 41.25, 42.25],
  ['2025-12-20', 38.75, 39.75],
].map(([yururluk, reeskont, avans]) => ({
  yururluk: String(yururluk),
  reeskont: Number(reeskont),
  avans: Number(avans),
}))

function oranOku(ham: string): number | null {
  const t = ham.replace(/%/g, '').replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(t)) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function tcmbTablosuCoz(html: string): TcmbFaizSatir[] {
  const satirlar: TcmbFaizSatir[] = []
  const re = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const hucre = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(x =>
      x[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(),
    )
    if (hucre.length < 3) continue
    const tarih = hucre[0].match(/(\d{2})\.(\d{2})\.(\d{4})/)
    if (!tarih) continue
    const reeskont = oranOku(hucre[1])
    const avans = oranOku(hucre[2])
    if (reeskont == null || avans == null) continue
    satirlar.push({ yururluk: `${tarih[3]}-${tarih[2]}-${tarih[1]}`, reeskont, avans })
  }
  satirlar.sort((a, b) => a.yururluk.localeCompare(b.yururluk))
  const tekil: TcmbFaizSatir[] = []
  for (const s of satirlar) {
    if (tekil.some(x => x.yururluk === s.yururluk)) continue
    tekil.push(s)
  }
  return tekil
}

export async function tcmbReeskontGetir(): Promise<{ satirlar: TcmbFaizSatir[]; kaynak: 'tcmb' | 'yedek' }> {
  try {
    const res = await fetch(TCMB_REESKONT_URL, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Intrada', Accept: 'text/html' },
      next: { revalidate: 60 * 60 * 6 },
    })
    if (!res.ok) throw new Error(String(res.status))
    const html = await res.text()
    const satirlar = tcmbTablosuCoz(html)
    const son = satirlar[satirlar.length - 1]
    if (satirlar.length < 10 || !son || son.yururluk < '2020-01-01') throw new Error('tablo')
    return { satirlar, kaynak: 'tcmb' }
  } catch {
    return { satirlar: TCMB_REESKONT_YEDEK, kaynak: 'yedek' }
  }
}
