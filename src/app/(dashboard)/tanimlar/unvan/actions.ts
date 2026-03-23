'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireTanimlarYazma } from '@/lib/tanimlar-yazma-guard'

const SAYFA = '/tanimlar/unvan'

export async function unvanEkle(
  formData: FormData
): Promise<{ hata?: string }> {
  const unvan_adi = String(formData.get('unvan_adi') ?? '').trim()
  if (!unvan_adi) return { hata: 'Unvan Adı boş bırakılamaz.' }

  const supabase = await createClient()
  const { error } = await supabase.from('tanim_unvan').insert({
    sira_no:    formData.get('sira_no')    ? Number(formData.get('sira_no'))    : null,
    unvan_kodu: String(formData.get('unvan_kodu') ?? '').trim() || null,
    unvan_adi,
    sinif_adi:  String(formData.get('sinif_adi')  ?? '').trim() || null,
    arazi:      formData.get('arazi') === 'true',
    kat_sayi:   formData.get('kat_sayi')   ? Number(formData.get('kat_sayi'))   : null,
    aktif:      true,
  })

  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

export async function unvanGuncelle(
  id: number,
  formData: FormData
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const unvan_adi = String(formData.get('unvan_adi') ?? '').trim()
  if (!unvan_adi) return { hata: 'Unvan Adı boş bırakılamaz.' }

  const supabase = await createClient()
  const { error } = await supabase.from('tanim_unvan').update({
    sira_no:    formData.get('sira_no')    ? Number(formData.get('sira_no'))    : null,
    unvan_kodu: String(formData.get('unvan_kodu') ?? '').trim() || null,
    unvan_adi,
    sinif_adi:  String(formData.get('sinif_adi')  ?? '').trim() || null,
    arazi:      formData.get('arazi') === 'true',
    kat_sayi:   formData.get('kat_sayi')   ? Number(formData.get('kat_sayi'))   : null,
  }).eq('id', id)

  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

export async function unvanToggleAktif(
  id: number,
  mevcutAktif: boolean
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const supabase = await createClient()
  const { error } = await supabase
    .from('tanim_unvan')
    .update({ aktif: !mevcutAktif })
    .eq('id', id)

  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}
