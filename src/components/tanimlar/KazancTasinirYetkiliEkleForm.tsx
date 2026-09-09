'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { TASINIR_GOREVI_OPTIONS, type TasinirGorevi } from '@/lib/tasinir-gorevi'
import { kazancTasinirYetkiliTopluEkle } from '@/app/(dashboard)/tanimlar/kazanc-bilgi/tasinir-actions'
import { KAZANC_TASINIR_LISTE_HREF } from '@/lib/kazanc-tasinir-yetkili'

type BosSatir = { gorev_adi: TasinirGorevi; tutar: string }

interface Props {
  mevcutGorevler: string[]
  saltOkunur?: boolean
}

export default function KazancTasinirYetkiliEkleForm({ mevcutGorevler, saltOkunur = false }: Props) {
  const router = useRouter()
  const kalan = TASINIR_GOREVI_OPTIONS.filter(g => !mevcutGorevler.includes(g))
  const [sunuciHata, setSunuciHata] = useState<string | null>(null)
  const [kaydedildi, setKaydedildi] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [ekleSatirlar, setEkleSatirlar] = useState<BosSatir[]>(() =>
    kalan.map(g => ({ gorev_adi: g, tutar: '' })),
  )

  function ekleSatirDegistir(idx: number, patch: Partial<BosSatir>) {
    setEkleSatirlar(s => s.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  function kaydet() {
    setSunuciHata(null)
    const satirlar: { gorev_adi: string; tutar: string }[] = []
    for (const r of ekleSatirlar) {
      const gorev_adi = r.gorev_adi.trim()
      const tutar = r.tutar.trim()
      if (!tutar) {
        setSunuciHata('Tüm satırlarda puan girilmelidir.')
        return
      }
      satirlar.push({ gorev_adi, tutar })
    }
    startTransition(async () => {
      const res = await kazancTasinirYetkiliTopluEkle(satirlar)
      if (res.hata) setSunuciHata(res.hata)
      else {
        try {
          window.opener?.location?.reload()
        } catch {
          /* ignore */
        }
        if (typeof window !== 'undefined' && window.opener) {
          setKaydedildi(true)
        } else {
          router.push(KAZANC_TASINIR_LISTE_HREF)
        }
      }
    })
  }

  if (saltOkunur) {
    return <p className="text-sm text-slate-600">Tanımlar bu hesap için salt okunur.</p>
  }

  if (kalan.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        Her iki taşınır görevi için de tanım mevcut. Listeye dönüp puanı düzenleyebilirsiniz.
      </p>
    )
  }

  return (
    <div>
      {kaydedildi && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-sm">
          Kayıtlar eklendi. Liste sayfasını yenileyerek görebilirsiniz. Bu sekmeyi kapatabilirsiniz.
          <button
            type="button"
            className="ml-3 text-emerald-900 underline font-medium"
            onClick={() => {
              try {
                window.close()
              } catch {
                /* ignore */
              }
            }}
          >
            Sekmeyi kapat
          </button>
        </div>
      )}
      {sunuciHata && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{sunuciHata}</div>
      )}
      {!kaydedildi && (
        <>
          <div className="space-y-3">
            {ekleSatirlar.map((satir, idx) => (
              <div
                key={satir.gorev_adi}
                className="flex flex-wrap items-end gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/60"
              >
                <label className="flex flex-col gap-1 text-xs text-slate-600 flex-1 min-w-[14rem]">
                  <span className="font-medium">Taşınır Görevi</span>
                  <select
                    className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white w-full"
                    value={satir.gorev_adi}
                    onChange={e => ekleSatirDegistir(idx, { gorev_adi: e.target.value as TasinirGorevi })}
                  >
                    {TASINIR_GOREVI_OPTIONS.map(s => (
                      <option key={s} value={s} disabled={mevcutGorevler.includes(s) && s !== satir.gorev_adi}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-600 w-40">
                  <span className="font-medium">Puan</span>
                  <input
                    type="text"
                    className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white w-full"
                    value={satir.tutar}
                    onChange={e => ekleSatirDegistir(idx, { tutar: e.target.value })}
                    placeholder="Puan"
                  />
                </label>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={kaydet}
              disabled={isPending}
              className="bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 font-medium"
            >
              {isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
