import Link from 'next/link'
import EmeklilikTazminatiClient from '@/components/hesaplama/EmeklilikTazminatiClient'
import { emeklilikAdaylari } from '../actions'

export const dynamic = 'force-dynamic'

export default async function EmeklilikTazminatiYeniPage() {
  const { adaylar, hata } = await emeklilikAdaylari()
  return (
    <div className="space-y-4">
      <Link href="/hesaplama/emeklilik-tazminati" className="text-sm text-slate-500 hover:text-slate-700">
        ← Emeklilik Tazminatı
      </Link>
      <h1 className="text-2xl font-bold text-slate-800">Hesap Oluştur</h1>
      <p className="text-sm text-slate-600">
        Memurda gösterge 13.558, işçide 12.105 gelir. Katsayı ve damga vergisi değiştirilebilir. Önizleme sağdadır.
      </p>
      {hata ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{hata}</p> : null}
      <EmeklilikTazminatiClient adaylar={adaylar} />
    </div>
  )
}
