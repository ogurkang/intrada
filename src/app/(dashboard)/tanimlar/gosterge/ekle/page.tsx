import TanimEkleListeGeriLink from '@/components/tanimlar/TanimEkleListeGeriLink'
import GostergeTopluEkleForm from '@/components/tanimlar/GostergeTopluEkleForm'

export default function GostergeEklePage() {
  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gösterge Ekle</h1>
          <p className="text-sm text-slate-600 mt-1">Birden fazla satır ekleyebilirsiniz.</p>
        </div>
        <TanimEkleListeGeriLink href="/tanimlar/gosterge" label="Gösterge tanımları listesi" />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <GostergeTopluEkleForm redirectTo="/tanimlar/gosterge" />
      </div>
    </div>
  )
}
