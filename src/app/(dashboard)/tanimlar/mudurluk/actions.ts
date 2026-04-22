'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireTanimlarYazma } from '@/lib/tanimlar-yazma-guard'

const SAYFA = '/tanimlar/mudurluk'

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

  const supabase = await createClient()
  const { error } = await supabase
    .from('tanim_mudurluk')
    .insert({ mudurluk_adi, konum, tehlike_sinifi, aktif: true })

  if (error) return { hata: error.message }
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

  const supabase = await createClient()
  const { error } = await supabase
    .from('tanim_mudurluk')
    .update({ mudurluk_adi, konum, tehlike_sinifi })
    .eq('id', id)

  if (error) return { hata: error.message }
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
