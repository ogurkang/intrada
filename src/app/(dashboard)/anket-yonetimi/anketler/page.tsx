import Link from 'next/link'
import AnketListeClient from '@/components/anket/AnketListeClient'
import { anketListeYukle } from '@/lib/anket-yukle'

export default async function AnketlerPage() {
  const { hata, satirlar } = await anketListeYukle()
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Anketler</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Yönetici anket adını ve soruları yazar. Cevap, paylaşım linki veya giriş ekranındaki kod ile isimsiz alınır.
          </p>
        </div>
        <Link href="/anket-yonetimi/anketler/yeni" className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700">
          Anket oluştur
        </Link>
      </div>
      {hata ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{hata}</p> : null}
      <AnketListeClient satirlar={satirlar} tur="anket" />
    </div>
  )
}
