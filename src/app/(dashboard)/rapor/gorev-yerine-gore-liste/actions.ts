'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function gorevYeriListeAyarKaydet(kayitKeyleri: string[]): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const temiz = Array.from(
    new Set(
      kayitKeyleri
        .map(k => String(k ?? '').trim())
        .filter(Boolean),
    ),
  )

  const { error: delErr } = await supabase.from('rapor_gorev_yeri_liste_ayar').delete().neq('id', 0)
  if (delErr) return { hata: delErr.message }

  if (temiz.length) {
    const payload = temiz.map((kayit_key, i) => ({ kayit_key, sira_no: i + 1 }))
    const { error: insErr } = await supabase.from('rapor_gorev_yeri_liste_ayar').insert(payload)
    if (insErr) return { hata: insErr.message }
  }

  revalidatePath('/rapor/gorev-yerine-gore-liste')
  revalidatePath('/api/rapor/gorev-yerine-gore-liste/excel')
  return {}
}
