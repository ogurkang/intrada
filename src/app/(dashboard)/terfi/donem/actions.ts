'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { revalidatePersonelDetayPaths } from '@/lib/revalidate-personel'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

export async function terfiDonemEkle(fd: FormData): Promise<{ hata?: string }> {
  const yil = parseInt(String(fd.get('yil') ?? '0'), 10)
  const baslangic_tarihi = str(fd, 'baslangic_tarihi')
  const bitis_tarihi = str(fd, 'bitis_tarihi')
  if (!yil || !baslangic_tarihi || !bitis_tarihi) return { hata: 'Yıl ve tarihler zorunludur.' }
  if (bitis_tarihi < baslangic_tarihi) return { hata: 'Bitiş tarihi başlangıçtan önce olamaz.' }

  const supabase = await createClient()
  const { error } = await supabase.from('terfi_donem').insert({
    yil,
    baslangic_tarihi,
    bitis_tarihi,
    sira_no: str(fd, 'sira_no'),
    donem_adi: str(fd, 'donem_adi'),
    durum: 'Açık',
  })

  if (error) return { hata: error.message }
  revalidatePath('/terfi')
  return {}
}

export async function terfiDonemGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('terfi_donem')
    .update({
      yil: parseInt(String(fd.get('yil') ?? '0'), 10),
      sira_no: str(fd, 'sira_no') ?? undefined,
      donem_adi: str(fd, 'donem_adi') ?? undefined,
      baslangic_tarihi: str(fd, 'baslangic_tarihi') ?? undefined,
      bitis_tarihi: str(fd, 'bitis_tarihi') ?? undefined,
    })
    .eq('id', id)

  if (error) return { hata: error.message }
  revalidatePath('/terfi')
  revalidatePath(`/terfi/donem/${id}`)
  return {}
}

export async function terfiDonemKapat(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('terfi_donem').update({ durum: 'Kapalı' }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath('/terfi')
  revalidatePath(`/terfi/donem/${id}`)
  return {}
}

export async function terfiDonemAc(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('terfi_donem').update({ durum: 'Açık' }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath('/terfi')
  revalidatePath(`/terfi/donem/${id}`)
  return {}
}

export type TerfiEttirKayitSatir = {
  terfi_id: number
  sicil_no: string
  kha_derece: string | null
  kha_kademe: string | null
  ekea_derece: string | null
  ekea_kademe: string | null
  ek_gosterge: string | null
  ek_odeme: string | null
  oht: string | null
  yan_odeme: string | null
  sds_orani: string | null
}

export async function terfiEttirKaydet(
  donemId: number,
  satirlar: TerfiEttirKayitSatir[],
): Promise<{ hata?: string }> {
  if (!satirlar.length) return {}
  const supabase = await createClient()

  for (const s of satirlar) {
    const { error } = await supabase
      .from('terfi_hareketleri')
      .update({
        kha_derece: s.kha_derece,
        kha_kademe: s.kha_kademe,
        ekea_derece: s.ekea_derece,
        ekea_kademe: s.ekea_kademe,
        ek_gosterge: s.ek_gosterge,
        ek_odeme: s.ek_odeme,
        oht: s.oht,
        yan_odeme: s.yan_odeme,
        sds_orani: s.sds_orani,
      })
      .eq('id', s.terfi_id)

    if (error) return { hata: error.message }
  }

  revalidatePath('/terfi')
  revalidatePath('/terfi/bilgiler')
  revalidatePath(`/terfi/donem/${donemId}`)
  const siciller = [...new Set(satirlar.map((x) => x.sicil_no))]
  for (const sicil of siciller) {
    await revalidatePersonelDetayPaths(sicil)
  }
  return {}
}
