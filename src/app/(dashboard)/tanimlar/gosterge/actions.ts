'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireTanimlarYazma } from '@/lib/tanimlar-yazma-guard'

const SAYFA = '/tanimlar/gosterge'

function dereceKademeGosterge(
  derece: number,
  kademe: number,
  gosterge: number
): { ok: true } | { ok: false; hata: string } {
  if (!Number.isInteger(derece) || derece < 1 || derece > 15) {
    return { ok: false, hata: 'Derece 1–15 arasında olmalıdır.' }
  }
  if (!Number.isInteger(kademe) || kademe < 1 || kademe > 9) {
    return { ok: false, hata: 'Kademe 1–9 arasında olmalıdır.' }
  }
  if (!Number.isFinite(gosterge) || gosterge < 0) {
    return { ok: false, hata: 'Gösterge geçerli bir sayı olmalıdır.' }
  }
  return { ok: true }
}

export async function gostergeTopluEkle(
  satirlar: { derece: number; kademe: number; gosterge: number }[]
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  if (!satirlar.length) return { hata: 'En az bir satır ekleyin.' }

  const insertRows: { derece: number; kademe: number; gosterge: number; aktif: boolean }[] = []
  for (const s of satirlar) {
    const v = dereceKademeGosterge(s.derece, s.kademe, s.gosterge)
    if (!v.ok) return { hata: v.hata }
    insertRows.push({ derece: s.derece, kademe: s.kademe, gosterge: s.gosterge, aktif: true })
  }

  const supabase = await createClient()
  const { error } = await supabase.from('tanim_gosterge').insert(insertRows)
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

export async function gostergeGuncelle(
  id: number,
  formData: FormData
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }

  const derece = Number(formData.get('derece'))
  const kademe = Number(formData.get('kademe'))
  const gosterge = Number(String(formData.get('gosterge') ?? '').replace(',', '.'))
  const aktifRaw = String(formData.get('aktif') ?? 'true')
  const aktif = aktifRaw === 'true' || aktifRaw === 'on' || aktifRaw === '1'

  const v = dereceKademeGosterge(derece, kademe, gosterge)
  if (!v.ok) return { hata: v.hata }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tanim_gosterge')
    .update({
      derece,
      kademe,
      gosterge,
      aktif,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

export async function gostergeToggleAktif(
  id: number,
  mevcutAktif: boolean
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const supabase = await createClient()
  const { error } = await supabase
    .from('tanim_gosterge')
    .update({ aktif: !mevcutAktif, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}
