'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function ayyZabitaNormalKesintiyeAl(sicil_no: string): Promise<{ hata?: string }> {
  const s = sicil_no.trim()
  if (!s) return { hata: 'Sicil gerekli.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('ayy_zabita_normal_kesinti_sicil')
    .upsert({ sicil_no: s } as never, { onConflict: 'sicil_no' })
  if (error) return { hata: error.message }
  revalidatePath('/kesintiler')
  revalidatePath('/kesintiler/ayy')
  return {}
}

export async function ayyZabitaKesintisineGeriAl(sicil_no: string): Promise<{ hata?: string }> {
  const s = sicil_no.trim()
  if (!s) return { hata: 'Sicil gerekli.' }
  const supabase = await createClient()
  const { error } = await supabase.from('ayy_zabita_normal_kesinti_sicil').delete().eq('sicil_no', s)
  if (error) return { hata: error.message }
  revalidatePath('/kesintiler')
  revalidatePath('/kesintiler/ayy')
  return {}
}

export async function ayyZabitaHavuzuTopluKaydet(normalKesintiSicilleri: string[]): Promise<{ hata?: string }> {
  const temiz = [...new Set((normalKesintiSicilleri ?? []).map(s => String(s ?? '').trim()).filter(Boolean))]
  const supabase = await createClient()

  const { error: silError } = await supabase
    .from('ayy_zabita_normal_kesinti_sicil')
    .delete()
    .neq('sicil_no', '')
  if (silError) return { hata: silError.message }

  if (temiz.length > 0) {
    const { error: ekleError } = await supabase
      .from('ayy_zabita_normal_kesinti_sicil')
      .insert(temiz.map(sicil_no => ({ sicil_no })) as never[])
    if (ekleError) return { hata: ekleError.message }
  }

  revalidatePath('/kesintiler')
  revalidatePath('/kesintiler/ayy')
  revalidatePath('/kesintiler/zabita-havuz')
  return {}
}
