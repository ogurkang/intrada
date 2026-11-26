import Link from 'next/link'
import EmekliIkramiyeMaasClient from '@/components/hesaplama/EmekliIkramiyeMaasClient'
import { emekliIkramiyeAdaylari } from '../actions'

export const dynamic = 'force-dynamic'

export default async function EmekliIkramiyeYeniPage() {
  const { adaylar, hata } = await emekliIkramiyeAdaylari()
  return (
    <div className="space-y-4">
      <Link href="/hesaplama/emekli-ikramiye-maas" className="text-sm text-slate-500 hover:text-slate-700">
        ← 4/C İkramiye ve Maaş
      </Link>
      <h1 className="text-2xl font-bold text-slate-800">Hesap Oluştur</h1>
      <p className="text-sm text-slate-600">
        Personel seçilince derece, kademe, ek gösterge ve hizmet önerilir. Makam/temsil ve katsayı dönemi elle
        girilir. Önizleme sağdadır.
      </p>
      {hata ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{hata}</p> : null}
      <EmekliIkramiyeMaasClient adaylar={adaylar} />
    </div>
  )
}
