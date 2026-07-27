'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  isgSaglikKayitAuditRefId,
  isgSaglikKayitAuditSnapshot,
  writeIsgSaglikKayitAuditLogSafe,
  type IsgSaglikKayitTur,
} from '@/lib/isg-saglik-taramasi-kayit-audit'

type KayitSatir = {
  sicil_no: string
  tarama: boolean
  muayene: boolean
}

type MevcutKayit = {
  sicil_no: string
  tarama: boolean
  muayene: boolean
  mudurluk: string | null
}

export async function isgSaglikTaramasiKayitKaydet(
  donemId: number,
  kayitlar: KayitSatir[],
  mudurlukMap: Record<string, string>,
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: mevcutRaw, error: mevcutErr } = await sb
    .from('isg_saglik_taramasi_kayit')
    .select('sicil_no, tarama, muayene, mudurluk')
    .eq('donem_id', donemId)
  if (mevcutErr) return { hata: mevcutErr.message }

  const mevcutMap = new Map<string, MevcutKayit>(
    (mevcutRaw ?? []).map((r: MevcutKayit) => [r.sicil_no, r]),
  )

  const yeniMap = new Map(kayitlar.map(k => [k.sicil_no, k]))

  for (const [sicil, kayit] of yeniMap) {
    const prev = mevcutMap.get(sicil)
    const mud = mudurlukMap[sicil] ?? null
    const hasAny = kayit.tarama || kayit.muayene

    if (!hasAny) {
      if (prev) {
        await sb.from('isg_saglik_taramasi_kayit').delete().eq('donem_id', donemId).eq('sicil_no', sicil)
        for (const tur of ['tarama', 'muayene'] as IsgSaglikKayitTur[]) {
          if (prev[tur]) {
            await writeIsgSaglikKayitAuditLogSafe(supabase, {
              sicil_no: sicil,
              donem_id: donemId,
              tur,
              islem: `${tur === 'tarama' ? 'Tarama' : 'Muayene'} Kaldır`,
              ozet: `${tur === 'tarama' ? 'Tarama' : 'Muayene'} işareti kaldırıldı`,
              mudurluk: prev.mudurluk,
              onceki: isgSaglikKayitAuditSnapshot({
                isaretlendi: true,
                mudurluk: prev.mudurluk,
                donem_id: donemId,
                tur,
              }),
              sonraki: null,
            })
          }
        }
      }
      continue
    }

    if (!prev) {
      await sb.from('isg_saglik_taramasi_kayit').insert({
        donem_id: donemId,
        sicil_no: sicil,
        tarama: kayit.tarama,
        muayene: kayit.muayene,
        mudurluk: mud,
      })
    } else {
      await sb
        .from('isg_saglik_taramasi_kayit')
        .update({
          tarama: kayit.tarama,
          muayene: kayit.muayene,
          mudurluk: mud,
        })
        .eq('donem_id', donemId)
        .eq('sicil_no', sicil)
    }

    for (const tur of ['tarama', 'muayene'] as IsgSaglikKayitTur[]) {
      const oncekiVal = Boolean(prev?.[tur])
      const yeniVal = Boolean(kayit[tur])
      if (oncekiVal === yeniVal) continue
      if (yeniVal) {
        await writeIsgSaglikKayitAuditLogSafe(supabase, {
          sicil_no: sicil,
          donem_id: donemId,
          tur,
          islem: `${tur === 'tarama' ? 'Tarama' : 'Muayene'} Ekle`,
          ozet: `${tur === 'tarama' ? 'Tarama' : 'Muayene'} işaretlendi`,
          mudurluk: mud,
          onceki: null,
          sonraki: isgSaglikKayitAuditSnapshot({
            isaretlendi: true,
            mudurluk: mud,
            donem_id: donemId,
            tur,
          }),
        })
      } else {
        await writeIsgSaglikKayitAuditLogSafe(supabase, {
          sicil_no: sicil,
          donem_id: donemId,
          tur,
          islem: `${tur === 'tarama' ? 'Tarama' : 'Muayene'} Kaldır`,
          ozet: `${tur === 'tarama' ? 'Tarama' : 'Muayene'} işareti kaldırıldı`,
          mudurluk: prev?.mudurluk ?? mud,
          onceki: isgSaglikKayitAuditSnapshot({
            isaretlendi: true,
            mudurluk: prev?.mudurluk ?? mud,
            donem_id: donemId,
            tur,
          }),
          sonraki: null,
        })
      }
    }
  }

  for (const [sicil, prev] of mevcutMap) {
    if (yeniMap.has(sicil)) continue
    await sb.from('isg_saglik_taramasi_kayit').delete().eq('donem_id', donemId).eq('sicil_no', sicil)
    for (const tur of ['tarama', 'muayene'] as IsgSaglikKayitTur[]) {
      if (prev[tur]) {
        await writeIsgSaglikKayitAuditLogSafe(supabase, {
          sicil_no: sicil,
          donem_id: donemId,
          tur,
          islem: `${tur === 'tarama' ? 'Tarama' : 'Muayene'} Kaldır`,
          ozet: `${tur === 'tarama' ? 'Tarama' : 'Muayene'} işareti kaldırıldı`,
          mudurluk: prev.mudurluk,
          onceki: isgSaglikKayitAuditSnapshot({
            isaretlendi: true,
            mudurluk: prev.mudurluk,
            donem_id: donemId,
            tur,
          }),
          sonraki: null,
        })
      }
    }
  }

  revalidatePath(`/isg/islemler/saglik-taramasi/${donemId}`)
  revalidatePath('/isg/islemler/saglik-taramasi')
  return {}
}

export { isgSaglikKayitAuditRefId }
