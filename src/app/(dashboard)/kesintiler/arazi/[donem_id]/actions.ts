'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const MAX_GUN = 20

export async function araziKayitToggle(
  donem_id: number,
  sicil_no: string,
  tarih: string,
  mevcutIsaret: boolean,
  mevcutSayisi: number
): Promise<{ hata?: string; yeniIsaret: boolean }> {
  if (!mevcutIsaret && mevcutSayisi >= MAX_GUN) {
    return { hata: 'Arazi dönemi içerisinde en fazla 20 gün seçilebilir.', yeniIsaret: false }
  }

  const supabase = await createClient()

  if (mevcutIsaret) {
    const { error } = await supabase
      .from('arazi_kayit')
      .delete()
      .eq('donem_id', donem_id)
      .eq('sicil_no', sicil_no)
      .eq('tarih', tarih)
    if (error) return { hata: error.message, yeniIsaret: true }
  } else {
    const { error } = await supabase
      .from('arazi_kayit')
      .insert({ donem_id, sicil_no, tarih })
    if (error) return { hata: error.message, yeniIsaret: false }
  }

  revalidatePath(`/kesintiler/arazi/${donem_id}`)
  return { yeniIsaret: !mevcutIsaret }
}

/** Toplu arazi kayıt güncellemesi (yevmiye gibi Günleri İşaretle + Kaydet akışı) */
export async function araziKayitTopluKaydet(
  donem_id: number,
  sicilNolar: string[],
  isaretler: { sicil_no: string; tarih: string }[]
): Promise<{ hata?: string }> {
  const sicilGunSayisi: Record<string, number> = {}
  for (const i of isaretler) {
    sicilGunSayisi[i.sicil_no] = (sicilGunSayisi[i.sicil_no] ?? 0) + 1
  }
  for (const [sicil, say] of Object.entries(sicilGunSayisi)) {
    if (say > MAX_GUN) return { hata: `${sicil} için en fazla ${MAX_GUN} gün seçilebilir.` }
  }

  const supabase = await createClient()
  const sicilSet = new Set(sicilNolar)

  const mevcut: { sicil_no: string; tarih: string }[] = []
  const { data: kayitRaw } = await supabase
    .from('arazi_kayit')
    .select('sicil_no, tarih')
    .eq('donem_id', donem_id)

  ;(kayitRaw ?? []).forEach(k => {
    if (k.sicil_no && k.tarih && sicilSet.has(k.sicil_no)) mevcut.push({ sicil_no: k.sicil_no, tarih: k.tarih })
  })

  const hedefSet = new Set(isaretler.map(i => `${i.sicil_no}:${i.tarih}`))
  const mevcutSet = new Set(mevcut.map(m => `${m.sicil_no}:${m.tarih}`))

  const toAdd = isaretler.filter(i => !mevcutSet.has(`${i.sicil_no}:${i.tarih}`))
  const toRemove = mevcut.filter(m => !hedefSet.has(`${m.sicil_no}:${m.tarih}`))

  for (const r of toRemove) {
    const { error } = await supabase
      .from('arazi_kayit')
      .delete()
      .eq('donem_id', donem_id)
      .eq('sicil_no', r.sicil_no)
      .eq('tarih', r.tarih)
    if (error) return { hata: error.message }
  }

  for (const a of toAdd) {
    const { error } = await supabase
      .from('arazi_kayit')
      .insert({ donem_id, sicil_no: a.sicil_no, tarih: a.tarih })
    if (error) return { hata: error.message }
  }

  revalidatePath(`/kesintiler/arazi/${donem_id}`)
  return {}
}
