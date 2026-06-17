'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { revalidatePersonelDetayPaths } from '@/lib/revalidate-personel'
import { personelAdresDegerlerinden } from '@/lib/personel-adres'
import {
  alanDegisiklikleriHesapla,
  degisiklikOzeti,
  degisiklikPayload,
  writePersonelAuditLogSafe,
} from '@/lib/personel-audit'

const CALISAN_ADRES_ALAN_ETIKETLERI: Record<string, string> = {
  mahalle_id: 'Mahalle',
  adres_detay: 'Adres Detayı',
  adresi: 'Adres',
}

export interface AdresDuzenlemeSatir {
  sicil_no: string
  mahalle_id: number | null
  adres_detay: string | null
}

function parseMahalleId(raw: unknown): number | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const n = Number(s)
  if (!Number.isInteger(n) || n <= 0) return null
  return n
}

async function adresGuncelle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sicil_no: string,
  mahalle_id: number | null,
  adres_detay: string | null,
  islemEtiket: string,
): Promise<{ hata?: string }> {
  const adresSonuc = await personelAdresDegerlerinden(supabase, mahalle_id, adres_detay)
  if ('hata' in adresSonuc) return { hata: adresSonuc.hata }

  const { data: oncekiCalisan } = await supabase
    .from('calisan')
    .select('mahalle_id, adres_detay, adresi')
    .eq('sicil_no', sicil_no)
    .maybeSingle()

  if (!oncekiCalisan) return { hata: 'Personel kaydı bulunamadı.' }

  const sonraki = {
    mahalle_id: adresSonuc.mahalle_id,
    adres_detay: adresSonuc.adres_detay,
    adresi: adresSonuc.adresi,
  }

  const degisiklikler = alanDegisiklikleriHesapla(
    oncekiCalisan as Record<string, unknown>,
    sonraki,
    CALISAN_ADRES_ALAN_ETIKETLERI,
  )
  if (!degisiklikler.length) return {}

  const { error } = await supabase.from('calisan').update(sonraki).eq('sicil_no', sicil_no)
  if (error) return { hata: error.message }

  const payload = degisiklikPayload(degisiklikler)
  await writePersonelAuditLogSafe(supabase, {
    sicil_no,
    modul: 'adres_duzenleme',
    islem: islemEtiket,
    ozet: degisiklikOzeti(degisiklikler, 'Adres güncellendi'),
    ref_table: 'calisan',
    ref_id: sicil_no,
    onceki: payload.onceki,
    sonraki: payload.sonraki,
  })

  await revalidatePersonelDetayPaths(sicil_no)
  return {}
}

export async function adresDuzenlemeSatirKaydet(
  sicil_no: string,
  fd: FormData,
): Promise<{ hata?: string }> {
  const sn = String(sicil_no ?? '').trim()
  if (!sn) return { hata: 'Geçersiz sicil numarası.' }

  const mahalle_id = parseMahalleId(fd.get('mahalle_id'))
  const adres_detay = String(fd.get('adres_detay') ?? '').trim() || null

  const supabase = await createClient()
  const res = await adresGuncelle(supabase, sn, mahalle_id, adres_detay, 'Adres Güncelle')
  if (res.hata) return res

  revalidatePath('/personel')
  revalidatePath('/personel/adres-duzenleme')
  return {}
}

export async function adresDuzenlemeTopluKaydet(
  satirlar: AdresDuzenlemeSatir[],
): Promise<{ hata?: string; kaydedilen?: number }> {
  if (!satirlar.length) return { kaydedilen: 0 }

  const supabase = await createClient()
  let kaydedilen = 0

  for (const s of satirlar) {
    const sn = String(s.sicil_no ?? '').trim()
    if (!sn) return { hata: 'Eksik sicil numarası.' }

    const res = await adresGuncelle(
      supabase,
      sn,
      s.mahalle_id,
      s.adres_detay,
      'Adres Güncelle (Toplu)',
    )
    if (res.hata) return { hata: `${sn}: ${res.hata}` }
    kaydedilen++
  }

  revalidatePath('/personel')
  revalidatePath('/personel/adres-duzenleme')
  return { kaydedilen }
}
