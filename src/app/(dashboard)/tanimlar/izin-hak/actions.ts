'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const SAYFA = '/tanimlar/izin-hak'

export async function izinHakEkle(formData: FormData): Promise<{ hata?: string }> {
  const statu          = String(formData.get('statu') ?? '').trim()
  const hak_edilen_gun = Number(formData.get('hak_edilen_gun') ?? 0)
  if (!statu)              return { hata: 'Statü seçimi zorunludur.' }
  if (hak_edilen_gun <= 0) return { hata: 'Hak edilen gün 0\'dan büyük olmalıdır.' }

  const supabase = await createClient()
  const { error } = await supabase.from('tanim_izin_hak').insert({
    statu,
    hak_edilen_gun,
    en_az:                  formData.get('en_az')   ? Number(formData.get('en_az'))   : null,
    en_cok:                 formData.get('en_cok')  ? Number(formData.get('en_cok'))  : null,
    gecerlilik_suresi_yil:  formData.get('gecerlilik_suresi_yil') ? Number(formData.get('gecerlilik_suresi_yil')) : null,
    durum: true,
  })
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

export async function izinHakGuncelle(id: number, formData: FormData): Promise<{ hata?: string }> {
  const statu          = String(formData.get('statu') ?? '').trim()
  const hak_edilen_gun = Number(formData.get('hak_edilen_gun') ?? 0)
  if (!statu)              return { hata: 'Statü seçimi zorunludur.' }
  if (hak_edilen_gun <= 0) return { hata: 'Hak edilen gün 0\'dan büyük olmalıdır.' }

  const supabase = await createClient()
  const { error } = await supabase.from('tanim_izin_hak').update({
    statu,
    hak_edilen_gun,
    en_az:                  formData.get('en_az')   ? Number(formData.get('en_az'))   : null,
    en_cok:                 formData.get('en_cok')  ? Number(formData.get('en_cok'))  : null,
    gecerlilik_suresi_yil:  formData.get('gecerlilik_suresi_yil') ? Number(formData.get('gecerlilik_suresi_yil')) : null,
  }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

export async function izinHakToggleDurum(id: number, mevcutDurum: boolean): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('tanim_izin_hak').update({ durum: !mevcutDurum }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}
