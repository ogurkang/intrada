'use client'

import { useRouter } from 'next/navigation'

export type KazancOzetSatir = {
  unvan_id: number
  /** `tanim_unvan.sinif_adi` */
  sinif_adi: string | null
  unvan_adi: string
  /** Doluysa virgülle ayrılmış öğrenim adları */
  egitimEtiket: string | null
  hasKayit: boolean
}

const PUANLAR_ETIKET = 'Ek Gösterge, Ek Ödeme, ÖHT, Yan Ödeme, SDS'

interface Props {
  satirlar: KazancOzetSatir[]
}

export default function KazancBilgiOzetClient({ satirlar }: Props) {
  const router = useRouter()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Kazanç Bilgileri</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Kadroda personeli olan ünvanlar listelenir. Satıra tıklayarak puan tanımlarını düzenleyin.
        </p>
      </div>

      {satirlar.length === 0 ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-4">
          Kadro hareketlerinde asil veya vekil atanmış ve Tanımlar ünvanlarıyla eşleşen kayıt bulunmuyor.
        </p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-14">Sıra No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Unvan</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[14rem]">Eğitim Bilgileri</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[18rem]">Puanlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {satirlar.map((s, i) => (
                <tr
                  key={s.unvan_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/tanimlar/kazanc-bilgi/${s.unvan_id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      router.push(`/tanimlar/kazanc-bilgi/${s.unvan_id}`)
                    }
                  }}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-center text-xs text-slate-400 tabular-nums">{i + 1}</td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{s.sinif_adi ?? '—'}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{s.unvan_adi}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {s.hasKayit ? (
                      <span>{s.egitimEtiket}</span>
                    ) : (
                      <span className="text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-1 text-xs">
                        Henüz puan girişi yapılmamıştır.
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs leading-relaxed">{PUANLAR_ETIKET}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
