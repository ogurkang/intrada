import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import PersonelHareketiDuzenleClient from '@/components/personel/PersonelHareketiDuzenleClient'
import { personelHareketiGuncelle } from '../../actions'
import { resolvePersonelHareketDuzenleSegment } from '@/lib/personel-hareket-route'
import type { Tables } from '@/types/database'
import { yukleGidisAyrilisNedenleri } from '@/lib/hareket-tanim-gidis'

export default async function PersonelHareketiDuzenlePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params
  const supabase = await createClient()

  const resolved = await resolvePersonelHareketDuzenleSegment(supabase, raw)
  if ('redirect' in resolved) redirect(resolved.redirect)

  const { data: hareket } = await supabase
    .from('personel_hareketleri')
    .select('*')
    .eq('id', resolved.idNum)
    .single()

  if (!hareket) notFound()

  const { data: unvanRows } = await supabase
    .from('tanim_unvan')
    .select('id, unvan_adi')
    .eq('aktif', true)
    .order('sira_no')

  const unvanlar = (unvanRows ?? []).map(r => ({ id: r.id, unvan_adi: r.unvan_adi })).filter(u => u.unvan_adi)
  const ayrilisNedenleri = await yukleGidisAyrilisNedenleri(supabase)

  return (
    <PersonelHareketiDuzenleClient
      hareket={hareket as Tables<'personel_hareketleri'>}
      unvanlar={unvanlar}
      ayrilisNedenleri={ayrilisNedenleri}
      onGuncelle={personelHareketiGuncelle}
    />
  )
}
