'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireTanimlarYazma } from '@/lib/tanimlar-yazma-guard'

const SAYFA = '/tanimlar/yerleske-adresi'

function validateSatir(
  yerleske_adi: string,
  adres: string,
): { ok: true } | { ok: false; hata: string } {
  if (!yerleske_adi) return { ok: false, hata: 'Yerleşke adı boş bırakılamaz.' }
  if (!adres) return { ok: false, hata: 'Adres boş bırakılamaz.' }
  return { ok: true }
}

export async function yerleskeAdresiTopluEkle(
  satirlar: { yerleske_adi: string; adres: string }[],
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  if (!satirlar.length) return { hata: 'En az bir satır ekleyin.' }

  const insertRows: { yerleske_adi: string; adres: string; aktif: boolean }[] = []
  for (const s of satirlar) {
    const yerleske_adi = s.yerleske_adi.trim()
    const adres = s.adres.trim()
    const v = validateSatir(yerleske_adi, adres)
    if (!v.ok) return { hata: v.hata }
    insertRows.push({ yerleske_adi, adres, aktif: true })
  }

  const supabase = await createClient()
  const { error } = await supabase.from('tanim_yerleske_adresi').insert(insertRows)
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  revalidatePath('/tanimlar/mudurluk')
  return {}
}

export async function yerleskeAdresiGuncelle(
  id: number,
  formData: FormData,
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }

  const yerleske_adi = String(formData.get('yerleske_adi') ?? '').trim()
  const adres = String(formData.get('adres') ?? '').trim()
  const aktifRaw = String(formData.get('aktif') ?? 'true')
  const aktif = aktifRaw === 'true' || aktifRaw === 'on' || aktifRaw === '1'

  const v = validateSatir(yerleske_adi, adres)
  if (!v.ok) return { hata: v.hata }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tanim_yerleske_adresi')
    .update({
      yerleske_adi,
      adres,
      aktif,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  revalidatePath('/tanimlar/mudurluk')
  return {}
}

export async function yerleskeAdresiToggleAktif(
  id: number,
  mevcutAktif: boolean,
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const supabase = await createClient()
  const { error } = await supabase
    .from('tanim_yerleske_adresi')
    .update({ aktif: !mevcutAktif, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  revalidatePath('/tanimlar/mudurluk')
  return {}
}
