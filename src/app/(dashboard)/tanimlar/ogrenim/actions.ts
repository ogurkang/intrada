'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const SAYFA = '/tanimlar/ogrenim'

export async function ogrenimEkle(
  formData: FormData
): Promise<{ hata?: string }> {
  const isim = String(formData.get('isim') ?? '').trim()
  if (!isim) return { hata: 'İsim alanı boş bırakılamaz.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tanim_ogrenim')
    .insert({ isim, aktif: true })

  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

export async function ogrenimGuncelle(
  id: number,
  formData: FormData
): Promise<{ hata?: string }> {
  const isim = String(formData.get('isim') ?? '').trim()
  if (!isim) return { hata: 'İsim alanı boş bırakılamaz.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tanim_ogrenim')
    .update({ isim })
    .eq('id', id)

  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

export async function ogrenimToggleAktif(
  id: number,
  mevcutAktif: boolean
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tanim_ogrenim')
    .update({ aktif: !mevcutAktif })
    .eq('id', id)

  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}
