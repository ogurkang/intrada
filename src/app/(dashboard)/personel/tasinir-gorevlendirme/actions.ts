'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { revalidatePersonelDetayPaths } from '@/lib/revalidate-personel'
import { tasinirGoreviNormalize, TASINIR_GOREVLENDIRME_MENU_ANAHTAR } from '@/lib/tasinir-gorevi'
import {
  writePersonelAuditLogSafe,
  alanDegisiklikleriHesapla,
  degisiklikOzeti,
  degisiklikPayload,
} from '@/lib/personel-audit'

async function revalidateTasinir(sicil_no: string) {
  await revalidatePersonelDetayPaths(sicil_no)
  revalidatePath('/personel')
  revalidatePath('/personel/tasinir-gorevlendirme')
}

export async function tasinirGoreviSatirKaydet(
  sicil_no: string,
  fd: FormData,
): Promise<{ hata?: string }> {
  const deger = tasinirGoreviNormalize(String(fd.get('value') ?? fd.get('tasinir_gorevi') ?? ''))
  const supabase = await createClient()

  const { data: onceki } = await supabase
    .from('calisan')
    .select('tasinir_gorevi')
    .eq('sicil_no', sicil_no)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('calisan')
    .update({ tasinir_gorevi: deger })
    .eq('sicil_no', sicil_no)

  if (error) return { hata: error.message }

  const temel = { tasinir_gorevi: deger }
  const degisiklikler = alanDegisiklikleriHesapla(
    (onceki ?? null) as Record<string, unknown> | null,
    temel,
    { tasinir_gorevi: 'Taşınır Görevi' },
  )
  if (degisiklikler.length > 0) {
    const payload = degisiklikPayload(degisiklikler)
    await writePersonelAuditLogSafe(supabase, {
      sicil_no,
      modul: 'görevlendirme bilgileri',
      islem: 'Güncelle',
      ozet: degisiklikOzeti(degisiklikler, 'Taşınır görevi güncellendi'),
      ref_table: 'calisan',
      ref_id: sicil_no,
      onceki: payload.onceki,
      sonraki: payload.sonraki,
    })
  }

  await revalidateTasinir(sicil_no)
  return {}
}

export async function tasinirGoreviTopluKaydet(
  satirlar: { sicil_no: string; deger: string | null }[],
): Promise<{ hata?: string; kaydedilen?: number }> {
  if (!satirlar.length) return { kaydedilen: 0 }
  const supabase = await createClient()
  let kaydedilen = 0

  for (const s of satirlar) {
    const deger = tasinirGoreviNormalize(s.deger)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('calisan')
      .update({ tasinir_gorevi: deger })
      .eq('sicil_no', s.sicil_no)
    if (error) return { hata: error.message }
    kaydedilen++
  }

  for (const s of satirlar) {
    await revalidateTasinir(s.sicil_no)
  }
  return { kaydedilen }
}

/** Geçici menüyü sidebar’dan kaldırır. */
export async function tasinirGorevlendirmeTamamlandi(): Promise<{ hata?: string }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('uygulama_ayar')
    .upsert(
      {
        anahtar: TASINIR_GOREVLENDIRME_MENU_ANAHTAR,
        deger: 'pasif',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'anahtar' },
    )

  if (error) return { hata: error.message }

  revalidatePath('/', 'layout')
  revalidatePath('/personel')
  revalidatePath('/personel/tasinir-gorevlendirme')
  return {}
}
