'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function txt(v: FormDataEntryValue | null): string {
  return String(v ?? '').trim()
}

function kodParca(v: FormDataEntryValue | null): string {
  const s = txt(v).replace(/[^\d]/g, '')
  return s.padStart(2, '0').slice(0, 2)
}

export async function butceKoduEkle(fd: FormData): Promise<{ hata?: string }> {
  const adim_1 = kodParca(fd.get('adim_1'))
  const adim_2 = kodParca(fd.get('adim_2'))
  const adim_3 = kodParca(fd.get('adim_3'))
  const adim_4 = kodParca(fd.get('adim_4'))
  const hesap_adi = txt(fd.get('hesap_adi'))
  if (!adim_1 || !adim_2 || !adim_3 || !adim_4 || !hesap_adi) {
    return { hata: 'Adım 1-4 ve Hesap Adı zorunludur.' }
  }
  const ekonomik_kod = `${adim_1}.${adim_2}.${adim_3}.${adim_4}`

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { error } = await sb.from('performans_programi_butce_kodu').insert({
    adim_1,
    adim_2,
    adim_3,
    adim_4,
    hesap_adi,
    ekonomik_kod,
    aktif: true,
  })
  if (error) return { hata: error.message }

  revalidatePath('/stratejik-yonetim/performans-programi/tanimlar')
  revalidatePath('/stratejik-yonetim/performans-programi/tanimlar/butce-kodu')
  return {}
}

export async function butceKoduGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
  const adim_1 = kodParca(fd.get('adim_1'))
  const adim_2 = kodParca(fd.get('adim_2'))
  const adim_3 = kodParca(fd.get('adim_3'))
  const adim_4 = kodParca(fd.get('adim_4'))
  const hesap_adi = txt(fd.get('hesap_adi'))
  if (!Number.isFinite(id)) return { hata: 'Geçersiz kayıt.' }
  if (!adim_1 || !adim_2 || !adim_3 || !adim_4 || !hesap_adi) {
    return { hata: 'Adım 1-4 ve Hesap Adı zorunludur.' }
  }
  const ekonomik_kod = `${adim_1}.${adim_2}.${adim_3}.${adim_4}`

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { error } = await sb
    .from('performans_programi_butce_kodu')
    .update({ adim_1, adim_2, adim_3, adim_4, hesap_adi, ekonomik_kod })
    .eq('id', id)
  if (error) return { hata: error.message }

  revalidatePath('/stratejik-yonetim/performans-programi/tanimlar')
  revalidatePath('/stratejik-yonetim/performans-programi/tanimlar/butce-kodu')
  return {}
}
