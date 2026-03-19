'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

type Durumu = 'Dolu' | 'Vekil' | 'Boş'

export async function kadroEkle(formData: FormData): Promise<{ hata?: string }> {
  const kadro_sira_no = str(formData, 'kadro_sira_no')
  const statu         = str(formData, 'statu')
  const durumu        = (str(formData, 'durumu') ?? 'Dolu') as Durumu

  // Statüsü Memur, Sözleşmeli veya İşçi olanlarda kadro sıra no zorunlu
  const kadroNoZorunluStatuler = ['Memur', 'Sözleşmeli', 'İşçi']
  if (statu && kadroNoZorunluStatuler.includes(statu) && !kadro_sira_no) {
    return { hata: 'Bu statü için Kadro Sıra No zorunludur.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('kadro_hareketleri').insert({
    meclis_karar_tarihi:  str(formData, 'meclis_karar_tarihi'),
    meclis_karar_no:      str(formData, 'meclis_karar_no'),
    kadro_sira_no,
    kadro_derecesi:       str(formData, 'kadro_derecesi'),
    statu,
    kadro_unvani:         str(formData, 'kadro_unvani'),
    kadro_mudurlugu:      str(formData, 'kadro_mudurlugu'),
    gorev_unvani:         str(formData, 'gorev_unvani'),
    gorev_mudurlugu:      str(formData, 'gorev_mudurlugu'),
    asil:                 str(formData, 'asil') || null,
    vekil:                str(formData, 'vekil') || null,
    meslegi:              str(formData, 'meslegi'),
    memuriyet_tarihi:     str(formData, 'memuriyet_tarihi'),
    kuruma_giris_tarihi:  str(formData, 'kuruma_giris_tarihi'),
    gelis_nedeni:         str(formData, 'gelis_nedeni'),
    geldigi_yer:          str(formData, 'geldigi_yer'),
    ayrilis_tarihi:       str(formData, 'ayrilis_tarihi'),
    ayrilis_nedeni:       str(formData, 'ayrilis_nedeni'),
    gittigi_yer:          str(formData, 'gittigi_yer'),
    aciklama:             str(formData, 'aciklama'),
    durumu,
  })

  if (error) return { hata: error.message }
  revalidatePath('/kadro')
  return {}
}

export async function kadroGuncelle(id: number, formData: FormData): Promise<{ hata?: string }> {
  const kadro_sira_no = str(formData, 'kadro_sira_no')
  const statu         = str(formData, 'statu')
  const durumu        = (str(formData, 'durumu') ?? 'Dolu') as Durumu

  const kadroNoZorunluStatuler = ['Memur', 'Sözleşmeli', 'İşçi']
  if (statu && kadroNoZorunluStatuler.includes(statu) && !kadro_sira_no) {
    return { hata: 'Bu statü için Kadro Sıra No zorunludur.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('kadro_hareketleri').update({
    meclis_karar_tarihi:  str(formData, 'meclis_karar_tarihi'),
    meclis_karar_no:      str(formData, 'meclis_karar_no'),
    kadro_sira_no,
    kadro_derecesi:       str(formData, 'kadro_derecesi'),
    statu,
    kadro_unvani:         str(formData, 'kadro_unvani'),
    kadro_mudurlugu:      str(formData, 'kadro_mudurlugu'),
    gorev_unvani:         str(formData, 'gorev_unvani'),
    gorev_mudurlugu:      str(formData, 'gorev_mudurlugu'),
    asil:                 str(formData, 'asil') || null,
    vekil:                str(formData, 'vekil') || null,
    meslegi:              str(formData, 'meslegi'),
    memuriyet_tarihi:     str(formData, 'memuriyet_tarihi'),
    kuruma_giris_tarihi:  str(formData, 'kuruma_giris_tarihi'),
    gelis_nedeni:         str(formData, 'gelis_nedeni'),
    geldigi_yer:          str(formData, 'geldigi_yer'),
    ayrilis_tarihi:       str(formData, 'ayrilis_tarihi'),
    ayrilis_nedeni:       str(formData, 'ayrilis_nedeni'),
    gittigi_yer:          str(formData, 'gittigi_yer'),
    aciklama:             str(formData, 'aciklama'),
    durumu,
  }).eq('id', id)

  if (error) return { hata: error.message }
  revalidatePath('/kadro')
  revalidatePath(`/kadro/${id}`)
  return {}
}
