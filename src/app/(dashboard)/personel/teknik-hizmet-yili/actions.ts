'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { revalidatePersonelDetayPaths } from '@/lib/revalidate-personel'
import { thHizmetTarihiKaydet } from '@/lib/th-hizmet-yili'
import {
  writePersonelAuditLogSafe,
  alanDegisiklikleriHesapla,
  degisiklikOzeti,
  degisiklikPayload,
} from '@/lib/personel-audit'

async function revalidateTh(sicil_no: string) {
  await revalidatePersonelDetayPaths(sicil_no)
  revalidatePath('/personel')
  revalidatePath('/personel/teknik-hizmet-yili')
  revalidatePath('/', 'layout')
}

export async function thHizmetYiliSatirKaydet(
  sicil_no: string,
  fd: FormData,
): Promise<{ hata?: string }> {
  const ham = String(fd.get('value') ?? fd.get('th_hizmet_baslangic') ?? '')
  const { iso, hata } = thHizmetTarihiKaydet(ham)
  if (hata || !iso) return { hata: hata ?? 'Tarih geçersiz.' }

  const supabase = await createClient()
  const { data: onceki } = await supabase
    .from('calisan')
    .select('th_hizmet_baslangic')
    .eq('sicil_no', sicil_no)
    .maybeSingle()

  const { error } = await supabase
    .from('calisan')
    .update({ th_hizmet_baslangic: iso })
    .eq('sicil_no', sicil_no)
  if (error) return { hata: error.message }

  const temel = { th_hizmet_baslangic: iso }
  const degisiklikler = alanDegisiklikleriHesapla(
    (onceki ?? null) as Record<string, unknown> | null,
    temel,
    { th_hizmet_baslangic: 'Teknik Hizmet Yılı' },
  )
  if (degisiklikler.length > 0) {
    const payload = degisiklikPayload(degisiklikler)
    await writePersonelAuditLogSafe(supabase, {
      sicil_no,
      modul: 'görevlendirme bilgileri',
      islem: 'Güncelle',
      ozet: degisiklikOzeti(degisiklikler, 'Teknik hizmet yılı kaydedildi'),
      ref_table: 'calisan',
      ref_id: sicil_no,
      onceki: payload.onceki,
      sonraki: payload.sonraki,
    })
  }

  await revalidateTh(sicil_no)
  return {}
}

export async function thHizmetYiliTopluKaydet(
  satirlar: { sicil_no: string; deger: string | null }[],
): Promise<{ hata?: string; kaydedilen?: number }> {
  if (!satirlar.length) return { kaydedilen: 0 }
  const supabase = await createClient()
  let kaydedilen = 0

  for (const s of satirlar) {
    const { iso, hata } = thHizmetTarihiKaydet(s.deger)
    if (hata || !iso) return { hata: `${s.sicil_no}: ${hata ?? 'Tarih geçersiz.'}` }
    const { error } = await supabase
      .from('calisan')
      .update({ th_hizmet_baslangic: iso })
      .eq('sicil_no', s.sicil_no)
    if (error) return { hata: error.message }
    kaydedilen++
  }

  for (const s of satirlar) {
    await revalidateTh(s.sicil_no)
  }
  return { kaydedilen }
}
