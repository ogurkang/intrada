'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { MouseEvent } from 'react'
import { belediyeKimlikFormDurumDegistir } from '@/app/(dashboard)/yerel-bilgi/islemler/belediye-kimlik-formu/actions'

type Row = {
  id: number
  sira_no: number | null
  form_adi: string | null
  kayit_tarihi: string | null
  islem_yapan_etiket: string
  aktif: boolean
}

type Props = {
  rows: Row[]
}

function tarihTR(v: string | null) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleDateString('tr-TR')
}

export default function BelediyeKimlikFormuListeClient({ rows }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sunucuHata, setSunucuHata] = useState<string | null>(null)

  function durumToggle(e: MouseEvent, id: number, aktif: boolean) {
    e.stopPropagation()
    setSunucuHata(null)
    startTransition(async () => {
      const res = await belediyeKimlikFormDurumDegistir(id, !aktif)
      if (res.hata) {
        setSunucuHata(res.hata)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {sunucuHata && (
        <div className="m-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {sunucuHata}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-24">Sıra No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Form Adı</th>
              <th className="text-right px-3 py-3 font-semibold text-slate-600 w-32 whitespace-nowrap">Kayıt Tarihi</th>
              <th className="text-right px-3 py-3 font-semibold text-slate-600 w-40 whitespace-nowrap">İşlem Yapan</th>
              <th className="text-right px-3 py-3 font-semibold text-slate-600 w-24 whitespace-nowrap">Durumu</th>
              <th className="text-right px-3 py-3 font-semibold text-slate-600 w-16 whitespace-nowrap">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400">Henüz kayıt yok.</td>
              </tr>
            ) : (
              rows.map(r => (
                <tr
                  key={r.id}
                  onClick={() => router.push(`/yerel-bilgi/islemler/belediye-kimlik-formu/${r.id}`)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">{r.sira_no ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.form_adi ?? 'Belediye Kimlik Formu'}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">{tarihTR(r.kayit_tarihi)}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">{r.islem_yapan_etiket}</td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={e => durumToggle(e, r.id, r.aktif)}
                      disabled={isPending}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                        r.aktif
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${r.aktif ? 'bg-green-500' : 'bg-slate-400'}`} />
                      {r.aktif ? 'Aktif' : 'Pasif'}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={`/yerel-bilgi/islemler/belediye-kimlik-formu/${r.id}`}
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      aria-label="Detay"
                      title="Detay"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12Z" />
                      </svg>
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
