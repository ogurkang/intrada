'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireTanimlarYazma } from '@/lib/tanimlar-yazma-guard'

const SAYFA = '/tanimlar/hareket-tanimlari'

const TUR_SET = new Set(['Geliş', 'Gidiş'])

function parseTur(raw: string): string | null {
  const t = String(raw ?? '').trim()
  return TUR_SET.has(t) ? t : null
}

export async function hareketTanimEkle(formData: FormData): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const tur = parseTur(String(formData.get('tur') ?? ''))
  const tip = String(formData.get('tip') ?? '').trim()
  if (!tur) return { hata: 'Tür seçilmelidir (Geliş veya Gidiş).' }
  if (!tip) return { hata: 'Tanım metni boş bırakılamaz.' }

  const supabase = await createClient()
  const { error } = await supabase.from('tanim_hareket_tanim').insert({
    tur,
    tip,
    aktif: true,
  })
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

export async function hareketTanimGuncelle(id: number, formData: FormData): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const tur = parseTur(String(formData.get('tur') ?? ''))
  const tip = String(formData.get('tip') ?? '').trim()
  if (!tur) return { hata: 'Tür seçilmelidir (Geliş veya Gidiş).' }
  if (!tip) return { hata: 'Tanım metni boş bırakılamaz.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tanim_hareket_tanim')
    .update({ tur, tip, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

export async function hareketTanimToggleAktif(id: number, mevcutAktif: boolean): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const supabase = await createClient()
  const { error } = await supabase
    .from('tanim_hareket_tanim')
    .update({ aktif: !mevcutAktif, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

/** Gösterge toplu ekle ile aynı mantık: satır dizisi. */
export async function hareketTopluEkle(satirlar: { tur: string; tip: string }[]): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  if (!satirlar.length) return { hata: 'En az bir satır ekleyin.' }

  const insertRows: { tur: string; tip: string; aktif: boolean }[] = []
  for (const s of satirlar) {
    const tur = parseTur(s.tur)
    const tip = String(s.tip ?? '').trim()
    if (!tur) return { hata: 'Her satırda tür Geliş veya Gidiş olmalıdır.' }
    if (!tip) return { hata: 'Tanım metni boş satır olamaz.' }
    insertRows.push({ tur, tip, aktif: true })
  }

  const supabase = await createClient()
  const { error } = await supabase.from('tanim_hareket_tanim').insert(insertRows)
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}
