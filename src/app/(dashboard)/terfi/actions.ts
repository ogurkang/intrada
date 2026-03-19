'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

export async function terfiEkle(fd: FormData): Promise<{ hata?: string }> {
  const sicil_no = str(fd, 'sicil_no')
  if (!sicil_no) return { hata: 'Sicil no zorunludur.' }

  const supabase = await createClient()
  const { error } = await supabase.from('terfi_hareketleri').insert({
    sicil_no,
    ad_soyad:               str(fd, 'ad_soyad'),
    rol:                    str(fd, 'rol'),
    kadro_sira_no:          str(fd, 'kadro_sira_no'),
    unvan:                  str(fd, 'unvan'),
    mudurluk:               str(fd, 'mudurluk'),
    gorev_ayligi_derece:    str(fd, 'gorev_ayligi_derece'),
    gorev_ayligi_kademe:    str(fd, 'gorev_ayligi_kademe'),
    kha_derece:             str(fd, 'kha_derece'),
    kha_kademe:             str(fd, 'kha_kademe'),
    kha_tarihi:             str(fd, 'kha_tarihi'),
    ekea_derece:            str(fd, 'ekea_derece'),
    ekea_kademe:            str(fd, 'ekea_kademe'),
    ekea_tarihi:            str(fd, 'ekea_tarihi'),
    kidem_yili:             str(fd, 'kidem_yili'),
    kidem_tarihi:           str(fd, 'kidem_tarihi'),
    iyi_hal_terfi_tarihi:   str(fd, 'iyi_hal_terfi_tarihi'),
    ek_gosterge:            str(fd, 'ek_gosterge'),
    ek_odeme:               str(fd, 'ek_odeme'),
    oht:                    str(fd, 'oht'),
    yan_odeme:              str(fd, 'yan_odeme'),
    sds_orani:              str(fd, 'sds_orani'),
  })
  if (error) return { hata: error.message }
  revalidatePath('/terfi')
  revalidatePath(`/personel/${sicil_no}`)
  return {}
}

export async function terfiGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
  const sicil_no = str(fd, 'sicil_no')
  if (!sicil_no) return { hata: 'Sicil no zorunludur.' }

  const supabase = await createClient()
  const { error } = await supabase.from('terfi_hareketleri').update({
    gorev_ayligi_derece:    str(fd, 'gorev_ayligi_derece'),
    gorev_ayligi_kademe:    str(fd, 'gorev_ayligi_kademe'),
    kha_derece:             str(fd, 'kha_derece'),
    kha_kademe:             str(fd, 'kha_kademe'),
    kha_tarihi:             str(fd, 'kha_tarihi'),
    ekea_derece:            str(fd, 'ekea_derece'),
    ekea_kademe:            str(fd, 'ekea_kademe'),
    ekea_tarihi:            str(fd, 'ekea_tarihi'),
    kidem_yili:             str(fd, 'kidem_yili'),
    kidem_tarihi:           str(fd, 'kidem_tarihi'),
    iyi_hal_terfi_tarihi:   str(fd, 'iyi_hal_terfi_tarihi'),
    ek_gosterge:            str(fd, 'ek_gosterge'),
    ek_odeme:               str(fd, 'ek_odeme'),
    oht:                    str(fd, 'oht'),
    yan_odeme:              str(fd, 'yan_odeme'),
    sds_orani:              str(fd, 'sds_orani'),
  }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath('/terfi')
  revalidatePath(`/personel/${sicil_no}`)
  return {}
}

export async function terfiSil(id: number, sicil_no: string): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('terfi_hareketleri').delete().eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath('/terfi')
  revalidatePath(`/personel/${sicil_no}`)
  return {}
}

export interface TerfiSatir {
  sicil_no:             string
  ad_soyad:             string | null
  gorev_ayligi_derece:  string | null
  gorev_ayligi_kademe:  string | null
  kha_derece:           string | null
  kha_kademe:           string | null
  kha_tarihi:           string | null
  ekea_derece:          string | null
  ekea_kademe:          string | null
  ekea_tarihi:          string | null
  kidem_yili:           string | null
  kidem_tarihi:         string | null
  iyi_hal_terfi_tarihi: string | null
  ek_gosterge:          string | null
  ek_odeme:             string | null
  oht:                  string | null
  yan_odeme:            string | null
  sds_orani:            string | null
}

export async function terfiTopluKaydet(
  satirlar: TerfiSatir[]
): Promise<{ hata?: string; kaydedilen?: number }> {
  if (!satirlar.length) return { kaydedilen: 0 }
  const supabase = await createClient()
  const { error } = await supabase.from('terfi_hareketleri').upsert(
    satirlar.map(s => ({
      sicil_no:             s.sicil_no,
      ad_soyad:             s.ad_soyad,
      gorev_ayligi_derece:  s.gorev_ayligi_derece,
      gorev_ayligi_kademe:  s.gorev_ayligi_kademe,
      kha_derece:           s.kha_derece,
      kha_kademe:           s.kha_kademe,
      kha_tarihi:           s.kha_tarihi,
      ekea_derece:          s.ekea_derece,
      ekea_kademe:          s.ekea_kademe,
      ekea_tarihi:          s.ekea_tarihi,
      kidem_yili:           s.kidem_yili,
      kidem_tarihi:         s.kidem_tarihi,
      iyi_hal_terfi_tarihi: s.iyi_hal_terfi_tarihi,
      ek_gosterge:          s.ek_gosterge,
      ek_odeme:             s.ek_odeme,
      oht:                  s.oht,
      yan_odeme:            s.yan_odeme,
      sds_orani:            s.sds_orani,
    })),
    { onConflict: 'sicil_no' }
  )
  if (error) return { hata: error.message }
  revalidatePath('/terfi')
  return { kaydedilen: satirlar.length }
}
