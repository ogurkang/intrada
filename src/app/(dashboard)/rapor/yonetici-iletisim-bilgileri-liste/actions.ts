'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function yoneticiIletisimListeAyarKaydet(kayitKeyleri: string[]): Promise<{ hata?: string }> {
  const supabase = await createClient()
  // Yeni tablo henüz Database tiplerine yansımadığı için geçici cast.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const temiz = Array.from(
    new Set(
      kayitKeyleri
        .map(k => String(k ?? '').trim())
        .filter(Boolean),
    ),
  )

  const { error: delErr } = await sb.from('rapor_yonetici_iletisim_liste_ayar').delete().neq('id', 0)
  if (delErr) return { hata: delErr.message }

  if (temiz.length) {
    const payload = temiz.map((kayit_key, i) => ({ kayit_key, sira_no: i + 1 }))
    const { error: insErr } = await sb.from('rapor_yonetici_iletisim_liste_ayar').insert(payload)
    if (insErr) return { hata: insErr.message }
  }

  revalidatePath('/rapor/yonetici-iletisim-bilgileri-liste')
  revalidatePath('/api/rapor/yonetici-iletisim-bilgileri-liste/excel')
  return {}
}
