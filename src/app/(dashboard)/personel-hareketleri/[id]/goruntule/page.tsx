import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import PersonelHareketiGoruntuleClient from '@/components/personel/PersonelHareketiGoruntuleClient'
import { kadroRolDogrula, sentetikHareketKadrodan } from '@/lib/personel-hareket-kadro'
import { personelHareketIslemNo } from '@/lib/personel-hareket-islem-no'
import type { Tables } from '@/types/database'

type PH = Tables<'personel_hareketleri'>
type Calisan = Tables<'calisan'>
type KH = Tables<'kadro_hareketleri'>

type Sp = { kadro_id?: string; rol?: string; popup?: string }

async function phKaydiKadroIdIle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sicil_no: string,
  kadroId: number,
): Promise<PH | null> {
  const { data, error } = await supabase
    .from('personel_hareketleri')
    .select('*')
    .eq('sicil_no', sicil_no)
    .eq('kadro_id', kadroId)
    .order('kayit_zamani', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return (data ?? null) as PH | null
}

export default async function PersonelHareketiGoruntulePage({
  params,
  searchParams,
}: { params: Promise<{ id: string }>; searchParams?: Promise<Sp> }) {
  const { id: rawId } = await params
  const idText = String(rawId ?? '').trim()
  if (!idText) notFound()

  let sp: Sp = {}
  try {
    sp = (await searchParams) ?? {}
  } catch {
    sp = {}
  }

  const seciliKadroId = Number.parseInt(String(sp.kadro_id ?? ''), 10)
  const seciliRol = String(sp.rol ?? '').trim().toLowerCase()
  const popup = String(sp.popup ?? '').trim()

  const supabase = await createClient()
  const idNum = Number.parseInt(idText, 10)

  let hareket: PH | null = null
  let sicil_no = ''
  let kadroKayit: KH | null = null

  const kadroModu = Number.isFinite(seciliKadroId) && seciliKadroId > 0
  let phById: PH | null = null

  // 1) URL yolu sayısal personel_hareketleri id olabilir (salt-okunur satır tıklaması)
  if (Number.isFinite(idNum) && idNum > 0) {
    const { data: byId } = await supabase
      .from('personel_hareketleri')
      .select('*')
      .eq('id', idNum)
      .maybeSingle()
    if (byId) phById = byId as PH
  }

  // 2) Kadro satırı: URL'deki id sicil_no; PH id ile çakışırsa sicil+kadro yolu tercih edilir
  const sicilOlarakAc =
    kadroModu && (!phById || phById.sicil_no.trim() !== idText)

  if (sicilOlarakAc) {
    sicil_no = idText
    const { data: kadro } = await supabase
      .from('kadro_hareketleri')
      .select('*')
      .eq('id', seciliKadroId)
      .maybeSingle()
    if (!kadro) notFound()
    kadroKayit = kadro as KH

    const dogrulanmisRol = kadroRolDogrula(kadroKayit, sicil_no, seciliRol)
    if (!dogrulanmisRol) notFound()

    hareket = await phKaydiKadroIdIle(supabase, sicil_no, seciliKadroId)

    if (!hareket && kadroKayit.kadro_sira_no) {
      const { data: phBySira } = await supabase
        .from('personel_hareketleri')
        .select('*')
        .eq('sicil_no', sicil_no)
        .eq('kadro_sira_no', kadroKayit.kadro_sira_no)
        .order('kayit_zamani', { ascending: false })
        .limit(1)
        .maybeSingle()
      hareket = (phBySira ?? null) as PH | null
    }

    if (!hareket) {
      hareket = sentetikHareketKadrodan(kadroKayit, sicil_no, dogrulanmisRol)
    }
  } else if (phById) {
    hareket = phById
    sicil_no = hareket.sicil_no
    if (hareket.kadro_id) {
      const { data: kh } = await supabase
        .from('kadro_hareketleri')
        .select('*')
        .eq('id', hareket.kadro_id)
        .maybeSingle()
      kadroKayit = (kh ?? null) as KH | null
    }
  }

  if (!sicil_no) sicil_no = idText

  const [{ data: calisan }, { data: ogrenimRows }] = await Promise.all([
    supabase.from('calisan').select('*').eq('sicil_no', sicil_no).maybeSingle(),
    supabase.from('calisan_ogrenim').select('ogrenim_turu').eq('sicil_no', sicil_no).eq('aktif', true).limit(1),
  ])

  if (!calisan) notFound()

  if (!hareket) {
    const to = Number.isFinite(seciliKadroId) && seciliKadroId > 0
      ? `/personel-hareketleri/${sicil_no}/degistir?kadro_id=${seciliKadroId}&rol=${encodeURIComponent(seciliRol || '')}${popup ? '&popup=1' : ''}`
      : `/personel-hareketleri/${sicil_no}/degistir${popup ? '?popup=1' : ''}`
    redirect(to)
  }

  const kadroIdGosterim = kadroKayit?.id ?? hareket.kadro_id ?? (Number.isFinite(seciliKadroId) ? seciliKadroId : null)
  const kadroRolGosterim = hareket.kadro_rol ?? seciliRol
  const islemNo = personelHareketIslemNo(hareket.id, hareket.kayit_no)

  let kadroLabel = hareket.kadro_sira_no ?? '—'
  if (kadroKayit) {
    const unvan = kadroKayit.gorev_unvani ?? kadroKayit.kadro_unvani ?? ''
    const mud = kadroKayit.gorev_mudurlugu ?? kadroKayit.kadro_mudurlugu ?? ''
    const rolEtiket = kadroRolGosterim === 'vekil' ? 'Vekil' : kadroRolGosterim === 'asil' ? 'Asil' : ''
    const no = kadroKayit.kadro_sira_no ?? hareket.kadro_sira_no
    kadroLabel = `${no ?? '—'} – ${unvan} (${mud})${rolEtiket ? ' – ' + rolEtiket : ''}`
  } else if (Number.isFinite(seciliKadroId) && seciliKadroId > 0) {
    const { data: khRows } = await supabase
      .from('kadro_hareketleri')
      .select('kadro_sira_no, kadro_unvani, gorev_unvani, kadro_mudurlugu, gorev_mudurlugu')
      .eq('id', seciliKadroId)
      .limit(1)
    const kh = (khRows ?? [])[0]
    if (kh) {
      const unvan = kh.gorev_unvani ?? kh.kadro_unvani ?? ''
      const mud = kh.kadro_mudurlugu ?? kh.gorev_mudurlugu ?? ''
      const rol = seciliRol === 'asil' ? 'Asil' : seciliRol === 'vekil' ? 'Vekil' : ''
      kadroLabel = `${kh.kadro_sira_no ?? hareket.kadro_sira_no} – ${unvan} (${mud})${rol ? ' – ' + rol : ''}`
    }
  } else if (hareket.kadro_sira_no) {
    const { data: khRows } = await supabase
      .from('kadro_hareketleri')
      .select('kadro_unvani, gorev_unvani, kadro_mudurlugu, gorev_mudurlugu, asil, vekil')
      .eq('kadro_sira_no', hareket.kadro_sira_no)
    const kh = (khRows ?? []).find(
      (r: { asil: string | null; vekil: string | null }) =>
        (r.asil ?? '').trim() === sicil_no || (r.vekil ?? '').trim() === sicil_no,
    ) ?? (khRows ?? [])[0]
    if (kh) {
      const unvan = kh.gorev_unvani ?? kh.kadro_unvani ?? ''
      const mud = kh.kadro_mudurlugu ?? kh.gorev_mudurlugu ?? ''
      const rol = ((kh as { asil?: string }).asil ?? '').trim() === sicil_no ? 'Asil' : ((kh as { vekil?: string }).vekil ?? '').trim() === sicil_no ? 'Vekil' : ''
      kadroLabel = `${hareket.kadro_sira_no} – ${unvan} (${mud})${rol ? ' – ' + rol : ''}`
    }
  }

  const teklifAd = hareket.teklif_eden
    ? (await supabase.from('calisan').select('ad_soyad').eq('sicil_no', hareket.teklif_eden).maybeSingle()).data?.ad_soyad ?? hareket.teklif_eden
    : ''

  const ogrenimDurumu = (ogrenimRows ?? [])[0]?.ogrenim_turu ?? null
  const degistirKadroId = kadroIdGosterim ?? seciliKadroId
  const degistirRol = kadroRolGosterim || seciliRol
  const degistirHref = Number.isFinite(degistirKadroId) && (degistirKadroId as number) > 0
    ? `/personel-hareketleri/${sicil_no}/degistir?kadro_id=${degistirKadroId}&rol=${encodeURIComponent(degistirRol || '')}${popup ? '&popup=1' : ''}`
    : `/personel-hareketleri/${sicil_no}/degistir${popup ? '?popup=1' : ''}`

  return (
    <PersonelHareketiGoruntuleClient
      personel={calisan as Calisan}
      hareket={hareket}
      kadroLabel={kadroLabel}
      islemNo={islemNo}
      teklifEdenAd={teklifAd}
      ogrenimDurumu={ogrenimDurumu}
      degistirHref={degistirHref}
    />
  )
}
