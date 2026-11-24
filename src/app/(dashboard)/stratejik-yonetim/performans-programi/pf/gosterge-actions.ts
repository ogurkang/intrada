'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ppOturum } from '@/lib/pp-erisim'
import { ppSatirLogYaz } from '@/lib/pp-satir-log'
import { PP_BIRIMLER } from '@/lib/pp-iliski'
import type { PpOdenekKalem } from './odenek-actions'

function dolu(k: PpOdenekKalem) {
  return [k.t1Butce, k.t1Haziran, k.t1YilSonu, k.tButce, k.t1Tahmin, k.t2Tahmin].some(n => n != null)
}

async function sonrakiGostergeSira(sb: { from: (t: string) => any }, faaliyetId: number): Promise<number> {
  const { data } = await sb
    .from('performans_programi_pf_gosterge')
    .select('sira_no')
    .eq('faaliyet_id', faaliyetId)
  const nolar = ((data ?? []) as { sira_no: number | null }[])
    .map(r => Number(r.sira_no))
    .filter(Number.isFinite)
  return (nolar.length ? Math.max(...nolar) : 0) + 1
}

export type PpGostergeFormGirdi = {
  id?: number
  faaliyetId: number
  ad: string
  birim: string
  aciklama: string
  hesaplama: string
  t2: number | null
  t1plan: number | null
  t1son: number | null
  thedef: number | null
  t1tahmin: number | null
  t2tahmin: number | null
  odenekler: PpOdenekKalem[]
}

export async function ppPfGostergeFormKaydet(
  girdi: PpGostergeFormGirdi,
): Promise<{ hata?: string; id?: number }> {
  const ad = girdi.ad.trim()
  if (!Number.isFinite(girdi.faaliyetId) || girdi.faaliyetId <= 0) return { hata: 'Faaliyet bulunamadı.' }
  if (!ad) return { hata: 'Gösterge adı girin.' }
  if (!PP_BIRIMLER.includes(girdi.birim as (typeof PP_BIRIMLER)[number])) {
    return { hata: 'Ölçü birimi seçin.' }
  }

  const supabase = await createClient()
  if (!(await ppOturum(supabase))) return { hata: 'Oturum gerekli.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: faaliyet } = await sb
    .from('performans_programi_pf_faaliyet')
    .select('id, bag_id')
    .eq('id', girdi.faaliyetId)
    .maybeSingle()
  if (!faaliyet) return { hata: 'Faaliyet bulunamadı.' }
  const bagId = Number(faaliyet.bag_id)

  let gostergeId = girdi.id
  const payload = {
    gosterge_adi: ad,
    birim: girdi.birim,
    aciklama: girdi.aciklama.trim(),
    hesaplama_yontemi: girdi.hesaplama.trim(),
    t2_gerceklesme: girdi.t2,
    t1_planlanan: girdi.t1plan,
    t1_yil_sonu: girdi.t1son,
    t_hedef: girdi.thedef,
    t1_tahmin: girdi.t1tahmin,
    t2_tahmin: girdi.t2tahmin,
  }

  if (gostergeId) {
    const { error } = await sb
      .from('performans_programi_pf_gosterge')
      .update(payload)
      .eq('id', gostergeId)
      .eq('faaliyet_id', girdi.faaliyetId)
    if (error) return { hata: error.message }
    await ppSatirLogYaz(supabase, { tablo: 'performans_gosterge', kayitId: gostergeId, islem: 'Güncelleme', ozet: ad })
  } else {
    const sira = await sonrakiGostergeSira(sb, girdi.faaliyetId)
    const { data: row, error } = await sb
      .from('performans_programi_pf_gosterge')
      .insert({ faaliyet_id: girdi.faaliyetId, sira_no: sira, ...payload })
      .select('id')
      .single()
    if (error) return { hata: error.message }
    gostergeId = Number(row.id)
    await ppSatirLogYaz(supabase, { tablo: 'performans_gosterge', kayitId: gostergeId, islem: 'Ekleme', ozet: ad })
  }

  const odenekSonuc = await ppPfGostergeOdenekKaydet(gostergeId!, girdi.odenekler)
  if (odenekSonuc.hata) return { hata: odenekSonuc.hata, id: gostergeId }

  revalidatePath(`/stratejik-yonetim/performans-programi/hedef/${bagId}`)
  revalidatePath(`/stratejik-yonetim/performans-programi/pf/${girdi.faaliyetId}`)
  revalidatePath(`/stratejik-yonetim/performans-programi/pf/${girdi.faaliyetId}/gostergeler`)
  return { id: gostergeId }
}

export async function ppPfGostergeOdenekKaydet(
  pfGostergeId: number,
  kalemler: PpOdenekKalem[],
): Promise<{ hata?: string }> {
  if (!Number.isFinite(pfGostergeId)) return { hata: 'Gösterge bulunamadı.' }
  const supabase = await createClient()
  if (!(await ppOturum(supabase))) return { hata: 'Oturum gerekli.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const silinecek = kalemler.filter(k => !dolu(k)).map(k => k.butce_kodu_id)
  const yazilacak = kalemler.filter(dolu)
  if (silinecek.length) {
    const { error } = await sb
      .from('performans_programi_pf_odenek')
      .delete()
      .eq('pf_gosterge_id', pfGostergeId)
      .in('butce_kodu_id', silinecek)
    if (error) {
      return {
        hata: error.message.includes('pf_gosterge_id')
          ? 'Ödenek gösterge bağını için 20261124180000_pp_odenek_gosterge.sql dosyasını çalıştırın.'
          : error.message,
      }
    }
  }
  if (yazilacak.length) {
    const { error } = await sb.from('performans_programi_pf_odenek').upsert(
      yazilacak.map(k => ({
        pf_gosterge_id: pfGostergeId,
        butce_kodu_id: k.butce_kodu_id,
        t1_butce: k.t1Butce,
        t1_haziran: k.t1Haziran,
        t1_yil_sonu: k.t1YilSonu,
        t_butce: k.tButce,
        t1_tahmin: k.t1Tahmin,
        t2_tahmin: k.t2Tahmin,
      })),
      { onConflict: 'pf_gosterge_id,butce_kodu_id' },
    )
    if (error) {
      return {
        hata: error.message.includes('pf_gosterge_id') || error.message.includes('onConflict')
          ? 'Ödenek gösterge bağını için 20261124180000_pp_odenek_gosterge.sql dosyasını çalıştırın.'
          : error.message,
      }
    }
  }
  await ppSatirLogYaz(supabase, {
    tablo: 'performans_gosterge',
    kayitId: pfGostergeId,
    islem: 'Ödenek',
    ozet: `${yazilacak.length} kod kaydedildi`,
  })
  return {}
}

export async function ppPfGostergeSil(
  gostergeId: number,
  faaliyetId: number,
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  if (!(await ppOturum(supabase))) return { hata: 'Oturum gerekli.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { count, error: sayHata } = await sb
    .from('performans_programi_pf_odenek')
    .select('id', { count: 'exact', head: true })
    .eq('pf_gosterge_id', gostergeId)
  if (sayHata && !String(sayHata.message).includes('pf_gosterge_id') && !String(sayHata.message).includes('pf_odenek')) {
    return { hata: sayHata.message }
  }
  if ((count ?? 0) > 0) return { hata: 'Silmek istediğiniz başlığa bağlı ödenek teklifi bulunmaktadır.' }

  const { data: faaliyet } = await sb
    .from('performans_programi_pf_faaliyet')
    .select('bag_id')
    .eq('id', faaliyetId)
    .maybeSingle()

  const { error } = await sb
    .from('performans_programi_pf_gosterge')
    .delete()
    .eq('id', gostergeId)
    .eq('faaliyet_id', faaliyetId)
  if (error) return { hata: error.message }

  await ppSatirLogYaz(supabase, {
    tablo: 'performans_gosterge',
    kayitId: gostergeId,
    islem: 'Silme',
    ozet: `Gösterge #${gostergeId}`,
  })
  if (faaliyet?.bag_id) revalidatePath(`/stratejik-yonetim/performans-programi/hedef/${faaliyet.bag_id}`)
  revalidatePath(`/stratejik-yonetim/performans-programi/pf/${faaliyetId}/gostergeler`)
  return {}
}
