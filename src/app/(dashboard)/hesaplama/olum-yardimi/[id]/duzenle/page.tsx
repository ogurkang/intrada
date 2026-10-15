import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OlumYardimiClient from '@/components/hesaplama/OlumYardimiClient'
import { katsayiTr } from '@/lib/ayliktan-kesme-hesap'
import { olumBelgeCoz } from '@/lib/olum-yardimi-hesap'
import { olumAdaylari } from '../../actions'

export const dynamic = 'force-dynamic'

export default async function OlumDuzenlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const kayitId = Number(id)
  if (!Number.isFinite(kayitId)) notFound()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('olum_yardimi_kayitlari')
    .select('id, belge')
    .eq('id', kayitId)
    .maybeSingle()
  const belge = olumBelgeCoz(data?.belge)
  if (!belge) notFound()
  const { adaylar } = await olumAdaylari()

  return (
    <div className="space-y-4">
      <Link href={`/hesaplama/olum-yardimi/${kayitId}`} className="text-sm text-slate-500 hover:text-slate-700">
        ← Önizleme
      </Link>
      <h1 className="text-2xl font-bold text-slate-800">Hesabı Düzenle</h1>
      <OlumYardimiClient
        adaylar={adaylar}
        baslangic={{
          id: kayitId,
          sicil: belge.sicil_no,
          ad: belge.ad_soyad,
          tckn: belge.tckn,
          unvan: belge.unvan,
          gosterge: String(belge.gosterge),
          maasKatsayi: katsayiTr(belge.maasKatsayi),
          varisler: belge.varisler.map(v => ({ tckn: v.tckn, adSoyad: v.adSoyad, iban: v.iban })),
        }}
      />
    </div>
  )
}
