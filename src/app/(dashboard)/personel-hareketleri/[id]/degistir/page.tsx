import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PersonelHareketiDegistirClient from '@/components/personel/PersonelHareketiDegistirClient'
import { personelHareketiEkle } from '../../actions'
import { yuklePersonelHareketDegistirVeri } from '@/lib/personel-hareket-degistir-yukle'

export default async function PersonelHareketiDegistirPage({
  params,
  searchParams,
}: { params: Promise<{ id: string }>; searchParams?: Promise<{ kadro_id?: string; rol?: string; popup?: string; yeni?: string; hareket_tipi?: string }> }) {
  const { id: sicil_no } = await params
  if (!sicil_no?.trim()) notFound()
  const sp = await searchParams?.catch(() => ({} as { kadro_id?: string; rol?: string; popup?: string; yeni?: string; hareket_tipi?: string }))
  const seciliKadroId = Number.parseInt(String(sp?.kadro_id ?? ''), 10)
  const seciliRol = String(sp?.rol ?? '').trim().toLowerCase()
  const popup = String(sp?.popup ?? '').trim() === '1'
  const yeniKayit = String(sp?.yeni ?? '').trim() === '1'
  const initialHareketTipi = String(sp?.hareket_tipi ?? '').trim()

  const supabase = await createClient()
  const veri = await yuklePersonelHareketDegistirVeri(supabase, sicil_no, {
    yeniKayit,
    seciliKadroId,
    seciliRol,
  })

  if (!veri.personel) notFound()

  const saltOkunur = !yeniKayit && !veri.seciliKadro

  return (
    <PersonelHareketiDegistirClient
      {...veri}
      popup={popup}
      yeniKayit={yeniKayit}
      initialHareketTipi={initialHareketTipi}
      saltOkunur={saltOkunur}
      onKaydet={personelHareketiEkle}
    />
  )
}
