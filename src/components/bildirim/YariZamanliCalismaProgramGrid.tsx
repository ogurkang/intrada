'use client'

import { Fragment, useMemo, useState } from 'react'
import {
  YZC_ACIKLAMALAR,
  YZC_GUNLER,
  YZC_HEDEF_HAFTALIK_SAAT,
  YZC_MAX_DILIM,
  YZC_MIN_GUN,
  YZC_MIN_GUNLUK_SAAT,
  YZC_SAATLER,
  yzcProgramDilimSayisi,
  yzcProgramDogrula,
  yzcProgramMaxDilimeUlasti,
  type YzcCalismaProgrami,
  type YzcGun,
  type YzcSaat,
} from '@/lib/yari-zamanli-calisma-belge'

interface Props {
  value: YzcCalismaProgrami
  onChange: (v: YzcCalismaProgrami) => void
}

function durumRenk(ok: boolean) {
  return ok ? 'text-emerald-700' : 'text-orange-700'
}

export default function YariZamanliCalismaProgramGrid({ value, onChange }: Props) {
  const [limitHata, setLimitHata] = useState<string | null>(null)
  const dogrulama = useMemo(() => yzcProgramDogrula(value), [value])
  const maxDoldu = yzcProgramMaxDilimeUlasti(value)

  function toggle(gun: YzcGun, saat: YzcSaat) {
    const mevcut = new Set(value[gun] ?? [])
    const ekleniyor = !mevcut.has(saat)
    if (ekleniyor && yzcProgramDilimSayisi(value) >= YZC_MAX_DILIM) {
      setLimitHata(`En fazla ${YZC_HEDEF_HAFTALIK_SAAT} saat seçilebilir.`)
      return
    }
    if (mevcut.has(saat)) mevcut.delete(saat)
    else mevcut.add(saat)
    const liste = [...mevcut].sort(
      (a, b) => YZC_SAATLER.indexOf(a as YzcSaat) - YZC_SAATLER.indexOf(b as YzcSaat),
    )
    setLimitHata(null)
    onChange({ ...value, [gun]: liste.length ? liste : undefined })
  }

  const ogleIdx = YZC_SAATLER.indexOf('13:30')
  const gunOk = dogrulama.gunSayisi >= YZC_MIN_GUN
  const saatOk = dogrulama.toplamSaat === YZC_HEDEF_HAFTALIK_SAAT

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-700">Ek — Haftalık Çalışma Programı</h3>
        <p className="text-xs text-slate-500 mt-1">
          Yarı zamanlı çalışma için haftada en az {YZC_MIN_GUN} gün, günde en az {YZC_MIN_GUNLUK_SAAT} saat ve
          toplam {YZC_HEDEF_HAFTALIK_SAAT} saat seçilmelidir.
        </p>
      </div>

      <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-xs space-y-2">
        <p className="font-semibold text-orange-900">Program Özeti</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
          <p className={durumRenk(gunOk)}>
            <span className="text-orange-800/80">Çalışma günü:</span>{' '}
            <strong>{dogrulama.gunSayisi}</strong> / min. {YZC_MIN_GUN}
          </p>
          <p className={durumRenk(saatOk)}>
            <span className="text-orange-800/80">Haftalık toplam:</span>{' '}
            <strong>{dogrulama.toplamSaat}</strong> / {YZC_HEDEF_HAFTALIK_SAAT} saat
          </p>
        </div>
        <p className="text-orange-800/90">
          Maks. işaretlenebilir süre:{' '}
          <strong className="text-orange-900">{YZC_HEDEF_HAFTALIK_SAAT} saat</strong>
        </p>
        {limitHata ? <p className="text-red-600 font-medium">{limitHata}</p> : null}
        {dogrulama.gunlukOzet.length > 0 ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-orange-200/80">
            {dogrulama.gunlukOzet.map(({ gun, saat }) => {
              const ok = saat >= YZC_MIN_GUNLUK_SAAT
              return (
                <span key={gun} className={durumRenk(ok)}>
                  {gun}: <strong>{saat}</strong> saat {ok ? '' : `(min. ${YZC_MIN_GUNLUK_SAAT})`}
                </span>
              )
            })}
          </div>
        ) : (
          <p className="text-orange-700/90">Henüz gün seçilmedi.</p>
        )}
        {!dogrulama.gecerli && dogrulama.hatalar.length > 0 ? (
          <ul className="list-disc list-inside text-orange-800 space-y-0.5 pt-1 border-t border-orange-200/80">
            {dogrulama.hatalar.map(h => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        ) : dogrulama.gecerli ? (
          <p className="text-emerald-700 font-medium pt-1 border-t border-orange-200/80">
            Program kurallara uygun.
          </p>
        ) : null}
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
                {YZC_SAATLER.map((saat, idx) => {
                  const secili = (value[gun] ?? []).includes(saat)
                  const disabled = maxDoldu && !secili
                  return (
                    <Fragment key={`${gun}-${saat}`}>
                      <td className="border border-slate-200 p-0 text-center">
                        <label
                          className={`flex items-center justify-center min-h-[32px] ${
                            disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={secili}
                            disabled={disabled}
                            onChange={() => toggle(gun, saat)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                          />
                        </label>
                      </td>
                      {idx === ogleIdx - 1 ? (
                        <td className="border border-slate-200 bg-amber-50/50" />
                      ) : null}
                    </Fragment>
                  )
                })}
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
