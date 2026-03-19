'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

export async function araziDonemEkle(fd: FormData): Promise<{ hata?: string }> {
  const yil              = parseInt(String(fd.get('yil') ?? '0'), 10)
  const baslangic_tarihi = str(fd, 'baslangic_tarihi')
  const bitis_tarihi     = str(fd, 'bitis_tarihi')
  if (!yil || !baslangic_tarihi || !bitis_tarihi) return { hata: 'Yıl ve tarihler zorunludur.' }
  if (bitis_tarihi < baslangic_tarihi) return { hata: 'Bitiş tarihi başlangıçtan önce olamaz.' }

  const supabase = await createClient()
  const { error } = await supabase.from('arazi_donem').insert({
    yil, baslangic_tarihi, bitis_tarihi,
    sira_no:   str(fd, 'sira_no'),
    donem_adi: str(fd, 'donem_adi'),
    durum:     'Açık',
  })

  if (error) return { hata: error.message }
  revalidatePath('/kesintiler/arazi')
  return {}
}

export async function araziDonemGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('arazi_donem').update({
    yil:              parseInt(String(fd.get('yil') ?? '0'), 10),
    sira_no:          str(fd, 'sira_no') ?? undefined,
    donem_adi:        str(fd, 'donem_adi') ?? undefined,
    baslangic_tarihi: str(fd, 'baslangic_tarihi') ?? undefined,
    bitis_tarihi:     str(fd, 'bitis_tarihi') ?? undefined,
  }).eq('id', id)

  if (error) return { hata: error.message }
  revalidatePath('/kesintiler/arazi')
  return {}
}

export async function araziDonemKapat(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('arazi_donem').update({ durum: 'Kapalı' }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath('/kesintiler/arazi')
  return {}
}

export async function araziDonemAc(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('arazi_donem').update({ durum: 'Açık' }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath('/kesintiler/arazi')
  return {}
}
