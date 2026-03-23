'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireTanimlarYazma } from '@/lib/tanimlar-yazma-guard'

const SAYFA = '/tanimlar/izin-kural'

function bool(fd: FormData, key: string): boolean {
  return fd.get(key) === 'on'
}

export async function izinKuralEkle(formData: FormData): Promise<{ hata?: string }> {
  const statu = String(formData.get('statu') ?? '').trim()
  if (!statu) return { hata: 'Statü seçimi zorunludur.' }

  const supabase = await createClient()
  const { error } = await supabase.from('tanim_izin_kural').insert({
    statu,
    cumartesi:       bool(formData, 'cumartesi'),
    pazar:           bool(formData, 'pazar'),
    haftaici_tatil:  bool(formData, 'haftaici_tatil'),
    tatil_haftasonu: bool(formData, 'tatil_haftasonu'),
    durum: true,
  })
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

export async function izinKuralGuncelle(id: number, formData: FormData): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const statu = String(formData.get('statu') ?? '').trim()
  if (!statu) return { hata: 'Statü seçimi zorunludur.' }

  const supabase = await createClient()
  const { error } = await supabase.from('tanim_izin_kural').update({
    statu,
    cumartesi:       bool(formData, 'cumartesi'),
    pazar:           bool(formData, 'pazar'),
    haftaici_tatil:  bool(formData, 'haftaici_tatil'),
    tatil_haftasonu: bool(formData, 'tatil_haftasonu'),
  }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

export async function izinKuralToggleDurum(id: number, mevcutDurum: boolean): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const supabase = await createClient()
  const { error } = await supabase.from('tanim_izin_kural').update({ durum: !mevcutDurum }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}
