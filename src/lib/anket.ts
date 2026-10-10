export const ANKET_BASLANGIC_UYARISI =
  'Bu anket isimsizdir. Cevabınız adınız ve siciliniz olmadan kaydedilir. Az sayıda kişi cevapladığında sonuç grafiği bir kişiyi belli edebilir.'

export const ANKET_PUAN_OLCEK = '1 çok kötü, 5 çok iyi anlamına gelir.'

export const ANKET_TIPLERI = [
  { id: 'tek_secim', etiket: 'Tek seçim' },
  { id: 'coklu_secim', etiket: 'Çoklu seçim' },
  { id: 'evet_hayir', etiket: 'Evet / Hayır' },
  { id: 'puan', etiket: 'Puan (1-5)' },
  { id: 'metin', etiket: 'Serbest metin' },
] as const

export type AnketSoruTipi = (typeof ANKET_TIPLERI)[number]['id']
export type AnketDurum = 'yayinda' | 'durduruldu'

const KOD_ALFABE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function anketKodUret(): string {
  let kod = ''
  for (let i = 0; i < 6; i += 1) {
    kod += KOD_ALFABE[Math.floor(Math.random() * KOD_ALFABE.length)]
  }
  return kod
}

export function anketKodTemizle(ham: string): string {
  return ham.trim().toLocaleUpperCase('tr-TR').replace(/[^A-Z0-9]/g, '')
}

export function anketTipEtiket(tip: string): string {
  return ANKET_TIPLERI.find(t => t.id === tip)?.etiket ?? tip
}

export function anketDurumEtiket(durum: string): string {
  return durum === 'yayinda' ? 'Yayında' : 'Durduruldu'
}

export function anketZaman(iso: string): string {
  const tarih = new Date(iso)
  if (Number.isNaN(tarih.getTime())) return '—'
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(tarih)
}

const LOG_ETIKET: Record<string, string> = {
  olusturuldu: 'Oluşturuldu',
  baslik_duzenlendi: 'Başlık düzenlendi',
  soru_eklendi: 'Soru eklendi',
  soru_duzenlendi: 'Soru düzenlendi',
  soru_silindi: 'Soru silindi',
  soru_tasindi: 'Soru sırası değişti',
  yayinlandi: 'Yayınlandı',
  durduruldu: 'Yayın durduruldu',
  sifirlandi: 'Cevaplar sıfırlandı',
}

export function anketLogEtiket(islem: string): string {
  return LOG_ETIKET[islem] ?? islem
}

/** Grafik dilimleri ve PDF çubukları aynı sırayı kullanır. */
export const ANKET_GRAFIK_HEX = [
  '#2563eb',
  '#059669',
  '#d97706',
  '#4f46e5',
  '#e11d48',
  '#0891b2',
  '#7c3aed',
  '#ea580c',
]

export type AnketSoruGirdi = {
  metin: string
  tip: string
  secenekler: string[]
}

export function anketSoruDogrula(
  girdi: AnketSoruGirdi,
): { hata: string } | { tip: AnketSoruTipi; metin: string; secenekler: string[] } {
  const metin = girdi.metin.trim()
  if (metin.length < 3) return { hata: 'Soru en az 3 karakter olmalı.' }
  if (metin.length > 500) return { hata: 'Soru 500 karakteri geçemez.' }
  const tip = ANKET_TIPLERI.find(t => t.id === girdi.tip)?.id
  if (!tip) return { hata: 'Cevap tipi seçin.' }
  if (tip === 'evet_hayir') return { tip, metin, secenekler: ['Evet', 'Hayır'] }
  if (tip === 'puan' || tip === 'metin') return { tip, metin, secenekler: [] }
  const secenekler = [...new Set(girdi.secenekler.map(s => s.trim()).filter(Boolean))]
  if (secenekler.length < 2) return { hata: 'Bu cevap tipi için en az iki seçenek yazın.' }
  if (secenekler.length > 12) return { hata: 'Bir soruda en fazla 12 seçenek olur.' }
  if (secenekler.some(s => s.length > 120)) return { hata: 'Seçenek 120 karakteri geçemez.' }
  return { tip, metin, secenekler }
}

export type AnketDagilim = { etiket: string; adet: number; yuzde: number }

export type AnketSoruSonuc = {
  tip: AnketSoruTipi
  cevapSayisi: number
  dagilim: AnketDagilim[]
  ortalama: number | null
  metinler: string[]
}

export type AnketHamCevap = {
  secimler: string[] | null
  puan: number | null
  metin: string | null
}

function yuzde(adet: number, toplam: number): number {
  if (toplam <= 0) return 0
  return Math.round((adet / toplam) * 100)
}

export function anketSoruSonuc(
  tip: AnketSoruTipi,
  secenekler: string[],
  cevaplar: AnketHamCevap[],
): AnketSoruSonuc {
  const metinler = cevaplar.map(c => (c.metin ?? '').trim()).filter(Boolean)
  if (tip === 'metin') {
    return { tip, cevapSayisi: metinler.length, dagilim: [], ortalama: null, metinler }
  }
  if (tip === 'puan') {
    const puanlar = cevaplar
      .map(c => c.puan)
      .filter((p): p is number => typeof p === 'number' && p >= 1 && p <= 5)
    const dagilim = [1, 2, 3, 4, 5].map(puan => ({
      etiket: String(puan),
      adet: puanlar.filter(p => p === puan).length,
      yuzde: yuzde(puanlar.filter(p => p === puan).length, puanlar.length),
    }))
    const ortalama = puanlar.length
      ? Math.round((puanlar.reduce((t, p) => t + p, 0) / puanlar.length) * 10) / 10
      : null
    return { tip, cevapSayisi: puanlar.length, dagilim, ortalama, metinler: [] }
  }
  const etiketler = tip === 'evet_hayir' ? ['Evet', 'Hayır'] : [...secenekler]
  const sayac = new Map<string, number>()
  for (const etiket of etiketler) sayac.set(etiket, 0)
  let kisi = 0
  for (const cevap of cevaplar) {
    const secimler = [...new Set((cevap.secimler ?? []).map(s => s.trim()).filter(Boolean))]
    if (secimler.length === 0) continue
    kisi += 1
    for (const secim of secimler) sayac.set(secim, (sayac.get(secim) ?? 0) + 1)
  }
  const dagilim = [...sayac.entries()].map(([etiket, adet]) => ({
    etiket,
    adet,
    yuzde: yuzde(adet, kisi),
  }))
  return { tip, cevapSayisi: kisi, dagilim, ortalama: null, metinler: [] }
}

function trOndalik(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function soruIbaresi(metin: string): string {
  const temiz = metin.trim()
  if (!temiz) return 'Bu soruda'
  return `«${temiz}» sorusunda`
}

function puanYargi(ort: number): string {
  if (ort >= 4.5) return 'Sonuç çok iyi tarafta.'
  if (ort >= 3.5) return 'Sonuç iyi tarafta.'
  if (ort >= 2.5) return 'Sonuç ortaya yakın.'
  if (ort > 1.5) return 'Sonuç kötü tarafta.'
  return 'Sonuç çok kötü tarafta.'
}

export function anketSoruYorumu(sonuc: AnketSoruSonuc, soruMetni = ''): string {
  const n = sonuc.cevapSayisi
  const giris = soruIbaresi(soruMetni)
  if (n === 0) return `${giris} henüz cevap yok.`
  const az = n < 5 ? ' Cevap sayısı az. Yüzde, tek bir kişinin seçimiyle belirgin değişir.' : ''
  if (sonuc.tip === 'metin') {
    return `${giris} ${n} yazılı cevap var. Bu soru grafik yerine liste olarak durur.${az}`
  }
  if (sonuc.tip === 'puan') {
    const ort = sonuc.ortalama ?? 0
    const tepe = [...sonuc.dagilim].sort((a, b) => b.adet - a.adet)[0]
    const sik = tepe && tepe.adet > 0 ? ` En sık verilen puan ${tepe.etiket} (${tepe.adet} cevap).` : ''
    return `${giris} ${ANKET_PUAN_OLCEK} Ortalama ${trOndalik(ort)} / 5. ${puanYargi(ort)}${sik}${az}`
  }
  const coklu = sonuc.tip === 'coklu_secim'
    ? ' Bir kişi birden fazla seçenek işaretleyebildiği için yüzdelerin toplamı 100’ü geçebilir.'
    : ''
  const dolu = sonuc.dagilim
    .filter(d => d.adet > 0)
    .sort((a, b) => b.adet - a.adet || a.etiket.localeCompare(b.etiket, 'tr'))
  const birinci = dolu[0]
  if (!birinci) return `${giris} henüz cevap yok.`
  const ayni = dolu.filter(d => d.adet === birinci.adet)
  if (ayni.length >= 2) {
    const adlar = ayni.slice(0, 3).map(d => `«${d.etiket}»`).join(' ve ')
    return `${giris} ${adlar} aynı paya sahip (%${birinci.yuzde}). Tek seçenek öne çıkmıyor.${coklu}${az}`
  }
  const ikinci = dolu[1]
  if (!ikinci || birinci.yuzde - ikinci.yuzde >= 15) {
    return `${giris} ${n} cevabın ${birinci.adet} tanesi (%${birinci.yuzde}) «${birinci.etiket}» oldu. Bu cevap açık ara önde.${coklu}${az}`
  }
  if (birinci.yuzde - ikinci.yuzde <= 8) {
    return `${giris} «${birinci.etiket}» %${birinci.yuzde} ve «${ikinci.etiket}» %${ikinci.yuzde} ile birbirine yakın. Sonuç tek tarafa yatmış değil.${coklu}${az}`
  }
  return `${giris} en yüksek pay «${birinci.etiket}» (%${birinci.yuzde}). Ardından «${ikinci.etiket}» (%${ikinci.yuzde}) geliyor.${coklu}${az}`
}

export function anketGenelYorum(katilim: number): string {
  if (katilim <= 0) {
    return 'Henüz cevap yok. Anket yayındayken link paylaşılınca grafikler ve yorumlar burada dolar.'
  }
  return `Bu raporda ${katilim} kişinin cevabı var. Kayıtlarda ad ve sicil tutulmaz. Her yorum, sorunun metnini ve cevap dağılımını birlikte okur.`
}
