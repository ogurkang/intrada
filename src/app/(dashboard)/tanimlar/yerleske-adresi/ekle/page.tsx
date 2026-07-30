import TanimEkleListeGeriLink from '@/components/tanimlar/TanimEkleListeGeriLink'
import YerleskeTopluEkleForm from '@/components/tanimlar/YerleskeTopluEkleForm'

export default function YerleskeAdresiEklePage() {
  return (
    <div className="max-w-3xl">
      <TanimEkleListeGeriLink href="/tanimlar/yerleske-adresi" label="Yerleşke adresleri listesi" />
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Yerleşke Adresi Ekle</h1>
      <p className="text-sm text-slate-600 mb-6">Birden fazla satır ekleyebilirsiniz.</p>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <YerleskeTopluEkleForm redirectTo="/tanimlar/yerleske-adresi" />
      </div>
    </div>
  )
}
