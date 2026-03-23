'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireTanimlarYazma } from '@/lib/tanimlar-yazma-guard'

const SAYFA = '/tanimlar/statu'

export async function statuEkle(formData: FormData): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const statu_adi = String(formData.get('statu_adi') ?? '').trim()
  if (!statu_adi) return { hata: 'Statü adı boş bırakılamaz.' }
  const supabase = await createClient()
  const { error } = await supabase.from('tanim_statu').insert({ statu_adi, aktif: true })
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

export async function statuGuncelle(id: number, formData: FormData): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const statu_adi = String(formData.get('statu_adi') ?? '').trim()
  if (!statu_adi) return { hata: 'Statü adı boş bırakılamaz.' }
  const supabase = await createClient()
  const { error } = await supabase.from('tanim_statu').update({ statu_adi }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

export async function statuToggleAktif(id: number, mevcutAktif: boolean): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const supabase = await createClient()
  const { error } = await supabase.from('tanim_statu').update({ aktif: !mevcutAktif }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}
