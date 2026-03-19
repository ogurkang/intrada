'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const SAYFA = '/tanimlar/mudurluk'

export async function mudurlukEkle(
  formData: FormData
): Promise<{ hata?: string }> {
  const mudurluk_adi = String(formData.get('mudurluk_adi') ?? '').trim()
  if (!mudurluk_adi) return { hata: 'Müdürlük adı boş bırakılamaz.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tanim_mudurluk')
    .insert({ mudurluk_adi, aktif: true })

  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

export async function mudurlukGuncelle(
  id: number,
  formData: FormData
): Promise<{ hata?: string }> {
  const mudurluk_adi = String(formData.get('mudurluk_adi') ?? '').trim()
  if (!mudurluk_adi) return { hata: 'Müdürlük adı boş bırakılamaz.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tanim_mudurluk')
    .update({ mudurluk_adi })
    .eq('id', id)

  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

export async function mudurlukToggleAktif(
  id: number,
  mevcutAktif: boolean
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tanim_mudurluk')
    .update({ aktif: !mevcutAktif })
    .eq('id', id)

  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}
