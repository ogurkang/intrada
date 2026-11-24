'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ppOturum } from '@/lib/pp-erisim'
import { ppSatirLogYaz } from '@/lib/pp-satir-log'

export type PpOdenekKalem = {
  butce_kodu_id: number
  t1Butce: number | null
  t1Haziran: number | null
  t1YilSonu: number | null
  tButce: number | null
  t1Tahmin: number | null
  t2Tahmin: number | null
}

export async function ppPfKurumIciKaydet(pfFaaliyetId: number, kurumIci: boolean): Promise<{ hata?: string }> {
  if (!Number.isFinite(pfFaaliyetId)) return { hata: 'Faaliyet bulunamadı.' }
  const supabase = await createClient()
  if (!(await ppOturum(supabase))) return { hata: 'Oturum gerekli.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { error } = await sb.from('performans_programi_pf_faaliyet').update({ kurum_ici: kurumIci }).eq('id', pfFaaliyetId)
  if (error) {
    if (String(error.message).includes('kurum_ici')) {
      return { hata: 'Kurum İçi için 20261120140000_pp_pf_kurum_ici.sql dosyasını çalıştırın.' }
    }
    return { hata: error.message }
  }
  await ppSatirLogYaz(supabase, {
    tablo: 'performans_faaliyet',
    kayitId: pfFaaliyetId,
    islem: 'Ödenek',
    ozet: kurumIci ? 'Kurum İçi işaretlendi' : 'Kurum İçi kaldırıldı',
  })
  const { data: faaliyet } = await sb.from('performans_programi_pf_faaliyet').select('bag_id').eq('id', pfFaaliyetId).maybeSingle()
  if (faaliyet?.bag_id) revalidatePath(`/stratejik-yonetim/performans-programi/hedef/${faaliyet.bag_id}`)
  revalidatePath(`/stratejik-yonetim/performans-programi/pf/${pfFaaliyetId}/gostergeler`)
  return {}
}
