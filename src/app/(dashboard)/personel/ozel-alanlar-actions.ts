'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { revalidatePersonelDetayPaths } from '@/lib/revalidate-personel'

function cleanText(v: unknown): string | null {
  const s = String(v ?? '').trim()
  return s || null
}

async function revalidateOzelAlan(sicil_no: string) {
  await revalidatePersonelDetayPaths(sicil_no)
  revalidatePath('/personel')
  revalidatePath('/personel/sgk-ssk-sicil-no')
}

export async function sgkSicilSatirKaydet(
  sicil_no: string,
  fd: FormData,
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const sgk_ssk_sicil_no = cleanText(fd.get('sgk_ssk_sicil_no'))
  const { error } = await supabase.from('calisan').update({ sgk_ssk_sicil_no }).eq('sicil_no', sicil_no)
  if (error) return { hata: error.message }
  await revalidateOzelAlan(sicil_no)
  return {}
}

export async function sgkSicilTopluKaydet(
  satirlar: { sicil_no: string; deger: string | null }[],
): Promise<{ hata?: string; kaydedilen?: number }> {
  if (!satirlar.length) return { kaydedilen: 0 }
  const supabase = await createClient()
  for (const s of satirlar) {
    const { error } = await supabase
      .from('calisan')
      .update({ sgk_ssk_sicil_no: cleanText(s.deger) })
      .eq('sicil_no', s.sicil_no)
    if (error) return { hata: error.message }
  }
  for (const sicil of new Set(satirlar.map(s => s.sicil_no))) await revalidateOzelAlan(sicil)
  return { kaydedilen: satirlar.length }
}

const KAN_GRUPLARI = new Set(['0 Rh+', '0 Rh-', 'A Rh+', 'A Rh-', 'B Rh+', 'B Rh-', 'AB Rh+', 'AB Rh-'])

function normalizeKan(v: unknown): string | null {
  const s = String(v ?? '').trim()
  if (!s) return null
  return KAN_GRUPLARI.has(s) ? s : null
}

export async function kanGrubuSatirKaydet(
  sicil_no: string,
  fd: FormData,
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const kan_grubu = normalizeKan(fd.get('kan_grubu'))
  const { error } = await supabase.from('calisan').update({ kan_grubu }).eq('sicil_no', sicil_no)
  if (error) return { hata: error.message }
  await revalidateOzelAlan(sicil_no)
  return {}
}

export async function kanGrubuTopluKaydet(
  satirlar: { sicil_no: string; deger: string | null }[],
): Promise<{ hata?: string; kaydedilen?: number }> {
  if (!satirlar.length) return { kaydedilen: 0 }
  const supabase = await createClient()
  for (const s of satirlar) {
    const { error } = await supabase
      .from('calisan')
      .update({ kan_grubu: normalizeKan(s.deger) })
      .eq('sicil_no', s.sicil_no)
    if (error) return { hata: error.message }
  }
  for (const sicil of new Set(satirlar.map(s => s.sicil_no))) await revalidateOzelAlan(sicil)
  return { kaydedilen: satirlar.length }
}
