import Link from 'next/link'
import AnketOlusturClient from '@/components/anket/AnketOlusturClient'
import { anketYoneticiSayfasi } from '@/lib/anket-yetki'

export default async function AnketYeniPage() {
  await anketYoneticiSayfasi()
  return (
    <div className="space-y-6">
      <div>
        <Link href="/anket-yonetimi/anketler" className="text-sm text-slate-600 underline">Anketlere dön</Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-800">Anket oluştur</h1>
      </div>
      <AnketOlusturClient />
    </div>
  )
}
