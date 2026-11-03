/** 3095 sayılı Kanun m.1 kanuni faiz ve m.2 temerrüt faizi (sözleşmede ayrı oran yoksa m.1 oranı). */

export type TcmbFaizSatir = {
  yururluk: string
  reeskont: number
  avans: number
}

export type FaizTuru = 'kanuni' | 'temerrut'

export type FaizParcasi = {
  bas: string
  bit: string
  gun: number
  yuzde: number
}

export type PlanSatir = {
  sira: number
  vade: string
  gun: number
  oran: string
  faiz: number
  anapara: number
  odeme: number
  kalan: number
}

export type OdemePlani = {
  satirlar: PlanSatir[]
  toplamFaiz: number
  toplamAnapara: number
  toplamOdeme: number
  taksitSayisi: number
}

const M1_REESKONT = '2026-07-31'
const EN_ERKEN = '2005-05-01'

export function faizTuruEtiket(tur: FaizTuru): string {
  return tur === 'temerrut' ? 'Temerrüt faizi' : 'Kanuni faiz'
}

export function yuzdeTr(n: number): string {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(n)
}

export function tarihTr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  return `${m[3]}.${m[2]}.${m[1]}`
}

function isoGecerli(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso)
}

function gunFark(bas: string, bit: string): number {
  const a = Date.parse(`${bas}T00:00:00Z`)
  const b = Date.parse(`${bit}T00:00:00Z`)
  return Math.round((b - a) / 86400000)
}

function vadeIso(yil: number, ay: number, gun: number): string {
  const dt = new Date(Date.UTC(yil, ay - 1, 1))
  const y = dt.getUTCFullYear()
  const m = dt.getUTCMonth()
  const son = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  return new Date(Date.UTC(y, m, Math.min(gun, son))).toISOString().slice(0, 10)
}

export function ilkVade(baslangic: string, odemeGunu: number): string {
  const y = Number(baslangic.slice(0, 4))
  const m = Number(baslangic.slice(5, 7))
  const bu = vadeIso(y, m, odemeGunu)
  if (bu > baslangic) return bu
  return vadeIso(y, m + 1, odemeGunu)
}

function sonrakiVade(vade: string, odemeGunu: number): string {
  const y = Number(vade.slice(0, 4))
  const m = Number(vade.slice(5, 7))
  return vadeIso(y, m + 1, odemeGunu)
}

export function tcmbOran(satirlar: TcmbFaizSatir[], gun: string): TcmbFaizSatir | null {
  let sec: TcmbFaizSatir | null = null
  for (const s of satirlar) {
    if (s.yururluk <= gun) sec = s
    else break
  }
  return sec
}

/** Yıllık yüzde. 31.07.2026 öncesi kararla sabit; sonrası TCMB reeskontunun %80'i. */
export function kanuniYillikYuzde(satirlar: TcmbFaizSatir[], gun: string): number | null {
  if (!isoGecerli(gun) || gun < EN_ERKEN) return null
  if (gun < '2006-01-01') return 12
  if (gun < '2024-06-01') return 9
  if (gun < M1_REESKONT) return 24
  const yil = Number(gun.slice(0, 4))
  const aralik = tcmbOran(satirlar, `${yil - 1}-12-31`)
  if (!aralik) return null
  let taban = aralik.reeskont
  if (gun >= `${yil}-07-01`) {
    const haziran = tcmbOran(satirlar, `${yil}-06-30`)
    if (haziran && Math.abs(haziran.reeskont - aralik.reeskont) >= 5) taban = haziran.reeskont
  }
  return taban * 0.8
}

function kirilmalar(bas: string, bit: string): string[] {
  const nokta = new Set<string>([bas, bit])
  const aday = ['2006-01-01', '2024-06-01', M1_REESKONT]
  const y0 = Number(bas.slice(0, 4))
  const y1 = Number(bit.slice(0, 4))
  for (let y = y0; y <= y1 + 1; y += 1) {
    aday.push(`${y}-01-01`, `${y}-07-01`)
  }
  for (const a of aday) {
    if (a > bas && a < bit) nokta.add(a)
  }
  return [...nokta].sort()
}

export function donemParcalari(
  satirlar: TcmbFaizSatir[],
  bas: string,
  bit: string,
): { parcalar: FaizParcasi[] } | { hata: string } {
  if (!isoGecerli(bas) || !isoGecerli(bit) || bit <= bas) return { hata: 'Faiz aralığı geçersiz.' }
  const nokta = kirilmalar(bas, bit)
  const parcalar: FaizParcasi[] = []
  for (let i = 0; i < nokta.length - 1; i += 1) {
    const a = nokta[i]
    const b = nokta[i + 1]
    const gun = gunFark(a, b)
    if (gun <= 0) continue
    const yuzde = kanuniYillikYuzde(satirlar, a)
    if (yuzde == null) return { hata: `${tarihTr(a)} için kanuni faiz oranı bulunamadı.` }
    parcalar.push({ bas: a, bit: b, gun, yuzde })
  }
  if (!parcalar.length) return { hata: 'Faiz günü oluşmadı.' }
  return { parcalar }
}

function faizKurus(anaparaKurus: number, parcalar: FaizParcasi[]): number {
  let ham = 0
  for (const p of parcalar) ham += (anaparaKurus * (p.yuzde / 100) * p.gun) / 365
  return Math.round(ham)
}

function kurustanTl(k: number): number {
  return k / 100
}

export function odemePlaniOlustur(girdi: {
  anaTutar: number
  taksitTutari: number
  odemeGunu: number
  faizBaslangic: string
  satirlar: TcmbFaizSatir[]
}): OdemePlani | { hata: string } {
  const ana = Math.round(girdi.anaTutar * 100)
  const taksit = Math.round(girdi.taksitTutari * 100)
  if (!Number.isFinite(ana) || ana <= 0) return { hata: 'Ana tutar sıfırdan büyük olmalıdır.' }
  if (!Number.isFinite(taksit) || taksit <= 0) return { hata: 'Taksit tutarı sıfırdan büyük olmalıdır.' }
  if (!Number.isInteger(girdi.odemeGunu) || girdi.odemeGunu < 1 || girdi.odemeGunu > 31) {
    return { hata: 'Ödeme günü 1 ile 31 arasında olmalıdır.' }
  }
  if (!isoGecerli(girdi.faizBaslangic)) return { hata: 'Faiz başlangıcını seçin.' }
  if (girdi.faizBaslangic < EN_ERKEN) return { hata: 'Faiz başlangıcı 1 Mayıs 2005 öncesi olamaz.' }
  if (Math.ceil(ana / taksit) > 240) return { hata: 'Taksit tutarı çok küçük. En fazla 240 taksit hesaplanır.' }

  const satirlar: PlanSatir[] = []
  let kalan = ana
  let faizToplam = 0
  let onceki = girdi.faizBaslangic
  let vade = ilkVade(girdi.faizBaslangic, girdi.odemeGunu)
  while (kalan > 0) {
    const parca = donemParcalari(girdi.satirlar, onceki, vade)
    if ('hata' in parca) return parca
    const faiz = faizKurus(kalan, parca.parcalar)
    const anapara = Math.min(kalan, taksit)
    kalan -= anapara
    faizToplam += faiz
    const oranlar = [...new Set(parca.parcalar.map(p => yuzdeTr(p.yuzde)))]
    satirlar.push({
      sira: satirlar.length + 1,
      vade,
      gun: parca.parcalar.reduce((n, p) => n + p.gun, 0),
      oran: oranlar.map(o => `%${o}`).join(' + '),
      faiz: kurustanTl(faiz),
      anapara: kurustanTl(anapara),
      odeme: kurustanTl(anapara + faiz),
      kalan: kurustanTl(kalan),
    })
    onceki = vade
    vade = sonrakiVade(vade, girdi.odemeGunu)
    if (satirlar.length > 240) return { hata: 'Ödeme planı 240 taksidi aştı.' }
  }

  return {
    satirlar,
    toplamFaiz: kurustanTl(faizToplam),
    toplamAnapara: kurustanTl(ana),
    toplamOdeme: kurustanTl(faizToplam + ana),
    taksitSayisi: satirlar.length,
  }
}
