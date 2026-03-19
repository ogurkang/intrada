import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PersonelHareketiDuzenleClient from '@/components/personel/PersonelHareketiDuzenleClient'
import { personelHareketiGuncelle } from '../../actions'
import type { Tables } from '@/types/database'

export default async function PersonelHareketiDuzenlePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const idNum = parseInt(id, 10)
  if (Number.isNaN(idNum)) notFound()

  const { data: hareket } = await supabase
    .from('personel_hareketleri')
    .select('*')
    .eq('id', idNum)
    .single()

  if (!hareket) notFound()

  const { data: unvanRows } = await supabase
    .from('tanim_unvan')
    .select('id, unvan_adi')
    .eq('aktif', true)
    .order('sira_no')

  const unvanlar = (unvanRows ?? []).map(r => ({ id: r.id, unvan_adi: r.unvan_adi })).filter(u => u.unvan_adi)

  return (
    <PersonelHareketiDuzenleClient
      hareket={hareket as Tables<'personel_hareketleri'>}
      unvanlar={unvanlar}
      onGuncelle={personelHareketiGuncelle}
    />
  )
}
