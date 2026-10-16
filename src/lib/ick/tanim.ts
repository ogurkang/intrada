import { trNormalize } from '@/lib/turkce-search'

export type IckRol = 'koordinator' | 'mudurluk_koordinatoru' | 'mudurluk_islemcisi' | 'izleyici'
export type IckEylemKisiRol = 'mudurluk_koordinatoru' | 'mudurluk_islemcisi'
export type IckPlanDurum = 'taslak' | 'kurulda' | 'onay_bekliyor' | 'yururlukte' | 'tamamlandi' | 'arsiv'
export type IckEylemDurum = 'baslanmadi' | 'devam' | 'tamamlandi' | 'iptal' | 'devredildi'
export type IckBeyanDurum = 'baslanmadi' | 'devam' | 'tamamlandi'
export type IckAkis = 'taslak' | 'incelemede' | 'iade' | 'kesinlesti'
export type IckTerminTipi = 'tek' | 'yillik' | 'alti_aylik' | 'surekli'
export type IckKanitYeterlilik = 'yeterli' | 'kismen' | 'yetersiz'
export type IckIsbirligiKapsam = 'yok' | 'tum_mudurlukler' | 'ilgili_mudurlukler'

export const ICK_ROL_ETIKET: Record<IckRol, string> = {
  koordinator: 'İç kontrol koordinatörü',
  mudurluk_koordinatoru: 'Müdürlük koordinatörü',
  mudurluk_islemcisi: 'Müdürlük işlemcisi',
  izleyici: 'İzleyici',
}

export const ICK_ROL_ACIKLAMA: Record<IckRol, string> = {
  koordinator:
    'Plan oluşturulurken koordinasyon müdürlüğünün personeli arasından seçilir. Planı ve eylemleri yönetir, bildirimleri inceler, kesinleştirir veya iade eder, dönemi kapatır. Kendi müdürlüğünün eylemlerine bildirim girmez.',
  mudurluk_koordinatoru:
    'Eylem eklenirken veya düzenlenirken sorumlu müdürlüğün personeli arasından seçilir. O eylemin bildirimini koordinatöre yalnızca o gönderir, işlemcinin taslağını düzeltebilir. Eylem kartında ve raporlarda muhatap olarak görünür.',
  mudurluk_islemcisi:
    'Eylem eklenirken veya düzenlenirken sorumlu müdürlüğün personeli arasından seçilir. O eyleme bildirim taslağı girer ve kanıt yükler; gönderemez.',
  izleyici: 'Belediye başkanı ve başkan yardımcıları; aktif organizasyondan kendiliğinden gelir. Tüm planları okur, değişiklik yapmaz.',
}

/** Eylem ekranındaki dönüş düğmesi: İKEP 25-26 */
export function ickPlanKisaAd(basYil: number, bitYil: number): string {
  const son = (y: number) => String(y).slice(-2)
  return `İKEP ${son(basYil)}-${son(bitYil)}`
}

export const ICK_IZLEME_SIKLIGI_ETIKET: Record<number, string> = {
  1: 'Yılda 1 kez (yıllık)',
  2: 'Yılda 2 kez (altı aylık)',
  4: 'Yılda 4 kez (üç aylık)',
}

const SIRA_ADI = ['Birinci', 'İkinci', 'Üçüncü', 'Dördüncü']

/** "2026 Yılı Birinci Altı Aylık İzleme Raporu" */
export function ickDonemBaslik(yil: number, sira: number, siklik: number): string {
  if (siklik === 1) return `${yil} Yılı İzleme Raporu`
  const tur = siklik === 4 ? 'Üç Aylık' : 'Altı Aylık'
  return `${yil} Yılı ${SIRA_ADI[sira - 1] ?? `${sira}.`} ${tur} İzleme Raporu`
}

/** "2026 / 1. dönem" kısa adı */
export function ickDonemKisaAd(yil: number, sira: number, siklik: number): string {
  if (siklik === 1) return `${yil}`
  return `${yil} / ${sira}. ${siklik === 4 ? 'çeyrek' : 'yarı'}`
}

export const ICK_PLAN_DURUM_ETIKET: Record<IckPlanDurum, string> = {
  taslak: 'Taslak',
  kurulda: 'Kurulda',
  onay_bekliyor: 'Onay bekliyor',
  yururlukte: 'Yürürlükte',
  tamamlandi: 'Tamamlandı',
  arsiv: 'Arşiv',
}

export const ICK_EYLEM_DURUM_ETIKET: Record<IckEylemDurum, string> = {
  baslanmadi: 'Başlanmadı',
  devam: 'Devam ediyor',
  tamamlandi: 'Tamamlandı',
  iptal: 'İptal',
  devredildi: 'Devredildi',
}

export const ICK_AKIS_ETIKET: Record<IckAkis, string> = {
  taslak: 'Taslak',
  incelemede: 'İncelemede',
  iade: 'İade edildi',
  kesinlesti: 'Kesinleşti',
}

export const ICK_TERMIN_TIPI_ETIKET: Record<IckTerminTipi, string> = {
  tek: 'Tek tarih',
  yillik: 'Her yıl',
  alti_aylik: 'Her yıl, 6 aylık izlemeli',
  surekli: 'Sürekli',
}

export const ICK_KANIT_ETIKET: Record<IckKanitYeterlilik, string> = {
  yeterli: 'Yeterli',
  kismen: 'Kısmen yeterli',
  yetersiz: 'Yetersiz',
}

export type IckVekaletKaynak = 'resmi_yazi' | 'eposta' | 'toplanti' | 'telefon' | 'diger'

export const ICK_VEKALET_KAYNAK_ETIKET: Record<IckVekaletKaynak, string> = {
  resmi_yazi: 'Resmî yazı',
  eposta: 'E-posta',
  toplanti: 'Toplantı',
  telefon: 'Telefon',
  diger: 'Diğer',
}

export const ICK_VEKALET_IBARE = 'Müdürlük adına iç kontrol koordinatörü girdi'
export const ICK_DOGRUDAN_IBARE = 'Doğrudan işlendi (girişi ve kararı aynı koordinatör verdi)'

export const ICK_DURUM_RENK: Record<string, string> = {
  baslanmadi: 'bg-slate-100 text-slate-700',
  devam: 'bg-amber-100 text-amber-800',
  tamamlandi: 'bg-emerald-100 text-emerald-800',
  iptal: 'bg-slate-200 text-slate-500',
  devredildi: 'bg-violet-100 text-violet-800',
  taslak: 'bg-slate-100 text-slate-700',
  incelemede: 'bg-blue-100 text-blue-800',
  iade: 'bg-red-100 text-red-700',
  kesinlesti: 'bg-emerald-100 text-emerald-800',
}

/** Aktarımda "eşlenmedi" değeri: işbirliği adı yalnızca metinde kalır */
export const ICK_ESLEME_YOK = 'yok'

/** "KOS.01", "KOS 1", "kos01" → "KOS 01" */
export function ickKodNorm(kod: string): string {
  const temiz = (kod ?? '').toLocaleUpperCase('tr-TR').replace(/[._\-]+/g, ' ').replace(/\s+/g, ' ').trim()
  const m = temiz.match(/^(\p{L}+)\s*(\d+)$/u)
  if (!m) return temiz
  return `${m[1]} ${m[2].padStart(2, '0')}`
}

const AYLAR = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik']
export const AY_ADLARI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

function ayBul(metin: string): number | null {
  for (let i = 0; i < AYLAR.length; i++) {
    if (new RegExp(`\\b${AYLAR[i]}\\b`).test(metin)) return i + 1
  }
  return null
}

function ayinSonGunu(yil: number, ay: number): string {
  const gun = new Date(Date.UTC(yil, ay, 0)).getUTCDate()
  return `${yil}-${String(ay).padStart(2, '0')}-${String(gun).padStart(2, '0')}`
}

export type IckTerminCozum =
  | { ok: true; tip: IckTerminTipi; ilk: string | null; metin: string }
  | { ok: false; metin: string; hata: string }

/**
 * Plan belgesindeki serbest termin metnini çözer.
 * "Aralık 2025" ayın son günü; "Her yıl Ocak" plan başlangıç yılındaki ay sonu;
 * "Her yıl Aralık / 6 aylık izleme" altı aylık izlemeli yıllık; "Sürekli" tarihsiz.
 */
export function ickTerminCoz(metin: string, planBasYil: number): IckTerminCozum {
  const ham = (metin ?? '').trim()
  const n = trNormalize(ham)
  if (!n) return { ok: false, metin: ham, hata: 'Tamamlanma tarihi boş.' }
  if (/^surekli\b/.test(n)) return { ok: true, tip: 'surekli', ilk: null, metin: ham }

  const tarih = n.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/)
  if (tarih) {
    const [, g, a, y] = tarih
    return { ok: true, tip: 'tek', ilk: `${y}-${a.padStart(2, '0')}-${g.padStart(2, '0')}`, metin: ham }
  }

  const ay = ayBul(n)
  if (/\bher yil\b/.test(n)) {
    if (!ay) return { ok: false, metin: ham, hata: 'Her yıl tekrarlanan tamamlanma tarihinde ay okunamadı.' }
    const tip: IckTerminTipi = /6 ayl|alti ayl/.test(n) ? 'alti_aylik' : 'yillik'
    return { ok: true, tip, ilk: ayinSonGunu(planBasYil, ay), metin: ham }
  }

  const yil = n.match(/\b(20\d{2})\b/)
  if (ay && yil) return { ok: true, tip: 'tek', ilk: ayinSonGunu(Number(yil[1]), ay), metin: ham }
  return { ok: false, metin: ham, hata: 'Tamamlanma tarihi "Ay Yıl", "Her yıl Ay" veya "Sürekli" biçiminde olmalı.' }
}

/** Plan belgelerindeki durum ifadeleri */
export function ickBeyanDurumCoz(metin: string): IckBeyanDurum | null {
  const n = trNormalize(metin)
  if (n.startsWith('tamamland')) return 'tamamlandi'
  if (n.startsWith('devam') || n.startsWith('surekli')) return 'devam'
  if (n.startsWith('baslanmad')) return 'baslanmadi'
  return null
}

export function ickTarihMetni(tarih: string | null | undefined): string {
  if (!tarih) return ''
  const [y, a, g] = tarih.slice(0, 10).split('-')
  return `${g}.${a}.${y}`
}

export function ickTerminGoster(e: { termin_tipi: string; termin_guncel: string | null; termin_metin: string }): string {
  if (e.termin_tipi === 'surekli') return 'Sürekli'
  if (!e.termin_guncel) return e.termin_metin || ''
  const [y, a] = e.termin_guncel.split('-').map(Number)
  if (e.termin_tipi === 'yillik') return `Her yıl ${AY_ADLARI[a - 1]}`
  if (e.termin_tipi === 'alti_aylik') return `Her yıl ${AY_ADLARI[a - 1]} / 6 aylık izleme`
  return `${AY_ADLARI[a - 1]} ${y}`
}

/** Tek tarihli eylem: bugün termin geçti ve kesinleşmiş tamamlanma yok */
export function ickGecikti(e: { termin_tipi: string; termin_guncel: string | null; durum: string }, bugun: string): boolean {
  if (e.durum === 'tamamlandi' || e.durum === 'iptal' || e.durum === 'devredildi') return false
  if (e.termin_tipi !== 'tek' || !e.termin_guncel) return false
  return e.termin_guncel < bugun
}

export function ickBugun(): string {
  const d = new Date()
  const tr = new Date(d.getTime() + 3 * 3600 * 1000)
  return tr.toISOString().slice(0, 10)
}

export const ICK_BILESEN_SIRA = ['KOS', 'RDS', 'KFS', 'BİS', 'İS']

/** Eylem kodunun önekinden bileşen ("KOS 03" → "KOS") */
export function ickKodBilesen(kodNorm: string): string {
  return kodNorm.split(' ')[0] ?? ''
}

export function ickKodSiralama(a: string, b: string): number {
  const [ab, an] = [ickKodBilesen(a), Number(a.split(' ')[1] ?? 0)]
  const [bb, bn] = [ickKodBilesen(b), Number(b.split(' ')[1] ?? 0)]
  const ai = ICK_BILESEN_SIRA.indexOf(ab)
  const bi = ICK_BILESEN_SIRA.indexOf(bb)
  return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || an - bn
}

export function ickGenelSartSiralama(a: string, b: string): number {
  const [a1, a2] = a.split('.').map(Number)
  const [b1, b2] = b.split('.').map(Number)
  return a1 - b1 || a2 - b2
}
