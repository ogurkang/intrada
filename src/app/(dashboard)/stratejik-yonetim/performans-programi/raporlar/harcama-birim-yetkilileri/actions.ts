'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ppHarcamaYetkilileriKaydet } from '@/lib/pp-harcama-yetkilileri-rapor'
import { PP_RAPORLAR_BASE } from '@/lib/pp-rapor-listesi'

export async function ppHarcamaYetkilileriKaydetAction(): Promise<{ ok: boolean; hata?: string; adet?: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, hata: 'Oturum gerekli.' }
  const sonuc = await ppHarcamaYetkilileriKaydet(supabase, user.email ?? user.id)
  if (!sonuc.ok) return { ok: false, hata: sonuc.hata }
  revalidatePath(`${PP_RAPORLAR_BASE}/harcama-birim-yetkilileri`)
  return { ok: true, adet: sonuc.adet }
}
