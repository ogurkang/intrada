import { fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import { createClient } from '@/lib/supabase/server'
import SendikaBilgilerineGorePersonelListeClient, {
  type SendikaPersonelListeTabVerisi,
} from '@/components/rapor/SendikaBilgilerineGorePersonelListeClient'
import { fetchPersonelSendikaAtDate } from '@/lib/personel-sendika-load'
import {
  parseSendikaIdsParam,
  parseStatuParam,
  sendikaBilgilerineGorePersonelListe,
} from '@/lib/rapor-sendika-bilgileri'
import { periyotSonGunu, type KadroRaporRow, type RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'
import { sortTanimSendika } from '@/lib/sendika-sira'
import type { Tables } from '@/types/database'

const AYLAR_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const MIN_YIL = 2000
const MAX_YIL = 2035

function sonGunuMetin(D: string): string {
  const [y, m, d] = D.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function SendikaBilgilerineGorePersonelListePage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; s?: string; st?: string }>
}) {
  const sp = await searchParams
  const parsed = parseInt(sp.y ?? '', 10)
  const yil = Number.isFinite(parsed) ? Math.min(MAX_YIL, Math.max(MIN_YIL, parsed)) : new Date().getFullYear()
  const initialSendikaIds = parseSendikaIdsParam(sp.s)
  const initialStatuIds = parseStatuParam(sp.st)

  const supabase = await createClient()
  const [{ data: kadroRaw }, { data: calisanRaw }, { data: mudurlukRaw }, { data: sendikaRaw }] = await Promise.all([
    fetchAllKadroHareketleri(supabase, 'asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, kadro_mudurlugu, gorev_mudurlugu', q => q.not('asil', 'is', null)),
    supabase.from('calisan').select('sicil_no, ad_soyad, telefon'),
    supabase.from('tanim_mudurluk').select('id, mudurluk_adi'),
    supabase.from('tanim_sendika').select('*').eq('aktif', true),
  ])

  const kadroByAsil = new Map<string, KadroRaporRow[]>()
  for (const k of (kadroRaw ?? []) as KadroRaporRow[]) {
    if (!k.asil) continue
    const list = kadroByAsil.get(k.asil) ?? []
    list.push(k)
    kadroByAsil.set(k.asil, list)
  }
  const mudurlukById = new Map((mudurlukRaw ?? []).map(m => [m.id, m.mudurluk_adi] as const))
  const calisanlar = (calisanRaw ?? []).map(c => ({
    sicil_no: c.sicil_no,
    ad_soyad: c.ad_soyad ?? c.sicil_no,
    telefon: c.telefon,
  }))
  const tumSendikalar = sortTanimSendika((sendikaRaw ?? []) as Tables<'tanim_sendika'>[]).map(s => ({
    id: s.id,
    kisa_ad: s.kisa_ad,
    statu: s.statu,
  }))

  const periyotlar: RaporPeriyot[] = ['yillik', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const tabs: SendikaPersonelListeTabVerisi[] = []
  for (const p of periyotlar) {
    const D = periyotSonGunu(yil, p)
    const sendikaBySicil = await fetchPersonelSendikaAtDate(supabase, D)
    const satirlar = sendikaBilgilerineGorePersonelListe(D, calisanlar, kadroByAsil, sendikaBySicil, mudurlukById)
    tabs.push({
      periyot: p,
      label: p === 'yillik' ? 'YILLIK' : AYLAR_TR[(p as number) - 1],
      sonGunuEtiket: sonGunuMetin(D),
      satirlar,
    })
  }

  const tumStatuler = [...new Set(tabs.flatMap(t => t.satirlar.map(r => r.statu)).filter(s => s && s !== '—'))].sort((a, b) =>
    a.localeCompare(b, 'tr'),
  )

  return (
    <SendikaBilgilerineGorePersonelListeClient
      yil={yil}
      minYil={MIN_YIL}
      maxYil={MAX_YIL}
      tabs={tabs}
      tumSendikalar={tumSendikalar}
      tumStatuler={tumStatuler}
      initialSendikaIds={initialSendikaIds}
      initialStatuIds={initialStatuIds}
    />
  )
}
