import type { SupabaseClient } from '@supabase/supabase-js'

export async function ppSatirLogYaz(
  supabase: SupabaseClient,
  girdi: { tablo: string; kayitId: number; islem: string; ozet: string },
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('performans_programi_satir_log').insert({
    tablo: girdi.tablo,
    kayit_id: girdi.kayitId,
    islem: girdi.islem,
    ozet: girdi.ozet,
    kullanici: user?.email ?? 'Sistem',
  })
  if (error && !String(error.message).includes('satir_log')) {
    console.error('pp satir log', error.message)
  }
}
