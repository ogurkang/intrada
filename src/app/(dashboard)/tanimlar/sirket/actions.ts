'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireTanimlarYazma } from '@/lib/tanimlar-yazma-guard'

const SAYFA = '/tanimlar/sirket'

export async function sirketEkle(formData: FormData): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const sirket_adi = String(formData.get('sirket_adi') ?? '').trim()
  if (!sirket_adi) return { hata: 'Şirket adı boş bırakılamaz.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = (await createClient()) as any
  const { error } = await sb.from('tanim_sirket').insert({ sirket_adi, aktif: true })
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

export async function sirketGuncelle(id: number, formData: FormData): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const sirket_adi = String(formData.get('sirket_adi') ?? '').trim()
  if (!sirket_adi) return { hata: 'Şirket adı boş bırakılamaz.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = (await createClient()) as any
  const { error } = await sb.from('tanim_sirket').update({ sirket_adi }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

export async function sirketToggleAktif(id: number, mevcutAktif: boolean): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = (await createClient()) as any
  const { error } = await sb.from('tanim_sirket').update({ aktif: !mevcutAktif }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}
