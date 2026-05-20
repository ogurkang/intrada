'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireTanimlarYazma } from '@/lib/tanimlar-yazma-guard'

const SAYFA = '/tanimlar/mudurluk'

function parseYerleskeIds(formData: FormData): number[] {
  const ids = new Set<number>()
  for (const raw of formData.getAll('yerleske_adresi_ids')) {
    const id = Number(String(raw).trim())
    if (Number.isInteger(id) && id > 0) ids.add(id)
  }
  return [...ids]
}

async function yerleskeEslemeleriniKaydet(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mudurlukId: number,
  yerleskeIds: number[],
): Promise<{ hata?: string }> {
  const { error: delErr } = await supabase
    .from('tanim_mudurluk_yerleske')
    .delete()
    .eq('mudurluk_id', mudurlukId)
  if (delErr) return { hata: delErr.message }

  if (yerleskeIds.length === 0) return {}

  const { error: insErr } = await supabase.from('tanim_mudurluk_yerleske').insert(
    yerleskeIds.map(yerleske_adresi_id => ({ mudurluk_id: mudurlukId, yerleske_adresi_id })),
  )
  if (insErr) return { hata: insErr.message }
  return {}
}

export async function mudurlukEkle(
  formData: FormData
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const mudurluk_adi = String(formData.get('mudurluk_adi') ?? '').trim()
  if (!mudurluk_adi) return { hata: 'Müdürlük adı boş bırakılamaz.' }
  const konum = String(formData.get('konum') ?? 'İç').trim()
  if (konum !== 'İç' && konum !== 'Dış') return { hata: 'Konum İç veya Dış olmalıdır.' }
  const tehlike_sinifi = String(formData.get('tehlike_sinifi') ?? 'Az Tehlikeli').trim()
  if (!['Az Tehlikeli', 'Tehlikeli', 'Çok Tehlikeli'].includes(tehlike_sinifi)) {
    return { hata: 'Tehlike sınıfı geçersiz.' }
  }
  const yerleskeIds = parseYerleskeIds(formData)

  const supabase = await createClient()
  const { data: inserted, error } = await supabase
    .from('tanim_mudurluk')
    .insert({ mudurluk_adi, konum, tehlike_sinifi, aktif: true })
    .select('id')
    .single()

  if (error) return { hata: error.message }

  const esleme = await yerleskeEslemeleriniKaydet(supabase, inserted.id, yerleskeIds)
  if (esleme.hata) return esleme

  revalidatePath(SAYFA)
  return {}
}

export async function mudurlukGuncelle(
  id: number,
  formData: FormData
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const mudurluk_adi = String(formData.get('mudurluk_adi') ?? '').trim()
  if (!mudurluk_adi) return { hata: 'Müdürlük adı boş bırakılamaz.' }
  const konum = String(formData.get('konum') ?? 'İç').trim()
  if (konum !== 'İç' && konum !== 'Dış') return { hata: 'Konum İç veya Dış olmalıdır.' }
  const tehlike_sinifi = String(formData.get('tehlike_sinifi') ?? 'Az Tehlikeli').trim()
  if (!['Az Tehlikeli', 'Tehlikeli', 'Çok Tehlikeli'].includes(tehlike_sinifi)) {
    return { hata: 'Tehlike sınıfı geçersiz.' }
  }
  const yerleskeIds = parseYerleskeIds(formData)

  const supabase = await createClient()
  const { error } = await supabase
    .from('tanim_mudurluk')
    .update({ mudurluk_adi, konum, tehlike_sinifi })
    .eq('id', id)

  if (error) return { hata: error.message }

  const esleme = await yerleskeEslemeleriniKaydet(supabase, id, yerleskeIds)
  if (esleme.hata) return esleme

  revalidatePath(SAYFA)
  return {}
}

export async function mudurlukToggleAktif(
  id: number,
  mevcutAktif: boolean
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const supabase = await createClient()
  const { error } = await supabase
    .from('tanim_mudurluk')
    .update({ aktif: !mevcutAktif })
    .eq('id', id)

  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}
