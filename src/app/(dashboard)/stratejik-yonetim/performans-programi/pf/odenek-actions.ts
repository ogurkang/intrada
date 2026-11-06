'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ppOturum } from '@/lib/pp-erisim'

export type PpOdenekKalem = {
  butce_kodu_id: number
  t1Butce: number | null
  t1Haziran: number | null
  t1YilSonu: number | null
  tButce: number | null
  t1Tahmin: number | null
  t2Tahmin: number | null
}

function dolu(k: PpOdenekKalem) {
  return [k.t1Butce, k.t1Haziran, k.t1YilSonu, k.tButce, k.t1Tahmin, k.t2Tahmin].some(n => n != null)
}

export async function ppPfOdenekKaydet(pfFaaliyetId: number, kalemler: PpOdenekKalem[]): Promise<{ hata?: string }> {
  if (!Number.isFinite(pfFaaliyetId)) return { hata: 'Faaliyet bulunamadı.' }
  const supabase = await createClient()
  if (!(await ppOturum(supabase))) return { hata: 'Oturum gerekli.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const silinecek = kalemler.filter(k => !dolu(k)).map(k => k.butce_kodu_id)
  const yazilacak = kalemler.filter(dolu)
  if (silinecek.length) {
    const { error } = await sb.from('performans_programi_pf_odenek').delete().eq('pf_faaliyet_id', pfFaaliyetId).in('butce_kodu_id', silinecek)
    if (error) return { hata: error.message.includes('pf_odenek') ? 'Ödenek tablosu için 20261106140000_pp_faaliyet_aciklama_odenek.sql dosyasını çalıştırın.' : error.message }
  }
  if (yazilacak.length) {
    const { error } = await sb.from('performans_programi_pf_odenek').upsert(yazilacak.map(k => ({
      pf_faaliyet_id: pfFaaliyetId,
      butce_kodu_id: k.butce_kodu_id,
      t1_butce: k.t1Butce,
      t1_haziran: k.t1Haziran,
      t1_yil_sonu: k.t1YilSonu,
      t_butce: k.tButce,
      t1_tahmin: k.t1Tahmin,
      t2_tahmin: k.t2Tahmin,
    })), { onConflict: 'pf_faaliyet_id,butce_kodu_id' })
    if (error) return { hata: error.message.includes('pf_odenek') ? 'Ödenek tablosu için 20261106140000_pp_faaliyet_aciklama_odenek.sql dosyasını çalıştırın.' : error.message }
  }
  const { data: faaliyet } = await sb.from('performans_programi_pf_faaliyet').select('bag_id').eq('id', pfFaaliyetId).maybeSingle()
  if (faaliyet?.bag_id) revalidatePath(`/stratejik-yonetim/performans-programi/hedef/${faaliyet.bag_id}`)
  revalidatePath(`/stratejik-yonetim/performans-programi/pf/${pfFaaliyetId}/odenek`)
  return {}
}
