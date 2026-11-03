import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { katsayiTr } from '@/lib/ayliktan-kesme-hesap'
import KisiBorcuClient from '@/components/hesaplama/KisiBorcuClient'
import { kisiBorcuBelgeCoz } from '@/lib/kisi-borcu'
import { tcmbReeskontGetir } from '@/lib/tcmb-reeskont'
import { kisiBorcuAdaylari } from '../../actions'

export const dynamic = 'force-dynamic'

export default async function KisiBorcuDuzenlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const kayitId = Number(id)
  if (!Number.isFinite(kayitId)) notFound()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('kisi_borcu_kayitlari')
    .select('id, belge')
    .eq('id', kayitId)
    .maybeSingle()
  const belge = kisiBorcuBelgeCoz(data?.belge)
  if (!belge) notFound()
  const [{ adaylar, hata }, tcmb] = await Promise.all([kisiBorcuAdaylari(), tcmbReeskontGetir()])
  const statu = belge.statu === 'Memur' || belge.statu === 'İşçi' ? belge.statu : ''

  return (
    <div className="space-y-4">
      <Link href={`/hesaplama/kisi-borcu/${kayitId}`} className="text-sm text-slate-500 hover:text-slate-700">
        ← Kayıt
      </Link>
      <h1 className="text-2xl font-bold text-slate-800">Formu Düzenle</h1>
      {hata ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{hata}</p> : null}
      <KisiBorcuClient
        adaylar={adaylar}
        tcmb={tcmb.satirlar}
        kaynak={tcmb.kaynak}
        baslangic={{
          id: kayitId,
          sicil: belge.sicil_no,
          ad: belge.ad_soyad,
          tckn: belge.tckn,
          unvan: belge.unvan,
          statu,
          ana: katsayiTr(belge.ana_tutar),
          taksit: String(belge.taksit_sayisi),
          odemeGunu: String(belge.odeme_gunu),
          odemeBaslangic: belge.odeme_baslangic || belge.satirlar[0]?.vade || '',
          baslangic: belge.faiz_baslangic,
          faizTuru: belge.faiz_turu,
        }}
      />
    </div>
  )
}
