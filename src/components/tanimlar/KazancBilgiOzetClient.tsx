'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { unvanSinifiThMi, YAN_ODEME_ARTI5_ETIKET, YAN_ODEME_EKSI5_ETIKET } from '@/lib/kazanc-yan-odeme'
import { useTanimlarSaltOkunur } from '@/components/tanimlar/TanimlarSaltOkunurContext'
import KazancTasinirYetkiliClient from '@/components/tanimlar/KazancTasinirYetkiliClient'
import type { Tables } from '@/types/database'

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

type Sekme = 'kadro' | 'tasinir'

interface Props {
  satirlar: KazancOzetSatir[]
  tasinirTanimlar: Tables<'tanim_kazanc_tasinir_yetkili'>[]
  tasinirAuditLoglarByRefId?: Record<string, Tables<'personel_audit_log'>[]>
  aktifSekme: Sekme
}

export default function KazancBilgiOzetClient({
  satirlar,
  tasinirTanimlar,
  tasinirAuditLoglarByRefId = {},
  aktifSekme,
}: Props) {
  const router = useRouter()
  const saltOkunur = useTanimlarSaltOkunur()

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kazanç Bilgileri</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {aktifSekme === 'tasinir'
              ? 'Taşınır görevi kazanç puanlarını tanımlayın.'
              : 'Kadroda personeli olan ünvanlar listelenir. Satıra tıklayarak puan tanımlarını düzenleyin.'}
          </p>
        </div>
        {aktifSekme === 'kadro' ? (
          <Link
            href="/tanimlar/kazanc-bilgi/sapma"
            className="shrink-0 text-sm font-medium border border-amber-300 bg-amber-50 text-amber-900 px-4 py-2 rounded-lg hover:bg-amber-100 shadow-sm"
          >
            Tanımdan sapan personel
          </Link>
        ) : (
          !saltOkunur && (
            <Link
              href="/tanimlar/kazanc-bilgi/tasinir/ekle"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Tanım Ekle
            </Link>
          )
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 overflow-x-auto bg-slate-50/80">
          <div className="flex min-w-max p-1.5 gap-1.5">
            <Link
              href="/tanimlar/kazanc-bilgi"
              className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap rounded-lg transition-colors ${
                aktifSekme === 'kadro'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-indigo-800 bg-indigo-50 hover:bg-indigo-100'
              }`}
            >
              Kadro Unvanları
            </Link>
            <Link
              href="/tanimlar/kazanc-bilgi?sekme=tasinir"
              className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap rounded-lg transition-colors ${
                aktifSekme === 'tasinir'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-teal-800 bg-teal-50 hover:bg-teal-100'
              }`}
            >
              Taşınır Yetkilileri
            </Link>
          </div>
        </div>

        <div className="p-0">
          {aktifSekme === 'tasinir' ? (
            <div className="p-6">
              <KazancTasinirYetkiliClient data={tasinirTanimlar} auditLoglarByRefId={tasinirAuditLoglarByRefId} />
            </div>
          ) : satirlar.length === 0 ? (
            <p className="text-sm text-amber-800 bg-amber-50 border-t border-amber-100 p-4">
              Kadro hareketlerinde asil veya vekil atanmış ve Tanımlar ünvanlarıyla eşleşen kayıt bulunmuyor.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 w-14">Sıra No</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Sınıf</th>
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
                    onKeyDown={e => {
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
                    <td className="px-4 py-3 text-slate-600 text-xs leading-relaxed">
                      {unvanSinifiThMi(s.sinif_adi)
                        ? `Ek Gösterge, Ek Ödeme, ÖHT, ${YAN_ODEME_EKSI5_ETIKET}, ${YAN_ODEME_ARTI5_ETIKET}, SDS`
                        : PUANLAR_ETIKET}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
