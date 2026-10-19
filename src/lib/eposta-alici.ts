import type { SupabaseClient } from '@supabase/supabase-js'

const ADRES = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface EpostaKisi {
  ad: string
  eposta: string
}

function katla(s: string): string {
  return s
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/i̇/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, ' ')
}

function parcalar(raw: string): string[] {
  return String(raw ?? '')
    .split(/[;,\n]/)
    .map(s => s.trim())
    .filter(Boolean)
}

function hazirAdres(token: string): { adres?: string; hata?: string } | null {
  const acik = token.match(/<([^>]+)>/)
  const aday = (acik?.[1] ?? token).trim()
  if (!aday.includes('@')) return null
  if (ADRES.test(aday)) return { adres: aday }
  return { hata: `Geçersiz adres: ${aday}` }
}

function kelimelerUyar(ad: string, sorgu: string): boolean {
  const adParca = katla(ad).split(' ').filter(Boolean)
  const sorguParca = katla(sorgu).split(' ').filter(Boolean)
  if (!sorguParca.length) return false
  if (katla(ad) === katla(sorgu)) return true
  return sorguParca.every(kelime => adParca.some(p => p === kelime))
}

interface Aday {
  ad: string
  eposta: string | null
}

async function adaylariGetir(supabase: SupabaseClient, sorgu: string): Promise<Aday[]> {
  const ilk = sorgu.trim().split(/\s+/)[0]?.replace(/[%_]/g, '') ?? ''
  if (ilk.length < 2) return []
  const like = `%${ilk}%`
  const bugun = new Date().toISOString().slice(0, 10)
  const [calisan, firma] = await Promise.all([
    supabase.from('calisan').select('ad_soyad, e_posta').ilike('ad_soyad', like).limit(40),
    supabase.from('firma_calisanlar').select('ad_soyad, e_posta, ayrilis_tarihi').ilike('ad_soyad', like).limit(40),
  ])
  const liste: Aday[] = []
  for (const k of calisan.data ?? []) liste.push({ ad: String(k.ad_soyad ?? '').trim(), eposta: k.e_posta })
  for (const k of firma.data ?? []) {
    const ayrilis = String(k.ayrilis_tarihi ?? '').slice(0, 10)
    if (ayrilis && ayrilis <= bugun) continue
    liste.push({ ad: String(k.ad_soyad ?? '').trim(), eposta: k.e_posta })
  }
  return liste.filter(k => k.ad)
}

function sec(adaylar: Aday[], sorgu: string): { kisi?: EpostaKisi; hata?: string } {
  const uyan = adaylar.filter(k => kelimelerUyar(k.ad, sorgu))
  const tam = uyan.filter(k => katla(k.ad) === katla(sorgu))
  const havuz = tam.length ? tam : uyan
  const tekil = new Map<string, Aday>()
  for (const k of havuz) {
    const anahtar = `${katla(k.ad)}|${(k.eposta ?? '').toLocaleLowerCase('tr-TR')}`
    if (!tekil.has(anahtar)) tekil.set(anahtar, k)
  }
  const kisiler = [...tekil.values()]
  if (!kisiler.length) return { hata: `"${sorgu}" adlı personel bulunamadı. Adı tam yazın veya e-posta girin.` }
  if (kisiler.length > 1) {
    const ozet = kisiler
      .slice(0, 5)
      .map(k => (k.eposta ? `${k.ad} (${k.eposta})` : `${k.ad} (e-posta yok)`))
      .join(', ')
    return { hata: `"${sorgu}" birden fazla personele uyuyor: ${ozet}. Tam adı veya e-postayı yazın.` }
  }
  const bulunan = kisiler[0]
  const eposta = String(bulunan.eposta ?? '').trim()
  if (!ADRES.test(eposta)) return { hata: `${bulunan.ad} için sistemde kayıtlı e-posta yok.` }
  return { kisi: { ad: bulunan.ad, eposta } }
}

/** Yazılan parça personel adıysa kayıtlı e-postayı döndürür. En fazla 8 kişi. */
export async function epostaKisiAra(supabase: SupabaseClient, sorgu: string): Promise<EpostaKisi[]> {
  const q = sorgu.trim()
  if (q.length < 2 || q.includes('@')) return []
  const adaylar = await adaylariGetir(supabase, q)
  const uyan = adaylar.filter(k => {
    const ad = katla(k.ad)
    const parca = katla(q).split(' ').filter(Boolean)
    return parca.every(kelime => ad.split(' ').some(p => p.startsWith(kelime)))
  })
  const gorulen = new Set<string>()
  const out: EpostaKisi[] = []
  for (const k of uyan) {
    const eposta = String(k.eposta ?? '').trim()
    if (!ADRES.test(eposta)) continue
    const anahtar = eposta.toLocaleLowerCase('tr-TR')
    if (gorulen.has(anahtar)) continue
    gorulen.add(anahtar)
    out.push({ ad: k.ad, eposta })
    if (out.length >= 8) break
  }
  return out
}

/** Virgülle ayrılmış alıcıları e-posta adresine çevirir. Ad, personel kaydından çözülür. */
export async function epostaAlicilariCoz(
  supabase: SupabaseClient,
  raw: string,
): Promise<{ adresler: string[]; hata?: string }> {
  const adresler: string[] = []
  for (const token of parcalar(raw)) {
    const hazir = hazirAdres(token)
    if (hazir?.hata) return { adresler: [], hata: hazir.hata }
    if (hazir?.adres) {
      adresler.push(hazir.adres)
      continue
    }
    const bulunan = sec(await adaylariGetir(supabase, token), token)
    if (bulunan.hata || !bulunan.kisi) return { adresler: [], hata: bulunan.hata ?? 'Alıcı çözülemedi.' }
    adresler.push(bulunan.kisi.eposta)
  }
  return { adresler: [...new Set(adresler.map(a => a.toLocaleLowerCase('tr-TR')))] }
}
