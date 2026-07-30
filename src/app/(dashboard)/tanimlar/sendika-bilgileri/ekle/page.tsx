import TanimEkleListeGeriLink from '@/components/tanimlar/TanimEkleListeGeriLink'
import SendikaTopluEkleForm from '@/components/tanimlar/SendikaTopluEkleForm'

export default function SendikaBilgileriEklePage() {
  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sendika Bilgileri Ekle</h1>
          <p className="text-sm text-slate-600 mt-1">
            Birden fazla satır ekleyebilirsiniz. Statü, Kısa Ad ve Uzun Ad alanlarını doldurun.
          </p>
        </div>
        <TanimEkleListeGeriLink href="/tanimlar/sendika-bilgileri" label="Sendika bilgileri listesi" />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <SendikaTopluEkleForm redirectTo="/tanimlar/sendika-bilgileri" />
      </div>
    </div>
  )
}
