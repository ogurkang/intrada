import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EmeklilikTazminatiClient from '@/components/hesaplama/EmeklilikTazminatiClient'
import { katsayiTr } from '@/lib/ayliktan-kesme-hesap'
import { emeklilikBelgeCoz } from '@/lib/emeklilik-tazminati-hesap'
import { emeklilikAdaylari } from '../../actions'

export const dynamic = 'force-dynamic'

export default async function EmeklilikDuzenlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const kayitId = Number(id)
  if (!Number.isFinite(kayitId)) notFound()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('emeklilik_tazminati_kayitlari')
    .select('id, belge')
    .eq('id', kayitId)
    .maybeSingle()
  const belge = emeklilikBelgeCoz(data?.belge)
  if (!belge) notFound()
  const { adaylar } = await emeklilikAdaylari()

  return (
    <div className="space-y-4">
      <Link href={`/hesaplama/emeklilik-tazminati/${kayitId}`} className="text-sm text-slate-500 hover:text-slate-700">
        ← Önizleme
      </Link>
      <h1 className="text-2xl font-bold text-slate-800">Hesabı Düzenle</h1>
      <EmeklilikTazminatiClient
        adaylar={adaylar}
        baslangic={{
          id: kayitId,
          sicil: belge.sicil_no,
          ad: belge.ad_soyad,
          tckn: belge.tckn,
          unvan: belge.unvan,
          statu: belge.statu,
          gosterge: String(belge.gosterge),
          maasKatsayi: katsayiTr(belge.maasKatsayi),
          damgaOrani: katsayiTr(belge.damgaOrani),
        }}
      />
    </div>
  )
}
