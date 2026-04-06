'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { revalidatePersonelDetayPaths } from '@/lib/revalidate-personel'

function parseNonNegInt(v: unknown): number {
  const n = parseInt(String(v ?? '').trim(), 10)
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

export interface HizmetSureGirisSatir {
  sicil_no: string
  hizmet_suresi_yil: number
  hizmet_suresi_ay: number
  hizmet_suresi_gun: number
}

async function revalidateHizmetGiris(sicil_no: string) {
  await revalidatePersonelDetayPaths(sicil_no)
  revalidatePath('/personel')
  revalidatePath('/personel/hizmet-sureleri-giris')
}

/** Tek satır — yalnızca hizmet süresi (360 gün esası). */
export async function hizmetSureleriSatirKaydet(
  sicil_no: string,
  fd: FormData
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { data: row, error: selErr } = await supabase
    .from('calisan')
    .select('gorev_turu')
    .eq('sicil_no', sicil_no)
    .maybeSingle()
  if (selErr) return { hata: selErr.message }
  if ((row?.gorev_turu ?? 'Çalışan') === 'Aylıksız İzin') {
    return {
      hata:
        'Görev türü Aylıksız İzin olan personelde hizmet süresi bu ekrandan güncellenmez (kişisel bilgiler ile aynı kural).',
    }
  }

  const yil = parseNonNegInt(fd.get('hizmet_suresi_yil'))
  const ay = parseNonNegInt(fd.get('hizmet_suresi_ay'))
  const gun = parseNonNegInt(fd.get('hizmet_suresi_gun'))

  const { error } = await supabase
    .from('calisan')
    .update({
      hizmet_suresi_yil: yil,
      hizmet_suresi_ay: ay,
      hizmet_suresi_gun: gun,
    })
    .eq('sicil_no', sicil_no)

  if (error) return { hata: error.message }
  await revalidateHizmetGiris(sicil_no)
  return {}
}

/** Toplu — değişen siciller. Aylıksız İzin satırları atlanır (kişisel bilgiler ile aynı kural). */
export async function hizmetSureleriTopluKaydet(
  satirlar: HizmetSureGirisSatir[]
): Promise<{ hata?: string; kaydedilen?: number; atlanan?: number }> {
  if (!satirlar.length) return { kaydedilen: 0, atlanan: 0 }
  const supabase = await createClient()
  const guncellenenSiciller: string[] = []
  let atlanan = 0

  for (const s of satirlar) {
    const { data: row, error: selErr } = await supabase
      .from('calisan')
      .select('gorev_turu')
      .eq('sicil_no', s.sicil_no)
      .maybeSingle()
    if (selErr) return { hata: selErr.message }
    if ((row?.gorev_turu ?? 'Çalışan') === 'Aylıksız İzin') {
      atlanan++
      continue
    }

    const { error } = await supabase
      .from('calisan')
      .update({
        hizmet_suresi_yil: Math.max(0, Math.floor(s.hizmet_suresi_yil)),
        hizmet_suresi_ay: Math.max(0, Math.floor(s.hizmet_suresi_ay)),
        hizmet_suresi_gun: Math.max(0, Math.floor(s.hizmet_suresi_gun)),
      })
      .eq('sicil_no', s.sicil_no)
    if (error) return { hata: error.message }
    guncellenenSiciller.push(s.sicil_no)
  }

  for (const sicil of new Set(guncellenenSiciller)) {
    await revalidateHizmetGiris(sicil)
  }
  return { kaydedilen: guncellenenSiciller.length, atlanan }
}
