'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireTanimlarYazma } from '@/lib/tanimlar-yazma-guard'

const SAYFA = '/tanimlar/izin-turu'

export async function izinTuruEkle(formData: FormData): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const tur_adi = String(formData.get('tur_adi') ?? '').trim()
  if (!tur_adi) return { hata: 'Tür adı boş bırakılamaz.' }
  const supabase = await createClient()
  const { error } = await supabase.from('tanim_izin_tur').insert({
    tur_adi,
    kod:                  String(formData.get('kod') ?? '').trim() || null,
    izin_hakki_kullanimi: String(formData.get('izin_hakki_kullanimi') ?? '').trim() || null,
    durum:                true,
  })
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

export async function izinTuruGuncelle(id: number, formData: FormData): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const tur_adi = String(formData.get('tur_adi') ?? '').trim()
  if (!tur_adi) return { hata: 'Tür adı boş bırakılamaz.' }
  const supabase = await createClient()
  const { error } = await supabase.from('tanim_izin_tur').update({
    tur_adi,
    kod:                  String(formData.get('kod') ?? '').trim() || null,
    izin_hakki_kullanimi: String(formData.get('izin_hakki_kullanimi') ?? '').trim() || null,
  }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

export async function izinTuruToggleDurum(id: number, mevcutDurum: boolean): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const supabase = await createClient()
  const { error } = await supabase.from('tanim_izin_tur').update({ durum: !mevcutDurum }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}
