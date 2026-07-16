import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import PerformansFormClient from '@/components/performans/PerformansFormClient'
import type { PerformansFormTipi } from '@/lib/performans'

export default async function PerformansKayitDetayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ rol?: string; donem?: string; mudurluk?: string; vekalet?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const rol = sp.rol === 'amir2' ? 'amir2' : 'amir1'
  const degId = Number(id)
  if (!degId) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()
  const access = await getAppAccess(supabase, user.id)
  const admin = isAdminLike(access)

  let currentSicil: string | null =
    access.mode === 'kullanici' ? access.sicilNo : null
  if (admin) {
    const { data } = await supabase.from('app_profiles').select('sicil_no').eq('id', user.id).maybeSingle()
    currentSicil = data?.sicil_no ? String(data.sicil_no) : currentSicil
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: deg } = await db
    .from('performans_degerlendirme')
    .select('*, donem:performans_donem(id, yil, durum)')
    .eq('id', degId)
    .maybeSingle()
  if (!deg) notFound()

  const adminVekalet = admin && sp.vekalet === '1'

  if (
    !admin &&
    deg.sicil_no !== currentSicil &&
    deg.amir1_sicil !== currentSicil &&
    deg.amir2_sicil !== currentSicil
  ) {
    notFound()
  }

  const { data: cal } = await supabase
    .from('calisan')
    .select('ad_soyad')
    .eq('sicil_no', deg.sicil_no)
    .maybeSingle()

  const { data: puanRows } = await db
    .from('performans_puan')
    .select('kriter_id, puan_amir1, puan_amir2, kriter:performans_kriter(id, kod, baslik, aciklama)')
    .eq('degerlendirme_id', degId)

  const kriterler = (puanRows ?? [])
    .map((p: {
      kriter_id: number
      puan_amir1: number | null
      puan_amir2: number | null
      kriter: { id: number; kod: number; baslik: string; aciklama: string | null } | null
    }) => ({
      id: p.kriter?.id ?? p.kriter_id,
      kod: p.kriter?.kod ?? 0,
      baslik: p.kriter?.baslik ?? '—',
      aciklama: p.kriter?.aciklama ?? null,
      puan_amir1: p.puan_amir1,
      puan_amir2: p.puan_amir2,
    }))
    .sort((a: { kod: number }, b: { kod: number }) => a.kod - b.kod)

  let kaydedilebilir = false
  if (deg.donem?.durum === 'Açık') {
    if (rol === 'amir1') {
      kaydedilebilir =
        (adminVekalet || deg.amir1_sicil === currentSicil) &&
        ['beklemede_1', 'iade'].includes(deg.durum)
    } else {
      kaydedilebilir =
        (adminVekalet || deg.amir2_sicil === currentSicil) &&
        deg.durum === 'amir1_gonderildi'
    }
  }

  let geriHref = '/performans/degerlendirme'
  if (sp.donem) {
    geriHref = `/performans/degerlendirme/${sp.donem}`
    if (sp.mudurluk) {
      geriHref += `?mudurluk=${encodeURIComponent(sp.mudurluk)}`
    }
  }

  return (
    <PerformansFormClient
      degerlendirme={{
        id: deg.id,
        sicil_no: deg.sicil_no,
        ad_soyad: cal?.ad_soyad ?? deg.sicil_no,
        form_tipi: deg.form_tipi as PerformansFormTipi,
        durum: deg.durum,
        tek_amir: deg.tek_amir,
        iade_notu: deg.iade_notu,
        puan_amir1: deg.puan_amir1,
        puan_amir2: deg.puan_amir2,
        ortalama: deg.ortalama,
        donem_yil: deg.donem?.yil ?? 0,
      }}
      kriterler={kriterler}
      rol={rol}
      kaydedilebilir={kaydedilebilir}
      geriHref={geriHref}
      adminVekalet={adminVekalet}
    />
  )
}
