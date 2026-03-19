'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Json } from '@/types/database'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

export async function aileKaydet(fd: FormData): Promise<{ hata?: string }> {
  const sicil_no = str(fd, 'sicil_no')
  if (!sicil_no) return { hata: 'Sicil no zorunludur.' }

  let cocuklar_json: Json = []
  try {
    const raw = String(fd.get('cocuklar_json') ?? '[]')
    cocuklar_json = JSON.parse(raw) as Json
  } catch {
    return { hata: 'Çocuk bilgileri geçersiz JSON formatında.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('aile_bildirimi').upsert({
    sicil_no,
    medeni_hal:    str(fd, 'medeni_hal'),
    esin_ad_soyad: str(fd, 'esin_ad_soyad'),
    esin_tckn:     str(fd, 'esin_tckn'),
    is_durumu:     str(fd, 'is_durumu'),
    gelir_durumu:  str(fd, 'gelir_durumu'),
    cocuklar_json,
  }, { onConflict: 'sicil_no' })

  if (error) return { hata: error.message }
  revalidatePath('/bildirim/aile')
  return {}
}

export async function aileSil(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('aile_bildirimi').delete().eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath('/bildirim/aile')
  return {}
}
