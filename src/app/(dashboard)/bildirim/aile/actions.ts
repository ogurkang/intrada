'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Json } from '@/types/database'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import { aileAuditSnapshot } from '@/lib/aile-audit'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

export async function aileKaydet(fd: FormData): Promise<{ hata?: string }> {
  const sicil_no = str(fd, 'sicil_no')
  if (!sicil_no) return { hata: 'Sicil no zorunludur.' }

  let cocuklar_json: Json = []
  try {
    const raw = String(fd.get('cocuklar_json') ?? '[]')
    cocuklar_json = JSON.parse(raw) as Json
  } catch {
    return { hata: 'Çocuk bilgileri geçersiz JSON formatında.' }
  }

  const supabase = await createClient()
  const { data: onceki } = await supabase
    .from('aile_bildirimi')
    .select('medeni_hal, esin_ad_soyad, esin_tckn, is_durumu, gelir_durumu, cocuklar_json')
    .eq('sicil_no', sicil_no)
    .maybeSingle()

  const payload = {
    sicil_no,
    medeni_hal:    str(fd, 'medeni_hal'),
    esin_ad_soyad: str(fd, 'esin_ad_soyad'),
    esin_tckn:     str(fd, 'esin_tckn'),
    is_durumu:     str(fd, 'is_durumu'),
    gelir_durumu:  str(fd, 'gelir_durumu'),
    cocuklar_json,
  }

  const { error } = await supabase.from('aile_bildirimi').upsert(payload, { onConflict: 'sicil_no' })

  if (error) return { hata: error.message }
  await writePersonelAuditLogSafe(supabase, {
    sicil_no,
    modul: 'aile',
    islem: onceki ? 'Güncelle' : 'Ekle',
    ozet: onceki ? 'Aile bildirimi güncellendi.' : 'Aile bildirimi eklendi.',
    ref_table: 'aile_bildirimi',
    ref_id: sicil_no,
    onceki: onceki ? aileAuditSnapshot(onceki as Record<string, unknown>) : null,
    sonraki: aileAuditSnapshot(payload as Record<string, unknown>),
  })
  revalidatePath('/bildirim/aile')
  revalidatePath('/bildirim/aile/[id]', 'page')
  revalidatePath('/bildirim/aile/[id]/duzenle', 'page')
  return {}
}

export async function aileSil(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { data: onceki } = await supabase
    .from('aile_bildirimi')
    .select('sicil_no, medeni_hal, esin_ad_soyad, esin_tckn, is_durumu, gelir_durumu, cocuklar_json')
    .eq('id', id)
    .maybeSingle()
  const { error } = await supabase.from('aile_bildirimi').delete().eq('id', id)
  if (error) return { hata: error.message }
  if (onceki?.sicil_no) {
    await writePersonelAuditLogSafe(supabase, {
      sicil_no: onceki.sicil_no,
      modul: 'aile',
      islem: 'Sil',
      ozet: 'Aile bildirimi silindi.',
      ref_table: 'aile_bildirimi',
      ref_id: onceki.sicil_no,
      onceki: aileAuditSnapshot(onceki as Record<string, unknown>),
    })
  }
  revalidatePath('/bildirim/aile')
  return {}
}
