'use server'

import { createClient } from '@/lib/supabase/server'

export type PpSatirLog = { id: number; zaman: string; islem: string; ozet: string; kullanici: string }

export async function ppSatirLogListele(tablo: string, kayitId: number): Promise<{ satirlar: PpSatirLog[]; hata?: string }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('performans_programi_satir_log')
    .select('id, islem, ozet, kullanici, created_at')
    .eq('tablo', tablo)
    .eq('kayit_id', kayitId)
    .order('created_at', { ascending: false })
  if (error) {
    if (String(error.message).includes('satir_log')) return { satirlar: [], hata: 'Satır geçmişi için 20261106160000_pp_satir_log.sql dosyasını çalıştırın.' }
    return { satirlar: [], hata: error.message }
  }
  const satirlar = ((data ?? []) as { id: number; islem: string; ozet: string; kullanici: string; created_at: string }[]).map(r => ({
    id: r.id,
    zaman: new Date(r.created_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }),
    islem: r.islem,
    ozet: r.ozet,
    kullanici: r.kullanici || 'Sistem',
  }))
  return { satirlar }
}
