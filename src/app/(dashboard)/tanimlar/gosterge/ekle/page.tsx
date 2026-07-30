import TanimEkleListeGeriLink from '@/components/tanimlar/TanimEkleListeGeriLink'
import GostergeTopluEkleForm from '@/components/tanimlar/GostergeTopluEkleForm'

export default function GostergeEklePage() {
  return (
    <div className="max-w-3xl">
      <TanimEkleListeGeriLink href="/tanimlar/gosterge" label="Gösterge tanımları listesi" />
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Gösterge Ekle</h1>
      <p className="text-sm text-slate-600 mb-6">Birden fazla satır ekleyebilirsiniz.</p>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <GostergeTopluEkleForm redirectTo="/tanimlar/gosterge" />
      </div>
    </div>
  )
}
