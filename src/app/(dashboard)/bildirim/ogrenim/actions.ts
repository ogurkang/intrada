'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

/** gg.aa.yyyy veya gg/aa/yyyy stringini ISO (yyyy-mm-dd) yapar; geçersizse null */
function mezuniyetTarihiToISO(val: string | null | undefined): string | null {
  if (!val || !val.trim()) return null
  const s = val.trim().replace(/\//g, '.')
  const parts = s.split('.')
  if (parts.length !== 3) return null
  const [g, a, y] = parts.map(p => p.trim())
  if (!g || !a || !y) return null
  const yy = y.length === 4 ? y : y.length === 2 ? `20${y}` : ''
  const aa = a.padStart(2, '0')
  const gg = g.padStart(2, '0')
  if (yy.length !== 4) return null
  return `${yy}-${aa}-${gg}`
}

export async function ogrenimEkle(fd: FormData): Promise<{ hata?: string }> {
  const sicil_no = str(fd, 'sicil_no')
  if (!sicil_no) return { hata: 'Sicil no zorunludur.' }

  const supabase = await createClient()
  const { error } = await supabase.from('calisan_ogrenim').insert({
    sicil_no,
    ogrenim_turu:     str(fd, 'ogrenim_turu'),
    okul_adi:         str(fd, 'okul_adi'),
    bolum:            str(fd, 'bolum'),
    mezuniyet_yili:   str(fd, 'mezuniyet_yili') ? parseInt(String(fd.get('mezuniyet_yili')), 10) : null,
    mezuniyet_tarihi: mezuniyetTarihiToISO(str(fd, 'mezuniyet_tarihi')),
    aktif:            fd.get('aktif') !== 'false',
  })
  if (error) return { hata: error.message }
  revalidatePath('/bildirim/ogrenim')
  return {}
}

export async function ogrenimGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('calisan_ogrenim').update({
    ogrenim_turu:     str(fd, 'ogrenim_turu'),
    okul_adi:         str(fd, 'okul_adi'),
    bolum:            str(fd, 'bolum'),
    mezuniyet_yili:   str(fd, 'mezuniyet_yili') ? parseInt(String(fd.get('mezuniyet_yili')), 10) : null,
    mezuniyet_tarihi: mezuniyetTarihiToISO(str(fd, 'mezuniyet_tarihi')),
    aktif:            fd.get('aktif') !== 'false',
  }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath('/bildirim/ogrenim')
  return {}
}

export async function ogrenimSil(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('calisan_ogrenim').delete().eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath('/bildirim/ogrenim')
  return {}
}
