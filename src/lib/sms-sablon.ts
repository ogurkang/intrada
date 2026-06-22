import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'

export type SmsSablonRow = Tables<'iletisim_sms_sablon'>

export type SmsSablonTur = 'dogum_gunu' | 'hosgeldin_bebek' | 'evlilik' | 'genel'

export const SMS_SABLON_TURLERI: { deger: SmsSablonTur; etiket: string }[] = [
  { deger: 'dogum_gunu', etiket: 'Doğum Günü' },
  { deger: 'hosgeldin_bebek', etiket: 'Hoş Geldin Bebek' },
  { deger: 'evlilik', etiket: 'Evlilik' },
  { deger: 'genel', etiket: 'Genel' },
]

export function sablonTurEtiket(tur: string): string {
  return SMS_SABLON_TURLERI.find(t => t.deger === tur)?.etiket ?? tur
}

export const SMS_SABLON_DEGISKENLERI = ['{ad_soyad}', '{ad}', '{cocuk_adi}'] as const

export async function fetchSmsSablonlari(supabase: SupabaseClient): Promise<SmsSablonRow[]> {
  const { data } = await supabase
    .from('iletisim_sms_sablon')
    .select('*')
    .order('tur', { ascending: true })
    .order('baslik', { ascending: true })
  return (data as SmsSablonRow[]) ?? []
}

/** Şablon metnindeki {anahtar} yer tutucularını değerlerle doldurur; tanımsızları boşaltır. */
export function sablonDoldur(metin: string, degiskenler: Record<string, string>): string {
  return String(metin ?? '')
    .replace(/\{(\w+)\}/g, (_m, anahtar: string) => {
      const v = degiskenler[anahtar]
      return v == null ? '' : String(v)
    })
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

/** Ad Soyad'tan ilk adı çıkarır. */
export function ilkAd(adSoyad: string | null | undefined): string {
  const s = String(adSoyad ?? '').trim()
  if (!s) return ''
  return s.split(/\s+/)[0]
}
