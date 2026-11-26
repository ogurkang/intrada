import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EmekliIkramiyeMaasClient, {
  type EmekliIkramiyeFormBaslangic,
} from '@/components/hesaplama/EmekliIkramiyeMaasClient'
import { emekliIkramiyeBelgeCoz } from '@/lib/emekli-ikramiye-maas-hesap'
import { emekliIkramiyeAdaylari } from '../../actions'

export const dynamic = 'force-dynamic'

export default async function EmekliIkramiyeDuzenlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const kayitId = Number(id)
  if (!Number.isFinite(kayitId)) notFound()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('emekli_ikramiye_maas_kayitlari')
    .select('id, belge')
    .eq('id', kayitId)
    .maybeSingle()
  const belge = emekliIkramiyeBelgeCoz(data?.belge)
  if (!belge) notFound()
  const { adaylar, hata } = await emekliIkramiyeAdaylari()

  const baslangic: EmekliIkramiyeFormBaslangic = {
    id: kayitId,
    sicil: belge.sicil_no,
    ad: belge.ad_soyad,
    tckn: belge.tckn,
    unvan: belge.unvan,
    kanun: belge.kanun,
    derece: String(belge.derece),
    kademe: String(belge.kademe),
    ekGosterge: String(belge.ekGosterge),
    kadTazEkGosterge: String(belge.kadTazEkGosterge),
    kidemYili: String(belge.kidemYili),
    hizmetYil: String(belge.hizmetYil),
    hizmetAy: String(belge.hizmetAy),
    hizmetGun: String(belge.hizmetGun),
    ikramiyeYili: String(belge.ikramiyeYili),
    makamTemsilGorevGosterge: String(belge.makamTemsilGorevGosterge),
    donemId: belge.donemId,
    pay: String(belge.pay),
    payda: String(belge.payda),
  }

  return (
    <div className="space-y-4">
      <Link href={`/hesaplama/emekli-ikramiye-maas/${kayitId}`} className="text-sm text-slate-500 hover:text-slate-700">
        ← Kayıt
      </Link>
      <h1 className="text-2xl font-bold text-slate-800">Düzenle</h1>
      {hata ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{hata}</p> : null}
      <EmekliIkramiyeMaasClient adaylar={adaylar} baslangic={baslangic} />
    </div>
  )
}
