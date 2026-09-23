'use server'

import { createClient } from '@/lib/supabase/server'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import { revalidatePersonelDetayPaths } from '@/lib/revalidate-personel'

export async function personelHazirlikKaydet(
  sicilNo: string,
  formData: FormData,
): Promise<{ hata?: string }> {
  const sicil_no = sicilNo.trim()
  if (!sicil_no) return { hata: 'Sicil numarası bulunamadı.' }

  const bilgisayarRaw = String(formData.get('bilgisayar_kullaniyor') ?? '').trim()
  if (bilgisayarRaw !== 'evet' && bilgisayarRaw !== 'hayir') {
    return { hata: 'Bilgisayar kullanım bilgisini Evet veya Hayır olarak seçin.' }
  }

  const thRaw = String(formData.get('th_hizmet_baslangic') ?? '').trim()
  if (thRaw && !/^\d{4}-\d{2}-\d{2}$/.test(thRaw)) {
    return { hata: 'Teknik hizmet başlangıç tarihi geçersiz.' }
  }

  const yurutRaw = String(formData.get('yuruttugu_unvan_id') ?? '').trim()
  const yuruttugu_unvan_id = yurutRaw ? Number.parseInt(yurutRaw, 10) : null
  if (yurutRaw && (!Number.isInteger(yuruttugu_unvan_id) || Number(yuruttugu_unvan_id) <= 0)) {
    return { hata: 'Yürütülen unvan seçimi geçersiz.' }
  }

  const supabase = await createClient()
  if (yuruttugu_unvan_id != null) {
    const { data: unvan } = await supabase
      .from('tanim_unvan')
      .select('id')
      .eq('id', yuruttugu_unvan_id)
      .eq('aktif', true)
      .maybeSingle()
    if (!unvan) return { hata: 'Yürütülen unvan tanımlarda bulunamadı.' }
  }

  const { data: onceki } = await supabase
    .from('calisan')
    .select('bilgisayar_kullaniyor, th_hizmet_baslangic, yuruttugu_unvan_id')
    .eq('sicil_no', sicil_no)
    .maybeSingle()
  if (!onceki) return { hata: 'Personel bulunamadı.' }

  const sonraki = {
    bilgisayar_kullaniyor: bilgisayarRaw === 'evet',
    th_hizmet_baslangic: thRaw || null,
    yuruttugu_unvan_id,
  }
  const { error } = await supabase.from('calisan').update(sonraki).eq('sicil_no', sicil_no)
  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no,
    modul: 'personel hazırlık',
    islem: 'Güncelle',
    ozet: 'Kazancı etkileyen personel bilgileri tamamlandı.',
    ref_table: 'calisan',
    ref_id: sicil_no,
    onceki,
    sonraki,
  })
  await revalidatePersonelDetayPaths(sicil_no)
  return {}
}
