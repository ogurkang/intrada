'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { kadroDurumuHesapla } from '@/lib/kadro-durum'

type SB = Awaited<ReturnType<typeof createClient>>

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

/** Formdan seçilen `tanim_unvan.id`; metin alanı geriye dönük uyumluluk için doldurulur. */
async function unvanFormdan(
  supabase: SB,
  fd: FormData,
  idKey: string,
): Promise<{ id: number | null; unvan_adi: string | null }> {
  const raw = String(fd.get(idKey) ?? '').trim()
  if (!raw || !/^\d+$/.test(raw)) return { id: null, unvan_adi: null }
  const id = Number.parseInt(raw, 10)
  const { data } = await supabase
    .from('tanim_unvan')
    .select('unvan_adi')
    .eq('id', id)
    .eq('aktif', true)
    .maybeSingle()
  if (!data?.unvan_adi) return { id: null, unvan_adi: null }
  return { id, unvan_adi: data.unvan_adi }
}

export async function kadroEkle(formData: FormData): Promise<{ hata?: string }> {
  const kadro_sira_no = str(formData, 'kadro_sira_no')
  const statu         = str(formData, 'statu')
  const asil          = str(formData, 'asil') || null
  const vekil         = str(formData, 'vekil') || null
  const iptalKararTarihi = str(formData, 'iptal_karar_tarihi')
  const iptalKararNo = str(formData, 'iptal_karar_no')
  const iptalMi = Boolean(iptalKararTarihi || iptalKararNo)
  const durumu        = kadroDurumuHesapla(asil, vekil)

  if (iptalMi && (asil || vekil)) {
    return { hata: 'İptal alanları dolu iken bu kayda Asil/Vekil personel atanamaz.' }
  }

  // Statüsü Memur, Sözleşmeli veya İşçi olanlarda kadro sıra no zorunlu
  const kadroNoZorunluStatuler = ['Memur', 'Sözleşmeli', 'İşçi']
  if (statu && kadroNoZorunluStatuler.includes(statu) && !kadro_sira_no) {
    return { hata: 'Bu statü için Kadro Sıra No zorunludur.' }
  }

  const supabase = await createClient()
  const kadroUn = await unvanFormdan(supabase, formData, 'kadro_unvan_id')
  const gorevUn = await unvanFormdan(supabase, formData, 'gorev_unvan_id')
  const { data: inserted, error } = await supabase.from('kadro_hareketleri').insert({
    meclis_karar_tarihi:  str(formData, 'meclis_karar_tarihi'),
    meclis_karar_no:      str(formData, 'meclis_karar_no'),
    iptal_karar_tarihi:   iptalKararTarihi,
    iptal_karar_no:       iptalKararNo,
    kadro_sira_no,
    kadro_derecesi:       str(formData, 'kadro_derecesi'),
    statu,
    kadro_unvan_id:       kadroUn.id,
    kadro_unvani:         kadroUn.unvan_adi,
    kadro_mudurlugu:      str(formData, 'kadro_mudurlugu'),
    gorev_unvan_id:       gorevUn.id,
    gorev_unvani:         gorevUn.unvan_adi,
    gorev_mudurlugu:      str(formData, 'gorev_mudurlugu'),
    asil,
    vekil,
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
  const iptalKararTarihi = str(formData, 'iptal_karar_tarihi')
  const iptalKararNo = str(formData, 'iptal_karar_no')
  const iptalMi = Boolean(iptalKararTarihi || iptalKararNo)
  const durumu        = kadroDurumuHesapla(asil, vekil)

  if (iptalMi && (asil || vekil)) {
    return { hata: 'İptal alanları dolu iken bu kayda Asil/Vekil personel atanamaz.' }
  }

  const kadroNoZorunluStatuler = ['Memur', 'Sözleşmeli', 'İşçi']
  if (statu && kadroNoZorunluStatuler.includes(statu) && !kadro_sira_no) {
    return { hata: 'Bu statü için Kadro Sıra No zorunludur.' }
  }

  const supabase = await createClient()
  const { data: mevcut } = await supabase
    .from('kadro_hareketleri')
    .select('kadro_unvan_id, kadro_unvani, gorev_unvan_id, gorev_unvani')
    .eq('id', id)
    .maybeSingle()
  const kadroUn = await unvanFormdan(supabase, formData, 'kadro_unvan_id')
  const gorevUn = await unvanFormdan(supabase, formData, 'gorev_unvan_id')
  const { data: updated, error } = await supabase.from('kadro_hareketleri').update({
    meclis_karar_tarihi:  str(formData, 'meclis_karar_tarihi'),
    meclis_karar_no:      str(formData, 'meclis_karar_no'),
    iptal_karar_tarihi:   iptalKararTarihi,
    iptal_karar_no:       iptalKararNo,
    kadro_sira_no,
    kadro_derecesi:       str(formData, 'kadro_derecesi'),
    statu,
    kadro_unvan_id:       kadroUn.id ?? mevcut?.kadro_unvan_id ?? null,
    kadro_unvani:         kadroUn.unvan_adi ?? mevcut?.kadro_unvani ?? null,
    kadro_mudurlugu:      str(formData, 'kadro_mudurlugu'),
    gorev_unvan_id:       gorevUn.id ?? mevcut?.gorev_unvan_id ?? null,
    gorev_unvani:         gorevUn.unvan_adi ?? mevcut?.gorev_unvani ?? null,
    gorev_mudurlugu:      str(formData, 'gorev_mudurlugu'),
    asil,
    vekil,
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
