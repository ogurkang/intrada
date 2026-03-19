'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const SAYFA = '/tanimlar/tatil'

export async function tatilEkle(formData: FormData): Promise<{ hata?: string }> {
  const tatil_adi       = String(formData.get('tatil_adi') ?? '').trim()
  const tatil_baslangici = String(formData.get('tatil_baslangici') ?? '').trim()
  const tatil_bitisi    = String(formData.get('tatil_bitisi') ?? '').trim()
  if (!tatil_adi)        return { hata: 'Tatil adı boş bırakılamaz.' }
  if (!tatil_baslangici) return { hata: 'Başlangıç tarihi zorunludur.' }
  if (!tatil_bitisi)     return { hata: 'Bitiş tarihi zorunludur.' }
  if (tatil_bitisi < tatil_baslangici) return { hata: 'Bitiş tarihi başlangıçtan önce olamaz.' }

  const supabase = await createClient()
  const { error } = await supabase.from('tanim_izin_tatil').insert({
    tatil_adi,
    tatil_turu:      String(formData.get('tatil_turu') ?? '').trim() || null,
    tatil_baslangici,
    tatil_bitisi,
    durum: true,
  })
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

export async function tatilGuncelle(id: number, formData: FormData): Promise<{ hata?: string }> {
  const tatil_adi       = String(formData.get('tatil_adi') ?? '').trim()
  const tatil_baslangici = String(formData.get('tatil_baslangici') ?? '').trim()
  const tatil_bitisi    = String(formData.get('tatil_bitisi') ?? '').trim()
  if (!tatil_adi)        return { hata: 'Tatil adı boş bırakılamaz.' }
  if (!tatil_baslangici) return { hata: 'Başlangıç tarihi zorunludur.' }
  if (!tatil_bitisi)     return { hata: 'Bitiş tarihi zorunludur.' }
  if (tatil_bitisi < tatil_baslangici) return { hata: 'Bitiş tarihi başlangıçtan önce olamaz.' }

  const supabase = await createClient()
  const { error } = await supabase.from('tanim_izin_tatil').update({
    tatil_adi,
    tatil_turu:      String(formData.get('tatil_turu') ?? '').trim() || null,
    tatil_baslangici,
    tatil_bitisi,
  }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

export async function tatilToggleDurum(id: number, mevcutDurum: boolean): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('tanim_izin_tatil').update({ durum: !mevcutDurum }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}
