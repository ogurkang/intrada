import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SendikaYeniClient from '@/components/bildirim/SendikaYeniClient'
import { filterOutGodmodeCalisan } from '@/lib/godmode-calisan'
import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'
import { sortTanimSendika } from '@/lib/sendika-sira'
import type { KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import type { Tables } from '@/types/database'

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export default async function SendikaYeniPage() {
  const supabase = await createClient()
  const D = new Date().toISOString().slice(0, 10)

  const [{ data: calisanRaw }, { data: phRaw }, { data: sendikaRaw }] = await Promise.all([
    supabase.from('calisan').select('sicil_no, ad_soyad').order('ad_soyad'),
    supabase.from('personel_hareketleri').select('sicil_no, ayrilis_tarihi').order('yururluk_tarihi', { ascending: false }),
    supabase.from('tanim_sendika').select('id, statu, kisa_ad, uzun_ad, aktif').eq('aktif', true),
  ])

  const sonAyrilisPerSicil = new Map<string, string | null>()
  for (const r of phRaw ?? []) {
    if (!sonAyrilisPerSicil.has(r.sicil_no)) sonAyrilisPerSicil.set(r.sicil_no, r.ayrilis_tarihi)
  }

  const calisanFiltreli = filterOutGodmodeCalisan(calisanRaw ?? [])
  const aktifSiciller = new Set<string>()
  calisanFiltreli.forEach(c => {
    if (!sonAyrilisPerSicil.get(c.sicil_no)) aktifSiciller.add(c.sicil_no)
  })

  const kadroByAsil = new Map<string, KadroRaporRow[]>()
  for (const part of chunk([...aktifSiciller], 120)) {
    if (!part.length) continue
    const { data: kRows } = await supabase
      .from('kadro_hareketleri')
      .select('asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
      .in('asil', part)
    for (const r of kRows ?? []) {
      if (!r.asil) continue
      const list = kadroByAsil.get(r.asil) ?? []
      list.push(r as KadroRaporRow)
      kadroByAsil.set(r.asil, list)
    }
  }

  const personeller = calisanFiltreli
    .filter(c => aktifSiciller.has(c.sicil_no))
    .filter(c => Boolean(secilenKadroSatirAsil(kadroByAsil.get(c.sicil_no) ?? [], D)))
    .map(c => {
      const kadro = secilenKadroSatirAsil(kadroByAsil.get(c.sicil_no) ?? [], D)
      return {
        sicil_no: c.sicil_no,
        ad_soyad: c.ad_soyad ?? c.sicil_no,
        statu: kadro?.statu ?? null,
      }
    })
    .sort((a, b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr'))

  const sendikalar = sortTanimSendika((sendikaRaw ?? []) as Tables<'tanim_sendika'>[])

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Yeni Sendika Kaydı</h1>
        <Link
          href="/bildirim/sendika"
          className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50"
        >
          ← Listeye dön
        </Link>
      </div>
      <SendikaYeniClient personeller={personeller} sendikalar={sendikalar} />
    </div>
  )
}
