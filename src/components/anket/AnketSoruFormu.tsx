'use client'

import { ANKET_TIPLERI, type AnketSoruTipi } from '@/lib/anket'

export type SoruTaslak = {
  anahtar: string
  metin: string
  tip: AnketSoruTipi
  secenekler: string[]
}

const inputSinif =
  'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-800'

export function bosSoru(anahtar: string): SoruTaslak {
  return { anahtar, metin: '', tip: 'tek_secim', secenekler: ['', ''] }
}

export function AnketSoruFormu({
  sira,
  deger,
  onChange,
}: {
  sira: number
  deger: SoruTaslak
  onChange: (sonraki: SoruTaslak) => void
}) {
  const secenekli = deger.tip === 'tek_secim' || deger.tip === 'coklu_secim'

  function tipDegistir(tip: AnketSoruTipi) {
    const secenekler = tip === 'tek_secim' || tip === 'coklu_secim'
      ? (deger.secenekler.length >= 2 ? deger.secenekler : ['', ''])
      : []
    onChange({ ...deger, tip, secenekler })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="grid gap-3 md:grid-cols-[4.5rem_1fr_12rem]">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">Sıra</p>
          <p className="px-3 py-2 text-sm font-semibold text-slate-800">{sira}</p>
        </div>
        <label className="block">
          <span className="text-xs font-medium text-slate-500">Soru</span>
          <textarea
            value={deger.metin}
            onChange={e => onChange({ ...deger, metin: e.target.value })}
            rows={2}
            className={`${inputSinif} mt-1`}
            placeholder="Soruyu yazın"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-500">Cevap tipi</span>
          <select
            value={deger.tip}
            onChange={e => tipDegistir(e.target.value as AnketSoruTipi)}
            className={`${inputSinif} mt-1`}
          >
            {ANKET_TIPLERI.map(t => (
              <option key={t.id} value={t.id}>{t.etiket}</option>
            ))}
          </select>
        </label>
      </div>
      {secenekli ? (
        <div className="space-y-2 pl-0 md:pl-[5.25rem]">
          <p className="text-xs font-medium text-slate-500">Seçenekler</p>
          {deger.secenekler.map((secenek, i) => (
            <div key={`${deger.anahtar}-${i}`} className="flex gap-2">
              <input
                value={secenek}
                onChange={e => {
                  const secenekler = deger.secenekler.slice()
                  secenekler[i] = e.target.value
                  onChange({ ...deger, secenekler })
                }}
                className={inputSinif}
                placeholder={`${i + 1}. seçenek`}
              />
              {deger.secenekler.length > 2 ? (
                <button
                  type="button"
                  onClick={() => onChange({ ...deger, secenekler: deger.secenekler.filter((_, j) => j !== i) })}
                  className="px-2 text-sm text-slate-500 hover:text-red-700"
                >
                  Sil
                </button>
              ) : null}
            </div>
          ))}
          {deger.secenekler.length < 12 ? (
            <button
              type="button"
              onClick={() => onChange({ ...deger, secenekler: [...deger.secenekler, ''] })}
              className="text-sm text-slate-700 underline"
            >
              Seçenek ekle
            </button>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-slate-500 md:pl-[5.25rem]">
          {deger.tip === 'evet_hayir'
            ? 'Seçenekler Evet ve Hayır olarak gelir.'
            : deger.tip === 'puan'
              ? 'Puan 1 ile 5 arasındadır. 5’in üstü seçilemez.'
              : 'Cevap serbest metin olarak yazılır. Raporda liste halinde durur.'}
        </p>
      )}
    </div>
  )
}
