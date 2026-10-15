import Link from 'next/link'
import OlumYardimiClient from '@/components/hesaplama/OlumYardimiClient'
import { olumAdaylari } from '../actions'

export const dynamic = 'force-dynamic'

export default async function OlumYardimiYeniPage() {
  const { adaylar, hata } = await olumAdaylari()
  return (
    <div className="space-y-4">
      <Link href="/hesaplama/olum-yardimi" className="text-sm text-slate-500 hover:text-slate-700">
        ← Ölüm Yardımı
      </Link>
      <h1 className="text-2xl font-bold text-slate-800">Hesap Oluştur</h1>
      <p className="text-sm text-slate-600">
        Memurun ölümü, en yüksek devlet memuru aylığının iki katıdır. Tutar varis sayısına bölünür. Önizleme sağdadır.
      </p>
      {hata ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{hata}</p> : null}
      <OlumYardimiClient adaylar={adaylar} />
    </div>
  )
}
