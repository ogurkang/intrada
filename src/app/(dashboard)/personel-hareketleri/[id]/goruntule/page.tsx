import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import PersonelHareketiGoruntuleClient from '@/components/personel/PersonelHareketiGoruntuleClient'
import type { Tables } from '@/types/database'

type PH = Tables<'personel_hareketleri'>
type Calisan = Tables<'calisan'>

const HAREKET_TIPI_LABEL: Record<string, string> = {
  IlkAtanma: 'İlk Atanma',
  YerDegistirme: 'Yer Değiştirme',
  Yukselme: 'Yükselme',
}

export default async function PersonelHareketiGoruntulePage({
  params,
  searchParams,
}: { params: Promise<{ id: string }>; searchParams?: Promise<{ kadro_id?: string; rol?: string; popup?: string }> }) {
  const { id: sicil_no } = await params
  if (!sicil_no?.trim()) notFound()
  const sp = await searchParams?.catch(() => ({} as { kadro_id?: string; rol?: string; popup?: string }))
  const seciliKadroId = Number.parseInt(String(sp?.kadro_id ?? ''), 10)
  const seciliRol = String(sp?.rol ?? '').trim().toLowerCase()
  const popup = String(sp?.popup ?? '').trim()

  const supabase = await createClient()

  const [
    { data: calisan },
    { data: phRows },
    { data: ogrenimRows },
  ] = await Promise.all([
    supabase.from('calisan').select('*').eq('sicil_no', sicil_no).single(),
    supabase
      .from('personel_hareketleri')
      .select('*')
      .eq('sicil_no', sicil_no)
      .order('kayit_zamani', { ascending: false })
      .limit(1),
    supabase.from('calisan_ogrenim').select('ogrenim_turu').eq('sicil_no', sicil_no).eq('aktif', true).limit(1),
  ])

  const hareket = (phRows ?? [])[0] as PH | null
  if (!calisan) notFound()
  if (!hareket) {
    const to = Number.isFinite(seciliKadroId) && seciliKadroId > 0
      ? `/personel-hareketleri/${sicil_no}/degistir?kadro_id=${seciliKadroId}&rol=${encodeURIComponent(seciliRol || '')}${popup ? '&popup=1' : ''}`
      : `/personel-hareketleri/${sicil_no}/degistir${popup ? '?popup=1' : ''}`
    redirect(to)
  }

  let kadroLabel = hareket.kadro_sira_no ?? '—'
  if (Number.isFinite(seciliKadroId) && seciliKadroId > 0) {
    const { data: khRows } = await supabase
      .from('kadro_hareketleri')
      .select('kadro_sira_no, kadro_unvani, gorev_unvani, kadro_mudurlugu, gorev_mudurlugu, asil, vekil')
      .eq('id', seciliKadroId)
      .limit(1)
    const kh = (khRows ?? [])[0]
    if (kh) {
      const unvan = (kh as { gorev_unvani?: string; kadro_unvani?: string }).gorev_unvani ?? (kh as { kadro_unvani?: string }).kadro_unvani ?? ''
      const mud = (kh as { kadro_mudurlugu?: string; gorev_mudurlugu?: string }).kadro_mudurlugu ?? (kh as { gorev_mudurlugu?: string }).gorev_mudurlugu ?? ''
      const rol = seciliRol === 'asil' ? 'Asil' : seciliRol === 'vekil' ? 'Vekil' : ''
      const no = (kh as { kadro_sira_no?: string | null }).kadro_sira_no ?? hareket.kadro_sira_no
      kadroLabel = `${no ?? '—'} – ${unvan} (${mud})${rol ? ' – ' + rol : ''}`
    }
  } else if (hareket.kadro_sira_no) {
    const { data: khRows } = await supabase
      .from('kadro_hareketleri')
      .select('kadro_unvani, gorev_unvani, kadro_mudurlugu, gorev_mudurlugu, asil, vekil')
      .eq('kadro_sira_no', hareket.kadro_sira_no)
    const kh = (khRows ?? []).find(
      (r: { asil: string | null; vekil: string | null }) =>
        (r.asil ?? '').trim() === sicil_no || (r.vekil ?? '').trim() === sicil_no
    ) ?? (khRows ?? [])[0]
    if (kh) {
      const unvan = (kh as { gorev_unvani?: string; kadro_unvani?: string }).gorev_unvani ?? (kh as { kadro_unvani?: string }).kadro_unvani ?? ''
      const mud = (kh as { kadro_mudurlugu?: string; gorev_mudurlugu?: string }).kadro_mudurlugu ?? (kh as { gorev_mudurlugu?: string }).gorev_mudurlugu ?? ''
      const rol = ((kh as { asil?: string }).asil ?? '').trim() === sicil_no ? 'Asil' : ((kh as { vekil?: string }).vekil ?? '').trim() === sicil_no ? 'Vekil' : ''
      kadroLabel = `${hareket.kadro_sira_no} – ${unvan} (${mud})${rol ? ' – ' + rol : ''}`
    }
  }

  const teklifAd = hareket.teklif_eden
    ? (await supabase.from('calisan').select('ad_soyad').eq('sicil_no', hareket.teklif_eden).maybeSingle()).data?.ad_soyad ?? hareket.teklif_eden
    : ''

  const ogrenimDurumu = (ogrenimRows ?? [])[0]?.ogrenim_turu ?? null
  const degistirHref = Number.isFinite(seciliKadroId) && seciliKadroId > 0
    ? `/personel-hareketleri/${sicil_no}/degistir?kadro_id=${seciliKadroId}&rol=${encodeURIComponent(seciliRol || '')}${popup ? '&popup=1' : ''}`
    : `/personel-hareketleri/${sicil_no}/degistir${popup ? '?popup=1' : ''}`

  return (
    <PersonelHareketiGoruntuleClient
      personel={calisan as Calisan}
      hareket={hareket}
      kadroLabel={kadroLabel}
      teklifEdenAd={teklifAd}
      ogrenimDurumu={ogrenimDurumu}
      degistirHref={degistirHref}
    />
  )
}
