'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireTanimlarYazma } from '@/lib/tanimlar-yazma-guard'

const SAYFA = '/tanimlar/sendika-bilgileri'

const GECERLI_STATULER = new Set(['Memur', 'İşçi'])

function validateSatir(
  statu: string,
  kisa_ad: string,
  uzun_ad: string,
): { ok: true } | { ok: false; hata: string } {
  if (!GECERLI_STATULER.has(statu)) return { ok: false, hata: 'Statü Memur veya İşçi olmalıdır.' }
  if (!kisa_ad) return { ok: false, hata: 'Kısa ad boş bırakılamaz.' }
  if (!uzun_ad) return { ok: false, hata: 'Uzun ad boş bırakılamaz.' }
  return { ok: true }
}

export async function sendikaBilgileriTopluEkle(
  satirlar: { statu: string; kisa_ad: string; uzun_ad: string }[],
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  if (!satirlar.length) return { hata: 'En az bir satır ekleyin.' }

  const insertRows: { statu: string; kisa_ad: string; uzun_ad: string; aktif: boolean }[] = []
  for (const s of satirlar) {
    const statu = s.statu.trim()
    const kisa_ad = s.kisa_ad.trim()
    const uzun_ad = s.uzun_ad.trim()
    const v = validateSatir(statu, kisa_ad, uzun_ad)
    if (!v.ok) return { hata: v.hata }
    insertRows.push({ statu, kisa_ad, uzun_ad, aktif: true })
  }

  const supabase = await createClient()
  const { error } = await supabase.from('tanim_sendika').insert(insertRows)
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

export async function sendikaBilgileriGuncelle(
  id: number,
  formData: FormData,
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }

  const statu = String(formData.get('statu') ?? '').trim()
  const kisa_ad = String(formData.get('kisa_ad') ?? '').trim()
  const uzun_ad = String(formData.get('uzun_ad') ?? '').trim()
  const aktifRaw = String(formData.get('aktif') ?? 'true')
  const aktif = aktifRaw === 'true' || aktifRaw === 'on' || aktifRaw === '1'

  const v = validateSatir(statu, kisa_ad, uzun_ad)
  if (!v.ok) return { hata: v.hata }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tanim_sendika')
    .update({ statu, kisa_ad, uzun_ad, aktif, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}

export async function sendikaBilgileriToggleAktif(
  id: number,
  mevcutAktif: boolean,
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const supabase = await createClient()
  const { error } = await supabase
    .from('tanim_sendika')
    .update({ aktif: !mevcutAktif, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}
