import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PersonelHareketiDegistirClient from '@/components/personel/PersonelHareketiDegistirClient'
import { personelHareketiEkle } from '../../actions'
import type { Tables } from '@/types/database'

type KH = Tables<'kadro_hareketleri'>
type PH = Tables<'personel_hareketleri'>

export default async function PersonelHareketiDegistirPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id: sicil_no } = await params
  if (!sicil_no?.trim()) notFound()

  const supabase = await createClient()

  const results = await Promise.all([
    supabase.from('calisan').select('*').eq('sicil_no', sicil_no).maybeSingle(),
    supabase
      .from('kadro_hareketleri')
      .select('*')
      .or(`asil.eq.${sicil_no},vekil.eq.${sicil_no}`)
      .is('ayrilis_tarihi', null)
      .eq('statu', 'Memur'),
    supabase.from('tanim_mudurluk').select('mudurluk_adi').eq('aktif', true).order('mudurluk_adi'),
    supabase.from('tanim_unvan').select('id, unvan_adi, sinif_adi').eq('aktif', true).order('sira_no'),
    supabase.from('calisan_ogrenim').select('ogrenim_turu').eq('sicil_no', sicil_no).eq('aktif', true).limit(1),
  ])

  const personel = results[0]?.data ?? null
  const kadroRaw = results[1]?.data ?? null
  const mudurlukRaw = results[2]?.data ?? null
  const unvanRaw = results[3]?.data ?? null
  const ogrenimRaw = results[4]?.data ?? null

  if (!personel) notFound()

  const kadrolar = (kadroRaw ?? []) as KH[]
  const vekiller = kadrolar.filter(k => (k.vekil ?? '').trim() === sicil_no)
  const asiller = kadrolar.filter(k => (k.asil ?? '').trim() === sicil_no && (k.durumu ?? '') === 'Dolu')
  const kadroListesi = [...vekiller, ...asiller]
  if (kadroListesi.length === 0) kadroListesi.push(...kadrolar)

  const mudurlukler = (mudurlukRaw ?? []).map(m => m.mudurluk_adi).filter(Boolean)
  const unvanlar = (unvanRaw ?? []).map(u => ({ id: u.id, ad: u.unvan_adi, sinif: u.sinif_adi })).filter(u => u.ad)

  // Personel + kadro için son personel_hareketleri kaydı (ESKİ değerler için)
  const kadroSiraNolar = kadroListesi.map(k => (k.kadro_sira_no ?? '').trim()).filter(Boolean)
  let sonKayit: PH | null = null
  if (kadroSiraNolar.length > 0) {
    const { data: phRows } = await supabase
      .from('personel_hareketleri')
      .select('*')
      .eq('sicil_no', sicil_no)
      .in('kadro_sira_no', kadroSiraNolar)
      .order('kayit_zamani', { ascending: false })
      .limit(1)
    sonKayit = (phRows ?? [])[0] as PH | null
  }
  if (!sonKayit && kadroSiraNolar.length === 0 && kadroListesi.length > 0) {
    const { data: phRows } = await supabase
      .from('personel_hareketleri')
      .select('*')
      .eq('sicil_no', sicil_no)
      .order('kayit_zamani', { ascending: false })
      .limit(1)
    sonKayit = (phRows ?? [])[0] as PH | null
  }

  // Belediye Başkanı / Yardımcıları (onaylayan, teklif eden)
  const { data: baskanKadro } = await supabase
    .from('kadro_hareketleri')
    .select('asil')
    .ilike('kadro_unvani', '%Belediye Başkanı%')
    .is('ayrilis_tarihi', null)
    .limit(1)
    .maybeSingle()
  const { data: yardimciKadrolar } = await supabase
    .from('kadro_hareketleri')
    .select('asil')
    .ilike('kadro_unvani', '%Belediye Başkan Yardımcısı%')
    .is('ayrilis_tarihi', null)

  const baskanSicil = (baskanKadro as { asil?: string } | null)?.asil ?? ''
  const yardimciSiciller = [...new Set((yardimciKadrolar ?? []).map((y: { asil: string | null }) => (y.asil ?? '').trim()).filter(Boolean))]

  const { data: calisanAdlar } = await supabase
    .from('calisan')
    .select('sicil_no, ad_soyad')
    .in('sicil_no', [baskanSicil, ...yardimciSiciller].filter(Boolean))

  const adMap: Record<string, string> = {}
  ;(calisanAdlar ?? []).forEach((c: { sicil_no: string; ad_soyad: string | null }) => {
    adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no
  })

  const onaylayan = adMap[baskanSicil] ?? baskanSicil
  const yardimcilar = yardimciSiciller.map(sicil => ({ sicil, ad: adMap[sicil] ?? sicil }))

  const ogrenimDurumu = (ogrenimRaw ?? [])[0]?.ogrenim_turu ?? null

  return (
    <PersonelHareketiDegistirClient
      personel={personel}
      ogrenimDurumu={ogrenimDurumu}
      kadrolar={kadroListesi}
      sonKayit={sonKayit}
      mudurlukler={mudurlukler}
      unvanlar={unvanlar}
      onaylayan={onaylayan}
      yardimcilar={yardimcilar}
      onKaydet={personelHareketiEkle}
    />
  )
}
