import TanimEkleListeGeriLink from '@/components/tanimlar/TanimEkleListeGeriLink'
import SendikaTopluEkleForm from '@/components/tanimlar/SendikaTopluEkleForm'

export default function SendikaBilgileriEklePage() {
  return (
    <div className="max-w-3xl">
      <TanimEkleListeGeriLink href="/tanimlar/sendika-bilgileri" label="Sendika bilgileri listesi" />
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Sendika Bilgileri Ekle</h1>
      <p className="text-sm text-slate-600 mb-6">
        Birden fazla satır ekleyebilirsiniz. Statü, Kısa Ad ve Uzun Ad alanlarını doldurun.
      </p>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <SendikaTopluEkleForm redirectTo="/tanimlar/sendika-bilgileri" />
      </div>
    </div>
  )
}
