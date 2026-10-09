import { anketYoneticiSayfasi } from '@/lib/anket-yetki'
import type { AnketListeSatir } from '@/components/anket/AnketListeClient'
import type { AnketHamCevap, AnketSoruTipi } from '@/lib/anket'
import { anketSoruSonuc } from '@/lib/anket'

type Sb = {
  from: (tablo: string) => {
    select: (kolon: string) => Sorgu
  }
}

type Sorgu = Promise<{ data: unknown; error: { message: string } | null }> & {
  eq: (kolon: string, deger: unknown) => Sorgu
  order: (kolon: string, opt?: { ascending: boolean }) => Sorgu
  limit: (n: number) => Sorgu
  maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>
}

function tabloYok(mesaj: string): boolean {
  return mesaj.includes('schema cache') || mesaj.includes('does not exist') || mesaj.includes('anketler')
}

export async function anketListeYukle(): Promise<{ hata?: string; satirlar: AnketListeSatir[] }> {
  const { supabase } = await anketYoneticiSayfasi()
  const sb = supabase as unknown as Sb
  const anketler = await sb.from('anketler').select('id, baslik, kod, durum, created_at').order('created_at', { ascending: false })
  if (anketler.error) {
    return {
      hata: tabloYok(anketler.error.message)
        ? 'Anket tabloları veritabanında yok. 20261009140000_anket_yonetimi migration dosyasını çalıştırın.'
        : anketler.error.message,
      satirlar: [],
    }
  }
  const [sorular, katilim] = await Promise.all([
    sb.from('anket_sorulari').select('anket_id'),
    sb.from('anket_katilim').select('anket_id'),
  ])
  const soruSay = new Map<string, number>()
  for (const satir of (sorular.data as { anket_id: string }[] | null) ?? []) {
    soruSay.set(satir.anket_id, (soruSay.get(satir.anket_id) ?? 0) + 1)
  }
  const cevapSay = new Map<string, number>()
  for (const satir of (katilim.data as { anket_id: string }[] | null) ?? []) {
    cevapSay.set(satir.anket_id, (cevapSay.get(satir.anket_id) ?? 0) + 1)
  }
  const satirlar = ((anketler.data as { id: string; baslik: string; kod: string; durum: string }[] | null) ?? []).map(a => ({
    id: a.id,
    baslik: a.baslik,
    kod: a.kod,
    durum: a.durum,
    soruSayisi: soruSay.get(a.id) ?? 0,
    cevapSayisi: cevapSay.get(a.id) ?? 0,
  }))
  return { satirlar }
}

export async function anketRaporYukle(anketId: string) {
  const { supabase } = await anketYoneticiSayfasi()
  const sb = supabase as unknown as Sb
  const anket = await sb.from('anketler').select('id, baslik, durum').eq('id', anketId).maybeSingle()
  if (anket.error || !anket.data) return { hata: 'Anket bulunamadı.' as const }
  const [soruSorgu, cevapSorgu, katilimSorgu] = await Promise.all([
    sb.from('anket_sorulari').select('id, sira, metin, tip, secenekler').eq('anket_id', anketId).order('sira'),
    sb.from('anket_cevaplar').select('soru_id, secimler, puan, metin').eq('anket_id', anketId),
    sb.from('anket_katilim').select('id').eq('anket_id', anketId),
  ])
  const sorular = ((soruSorgu.data as {
    id: string
    sira: number
    metin: string
    tip: AnketSoruTipi
    secenekler: string[] | null
  }[] | null) ?? []).slice().sort((a, b) => a.sira - b.sira)
  const cevaplar = (cevapSorgu.data as ({ soru_id: string } & AnketHamCevap)[] | null) ?? []
  const katilim = ((katilimSorgu.data as { id: string }[] | null) ?? []).length
  return {
    baslik: String(anket.data.baslik),
    katilim,
    sorular: sorular.map(soru => ({
      id: soru.id,
      sira: soru.sira,
      metin: soru.metin,
      sonuc: anketSoruSonuc(
        soru.tip,
        Array.isArray(soru.secenekler) ? soru.secenekler : [],
        cevaplar.filter(c => c.soru_id === soru.id),
      ),
    })),
  }
}
