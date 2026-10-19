import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'

export type EpostaAyarRow = Tables<'iletisim_eposta_ayar'>

export const EPOSTA_VARSAYILAN = {
  adres: 'insankaynaklari@adapazari.bel.tr',
  gorunenAd: 'Adapazarı Belediyesi İnsan Kaynakları ve Eğitim Müdürlüğü',
  imapHost: 'mail.adapazari.bel.tr',
  imapPort: 993,
  smtpHost: 'mail.adapazari.bel.tr',
  smtpPort: 465,
}

export async function fetchEpostaAyar(supabase: SupabaseClient): Promise<EpostaAyarRow | null> {
  const { data } = await supabase.from('iletisim_eposta_ayar').select('*').eq('id', 1).maybeSingle()
  return (data as EpostaAyarRow) ?? null
}

export function epostaAyarHazirMi(row: EpostaAyarRow | null): boolean {
  return Boolean(row?.aktif && String(row.adres ?? '').trim() && String(row.sifre ?? '').trim() && String(row.imap_host ?? '').trim())
}
