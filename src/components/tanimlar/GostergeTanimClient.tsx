'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'
import { useTanimlarSaltOkunur } from '@/components/tanimlar/TanimlarSaltOkunurContext'
import type { Tables } from '@/types/database'
import { gostergeGuncelle, gostergeToggleAktif } from '@/app/(dashboard)/tanimlar/gosterge/actions'

type GostergeRow = Tables<'tanim_gosterge'>

const DERECE_SEC = Array.from({ length: 15 }, (_, i) => i + 1)
const KADEME_SEC = Array.from({ length: 9 }, (_, i) => i + 1)

export default function GostergeTanimClient({ data }: { data: GostergeRow[] }) {
  const saltOkunur = useTanimlarSaltOkunur()
  const [duzenleSatir, setDuzenleSatir] = useState<GostergeRow | null>(null)
  const [sunuciHata, setSunuciHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function duzenleKaydet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!duzenleSatir) return
    setSunuciHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await gostergeGuncelle(duzenleSatir.id, fd)
      if (res.hata) setSunuciHata(res.hata)
      else setDuzenleSatir(null)
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Gösterge Tanımları</h1>
        {!saltOkunur && (
          <Link
            href="/tanimlar/gosterge/ekle"
            target="_blank"
            rel="noopener noreferrer"
            className="intrada-btn intrada-btn-ekle"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Gösterge Ekle
          </Link>
        )}
      </div>

      {sunuciHata && !duzenleSatir && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{sunuciHata}</div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 font-semibold text-slate-600 w-14">#</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Derece</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Kademe</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Gösterge</th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600 w-28">Durum</th>
              <th className="text-right px-5 py-3 font-semibold text-slate-600 w-40">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400">
                  Henüz kayıt yok. &ldquo;Gösterge Ekle&rdquo; yeni sekmede açılır.
                </td>
              </tr>
            )}
            {data.map((row, i) => (
              <tr key={row.id} className={!row.aktif ? 'bg-slate-50/80' : ''}>
                <td className="px-5 py-3 text-slate-500">{i + 1}</td>
                <td className="px-5 py-3 font-medium text-slate-800">{row.derece}</td>
                <td className="px-5 py-3 text-slate-700">{row.kademe}</td>
                <td className="px-5 py-3 text-slate-700 tabular-nums">{row.gosterge}</td>
                <td className="px-5 py-3 text-center">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      row.aktif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {row.aktif ? 'Aktif' : 'Pasif'}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  {!saltOkunur && (
                    <div className="flex justify-end gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setSunuciHata(null)
                          setDuzenleSatir(row)
                        }}
                        className="intrada-btn intrada-btn-duzenle text-xs px-2 py-1"
                      >
                        Değiştir
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          setSunuciHata(null)
                          startTransition(async () => {
                            const res = await gostergeToggleAktif(row.id, row.aktif)
                            if (res.hata) setSunuciHata(res.hata)
                          })
                        }}
                        className="text-slate-600 hover:text-slate-900 text-xs font-medium"
                      >
                        {row.aktif ? 'Pasifleştir' : 'Aktifleştir'}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!duzenleSatir}
        title="Gösterge — Değiştir"
        onClose={() => {
          setDuzenleSatir(null)
          setSunuciHata(null)
        }}
      >
        {duzenleSatir && (
          <form onSubmit={duzenleKaydet} className="space-y-4">
            {sunuciHata && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{sunuciHata}</div>
            )}
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span className="font-medium">Derece</span>
              <select
                name="derece"
                defaultValue={duzenleSatir.derece}
                className="border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                {DERECE_SEC.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span className="font-medium">Kademe</span>
              <select
                name="kademe"
                defaultValue={duzenleSatir.kademe}
                className="border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                {KADEME_SEC.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span className="font-medium">Gösterge</span>
              <input
                name="gosterge"
                type="number"
                step="any"
                min={0}
                defaultValue={duzenleSatir.gosterge}
                className="border border-slate-300 rounded-lg px-3 py-2"
              />
            </label>
            <fieldset className="border border-slate-200 rounded-lg p-3">
              <legend className="text-xs font-medium text-slate-600 px-1">Durum</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="aktif" value="true" defaultChecked={duzenleSatir.aktif} />
                Aktif
              </label>
              <label className="flex items-center gap-2 text-sm mt-1">
                <input type="radio" name="aktif" value="false" defaultChecked={!duzenleSatir.aktif} />
                Pasif
              </label>
            </fieldset>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDuzenleSatir(null)}
                className="text-sm text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-100"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isPending || saltOkunur}
                className="intrada-btn intrada-btn-kaydet disabled:opacity-50"
              >
                {isPending ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
