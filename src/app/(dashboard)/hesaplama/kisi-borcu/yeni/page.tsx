import Link from 'next/link'
import KisiBorcuClient from '@/components/hesaplama/KisiBorcuClient'
import { tcmbReeskontGetir } from '@/lib/tcmb-reeskont'
import { kisiBorcuAdaylari } from '../actions'

export const dynamic = 'force-dynamic'

export default async function KisiBorcuYeniPage() {
  const [{ adaylar, hata }, tcmb] = await Promise.all([kisiBorcuAdaylari(), tcmbReeskontGetir()])
  return (
    <div className="space-y-4">
      <Link href="/hesaplama/kisi-borcu" className="text-sm text-slate-500 hover:text-slate-700">
        ← Kişi Borcu
      </Link>
      <h1 className="text-2xl font-bold text-slate-800">Form Oluştur</h1>
      <p className="max-w-3xl text-sm text-slate-600">
        Kanuni faiz 3095 sayılı Kanunun 1. maddesine, temerrüt faizi sözleşmede ayrı oran yoksa aynı maddeye göre hesaplanır. Oran, tarihe göre TCMB reeskont tablosundan okunur.
      </p>
      {hata ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{hata}</p> : null}
      <KisiBorcuClient adaylar={adaylar} tcmb={tcmb.satirlar} kaynak={tcmb.kaynak} />
    </div>
  )
}
