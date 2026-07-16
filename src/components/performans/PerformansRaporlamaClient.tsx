'use client'

import Link from 'next/link'
import { performansPuanBandi } from '@/lib/performans'

export type DusukPuanSatir = {
  id: number
  sicil_no: string
  ad_soyad: string
  yil: number
  ortalama: number | null
  durum: string
}

/** v1: düşük puan listesi; belge üretimi sonraki iterasyon (yönetmelik ek formları) */
export default function PerformansRaporlamaClient({
  satirlar,
}: {
  satirlar: DusukPuanSatir[]
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Raporlama</h1>
        <p className="text-sm text-slate-600 mt-1">
          Ortalaması 59 ve altı (yetersiz / çok yetersiz) değerlendirmeler. Tebliğ ve uyarı
          formları yönetmelik eklerine göre sonraki adımda eklenecek.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Yıl</th>
              <th className="px-4 py-3">Sicil</th>
              <th className="px-4 py-3">Ad Soyad</th>
              <th className="px-4 py-3">Ortalama</th>
              <th className="px-4 py-3">Bant</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {satirlar.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Kayıt yok.
                </td>
              </tr>
            ) : (
              satirlar.map(s => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{s.yil}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.sicil_no}</td>
                  <td className="px-4 py-3">{s.ad_soyad}</td>
                  <td className="px-4 py-3 tabular-nums">{s.ortalama ?? '—'}</td>
                  <td className="px-4 py-3">{performansPuanBandi(s.ortalama)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/performans/degerlendirme/kayit/${s.id}?rol=amir2`}
                      className="text-sky-700 hover:underline"
                    >
                      Kayıt
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
