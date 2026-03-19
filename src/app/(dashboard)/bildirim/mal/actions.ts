'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Json } from '@/types/database'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

function parseJson(fd: FormData, key: string): Json {
  try {
    const raw = String(fd.get(key) ?? '[]')
    const parsed = JSON.parse(raw)
    return (Array.isArray(parsed) ? parsed : []) as Json
  } catch { return [] }
}

export async function malBildirimEkle(fd: FormData): Promise<{ hata?: string }> {
  const sicil_no = str(fd, 'sicil_no')
  if (!sicil_no) return { hata: 'Sicil no zorunludur.' }

  const supabase = await createClient()
  const { error } = await supabase.from('mal_bildirimi').insert({
    sicil_no,
    beyan_turu:            str(fd, 'beyan_turu'),
    onay_tarihi:           str(fd, 'onay_tarihi'),
    son_net_maas:          str(fd, 'son_net_maas') ? parseFloat(String(fd.get('son_net_maas')).replace(',', '.')) : null,
    aciklama:              str(fd, 'aciklama'),
    kimlik_json:           parseJson(fd, 'kimlik_json'),
    tasinmaz_json:         parseJson(fd, 'tasinmaz_json'),
    kooperatif_json:       parseJson(fd, 'kooperatif_json'),
    tasitlar_json:         parseJson(fd, 'tasitlar_json'),
    diger_tasinirlar_json: parseJson(fd, 'diger_tasinirlar_json'),
    banka_menkul_json:     parseJson(fd, 'banka_menkul_json'),
    altin_mucevher_json:   parseJson(fd, 'altin_mucevher_json'),
    borc_alacak_json:      parseJson(fd, 'borc_alacak_json'),
    haklar_json:           parseJson(fd, 'haklar_json'),
  })

  if (error) return { hata: error.message }
  revalidatePath('/bildirim/mal')
  return {}
}

export async function malBildirimGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('mal_bildirimi').update({
    beyan_turu:            str(fd, 'beyan_turu'),
    onay_tarihi:           str(fd, 'onay_tarihi'),
    son_net_maas:          str(fd, 'son_net_maas') ? parseFloat(String(fd.get('son_net_maas')).replace(',', '.')) : null,
    aciklama:              str(fd, 'aciklama'),
    kimlik_json:           parseJson(fd, 'kimlik_json'),
    tasinmaz_json:         parseJson(fd, 'tasinmaz_json'),
    kooperatif_json:       parseJson(fd, 'kooperatif_json'),
    tasitlar_json:         parseJson(fd, 'tasitlar_json'),
    diger_tasinirlar_json: parseJson(fd, 'diger_tasinirlar_json'),
    banka_menkul_json:     parseJson(fd, 'banka_menkul_json'),
    altin_mucevher_json:   parseJson(fd, 'altin_mucevher_json'),
    borc_alacak_json:      parseJson(fd, 'borc_alacak_json'),
    haklar_json:           parseJson(fd, 'haklar_json'),
  }).eq('id', id)

  if (error) return { hata: error.message }
  revalidatePath('/bildirim/mal')
  return {}
}

export async function malBildirimSil(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('mal_bildirimi').delete().eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath('/bildirim/mal')
  return {}
}
