import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PersonelHareketiDegistirClient from '@/components/personel/PersonelHareketiDegistirClient'
import { personelHareketiEkle } from '../../actions'
import type { Tables } from '@/types/database'
import { yukleGidisAyrilisNedenleri } from '@/lib/hareket-tanim-gidis'

type KH = Tables<'kadro_hareketleri'>
type TH = Tables<'terfi_hareketleri'>
type BosKadroSecenek = Pick<KH, 'id' | 'kadro_sira_no' | 'kadro_derecesi' | 'kadro_unvani' | 'gorev_unvani' | 'kadro_mudurlugu' | 'gorev_mudurlugu' | 'statu' | 'durumu'>

export default async function PersonelHareketiDegistirPage({
  params,
  searchParams,
}: { params: Promise<{ id: string }>; searchParams?: Promise<{ kadro_id?: string; rol?: string; popup?: string }> }) {
  const { id: sicil_no } = await params
  if (!sicil_no?.trim()) notFound()
  const sp = await searchParams?.catch(() => ({} as { kadro_id?: string; rol?: string; popup?: string }))
  const seciliKadroId = Number.parseInt(String(sp?.kadro_id ?? ''), 10)
  const seciliRol = String(sp?.rol ?? '').trim().toLowerCase()
  const popup = String(sp?.popup ?? '').trim() === '1'

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
    supabase
      .from('calisan_ogrenim')
      .select('ogrenim_turu, okul_adi, varsayilan, kayit_zamani')
      .eq('sicil_no', sicil_no)
      .eq('aktif', true)
      .order('varsayilan', { ascending: false })
      .order('kayit_zamani', { ascending: false })
      .limit(1),
    supabase.from('terfi_hareketleri').select('*').eq('sicil_no', sicil_no).order('kayit_zamani', { ascending: false }).limit(1),
    supabase
      .from('personel_hareketleri')
      .select('ayrilis_tarihi, ayrilis_nedeni')
      .eq('sicil_no', sicil_no)
      .order('kayit_zamani', { ascending: false })
      .limit(1),
    supabase
      .from('kadro_hareketleri')
      .select('id, kadro_sira_no, kadro_derecesi, kadro_unvani, gorev_unvani, kadro_mudurlugu, gorev_mudurlugu, statu, durumu')
      .eq('durumu', 'Boş')
      .is('iptal_karar_tarihi', null)
      .is('iptal_karar_no', null)
      .is('ayrilis_tarihi', null)
      .order('kadro_sira_no', { ascending: true }),
    supabase.from('tanim_gosterge').select('derece, kademe, gosterge').eq('aktif', true),
  ])

  const personel = results[0]?.data ?? null
  const kadroRaw = results[1]?.data ?? null
  const mudurlukRaw = results[2]?.data ?? null
  const unvanRaw = results[3]?.data ?? null
  const ogrenimRaw = results[4]?.data ?? null
  const terfiSon = ((results[5]?.data ?? [])[0] ?? null) as TH | null
  const sonHareketRaw = ((results[6]?.data ?? [])[0] ?? null) as { ayrilis_tarihi: string | null; ayrilis_nedeni: string | null } | null
  const tumBosKadrolar = (results[7]?.data ?? []) as BosKadroSecenek[]
  const gostergeler = (results[8]?.data ?? []) as { derece: number; kademe: number; gosterge: number }[]

  if (!personel) notFound()

  const kadrolar = (kadroRaw ?? []) as KH[]
  const vekiller = kadrolar.filter(k => (k.vekil ?? '').trim() === sicil_no)
  // Liste ekranında asıl satırı "durumu"na bakmadan gösteriyoruz; burada da aynı kuralı kullanmalıyız.
  const asiller = kadrolar.filter(k => (k.asil ?? '').trim() === sicil_no)
  const kadroListesi = [...vekiller, ...asiller]
  if (kadroListesi.length === 0) kadroListesi.push(...kadrolar)
  const seciliKadro =
    (Number.isFinite(seciliKadroId) && seciliKadroId > 0
      ? kadroListesi.find(k => {
          if (k.id !== seciliKadroId) return false
          if (seciliRol === 'vekil') return (k.vekil ?? '').trim() === sicil_no
          if (seciliRol === 'asil') return (k.asil ?? '').trim() === sicil_no
          return true
        })
      : undefined) ?? kadroListesi[0] ?? null
  const saltOkunur = !seciliKadro
  const personelStatu = String(seciliKadro?.statu ?? '').trim()
  const bosKadrolar = personelStatu
    ? tumBosKadrolar.filter(k => String(k.statu ?? '').trim() === personelStatu)
    : tumBosKadrolar

  const mudurlukler = (mudurlukRaw ?? []).map(m => m.mudurluk_adi).filter(Boolean)
  const unvanlar = (unvanRaw ?? []).map(u => ({ id: u.id, ad: u.unvan_adi, sinif: u.sinif_adi })).filter(u => u.ad)

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

  const ogrenim = (ogrenimRaw ?? [])[0] as { ogrenim_turu?: string | null; okul_adi?: string | null } | undefined
  const ogrenimDurumu = ogrenim?.ogrenim_turu
    ? `${ogrenim.ogrenim_turu}${ogrenim.okul_adi ? ` - ${ogrenim.okul_adi}` : ''}`
    : null

  const ayrilisNedenleri = await yukleGidisAyrilisNedenleri(supabase)

  return (
    <PersonelHareketiDegistirClient
      personel={personel}
      ogrenimDurumu={ogrenimDurumu}
      seciliKadro={seciliKadro}
      mudurlukler={mudurlukler}
      unvanlar={unvanlar}
      onaylayan={onaylayan}
      yardimcilar={yardimcilar}
      terfiSon={terfiSon}
      gostergeler={gostergeler}
      ayrilisNedenleri={ayrilisNedenleri}
      sonHareketAyrilis={{
        tarih: sonHareketRaw?.ayrilis_tarihi ?? null,
        nedeni: sonHareketRaw?.ayrilis_nedeni ?? null,
      }}
      seciliKadroRol={seciliRol === 'vekil' ? 'vekil' : 'asil'}
      bosKadrolar={bosKadrolar}
      popup={popup}
      saltOkunur={saltOkunur}
      onKaydet={personelHareketiEkle}
    />
  )
}
