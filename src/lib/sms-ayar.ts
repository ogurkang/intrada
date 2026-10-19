import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'
import { smsGatewayAdresi, type SmsAyarConfig } from '@/lib/sms-mesajpaketi'

export type SmsAyarRow = Tables<'iletisim_sms_ayar'>

export async function fetchSmsAyar(supabase: SupabaseClient): Promise<SmsAyarRow | null> {
  const { data } = await supabase
    .from('iletisim_sms_ayar')
    .select('*')
    .eq('id', 1)
    .maybeSingle()
  return (data as SmsAyarRow) ?? null
}

export function smsAyarToConfig(row: SmsAyarRow | null): SmsAyarConfig {
  return {
    apiBaseUrl: smsGatewayAdresi(row?.api_base_url),
    kullaniciAdi: String(row?.kullanici_adi ?? '').trim(),
    bayiKodu: String(row?.bayi_kodu ?? '').trim(),
    sifre: String(row?.sifre ?? '').trim(),
    originator: String(row?.originator ?? '').trim(),
    turkceKarakter: row?.turkce_karakter !== false,
  }
}

/** Tanımlı (boş olmayan) originator başlıkları; ilki varsayılan. */
export function smsOriginatorListesi(row: SmsAyarRow | null): string[] {
  const adaylar = [row?.originator, row?.originator2, row?.originator3]
  const out: string[] = []
  for (const a of adaylar) {
    const v = String(a ?? '').trim()
    if (v && !out.includes(v)) out.push(v)
  }
  return out
}

export function smsAyarHazirMi(row: SmsAyarRow | null): boolean {
  const ad = String(row?.kullanici_adi ?? '').trim()
  const bayi = String(row?.bayi_kodu ?? '').trim()
  return Boolean(
    row?.aktif &&
      ad &&
      (bayi || ad.includes('-')) &&
      String(row?.sifre ?? '').trim() &&
      String(row?.originator ?? '').trim(),
  )
}
