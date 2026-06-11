'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { revalidatePersonelDetayPaths } from '@/lib/revalidate-personel'
import { revalidateFirmaCalisanPaths } from '@/lib/revalidate-firma-calisan'
import { gecerliYerleskeId, mudurlukYerleskeHaritasi, fetchMudurlukYerleskeTanimSatirlari } from '@/lib/yerleske-adresi'
import { writeFirmaAuditLogSafe, FIRMA_ALAN_ETIKETLERI } from '@/lib/firma-audit'
import { alanDegisiklikleriHesapla, degisiklikPayload } from '@/lib/personel-audit'

export type YerleskeKaynak = 'kadro' | 'firma'

export interface YerleskeGuncelleSatir {
  kaynak: YerleskeKaynak
  sicil_no?: string
  firma_id?: number
  yerleske_adresi_id: number | null
}

async function revalidateYerleskeGiris(kaynak: YerleskeKaynak, id: string) {
  if (kaynak === 'kadro') {
    await revalidatePersonelDetayPaths(id)
  } else {
    const firmaId = Number(id)
    if (Number.isInteger(firmaId) && firmaId > 0) {
      await revalidateFirmaCalisanPaths(firmaId)
    }
    revalidatePath('/firma-calisanlar')
  }
  revalidatePath('/personel')
  revalidatePath('/personel/yerleske-guncelle')
}

function parseYerleskeId(raw: unknown): number | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const n = Number(s)
  if (!Number.isInteger(n) || n <= 0) return null
  return n
}

async function kadroMudurlugu(supabase: Awaited<ReturnType<typeof createClient>>, sicil_no: string): Promise<string> {
  const D = new Date().toISOString().slice(0, 10)
  const { data: kadroRaw } = await supabase
    .from('kadro_hareketleri')
    .select('asil, gorev_mudurlugu, kadro_mudurlugu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
    .eq('asil', sicil_no)

  const { secilenKadroSatirAsil } = await import('@/lib/kadro-statu-sec')
  const sec = secilenKadroSatirAsil((kadroRaw ?? []) as Parameters<typeof secilenKadroSatirAsil>[0], D)
  return String(sec?.gorev_mudurlugu ?? sec?.kadro_mudurlugu ?? '').trim()
}

async function firmaMudurlugu(supabase: Awaited<ReturnType<typeof createClient>>, firmaId: number): Promise<string> {
  const { data } = await supabase
    .from('firma_calisanlar')
    .select('gorev_mudurlugu')
    .eq('id', firmaId)
    .maybeSingle()
  return String(data?.gorev_mudurlugu ?? '').trim()
}

export async function yerleskeGuncelleSatirKaydet(
  kaynak: YerleskeKaynak,
  id: string,
  fd: FormData,
): Promise<{ hata?: string }> {
  const yerleskeId = parseYerleskeId(fd.get('yerleske_adresi_id'))
  const supabase = await createClient()

  const tanimSatirlar = await fetchMudurlukYerleskeTanimSatirlari(supabase)
  const harita = mudurlukYerleskeHaritasi(tanimSatirlar)

  const mudurluk =
    kaynak === 'kadro'
      ? await kadroMudurlugu(supabase, id)
      : await firmaMudurlugu(supabase, Number(id))

  if (yerleskeId != null && !gecerliYerleskeId(harita, mudurluk, yerleskeId)) {
    return { hata: 'Seçilen yerleşke, personelin görev müdürlüğü ile eşleşmiyor.' }
  }

  if (kaynak === 'kadro') {
    const { error } = await supabase
      .from('calisan')
      .update({ yerleske_adresi_id: yerleskeId })
      .eq('sicil_no', id)
    if (error) return { hata: error.message }
  } else {
    const firmaId = Number(id)
    if (!Number.isInteger(firmaId) || firmaId <= 0) return { hata: 'Geçersiz ADABEL kaydı.' }
    const { data: onceki } = await supabase
      .from('firma_calisanlar')
      .select('yerleske_adresi_id')
      .eq('id', firmaId)
      .maybeSingle()
    const { error } = await supabase
      .from('firma_calisanlar')
      .update({ yerleske_adresi_id: yerleskeId })
      .eq('id', firmaId)
    if (error) return { hata: error.message }
    const eskiYerleske = onceki?.yerleske_adresi_id ?? null
    if (eskiYerleske !== yerleskeId) {
      const degisiklikler = alanDegisiklikleriHesapla(
        { yerleske_adresi_id: eskiYerleske },
        { yerleske_adresi_id: yerleskeId },
        FIRMA_ALAN_ETIKETLERI,
      )
      if (degisiklikler.length > 0) {
        const payload = degisiklikPayload(degisiklikler)
        await writeFirmaAuditLogSafe(supabase, {
          firmaId,
          islem: 'Yerleşke Güncelle',
          ozet: 'Yerleşke adresi güncellendi.',
          onceki: payload.onceki,
          sonraki: payload.sonraki,
        })
      }
    }
  }

  await revalidateYerleskeGiris(kaynak, id)
  return {}
}

export async function yerleskeGuncelleTopluKaydet(
  satirlar: YerleskeGuncelleSatir[],
): Promise<{ hata?: string; kaydedilen?: number }> {
  if (!satirlar.length) return { kaydedilen: 0 }

  const supabase = await createClient()
  const tanimSatirlar = await fetchMudurlukYerleskeTanimSatirlari(supabase)
  const harita = mudurlukYerleskeHaritasi(tanimSatirlar)
  const D = new Date().toISOString().slice(0, 10)
  const { secilenKadroSatirAsil } = await import('@/lib/kadro-statu-sec')

  const kadroSiciller = [...new Set(satirlar.filter(s => s.kaynak === 'kadro').map(s => s.sicil_no!).filter(Boolean))]
  const kadroByAsil = new Map<string, Parameters<typeof secilenKadroSatirAsil>[0]>()
  for (let i = 0; i < kadroSiciller.length; i += 120) {
    const part = kadroSiciller.slice(i, i + 120)
    const { data: kRows, error: kErr } = await supabase
      .from('kadro_hareketleri')
      .select('asil, gorev_mudurlugu, kadro_mudurlugu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
      .in('asil', part)
    if (kErr) return { hata: kErr.message }
    for (const r of kRows ?? []) {
      if (!r.asil) continue
      const list = kadroByAsil.get(r.asil) ?? []
      list.push(r as Parameters<typeof secilenKadroSatirAsil>[0][number])
      kadroByAsil.set(r.asil, list)
    }
  }

  const firmaIds = [...new Set(satirlar.filter(s => s.kaynak === 'firma').map(s => s.firma_id!).filter(Boolean))]
  const firmaMudById = new Map<number, string>()
  const firmaYerleskeById = new Map<number, number | null>()
  for (let i = 0; i < firmaIds.length; i += 120) {
    const part = firmaIds.slice(i, i + 120)
    const { data: fRows, error: fErr } = await supabase
      .from('firma_calisanlar')
      .select('id, gorev_mudurlugu, yerleske_adresi_id')
      .in('id', part)
    if (fErr) return { hata: fErr.message }
    for (const r of fRows ?? []) {
      firmaMudById.set(r.id, String(r.gorev_mudurlugu ?? '').trim())
      firmaYerleskeById.set(r.id, r.yerleske_adresi_id ?? null)
    }
  }

  let kaydedilen = 0
  for (const s of satirlar) {
    let mudurluk = ''
    if (s.kaynak === 'kadro') {
      const sicil = String(s.sicil_no ?? '').trim()
      if (!sicil) return { hata: 'Eksik sicil numarası.' }
      const sec = secilenKadroSatirAsil(kadroByAsil.get(sicil) ?? [], D)
      mudurluk = String(sec?.gorev_mudurlugu ?? sec?.kadro_mudurlugu ?? '').trim()
    } else {
      const fid = s.firma_id
      if (fid == null) return { hata: 'Eksik ADABEL kayıt kimliği.' }
      mudurluk = firmaMudById.get(fid) ?? ''
    }

    if (s.yerleske_adresi_id != null && !gecerliYerleskeId(harita, mudurluk, s.yerleske_adresi_id)) {
      const etiket = s.kaynak === 'kadro' ? s.sicil_no : `ADABEL #${s.firma_id}`
      return { hata: `${etiket}: yerleşke seçimi görev müdürlüğü ile uyumsuz.` }
    }

    if (s.kaynak === 'kadro') {
      const { error } = await supabase
        .from('calisan')
        .update({ yerleske_adresi_id: s.yerleske_adresi_id })
        .eq('sicil_no', s.sicil_no!)
      if (error) return { hata: error.message }
      await revalidateYerleskeGiris('kadro', s.sicil_no!)
    } else {
      const firmaId = s.firma_id!
      const eskiYerleske = firmaYerleskeById.get(firmaId) ?? null
      const { error } = await supabase
        .from('firma_calisanlar')
        .update({ yerleske_adresi_id: s.yerleske_adresi_id })
        .eq('id', firmaId)
      if (error) return { hata: error.message }
      if (eskiYerleske !== s.yerleske_adresi_id) {
        const degisiklikler = alanDegisiklikleriHesapla(
          { yerleske_adresi_id: eskiYerleske },
          { yerleske_adresi_id: s.yerleske_adresi_id },
          FIRMA_ALAN_ETIKETLERI,
        )
        if (degisiklikler.length > 0) {
          const payload = degisiklikPayload(degisiklikler)
          await writeFirmaAuditLogSafe(supabase, {
            firmaId,
            islem: 'Yerleşke Güncelle',
            ozet: 'Yerleşke adresi güncellendi (toplu).',
            onceki: payload.onceki,
            sonraki: payload.sonraki,
          })
        }
        firmaYerleskeById.set(firmaId, s.yerleske_adresi_id)
      }
      await revalidateYerleskeGiris('firma', String(firmaId))
    }
    kaydedilen++
  }

  return { kaydedilen }
}
