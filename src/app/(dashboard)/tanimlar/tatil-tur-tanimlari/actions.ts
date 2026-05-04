'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireTanimlarYazma } from '@/lib/tanimlar-yazma-guard'

const SAYFA = '/tanimlar/tatil-tur-tanimlari'
const TATIL_SAYFA = '/tanimlar/tatil'

export async function tatilTurEkle(formData: FormData): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const tur_adi = String(formData.get('tur_adi') ?? '').trim()
  if (!tur_adi) return { hata: 'Tatil türü adı boş bırakılamaz.' }

  const supabase = await createClient()
  const { error } = await supabase.from('tanim_izin_tatil_tur').insert({ tur_adi, aktif: true })
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  revalidatePath(TATIL_SAYFA)
  return {}
}

export async function tatilTurGuncelle(id: number, formData: FormData): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const tur_adi = String(formData.get('tur_adi') ?? '').trim()
  if (!tur_adi) return { hata: 'Tatil türü adı boş bırakılamaz.' }

  const supabase = await createClient()
  const { error } = await supabase.from('tanim_izin_tatil_tur').update({ tur_adi }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  revalidatePath(TATIL_SAYFA)
  return {}
}

export async function tatilTurToggleAktif(id: number, mevcutAktif: boolean): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const supabase = await createClient()
  const { error } = await supabase.from('tanim_izin_tatil_tur').update({ aktif: !mevcutAktif }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  revalidatePath(TATIL_SAYFA)
  return {}
}
