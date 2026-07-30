'use client'

import Link from 'next/link'
import TanimEkleListeGeriLink from '@/components/tanimlar/TanimEkleListeGeriLink'
import { useMemo, useState, useTransition } from 'react'
import type { KazancGrupAyar } from '@/app/(dashboard)/tanimlar/kazanc-bilgi/actions'
import { kazancBilgiGruplariEkle } from '@/app/(dashboard)/tanimlar/kazanc-bilgi/actions'
import { broadcastIntradaRefresh } from '@/lib/intrada-tab-sync'
import { kazancOgrenimlerSekmeListesi, type KazancOgrenimSekmesi } from '@/lib/kazanc-ogrenim-grup'

const DERECE_SEC = Array.from({ length: 15 }, (_, i) => i + 1)

const SEKME_ETIKET: Record<KazancOgrenimSekmesi, string> = {
  lisans_onlisans: 'Lisans / Önlisans',
  lise_meslek: 'Meslek Lisesi / Lise',
}

type SatirModel = {
  ogrenimIdSet: Set<number>
  derece: number
  ek_gosterge: string | null
  ek_odeme: string | null
  oht: string | null
  yan_odeme: string | null
  sds_orani: string | null
}

function bosSatir(): SatirModel {
  return {
    ogrenimIdSet: new Set(),
    derece: 1,
    ek_gosterge: null,
    ek_odeme: null,
    oht: null,
    yan_odeme: null,
    sds_orani: null,
  }
}

const selDar = 'mt-0.5 w-full min-w-0 border border-slate-300 rounded-md px-1 py-1 text-xs bg-white'
const inpDar = 'mt-0.5 w-full min-w-0 border border-slate-300 rounded-md px-1 py-1 text-xs tabular-nums'

interface Props {
  unvanId: number
  unvanAdi: string
  ogrenimler: { id: number; isim: string }[]
  saltOkunur?: boolean
}

export default function KazancBilgiTopluEkleTabClient({
  unvanId,
  unvanAdi,
  ogrenimler,
  saltOkunur = false,
}: Props) {
  const [satirlar, setSatirlar] = useState<SatirModel[]>(() => [bosSatir()])
  const [satirSekme, setSatirSekme] = useState<KazancOgrenimSekmesi[]>(() => ['lisans_onlisans'])
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function satirEkle() {
    setSatirlar((s) => [...s, bosSatir()])
    setSatirSekme((t) => [...t, 'lisans_onlisans'])
  }

  function satirSil(idx: number) {
    setSatirlar((s) => (s.length <= 1 ? s : s.filter((_, i) => i !== idx)))
    setSatirSekme((t) => (t.length <= 1 ? t : t.filter((_, i) => i !== idx)))
  }

  function satirPatch(idx: number, patch: Partial<SatirModel>) {
    setSatirlar((s) => s.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  function toggleOgrenim(idx: number, oid: number) {
    setSatirlar((s) =>
      s.map((row, i) => {
        if (i !== idx) return row
        const n = new Set(row.ogrenimIdSet)
        if (n.has(oid)) n.delete(oid)
        else n.add(oid)
        return { ...row, ogrenimIdSet: n }
      }),
    )
  }

  function kaydet() {
    setHata(null)
    const gruplar: KazancGrupAyar[] = []
    for (let i = 0; i < satirlar.length; i++) {
      const r = satirlar[i]
      const ogrenim_ids = [...r.ogrenimIdSet]
      if (!ogrenim_ids.length) {
        setHata(`Satır ${i + 1}: en az bir öğrenim seçin.`)
        return
      }
      gruplar.push({
        ogrenim_ids,
        sira_no: null,
        unvan_id: unvanId,
        derece: r.derece,
        ek_gosterge: r.ek_gosterge,
        ek_odeme: r.ek_odeme,
        oht: r.oht,
        yan_odeme: r.yan_odeme,
        sds_orani: r.sds_orani,
      })
    }
    startTransition(async () => {
      const res = await kazancBilgiGruplariEkle(gruplar)
      if (res.hata) setHata(res.hata)
      else {
        broadcastIntradaRefresh('kazanc')
        if (typeof window !== 'undefined' && window.opener) {
          try {
            window.opener.postMessage({ source: 'intrada-kazanc-ekle', type: 'refresh' }, window.location.origin)
          } catch {
            window.opener.postMessage({ source: 'intrada-kazanc-ekle', type: 'refresh' }, '*')
          }
        }
        setSatirlar([bosSatir()])
        setSatirSekme(['lisans_onlisans'])
        if (typeof window !== 'undefined') window.close()
      }
    })
  }

  if (!ogrenimler.length) {
    return (
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-4">
        Öğrenim tanımı yok. Önce Tanımlar üzerinden en az bir öğrenim türü ekleyin.
      </p>
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kazanç — toplu ekle</h1>
          <p className="text-sm text-slate-600 mt-1">
            <span className="font-medium text-slate-800">{unvanAdi}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 justify-end">
          <TanimEkleListeGeriLink href="/tanimlar/kazanc-bilgi" label="Kazanç listesi" />
          <TanimEkleListeGeriLink href={`/tanimlar/kazanc-bilgi/${unvanId}`} label="Detaya dön" />
        </div>
      </div>

      {hata && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{hata}</div>}

      <div className="flex items-center justify-between mb-4 gap-4">
        <p className="text-sm text-slate-600 flex-1 min-w-0">
          Her satırda birden fazla öğrenim seçebilirsiniz; puanlar seçilen tüm öğrenimler için ortaktır. Liste tek satırda virgülle
          gösterilir. Kayıt sonrası pencere kapanır, diğer sekme yenilenir.
        </p>
        {!saltOkunur && (
          <button
            type="button"
            onClick={satirEkle}
            className="shrink-0 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50"
          >
            + Satır ekle
          </button>
        )}
      </div>

      <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
        {satirlar.map((r, idx) => {
          const sek = satirSekme[idx] ?? 'lisans_onlisans'
          const liste = kazancOgrenimlerSekmeListesi(ogrenimler, sek)
          return (
            <div
              key={idx}
              className="rounded-lg border border-slate-200 bg-slate-50/90 px-2 py-2 min-w-0 space-y-2"
            >
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex min-w-0 flex-[2] flex-col">
                  <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-1">
                    Öğrenim (çoklu)
                  </span>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {(['lisans_onlisans', 'lise_meslek'] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() =>
                          setSatirSekme((t) => {
                            const n = [...t]
                            n[idx] = k
                            return n
                          })
                        }
                        className={`px-2 py-0.5 text-[10px] rounded border ${
                          sek === k ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-300 text-slate-600'
                        }`}
                      >
                        {SEKME_ETIKET[k]}
                      </button>
                    ))}
                  </div>
                  <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-md bg-white px-2 py-1.5 space-y-1">
                    {liste.length === 0 ? (
                      <span className="text-xs text-slate-400">Bu grupta öğrenim yok.</span>
                    ) : (
                      liste.map((o) => (
                        <label key={o.id} className="flex items-center gap-2 text-xs text-slate-800">
                          <input
                            type="checkbox"
                            checked={r.ogrenimIdSet.has(o.id)}
                            onChange={() => toggleOgrenim(idx, o.id)}
                            className="rounded border-slate-300"
                          />
                          <span>{o.isim}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <label className="flex w-12 shrink-0 flex-col">
                  <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">D.</span>
                  <select
                    className={selDar}
                    value={r.derece}
                    onChange={(e) => satirPatch(idx, { derece: Number(e.target.value) })}
                  >
                    {DERECE_SEC.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
                {(
                  [
                    ['ek_gosterge', 'Ek G.'],
                    ['ek_odeme', 'Ek Ö.'],
                    ['oht', 'ÖHT'],
                    ['yan_odeme', 'Yan Ö.'],
                    ['sds_orani', 'SDS'],
                  ] as const
                ).map(([key, short]) => (
                  <label key={key} className="flex min-w-0 flex-1 flex-col">
                    <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">{short}</span>
                    <input
                      className={inpDar}
                      value={(r[key] as string | null) ?? ''}
                      onChange={(e) => satirPatch(idx, { [key]: e.target.value.trim() || null })}
                    />
                  </label>
                ))}
                <div className="shrink-0 flex items-end pb-0.5 pl-1">
                  <button
                    type="button"
                    onClick={() => satirSil(idx)}
                    className="text-xs text-red-600 hover:text-red-800 whitespace-nowrap disabled:opacity-40"
                    disabled={satirlar.length <= 1}
                    title="Satırı sil"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {!saltOkunur && (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            disabled={isPending}
            onClick={kaydet}
            className="px-5 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            {isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      )}
    </div>
  )
}
