import type { SupabaseClient } from '@supabase/supabase-js'
import { trNormalize } from '@/lib/turkce-search'

export type AsistanMesaj = { role: 'user' | 'assistant'; content: string }

const IZIN_ANAHTAR = /izin|izni|izinler|hak|kalan|devreden|kullanilan|kullanılan|tatil/i

const STOP = new Set(
  [
    'kac',
    'kaç',
    'ne',
    'nedir',
    'nerede',
    'nasıl',
    'nasil',
    'var',
    'mi',
    'mı',
    'kim',
    'hangi',
    'gun',
    'gün',
    'izin',
    'izni',
    'izinler',
    'hakki',
    'hakkı',
    'kalan',
    'devreden',
    'kullanilan',
    'kullanılan',
    'lütfen',
    'icin',
    'için',
    'olan',
    'olanın',
  ].map(w => trNormalize(w)),
)

const MAX_SECIM = 8

export type PersonelIzinOzet = {
  ad_soyad: string
  sicil_no: string
  kaynak: 'kadro' | 'adabel'
  yil: number
  devreden_gun: number
  hak_edilen_gun: number
  kullanilan_gun: number
  kalan_gun: number
  taslak_izin_sayisi: number
  gorev_mudurlugu?: string | null
}

export type PersonelAday = {
  sicil_no: string
  ad_soyad: string
  gorev_mudurlugu?: string | null
  skor: number
}

export type IzinSorguSonuc =
  | { tur: 'ozet'; ozet: PersonelIzinOzet }
  | { tur: 'secim'; adaylar: PersonelAday[]; aranan: string }
  | { tur: 'bulunamadi'; aranan: string }

export function soruIzinIleIlgili(mesaj: string): boolean {
  return IZIN_ANAHTAR.test(mesaj)
}

/** Mesajdan tam ad veya tek kelime (Gürkan) arama terimleri çıkarır. */
export function olasiAramaTerimleri(mesaj: string): string[] {
  const temiz = mesaj
    .replace(/[''`]/g, ' ')
    .replace(/\b(in|ın|un|ün|nin|nın)\b/gi, ' ')
  const adaylar = new Set<string>()

  const coklu = /[A-Za-zÇĞİÖŞÜçğıöşü]{2,}(?:\s+[A-Za-zÇĞİÖŞÜçğıöşü]{2,}){1,3}/g
  for (const m of temiz.match(coklu) ?? []) {
    const kelimeler = m
      .trim()
      .split(/\s+/)
      .filter(w => !STOP.has(trNormalize(w)) && !IZIN_ANAHTAR.test(w))
    if (kelimeler.length >= 2) adaylar.add(kelimeler.join(' '))
  }

  const tek = /[A-Za-zÇĞİÖŞÜçğıöşü]{3,}/g
  for (const w of temiz.match(tek) ?? []) {
    const n = trNormalize(w)
    if (STOP.has(n) || IZIN_ANAHTAR.test(w)) continue
    adaylar.add(w.trim())
  }

  return [...adaylar].sort((a, b) => b.length - a.length).slice(0, 5)
}

function skorIsim(terimNorm: string, adSoyadNorm: string): number {
  if (adSoyadNorm === terimNorm) return 100
  if (adSoyadNorm.includes(terimNorm) || terimNorm.includes(adSoyadNorm)) return 85

  const kelimelerAd = adSoyadNorm.split(/\s+/).filter(Boolean)
  const terimKelimeler = terimNorm.split(/\s+/).filter(Boolean)

  if (terimKelimeler.length === 1) {
    const t = terimKelimeler[0]
    if (kelimelerAd.some(k => k === t)) return 78
    if (kelimelerAd.some(k => k.startsWith(t) || k.includes(t))) return 65
    if (adSoyadNorm.includes(t)) return 55
    return 0
  }

  if (terimKelimeler.every(p => adSoyadNorm.includes(p))) return 72
  return 0
}

async function calisanAraTerim(
  supabase: SupabaseClient,
  terim: string,
): Promise<{ sicil_no: string; ad_soyad: string }[]> {
  const { data } = await supabase
    .from('calisan')
    .select('sicil_no, ad_soyad')
    .ilike('ad_soyad', `%${terim}%`)
    .limit(25)
  return data ?? []
}

async function adaylaraMudurlukEkle(
  supabase: SupabaseClient,
  adaylar: PersonelAday[],
): Promise<PersonelAday[]> {
  const siciller = adaylar.map(a => a.sicil_no)
  if (siciller.length === 0) return adaylar

  const { data: ozetler } = await supabase
    .from('personel_kadro_ozet')
    .select('sicil_no, gorev_mudurlugu')
    .in('sicil_no', siciller)

  const mudMap = new Map((ozetler ?? []).map(o => [o.sicil_no, o.gorev_mudurlugu]))
  return adaylar.map(a => ({
    ...a,
    gorev_mudurlugu: mudMap.get(a.sicil_no) ?? null,
  }))
}

export async function personelAdaylariBul(
  supabase: SupabaseClient,
  mesaj: string,
): Promise<{ adaylar: PersonelAday[]; aranan: string } | null> {
  const terimler = olasiAramaTerimleri(mesaj)
  if (terimler.length === 0) return null

  const birlestir = new Map<string, PersonelAday>()

  for (const terim of terimler) {
    const n = trNormalize(terim)
    const calisanlar = await calisanAraTerim(supabase, terim)
    for (const c of calisanlar) {
      const skor = skorIsim(n, trNormalize(c.ad_soyad))
      if (skor < 50) continue
      const mevcut = birlestir.get(c.sicil_no)
      if (!mevcut || skor > mevcut.skor) {
        birlestir.set(c.sicil_no, {
          sicil_no: c.sicil_no,
          ad_soyad: c.ad_soyad,
          skor,
        })
      }
    }
  }

  const sirali = [...birlestir.values()].sort((a, b) => b.skor - a.skor)
  if (sirali.length === 0) return { adaylar: [], aranan: terimler[0] }

  const zengin = await adaylaraMudurlukEkle(supabase, sirali.slice(0, MAX_SECIM))
  return { adaylar: zengin, aranan: terimler[0] }
}

const SECIM_SATIR = /^\s*(\d+)\.\s+(.+?)\s+—\s+sicil\s+(\S+)/

/** Son asistan mesajındaki numaralı personel listesini okur. */
export function sonSecimListesi(gecmis: AsistanMesaj[]): PersonelAday[] | null {
  const son = [...gecmis].reverse().find(
    m => m.role === 'assistant' && /Hangisini kastediyorsunuz/i.test(m.content),
  )
  if (!son) return null

  const adaylar: PersonelAday[] = []
  for (const satir of son.content.split('\n')) {
    const m = satir.match(SECIM_SATIR)
    if (!m) continue
    adaylar.push({
      sicil_no: m[3].trim(),
      ad_soyad: m[2].trim(),
      skor: 100,
    })
  }
  return adaylar.length > 0 ? adaylar : null
}

/** Kullanıcının "1", soyad veya kısmi ad yanıtından sicil seçer. */
export function secimdenSicilBul(mesaj: string, adaylar: PersonelAday[]): string | null {
  const t = mesaj.trim()
  if (!t) return null

  if (/^\d{1,2}$/.test(t)) {
    const idx = parseInt(t, 10) - 1
    if (idx >= 0 && idx < adaylar.length) return adaylar[idx].sicil_no
  }

  const n = trNormalize(t)
  const tam = adaylar.filter(a => trNormalize(a.ad_soyad) === n)
  if (tam.length === 1) return tam[0].sicil_no

  const icerir = adaylar.filter(a => {
    const ad = trNormalize(a.ad_soyad)
    return ad.includes(n) || n.split(/\s+/).every(p => ad.includes(p))
  })
  if (icerir.length === 1) return icerir[0].sicil_no

  const sicilEsles = adaylar.find(a => a.sicil_no === t)
  if (sicilEsles) return sicilEsles.sicil_no

  return null
}

export function secimListesiMetni(adaylar: PersonelAday[], aranan: string): string {
  const satirlar = adaylar.map((a, i) => {
    const mud = a.gorev_mudurlugu ? ` (${a.gorev_mudurlugu})` : ''
    return `${i + 1}. ${a.ad_soyad} — sicil ${a.sicil_no}${mud}`
  })
  return [
    `"${aranan}" için ${adaylar.length} personel bulundu. Hangisini kastediyorsunuz?`,
    '',
    ...satirlar,
    '',
    'Yanıt olarak liste numarası (ör. 1), soyad veya daha fazla ad yazabilirsiniz.',
  ].join('\n')
}

export async function personelIzinOzetSicil(
  supabase: SupabaseClient,
  sicilNo: string,
  yil: number,
): Promise<PersonelIzinOzet | null> {
  const hedefSicil = sicilNo.trim()
  if (!hedefSicil) return null

  const [{ data: hak }, { data: calisan }, { count: taslakSay }] = await Promise.all([
    supabase
      .from('izin_haklari')
      .select('devreden_gun, hak_edilen_gun, kullanilan_gun, kalan_gun')
      .eq('sicil_no', hedefSicil)
      .eq('yil', yil)
      .maybeSingle(),
    supabase.from('calisan').select('ad_soyad, sicil_no').eq('sicil_no', hedefSicil).maybeSingle(),
    supabase
      .from('izin_hareketleri')
      .select('id', { count: 'exact', head: true })
      .eq('sicil_no', hedefSicil)
      .eq('yil', yil)
      .eq('durum', 'Taslak'),
  ])

  if (!hak && !calisan) return null

  const { data: ozet } = await supabase
    .from('personel_kadro_ozet')
    .select('gorev_mudurlugu')
    .eq('sicil_no', hedefSicil)
    .maybeSingle()

  return {
    ad_soyad: calisan?.ad_soyad ?? hedefSicil,
    sicil_no: hedefSicil,
    kaynak: 'kadro',
    yil,
    devreden_gun: hak?.devreden_gun ?? 0,
    hak_edilen_gun: hak?.hak_edilen_gun ?? 0,
    kullanilan_gun: hak?.kullanilan_gun ?? 0,
    kalan_gun: hak?.kalan_gun ?? 0,
    taslak_izin_sayisi: taslakSay ?? 0,
    gorev_mudurlugu: ozet?.gorev_mudurlugu ?? null,
  }
}

export async function personelIzinSorgula(
  supabase: SupabaseClient,
  mesaj: string,
  yil: number,
  opts?: { yalnizcaSicil?: string; gecmis?: AsistanMesaj[] },
): Promise<IzinSorguSonuc | null> {
  if (!soruIzinIleIlgili(mesaj) && !opts?.yalnizcaSicil) return null

  if (opts?.yalnizcaSicil) {
    const ozet = await personelIzinOzetSicil(supabase, opts.yalnizcaSicil, yil)
    return ozet ? { tur: 'ozet', ozet } : null
  }

  const bekleyen = opts?.gecmis ? sonSecimListesi(opts.gecmis) : null
  if (bekleyen && bekleyen.length > 0) {
    const sicil = secimdenSicilBul(mesaj, bekleyen)
    if (sicil) {
      const ozet = await personelIzinOzetSicil(supabase, sicil, yil)
      if (ozet) return { tur: 'ozet', ozet }
      return { tur: 'bulunamadi', aranan: mesaj }
    }
  }

  const eslesme = await personelAdaylariBul(supabase, mesaj)
  if (!eslesme) return null

  const { adaylar, aranan } = eslesme
  if (adaylar.length === 0) return { tur: 'bulunamadi', aranan }

  if (adaylar.length === 1) {
    const ozet = await personelIzinOzetSicil(supabase, adaylar[0].sicil_no, yil)
    return ozet ? { tur: 'ozet', ozet } : { tur: 'bulunamadi', aranan }
  }

  const enYuksek = adaylar[0].skor
  const ustGrup = adaylar.filter(a => a.skor >= enYuksek - 8)
  if (ustGrup.length === 1) {
    const ozet = await personelIzinOzetSicil(supabase, ustGrup[0].sicil_no, yil)
    return ozet ? { tur: 'ozet', ozet } : { tur: 'bulunamadi', aranan }
  }

  return { tur: 'secim', adaylar: ustGrup.length <= MAX_SECIM ? ustGrup : adaylar, aranan }
}

/** Yetki kontrolü için tek aday önizlemesi (kullanıcı rolü). */
export async function personelIzinOzetBul(
  supabase: SupabaseClient,
  mesaj: string,
  yil: number,
  opts?: { yalnizcaSicil?: string },
): Promise<PersonelIzinOzet | null> {
  const sonuc = await personelIzinSorgula(supabase, mesaj, yil, opts)
  if (sonuc?.tur === 'ozet') return sonuc.ozet
  if (sonuc?.tur === 'secim' && sonuc.adaylar.length === 1) {
    return personelIzinOzetSicil(supabase, sonuc.adaylar[0].sicil_no, yil)
  }
  return null
}

export function izinOzetMetni(o: PersonelIzinOzet): string {
  return [
    `Personel: ${o.ad_soyad} (sicil: ${o.sicil_no})`,
    `Yıl: ${o.yil}`,
    `Devreden: ${o.devreden_gun} gün`,
    `Hak edilen: ${o.hak_edilen_gun} gün`,
    `Kullanılan (onaylı): ${o.kullanilan_gun} gün`,
    `Kalan: ${o.kalan_gun} gün`,
    o.taslak_izin_sayisi > 0 ? `Bekleyen (Taslak) izin kaydı: ${o.taslak_izin_sayisi} adet` : '',
    o.gorev_mudurlugu ? `Görev müdürlüğü: ${o.gorev_mudurlugu}` : '',
    `Detay: /izin/haklar veya personel kartı → İzin sekmesi`,
  ]
    .filter(Boolean)
    .join('\n')
}
