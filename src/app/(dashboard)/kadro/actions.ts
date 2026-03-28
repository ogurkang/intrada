'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { kadroDurumuHesapla } from '@/lib/kadro-durum'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

export async function kadroEkle(formData: FormData): Promise<{ hata?: string }> {
  const kadro_sira_no = str(formData, 'kadro_sira_no')
  const statu         = str(formData, 'statu')
  const asil          = str(formData, 'asil') || null
  const vekil         = str(formData, 'vekil') || null
  const durumu        = kadroDurumuHesapla(asil, vekil)

  // Statüsü Memur, Sözleşmeli veya İşçi olanlarda kadro sıra no zorunlu
  const kadroNoZorunluStatuler = ['Memur', 'Sözleşmeli', 'İşçi']
  if (statu && kadroNoZorunluStatuler.includes(statu) && !kadro_sira_no) {
    return { hata: 'Bu statü için Kadro Sıra No zorunludur.' }
  }

  const supabase = await createClient()
  const { data: inserted, error } = await supabase.from('kadro_hareketleri').insert({
    meclis_karar_tarihi:  str(formData, 'meclis_karar_tarihi'),
    meclis_karar_no:      str(formData, 'meclis_karar_no'),
    kadro_sira_no,
    kadro_derecesi:       str(formData, 'kadro_derecesi'),
    statu,
    kadro_unvani:         str(formData, 'kadro_unvani'),
    kadro_mudurlugu:      str(formData, 'kadro_mudurlugu'),
    gorev_unvani:         str(formData, 'gorev_unvani'),
    gorev_mudurlugu:      str(formData, 'gorev_mudurlugu'),
    asil,
    vekil,
    memuriyet_tarihi:     str(formData, 'memuriyet_tarihi'),
    kuruma_giris_tarihi:  str(formData, 'kuruma_giris_tarihi'),
    gelis_nedeni:         str(formData, 'gelis_nedeni'),
    geldigi_yer:          str(formData, 'geldigi_yer'),
    ayrilis_tarihi:       str(formData, 'ayrilis_tarihi'),
    ayrilis_nedeni:       str(formData, 'ayrilis_nedeni'),
    gittigi_yer:          str(formData, 'gittigi_yer'),
    aciklama:             str(formData, 'aciklama'),
    durumu,
  }).select('id, public_id').single()

  if (error) return { hata: error.message }
  revalidatePath('/kadro')
  if (inserted?.public_id) revalidatePath(`/link/${inserted.public_id}`)
  return {}
}

export async function kadroGuncelle(id: number, formData: FormData): Promise<{ hata?: string }> {
  const kadro_sira_no = str(formData, 'kadro_sira_no')
  const statu         = str(formData, 'statu')
  const asil          = str(formData, 'asil') || null
  const vekil         = str(formData, 'vekil') || null
  const durumu        = kadroDurumuHesapla(asil, vekil)

  const kadroNoZorunluStatuler = ['Memur', 'Sözleşmeli', 'İşçi']
  if (statu && kadroNoZorunluStatuler.includes(statu) && !kadro_sira_no) {
    return { hata: 'Bu statü için Kadro Sıra No zorunludur.' }
  }

  const supabase = await createClient()
  const { data: updated, error } = await supabase.from('kadro_hareketleri').update({
    meclis_karar_tarihi:  str(formData, 'meclis_karar_tarihi'),
    meclis_karar_no:      str(formData, 'meclis_karar_no'),
    kadro_sira_no,
    kadro_derecesi:       str(formData, 'kadro_derecesi'),
    statu,
    kadro_unvani:         str(formData, 'kadro_unvani'),
    kadro_mudurlugu:      str(formData, 'kadro_mudurlugu'),
    gorev_unvani:         str(formData, 'gorev_unvani'),
    gorev_mudurlugu:      str(formData, 'gorev_mudurlugu'),
    asil,
    vekil,
    memuriyet_tarihi:     str(formData, 'memuriyet_tarihi'),
    kuruma_giris_tarihi:  str(formData, 'kuruma_giris_tarihi'),
    gelis_nedeni:         str(formData, 'gelis_nedeni'),
    geldigi_yer:          str(formData, 'geldigi_yer'),
    ayrilis_tarihi:       str(formData, 'ayrilis_tarihi'),
    ayrilis_nedeni:       str(formData, 'ayrilis_nedeni'),
    gittigi_yer:          str(formData, 'gittigi_yer'),
    aciklama:             str(formData, 'aciklama'),
    durumu,
  }).eq('id', id).select('public_id').single()

  if (error) return { hata: error.message }
  revalidatePath('/kadro')
  revalidatePath(`/kadro/${id}`)
  if (updated?.public_id) revalidatePath(`/link/${updated.public_id}`)
  return {}
}
