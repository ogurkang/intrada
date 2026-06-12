import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'
import IzinHareketDetayView from '@/components/izin/IzinHareketDetayView'
import { resolveIzinHareketSegment } from '@/lib/izin-hareket-route'
import { loadIzinHareketAuditLoglar } from '@/lib/izin-hareket-detay-load'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ yil?: string }>
}

export default async function IzinGoruntuPage({ params, searchParams }: Props) {
  const { id: raw } = await params
  const { yil: yilParam } = await searchParams
  const yil = yilParam ? parseInt(yilParam, 10) : new Date().getFullYear()
  const listeyeYil = Number.isFinite(yil) ? yil : new Date().getFullYear()

  const supabase = await createClient()
  const resolved = await resolveIzinHareketSegment(supabase, raw)
  if ('redirect' in resolved) redirect(resolved.redirect)

  const { data: izin, error } = await supabase
    .from('izin_hareketleri')
    .select('*')
    .eq('id', resolved.idNum)
    .single()

  if (error || !izin) notFound()

  const { data: calisanRow } = await supabase
    .from('calisan')
    .select('ad_soyad')
    .eq('sicil_no', izin.sicil_no)
    .maybeSingle()

  const h = izin as Tables<'izin_hareketleri'>

  const auditLoglar = await loadIzinHareketAuditLoglar(supabase, h.id)

  return (
    <IzinHareketDetayView
      h={h}
      adSoyad={calisanRow?.ad_soyad}
      listeyeYil={listeyeYil}
      duzenleHref={`/izin/${h.id}/duzenle`}
      auditLoglar={auditLoglar}
    />
  )
}
