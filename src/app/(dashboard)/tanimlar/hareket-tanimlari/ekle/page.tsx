import TanimEkleListeGeriLink from '@/components/tanimlar/TanimEkleListeGeriLink'
import HareketTopluEkleForm from '@/components/tanimlar/HareketTopluEkleForm'

export default function HareketTanimlariEklePage() {
  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Hareket Tanımı Ekle</h1>
          <p className="text-sm text-slate-600 mt-1">
            Birden fazla satır ekleyebilirsiniz; her satırda tür (Geliş / Gidiş) ve tanım metni girilir.
          </p>
        </div>
        <TanimEkleListeGeriLink href="/tanimlar/hareket-tanimlari" label="Hareket tanımları listesi" />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <HareketTopluEkleForm redirectTo="/tanimlar/hareket-tanimlari" />
      </div>
    </div>
  )
}
