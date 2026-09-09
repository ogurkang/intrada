'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { revalidatePersonelDetayPaths } from '@/lib/revalidate-personel'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import { bilgisayarYetkinlikEtiket, bilgisayarYetkinlikParse } from '@/lib/yetkinlik'

async function kaydetSicil(sicil_no: string, kullaniyor: boolean): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { data: onceki } = await supabase
    .from('calisan')
    .select('bilgisayar_kullaniyor')
    .eq('sicil_no', sicil_no)
    .maybeSingle()
  if (!onceki) return { hata: 'Personel bulunamadı.' }
  if (onceki.bilgisayar_kullaniyor === kullaniyor) return {}

  const { error } = await supabase
    .from('calisan')
    .update({ bilgisayar_kullaniyor: kullaniyor })
    .eq('sicil_no', sicil_no)
  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no,
    modul: 'yetkinlik',
    islem: 'Güncelle',
    ozet: `Yetkinlik: ${bilgisayarYetkinlikEtiket(kullaniyor)}`,
    ref_table: 'calisan',
    ref_id: sicil_no,
    onceki: { bilgisayar_kullaniyor: onceki.bilgisayar_kullaniyor },
    sonraki: { bilgisayar_kullaniyor: kullaniyor },
  })
  revalidatePath('/bildirim/yetkinlik')
  revalidatePath('/bildirim')
  await revalidatePersonelDetayPaths(sicil_no)
  return {}
}

export async function yetkinlikSatirKaydet(
  sicil_no: string,
  fd: FormData,
): Promise<{ hata?: string }> {
  return kaydetSicil(sicil_no, bilgisayarYetkinlikParse(String(fd.get('value') ?? '')))
}

export async function yetkinlikTopluKaydet(
  satirlar: { sicil_no: string; deger: string | null }[],
): Promise<{ hata?: string; kaydedilen?: number }> {
  let kaydedilen = 0
  for (const s of satirlar) {
    const res = await kaydetSicil(s.sicil_no, bilgisayarYetkinlikParse(s.deger))
    if (res.hata) return res
    kaydedilen++
  }
  return { kaydedilen }
}
