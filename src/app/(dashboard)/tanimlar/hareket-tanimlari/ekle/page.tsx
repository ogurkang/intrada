import TanimEkleListeGeriLink from '@/components/tanimlar/TanimEkleListeGeriLink'
import HareketTopluEkleForm from '@/components/tanimlar/HareketTopluEkleForm'

export default function HareketTanimlariEklePage() {
  return (
    <div className="max-w-3xl">
      <TanimEkleListeGeriLink href="/tanimlar/hareket-tanimlari" label="Hareket tanımları listesi" />
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Hareket Tanımı Ekle</h1>
      <p className="text-sm text-slate-600 mb-6">
        Birden fazla satır ekleyebilirsiniz; her satırda tür (Geliş / Gidiş) ve tanım metni girilir.
      </p>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <HareketTopluEkleForm redirectTo="/tanimlar/hareket-tanimlari" />
      </div>
    </div>
  )
}
