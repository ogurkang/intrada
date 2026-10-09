import AnketListeClient from '@/components/anket/AnketListeClient'
import { anketListeYukle } from '@/lib/anket-yukle'

export default async function AnketRaporlariPage() {
  const { hata, satirlar } = await anketListeYukle()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Raporlar</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Her anket başlığı burada kendiliğinden durur. Göz, soru grafiklerini ve her sonucun yorumunu açar.
        </p>
      </div>
      {hata ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{hata}</p> : null}
      <AnketListeClient satirlar={satirlar} tur="rapor" />
    </div>
  )
}
