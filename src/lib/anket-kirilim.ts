import { anketSoruSonuc, anketSoruYorumu, type AnketHamCevap, type AnketSoruTipi } from '@/lib/anket'

export type AnketDemografiKonu = 'yas' | 'cinsiyet' | 'ogrenim' | 'statu'

export type AnketSoruKaydi = {
  id: string
  sira: number
  metin: string
  tip: AnketSoruTipi
  secenekler: string[]
}

export type AnketCevapKaydi = AnketHamCevap & {
  katilimId: string
  soruId: string
}

export type AktifPersonelProfil = {
  cinsiyet: string | null
  yas: number | null
  ogrenim: string | null
  statu: string | null
}

const KONU_SIRA: AnketDemografiKonu[] = ['statu', 'cinsiyet', 'ogrenim', 'yas']

function katla(ham: string): string {
  return ham
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ı', 'i')
    .replaceAll('ş', 's')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c')
    .replaceAll('â', 'a')
    .replaceAll('î', 'i')
    .replaceAll('û', 'u')
}

function kategori(ham: string): string {
  return katla(ham)
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function tekKelime(ham: string): boolean {
  return ham.trim().length > 0 && !/\s/.test(ham.trim())
}

function sonSesli(kelime: string): string {
  const s = kelime.toLocaleLowerCase('tr-TR')
  for (let i = s.length - 1; i >= 0; i -= 1) {
    const ch = s[i]
    if ('aeıioöuü'.includes(ch)) return ch
  }
  return 'e'
}

function iyelikCogul(soz: string): string {
  const k = soz.trim().toLocaleLowerCase('tr-TR')
  const ek = 'aıou'.includes(sonSesli(k)) ? 'ların' : 'lerin'
  return `${k}${ek}`
}

/** Soru metni yaş, cinsiyet, öğrenim veya statü soruyorsa konu döner. Memnuniyet sorusu dönmez. */
export function anketDemografiKonu(metin: string): AnketDemografiKonu | null {
  const f = katla(metin)
  if (/memnun|ayrim|siddet|nasil|iyi mi|kotu|degis/.test(f)) return null
  if (f.includes('cinsiyet')) return 'cinsiyet'
  if (
    f.includes('ogrenim durum')
    || f.includes('ogreniminiz')
    || f.includes('mezuniyet')
    || /(^|[^a-z])ogrenim(?![a-z])/.test(f)
  ) return 'ogrenim'
  if (/(^|[^a-z])statu(nuz\w*)?(?![a-z])/.test(f)) return 'statu'
  if (/(^|[^a-z])yas(iniz\w*|inda\w*|i)?(?![a-z])/.test(f)) return 'yas'
  return null
}

export function anketCinsiyetEsle(etiket: string): 'Kadın' | 'Erkek' | null {
  const s = kategori(etiket)
  if (s === 'kadin' || s === 'kiz' || s.startsWith('kadin')) return 'Kadın'
  if (s === 'erkek' || s.startsWith('erkek')) return 'Erkek'
  return null
}

export function anketYasAraligi(etiket: string): { alt: number; ust: number } | null {
  const f = katla(etiket)
    .replace(/[–—]/g, '-')
    .replace(/yaş|yas/g, '')
    .replace(/\s+/g, '')
  const arti = f.match(/(\d+)\+/) ?? f.match(/(\d+)(?:veuzeri|veustu|veyasustu|yasustu)/)
  if (arti) {
    const alt = Number(arti[1])
    if (alt >= 0 && alt <= 120) return { alt, ust: 120 }
  }
  const aralik = f.match(/(\d+)-(\d+)/)
  if (aralik) {
    const alt = Number(aralik[1])
    const ust = Number(aralik[2])
    if (alt <= ust && alt >= 0 && ust <= 120) return { alt, ust }
  }
  const alti = f.match(/(\d+)alti/)
  if (alti) {
    const ust = Number(alti[1]) - 1
    if (ust >= 0) return { alt: 0, ust }
  }
  return null
}

function yasEtiketTemiz(etiket: string): string {
  return etiket.trim().replace(/\s*yaş\s*$/i, '').trim()
}

type Parca = { konu: AnketDemografiKonu; etiket: string }

function kisaAd(p: Parca): string {
  if (p.konu === 'cinsiyet') {
    const c = anketCinsiyetEsle(p.etiket)
    if (c === 'Kadın') return 'kadın'
    if (c === 'Erkek') return 'erkek'
  }
  if (p.konu === 'yas') return `${yasEtiketTemiz(p.etiket)} yaş`
  if (p.konu === 'ogrenim') return `öğrenimi «${p.etiket.trim()}»`
  if (tekKelime(p.etiket)) return p.etiket.trim().toLocaleLowerCase('tr-TR')
  return `«${p.etiket.trim()}»`
}

function tekilBaslangic(p: Parca): string {
  if (p.konu === 'yas') return `Anketi cevaplayan ${kisaAd(p)} olanların`
  if (p.konu === 'ogrenim') return `Anketi cevaplayan ${kisaAd(p)} olanların`
  if (p.konu === 'cinsiyet') {
    const c = anketCinsiyetEsle(p.etiket)
    if (c === 'Kadın') return 'Anketi cevaplayan kadınların'
    if (c === 'Erkek') return 'Anketi cevaplayan erkeklerin'
  }
  if ((p.konu === 'statu' || p.konu === 'cinsiyet') && tekKelime(p.etiket)) {
    return `Anketi cevaplayan ${iyelikCogul(p.etiket)}`
  }
  return `Anketi cevaplayan «${p.etiket.trim()}» olanların`
}

function sirala(parcalar: Parca[]): Parca[] {
  return parcalar.slice().sort((a, b) => {
    if (a.konu === 'yas') return 1
    if (b.konu === 'yas') return -1
    return KONU_SIRA.indexOf(a.konu) - KONU_SIRA.indexOf(b.konu)
  })
}

function grupBaslangic(parcalar: Parca[]): string {
  if (parcalar.length === 1) return tekilBaslangic(parcalar[0])
  const [ilk, son] = sirala(parcalar)
  if (son.konu === 'yas') {
    const ilkSoz = tekilBaslangic(ilk).replace(/^Anketi cevaplayan /, '')
    return `Anketi cevaplayan ${ilkSoz} ${kisaAd(son)} olanlarının`
  }
  return `Anketi cevaplayan ${kisaAd(ilk)} ve ${kisaAd(son)} olanların`
}

function grupSecenekleri(soru: AnketSoruKaydi): string[] {
  if (soru.tip === 'evet_hayir') return ['Evet', 'Hayır']
  return soru.secenekler
}

function kullanilabilir(soru: AnketSoruKaydi): AnketDemografiKonu | null {
  const konu = anketDemografiKonu(soru.metin)
  if (!konu) return null
  if (soru.tip !== 'tek_secim' && soru.tip !== 'evet_hayir') return null
  return konu
}

function uyelikHaritasi(demolar: AnketSoruKaydi[], cevaplar: AnketCevapKaydi[]): Map<string, Map<string, string>> {
  const demoId = new Set(demolar.map(d => d.id))
  const harita = new Map<string, Map<string, string>>()
  for (const cevap of cevaplar) {
    if (!demoId.has(cevap.soruId)) continue
    const etiket = (cevap.secimler ?? []).map(s => s.trim()).find(Boolean)
    if (!etiket) continue
    const kisi = harita.get(cevap.katilimId) ?? new Map<string, string>()
    kisi.set(cevap.soruId, etiket)
    harita.set(cevap.katilimId, kisi)
  }
  return harita
}

function etiketSirasi(soru: AnketSoruKaydi, gorulen: Iterable<string>): string[] {
  const sirali = grupSecenekleri(soru).map(s => s.trim()).filter(Boolean)
  const varOlan = new Set(sirali)
  const ekstra = [...new Set(gorulen)].filter(e => !varOlan.has(e)).sort((a, b) => a.localeCompare(b, 'tr'))
  return [...sirali, ...ekstra]
}

function grupSonucCumlesi(
  bas: string,
  hedef: AnketSoruKaydi,
  katilimlar: Set<string>,
  cevaplar: AnketCevapKaydi[],
): string | null {
  const ilgili = cevaplar.filter(c => c.soruId === hedef.id && katilimlar.has(c.katilimId))
  const sonuc = anketSoruSonuc(hedef.tip, hedef.tip === 'evet_hayir' ? ['Evet', 'Hayır'] : hedef.secenekler, ilgili)
  if (sonuc.cevapSayisi === 0) return null
  return `${bas} ${anketSoruYorumu(sonuc, hedef.metin)}`
}

export function anketKirilimSatirlari(sorular: AnketSoruKaydi[], cevaplar: AnketCevapKaydi[]): Map<string, string[]> {
  const sonuc = new Map<string, string[]>()
  const demolar = sorular.filter(s => kullanilabilir(s)).sort((a, b) => a.sira - b.sira)
  if (demolar.length === 0) return sonuc
  const uyeler = uyelikHaritasi(demolar, cevaplar)
  const hedefler = sorular.filter(s => !demolar.some(d => d.id === s.id))

  for (const hedef of hedefler) {
    const satirlar: string[] = []
    for (const demo of demolar) {
      const gorulen: string[] = []
      for (const kisi of uyeler.values()) {
        const etiket = kisi.get(demo.id)
        if (etiket) gorulen.push(etiket)
      }
      for (const etiket of etiketSirasi(demo, gorulen)) {
        const katilimlar = new Set<string>()
        for (const [katilimId, kisi] of uyeler) {
          if (kisi.get(demo.id) === etiket) katilimlar.add(katilimId)
        }
        const cumle = grupSonucCumlesi(tekilBaslangic({ konu: kullanilabilir(demo)!, etiket }), hedef, katilimlar, cevaplar)
        if (cumle) satirlar.push(cumle)
      }
    }
    for (let i = 0; i < demolar.length; i += 1) {
      for (let j = i + 1; j < demolar.length; j += 1) {
        const a = demolar[i]
        const b = demolar[j]
        const konuA = kullanilabilir(a)!
        const konuB = kullanilabilir(b)!
        const cift = new Map<string, Set<string>>()
        for (const [katilimId, kisi] of uyeler) {
          const ea = kisi.get(a.id)
          const eb = kisi.get(b.id)
          if (!ea || !eb) continue
          const anahtar = `${ea}\u0000${eb}`
          const kume = cift.get(anahtar) ?? new Set<string>()
          kume.add(katilimId)
          cift.set(anahtar, kume)
        }
        const etiketA = etiketSirasi(a, [...cift.keys()].map(k => k.split('\u0000')[0]))
        const etiketB = etiketSirasi(b, [...cift.keys()].map(k => k.split('\u0000')[1]))
        for (const ea of etiketA) {
          for (const eb of etiketB) {
            const katilimlar = cift.get(`${ea}\u0000${eb}`)
            if (!katilimlar) continue
            const cumle = grupSonucCumlesi(
              grupBaslangic([{ konu: konuA, etiket: ea }, { konu: konuB, etiket: eb }]),
              hedef,
              katilimlar,
              cevaplar,
            )
            if (cumle) satirlar.push(cumle)
          }
        }
      }
    }
    if (satirlar.length > 0) sonuc.set(hedef.id, satirlar)
  }
  return sonuc
}

function yuzde(adet: number, toplam: number): number {
  if (toplam <= 0) return 0
  return Math.round((adet / toplam) * 100)
}

function personelEslesir(kisi: AktifPersonelProfil, konu: AnketDemografiKonu, etiket: string): boolean | null {
  if (konu === 'cinsiyet') {
    const hedef = anketCinsiyetEsle(etiket)
    if (!hedef) return null
    const kendi = anketCinsiyetEsle(kisi.cinsiyet ?? '')
    return kendi === hedef
  }
  if (konu === 'yas') {
    const aralik = anketYasAraligi(etiket)
    if (!aralik) return null
    if (kisi.yas === null) return false
    return kisi.yas >= aralik.alt && kisi.yas <= aralik.ust
  }
  if (konu === 'ogrenim') {
    if (!kisi.ogrenim) return false
    if (!kategori(etiket)) return null
    return kategori(kisi.ogrenim) === kategori(etiket)
  }
  if (!kisi.statu) return false
  if (!kategori(etiket)) return null
  return kategori(kisi.statu) === kategori(etiket)
}

function secenekEslesirMi(konu: AnketDemografiKonu, etiket: string): boolean {
  if (konu === 'cinsiyet') return anketCinsiyetEsle(etiket) !== null
  if (konu === 'yas') return anketYasAraligi(etiket) !== null
  return kategori(etiket).length > 0
}

function bosKayitNotu(konu: AnketDemografiKonu, personel: AktifPersonelProfil[]): string | null {
  const bos = personel.filter(k => {
    if (konu === 'cinsiyet') return anketCinsiyetEsle(k.cinsiyet ?? '') === null
    if (konu === 'yas') return k.yas === null
    if (konu === 'ogrenim') return !k.ogrenim?.trim()
    return !k.statu?.trim()
  }).length
  if (bos === 0) return null
  const alan = konu === 'cinsiyet' ? 'cinsiyet' : konu === 'yas' ? 'doğum tarihi' : konu === 'ogrenim' ? 'öğrenim' : 'statü'
  return `Aktif personelin ${bos} kişisinde ${alan} kaydı yok. Yüzde, kayıtlı aktif personelin tamamına göredir. Bu kişiler o satıra yazılmaz.`
}

/**
 * Cevaplayanların demografik dağılımını kayıtlı aktif personelle yan yana koyar.
 * Yakınlık, kurumun düşüncesi değildir.
 */
export function anketKurumKiyasMetni(input: {
  sorular: AnketSoruKaydi[]
  cevaplar: AnketCevapKaydi[]
  katilim: number
  personel: AktifPersonelProfil[] | null
}): string | null {
  const adaylar = input.sorular.filter(s => anketDemografiKonu(s.metin))
  if (adaylar.length === 0) return null
  const demolar = adaylar.filter(s => kullanilabilir(s))
  const uygunOlmayan = adaylar.filter(s => !kullanilabilir(s))
  const parcalar: string[] = []
  if (uygunOlmayan.length > 0) {
    const adlar = uygunOlmayan.map(s => `«${s.metin.trim()}»`).join(', ')
    parcalar.push(`${adlar} yaş, cinsiyet, öğrenim veya statü sorusu gibi duruyor. Grup yorumu tek seçim cevaplarından kurulur.`)
  }
  if (demolar.length === 0) return parcalar.join('\n') || null
  if (input.katilim <= 0) {
    parcalar.push('Bu ankette yaş, cinsiyet, öğrenim veya statü sorusu var. Cevap geldikçe grup yorumu ve kayıtlı aktif personel karşılaştırması burada durur.')
    return parcalar.join('\n')
  }
  if (input.personel === null) {
    parcalar.push('Grup yorumu anket cevaplarından kurulur. Kayıtlı aktif personel sayıları bu raporda okunamadı.')
    return parcalar.join('\n')
  }

  const uyeler = uyelikHaritasi(demolar, input.cevaplar)
  parcalar.push(`Kayıtlı aktif personel ${input.personel.length} kişidir. Anketi ${input.katilim} kişi cevapladı.`)
  let kiyasVar = false
  const farklar: number[] = []

  for (const demo of demolar) {
    const konu = kullanilabilir(demo)!
    const secilen = new Map<string, number>()
    for (const kisi of uyeler.values()) {
      const etiket = kisi.get(demo.id)
      if (!etiket) continue
      secilen.set(etiket, (secilen.get(etiket) ?? 0) + 1)
    }
    const cevaplayan = [...secilen.values()].reduce((t, n) => t + n, 0)
    const satirlar = [`«${demo.metin.trim()}» sorusunu ${cevaplayan} kişi cevapladı.`]
    const etiketler = etiketSirasi(demo, secilen.keys())
    for (const etiket of etiketler) {
      const ca = secilen.get(etiket) ?? 0
      if (ca === 0 && !grupSecenekleri(demo).includes(etiket)) continue
      const cy = yuzde(ca, cevaplayan)
      if (!secenekEslesirMi(konu, etiket)) {
        satirlar.push(`«${etiket}» kayıtlı personel kaydıyla eşleşmedi.`)
        continue
      }
      let ka = 0
      for (const kisi of input.personel) {
        const es = personelEslesir(kisi, konu, etiket)
        if (es === true) ka += 1
      }
      const ky = yuzde(ka, input.personel.length)
      kiyasVar = true
      farklar.push(Math.abs(cy - ky))
      satirlar.push(`«${etiket}»: cevaplayanların %${cy} kadarı (${ca} kişi), kayıtlı aktif personelin %${ky} kadarı (${ka} kişi).`)
    }
    const bos = bosKayitNotu(konu, input.personel)
    if (bos) satirlar.push(bos)
    if (konu === 'yas') {
      const araliklar = etiketler.map(anketYasAraligi).filter((a): a is { alt: number; ust: number } => a !== null)
      const ortusur = araliklar.some((a, i) => araliklar.some((b, j) => i < j && a.alt <= b.ust && b.alt <= a.ust))
      if (ortusur) satirlar.push('Yaş aralıkları örtüşüyor. Bir personel birden fazla satıra girebilir.')
    }
    parcalar.push(satirlar.join('\n'))
  }

  if (kiyasVar) {
    const enBuyuk = Math.max(...farklar)
    const yakin = enBuyuk <= 10
      ? `En büyük pay farkı ${enBuyuk} puandır. Cevaplayanların dağılımı kayıtlı aktif personele yakındır.`
      : `En büyük pay farkı ${enBuyuk} puandır. Cevaplayanların dağılımı kayıtlı aktif personelden belirgin şekilde farklıdır.`
    const az = input.katilim < 5 ? ' Cevap sayısı az. Pay, tek bir kişinin seçimiyle belirgin değişir.' : ''
    parcalar.push(`${yakin}${az} Bu karşılaştırma, cevaplayan grubun kayıtlı aktif personele benzeyip benzemediğini gösterir. Kurumun genelinin düşüncesi anlamına gelmez. Cevaplar linki açan kişilere aittir.`)
  }
  return parcalar.join('\n')
}
