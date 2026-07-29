import Link from 'next/link'
import SendikaTopluEkleForm from '@/components/tanimlar/SendikaTopluEkleForm'

export default function SendikaBilgileriEklePage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href="/tanimlar/sendika-bilgileri" className="text-sm text-sky-600 hover:text-sky-800 font-medium">
          ← Sendika bilgileri listesi
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Sendika Bilgileri Ekle</h1>
      <p className="text-sm text-slate-600 mb-6">
        Birden fazla satır ekleyebilirsiniz. Statü, Kısa Ad ve Uzun Ad alanlarını doldurun.
      </p>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <SendikaTopluEkleForm />
      </div>
    </div>
  )
}
