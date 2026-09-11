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
    destek_yardimci_birim: formData.get('destek_yardimci_birim') === 'true',
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
    destek_yardimci_birim: formData.get('destek_yardimci_birim') === 'true',
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

export type UnvanTopluSatir = {
  id: number
  sira_no: number | null
  unvan_kodu: string | null
  unvan_adi: string
  sinif_adi: string | null
  arazi: boolean
  destek_yardimci_birim: boolean
  kat_sayi: number | null
}

export async function unvanTopluGuncelle(
  satirlar: UnvanTopluSatir[],
): Promise<{ hata?: string; adet?: number }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  if (!satirlar.length) return { hata: 'Güncellenecek satır yok.' }

  const supabase = await createClient()
  let adet = 0
  for (const s of satirlar) {
    const unvan_adi = String(s.unvan_adi ?? '').trim()
    if (!unvan_adi) return { hata: `Unvan adı boş olamaz (id ${s.id}).` }
    const { error } = await supabase.from('tanim_unvan').update({
      sira_no: s.sira_no,
      unvan_kodu: String(s.unvan_kodu ?? '').trim() || null,
      unvan_adi,
      sinif_adi: String(s.sinif_adi ?? '').trim() || null,
      arazi: s.arazi === true,
      destek_yardimci_birim: s.destek_yardimci_birim === true,
      kat_sayi: s.kat_sayi,
    }).eq('id', s.id)
    if (error) return { hata: error.message }
    adet++
  }
  revalidatePath(SAYFA)
  return { adet }
}
