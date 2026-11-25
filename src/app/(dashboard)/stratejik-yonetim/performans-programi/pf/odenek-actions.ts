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

/** Kurum İçi yalnızca ilgili göstergeye yazılır; diğer göstergeleri / faaliyeti etkilemez. */
export async function ppPfKurumIciKaydet(pfGostergeId: number, kurumIci: boolean): Promise<{ hata?: string }> {
  if (!Number.isFinite(pfGostergeId) || pfGostergeId <= 0) {
    return { hata: 'Önce göstergeyi kaydedin; Kurum İçi ilgili göstergeye bağlanır.' }
  }
  const supabase = await createClient()
  if (!(await ppOturum(supabase))) return { hata: 'Oturum gerekli.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: gosterge, error: gHata } = await sb
    .from('performans_programi_pf_gosterge')
    .select('id, faaliyet_id')
    .eq('id', pfGostergeId)
    .maybeSingle()
  if (gHata) return { hata: gHata.message }
  if (!gosterge) return { hata: 'Gösterge bulunamadı.' }

  const { error } = await sb
    .from('performans_programi_pf_gosterge')
    .update({ kurum_ici: kurumIci })
    .eq('id', pfGostergeId)
  if (error) {
    if (String(error.message).includes('kurum_ici')) {
      return { hata: 'Kurum İçi için 20261125120000_pp_gosterge_kurum_ici.sql dosyasını çalıştırın.' }
    }
    return { hata: error.message }
  }
  await ppSatirLogYaz(supabase, {
    tablo: 'performans_gosterge',
    kayitId: pfGostergeId,
    islem: 'Ödenek',
    ozet: kurumIci ? 'Kurum İçi işaretlendi' : 'Kurum İçi kaldırıldı',
  })
  const faaliyetId = Number(gosterge.faaliyet_id)
  const { data: faaliyet } = await sb
    .from('performans_programi_pf_faaliyet')
    .select('bag_id')
    .eq('id', faaliyetId)
    .maybeSingle()
  if (faaliyet?.bag_id) revalidatePath(`/stratejik-yonetim/performans-programi/hedef/${faaliyet.bag_id}`)
  revalidatePath(`/stratejik-yonetim/performans-programi/pf/${faaliyetId}/gostergeler`)
  return {}
}
