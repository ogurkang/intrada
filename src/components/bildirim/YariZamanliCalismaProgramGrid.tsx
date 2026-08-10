'use client'

import { Fragment } from 'react'
import {
  YZC_ACIKLAMALAR,
  YZC_GUNLER,
  YZC_SAATLER,
  type YzcCalismaProgrami,
  type YzcGun,
  type YzcSaat,
} from '@/lib/yari-zamanli-calisma-belge'

interface Props {
  value: YzcCalismaProgrami
  onChange: (v: YzcCalismaProgrami) => void
}

export default function YariZamanliCalismaProgramGrid({ value, onChange }: Props) {
  function toggle(gun: YzcGun, saat: YzcSaat) {
    const mevcut = new Set(value[gun] ?? [])
    if (mevcut.has(saat)) mevcut.delete(saat)
    else mevcut.add(saat)
    const liste = [...mevcut].sort(
      (a, b) => YZC_SAATLER.indexOf(a as YzcSaat) - YZC_SAATLER.indexOf(b as YzcSaat),
    )
    onChange({ ...value, [gun]: liste.length ? liste : undefined })
  }

  const ogleIdx = YZC_SAATLER.indexOf('13:30')

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-700">Ek — Haftalık Çalışma Programı</h3>
        <p className="text-xs text-slate-500 mt-1">
          Çalışılacak gün ve saat dilimlerini işaretleyin. Haftalık en az 3 gün seçilmelidir.
        </p>
      </div>
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="min-w-[960px] w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="border border-slate-200 px-2 py-2 text-left font-semibold text-slate-600 sticky left-0 bg-slate-50 z-10">
                Günler
              </th>
              {YZC_SAATLER.map((saat, idx) => (
                <Fragment key={saat}>
                  <th className="border border-slate-200 px-1 py-2 text-center font-medium text-slate-600 min-w-[44px]">
                    {saat}
                  </th>
                  {idx === ogleIdx - 1 ? (
                    <th className="border border-slate-200 px-1 py-2 text-center font-semibold text-amber-700 bg-amber-50 min-w-[52px]">
                      ÖĞLE ARASI
                    </th>
                  ) : null}
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {YZC_GUNLER.map(gun => (
              <tr key={gun} className="hover:bg-slate-50/50">
                <td className="border border-slate-200 px-2 py-1.5 font-medium text-slate-700 sticky left-0 bg-white z-10">
                  {gun}
                </td>
                {YZC_SAATLER.map((saat, idx) => (
                  <Fragment key={`${gun}-${saat}`}>
                    <td className="border border-slate-200 p-0 text-center">
                      <label className="flex items-center justify-center min-h-[32px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(value[gun] ?? []).includes(saat)}
                          onChange={() => toggle(gun, saat)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                    </td>
                    {idx === ogleIdx - 1 ? (
                      <td className="border border-slate-200 bg-amber-50/50" />
                    ) : null}
                  </Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-xs text-slate-600 space-y-1 max-h-40 overflow-y-auto">
        <p className="font-semibold text-slate-700">Açıklamalar</p>
        {YZC_ACIKLAMALAR.map((m, i) => (
          <p key={i}>
            {i + 1}-{m}
          </p>
        ))}
      </div>
    </div>
  )
}
