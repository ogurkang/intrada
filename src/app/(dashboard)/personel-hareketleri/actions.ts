'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ggAayyyyToIso } from '@/lib/tarih'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

function tarihStr(fd: FormData, key: string): string | null {
  const v = str(fd, key)
  if (!v) return null
  return ggAayyyyToIso(v) ?? v
}

export async function personelHareketiGuncelle(
  id: number,
  formData: FormData
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('personel_hareketleri')
    .select('sicil_no')
    .eq('id', id)
    .single()
  const sicil_no = row?.sicil_no

  const { error } = await supabase.from('personel_hareketleri').update({
    hareket_tipi:          str(formData, 'hareket_tipi'),
    yururluk_tarihi:       tarihStr(formData, 'yururluk_tarihi'),
    kadro_sira_no:         str(formData, 'kadro_sira_no'),
    yeni_gorev_yeri:       str(formData, 'yeni_gorev_yeri'),
    yeni_unvan:            str(formData, 'yeni_unvan'),
    yeni_sinif:            str(formData, 'yeni_sinif'),
    yeni_kadro_derecesi:   str(formData, 'yeni_kadro_derecesi'),
    yeni_kha_derece:       str(formData, 'yeni_kha_derece'),
    yeni_kha_kademe:       str(formData, 'yeni_kha_kademe'),
    yeni_ekea_derece:      str(formData, 'yeni_ekea_derece'),
    yeni_ekea_kademe:      str(formData, 'yeni_ekea_kademe'),
    ise_baslama_tarihi:    tarihStr(formData, 'ise_baslama_tarihi'),
    ayrilis_tarihi:        tarihStr(formData, 'ayrilis_tarihi'),
    dayanak:               str(formData, 'dayanak'),
    aciklama:              str(formData, 'aciklama'),
    dagitim_mudurlukleri:  str(formData, 'dagitim_mudurlukleri'),
  }).eq('id', id)

  if (error) return { hata: error.message }
  revalidatePath('/personel-hareketleri')
  if (sicil_no) revalidatePath(`/personel/${sicil_no}`)
  return {}
}

/** Personel Hareketleri Değiştir: Yeni personel_hareketleri kaydı oluşturur (GAS personelHareketiKaydet karşılığı) */
export async function personelHareketiEkle(formData: FormData): Promise<{ hata?: string }> {
  const sicil_no = str(formData, 'sicil_no')
  if (!sicil_no) return { hata: 'Sicil No gerekli.' }

  const supabase = await createClient()
  const { error } = await supabase.from('personel_hareketleri').insert({
    sicil_no,
    hareket_tipi:                    str(formData, 'hareket_tipi') ?? 'Yukselme',
    kadro_sira_no:                  str(formData, 'kadro_sira_no'),
    yururluk_tarihi:                tarihStr(formData, 'yururluk_tarihi'),
    adaylik_suresi:                 str(formData, 'adaylik_suresi'),
    asli_memuriyete_atanma_tarihi:  tarihStr(formData, 'asli_memuriyete_atanma_tarihi'),
    eski_gorev_yeri:                str(formData, 'eski_gorev_yeri'),
    eski_unvan:                     str(formData, 'eski_unvan'),
    eski_sinif:                     str(formData, 'eski_sinif'),
    eski_kadro_derecesi:            str(formData, 'eski_kadro_derecesi'),
    eski_kha_derece:                str(formData, 'eski_kha_derece'),
    eski_kha_kademe:                str(formData, 'eski_kha_kademe'),
    eski_ekea_derece:               str(formData, 'eski_ekea_derece'),
    eski_ekea_kademe:               str(formData, 'eski_ekea_kademe'),
    eski_kidem_yili:                str(formData, 'eski_kidem_yili'),
    eski_oht:                       str(formData, 'eski_oht'),
    eski_igz:                       str(formData, 'eski_igz'),
    eski_ek_odeme:                  str(formData, 'eski_ek_odeme'),
    eski_ek_gosterge:               str(formData, 'eski_ek_gosterge'),
    yeni_gorev_yeri:                str(formData, 'yeni_gorev_yeri'),
    yeni_unvan:                     str(formData, 'yeni_unvan'),
    yeni_sinif:                     str(formData, 'yeni_sinif'),
    yeni_kadro_derecesi:            str(formData, 'yeni_kadro_derecesi'),
    yeni_kha_derece:                str(formData, 'yeni_kha_derece'),
    yeni_kha_kademe:                str(formData, 'yeni_kha_kademe'),
    yeni_ekea_derece:               str(formData, 'yeni_ekea_derece'),
    yeni_ekea_kademe:               str(formData, 'yeni_ekea_kademe'),
    yeni_kidem_yili:                str(formData, 'yeni_kidem_yili'),
    yeni_oht:                       str(formData, 'yeni_oht'),
    yeni_igz:                       str(formData, 'yeni_igz'),
    yeni_ek_odeme:                  str(formData, 'yeni_ek_odeme'),
    yeni_ek_gosterge:               str(formData, 'yeni_ek_gosterge'),
    dayanak:                        str(formData, 'dayanak'),
    aciklama:                       str(formData, 'aciklama'),
    teklif_eden:                    str(formData, 'teklif_eden'),
    onaylayan:                      str(formData, 'onaylayan'),
    ise_baslama_tarihi:             tarihStr(formData, 'ise_baslama_tarihi'),
    ayrilis_tarihi:                 tarihStr(formData, 'ayrilis_tarihi'),
    kayit_tarihi:                   tarihStr(formData, 'kayit_tarihi'),
    kayit_no:                       str(formData, 'kayit_no'),
    dagitim_mudurlukleri:           (formData.getAll('dagitim_mudurlukleri') as string[]).filter(Boolean).join('; ') || null,
    kayit_zamani:                   new Date().toISOString(),
  })

  if (error) return { hata: error.message }
  revalidatePath('/personel-hareketleri')
  revalidatePath(`/personel/${sicil_no}`)
  return {}
}
