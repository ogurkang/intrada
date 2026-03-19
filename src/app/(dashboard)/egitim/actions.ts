'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

export async function egitimDonemEkle(fd: FormData): Promise<{ hata?: string }> {
  const yil      = parseInt(String(fd.get('yil') ?? '0'), 10)
  const donem_adi = str(fd, 'donem_adi')
  const bas       = str(fd, 'baslangic_tarihi')
  const bit       = str(fd, 'bitis_tarihi')
  if (!yil || !donem_adi || !bas || !bit) return { hata: 'Yıl, dönem adı ve tarihler zorunludur.' }
  if (bit < bas) return { hata: 'Bitiş tarihi başlangıçtan önce olamaz.' }

  const supabase = await createClient()
  const { error } = await supabase.from('egitim_takvimi_donem').insert({
    yil, donem_adi, baslangic_tarihi: bas, bitis_tarihi: bit,
    sira_no: str(fd, 'sira_no'),
    durum:   'Açık',
  })
  if (error) return { hata: error.message }
  revalidatePath('/egitim')
  return {}
}

export async function egitimDonemGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('egitim_takvimi_donem').update({
    yil:              parseInt(String(fd.get('yil') ?? '0'), 10),
    donem_adi:        str(fd, 'donem_adi') ?? undefined,
    sira_no:          str(fd, 'sira_no') ?? undefined,
    baslangic_tarihi: str(fd, 'baslangic_tarihi') ?? undefined,
    bitis_tarihi:     str(fd, 'bitis_tarihi') ?? undefined,
  }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath('/egitim')
  return {}
}

export async function egitimDonemKapat(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('egitim_takvimi_donem').update({ durum: 'Kapalı' }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath('/egitim')
  return {}
}
