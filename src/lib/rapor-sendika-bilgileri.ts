import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchPersonelSendikaAtDate } from '@/lib/personel-sendika-load'
import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'
import type { KadroRaporRow, RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'
import { sortTanimSendika } from '@/lib/sendika-sira'
import type { Tables } from '@/types/database'

export type SendikaPersonelListeSatir = {
  sicil_no: string
  ad_soyad: string
  mudurluk: string
  statu: string
  sendika_id: number
  kisa_ad: string
  uzun_ad: string
}

export function sendikaBilgilerineGorePersonelListe(
  D: string,
  calisanlar: { sicil_no: string; ad_soyad: string }[],
  kadroByAsil: Map<string, KadroRaporRow[]>,
  sendikaBySicil: Map<string, { sendika_id: number; tanim_sendika: { kisa_ad: string; uzun_ad: string } | null }>,
  mudurlukById: Map<number, string>,
): SendikaPersonelListeSatir[] {
  const out: SendikaPersonelListeSatir[] = []
  for (const c of calisanlar) {
    const kadro = secilenKadroSatirAsil(kadroByAsil.get(c.sicil_no) ?? [], D)
    if (!kadro) continue
    const uyelik = sendikaBySicil.get(c.sicil_no)
    if (!uyelik?.tanim_sendika) continue
    const mudId = kadro.gorev_mudurlugu ?? kadro.kadro_mudurlugu
    const mudurluk = mudId != null ? mudurlukById.get(Number(mudId)) ?? '—' : '—'
    out.push({
      sicil_no: c.sicil_no,
      ad_soyad: c.ad_soyad,
      mudurluk,
      statu: kadro.statu ?? '—',
      sendika_id: uyelik.sendika_id,
      kisa_ad: uyelik.tanim_sendika.kisa_ad,
      uzun_ad: uyelik.tanim_sendika.uzun_ad,
    })
  }
  out.sort((a, b) => {
    const ka = a.kisa_ad.localeCompare(b.kisa_ad, 'tr')
    if (ka !== 0) return ka
    return a.ad_soyad.localeCompare(b.ad_soyad, 'tr')
  })
  return out
}

export type SendikaPersonelSayiSatir = {
  sendika_id: number
  statu: string
  kisa_ad: string
  uzun_ad: string
  sayi: number
}

export function sendikaBilgilerineGorePersonelSayi(
  liste: SendikaPersonelListeSatir[],
  tumSendikalar: Tables<'tanim_sendika'>[],
): SendikaPersonelSayiSatir[] {
  const sayim = new Map<number, number>()
  for (const r of liste) {
    sayim.set(r.sendika_id, (sayim.get(r.sendika_id) ?? 0) + 1)
  }
  const aktifIds = new Set(liste.map(r => r.sendika_id))
  const rows: SendikaPersonelSayiSatir[] = sortTanimSendika(tumSendikalar.filter(s => s.aktif || aktifIds.has(s.id))).map(
    s => ({
      sendika_id: s.id,
      statu: s.statu,
      kisa_ad: s.kisa_ad,
      uzun_ad: s.uzun_ad,
      sayi: sayim.get(s.id) ?? 0,
    }),
  )
  rows.sort((a, b) => {
    if (b.sayi !== a.sayi) return b.sayi - a.sayi
    return a.kisa_ad.localeCompare(b.kisa_ad, 'tr')
  })
  return rows
}

export async function yukleSendikaRaporVerisi(
  supabase: SupabaseClient,
  D: string,
): Promise<{
  sendikaBySicil: Awaited<ReturnType<typeof fetchPersonelSendikaAtDate>>
  tumSendikalar: Tables<'tanim_sendika'>[]
}> {
  const [{ data: sendikaRaw }, sendikaBySicil] = await Promise.all([
    supabase.from('tanim_sendika').select('*').order('id'),
    fetchPersonelSendikaAtDate(supabase, D),
  ])
  return {
    sendikaBySicil,
    tumSendikalar: (sendikaRaw ?? []) as Tables<'tanim_sendika'>[],
  }
}

export function parseSendikaIdsParam(raw: string | undefined): number[] {
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => Number.isFinite(n) && n > 0)
}

export type { RaporPeriyot }
