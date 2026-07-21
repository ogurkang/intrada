import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AileDuzenleClient from '@/components/bildirim/AileDuzenleClient'
import { aileKaydet } from '../../actions'
import type { AileBilgisi, Cocuk } from '@/components/bildirim/AileClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AileDuzenlePage({ params }: Props) {
  const { id } = await params
  const numId = parseInt(id, 10)
  if (isNaN(numId)) notFound()

  const supabase = await createClient()

  const { data: kayit, error } = await supabase
    .from('aile_bildirimi')
    .select('*, calisan(ad_soyad)')
    .eq('id', numId)
    .single()

  if (error || !kayit) notFound()

  const aileBilgisi: AileBilgisi = {
    id: kayit.id,
    sicil_no: kayit.sicil_no,
    ad_soyad: (kayit.calisan as { ad_soyad: string | null } | null)?.ad_soyad ?? null,
    medeni_hal: kayit.medeni_hal,
    esin_ad_soyad: kayit.esin_ad_soyad,
    esin_tckn: kayit.esin_tckn,
    is_durumu: kayit.is_durumu,
    gelir_durumu: kayit.gelir_durumu,
    cocuklar_json: (Array.isArray(kayit.cocuklar_json) ? kayit.cocuklar_json : []) as unknown as Cocuk[],
    kayit_zamani: kayit.kayit_zamani,
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Aile Bildirimi - Düzenle</h1>
        <Link href={`/bildirim/aile/${numId}`}
          className="intrada-btn intrada-btn-ust-menu">
          ← Geri
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <AileDuzenleClient kayit={aileBilgisi} onKaydet={aileKaydet} />
      </div>
    </div>
  )
}
