'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'
import { useTanimlarSaltOkunur } from '@/components/tanimlar/TanimlarSaltOkunurContext'

export type YerelBilgiTanimRow = {
  id: number
  sira_no: number | null
  tanim_adi: string
  aktif: boolean
}

type Props = {
  title: string
  description?: string
  geriHref?: string
  geriLabel?: string
  rows: YerelBilgiTanimRow[]
  /** RSC'den güvenli: satıra tıklanınca `${satirDetayBase}/${id}` */
  satirDetayBase?: string
  /** Yalnızca istemci üst bileşenden: özel rota (sunucudan fonksiyon geçirilemez) */
  satirHref?: (row: YerelBilgiTanimRow) => string | null
  topluEkle: (satirlar: { sira_no: number | null; tanim_adi: string }[]) => Promise<{ hata?: string }>
  tekGuncelle: (id: number, fd: FormData) => Promise<{ hata?: string }>
  topluGuncelle: (guncellemeler: YerelBilgiTanimRow[]) => Promise<{ hata?: string }>
  toggleAktif: (id: number, mevcutAktif: boolean) => Promise<{ hata?: string }>
}

export default function YerelBilgiTanimListeClient({
  title,
  description,
  geriHref,
  geriLabel = '← Yerel Bilgi — Tanımlar',
  rows: initialRows,
  satirDetayBase,
  satirHref,
  topluEkle,
  tekGuncelle,
  topluGuncelle,
  toggleAktif,
}: Props) {
  const saltOkunur = useTanimlarSaltOkunur()
  const router = useRouter()
  const [rows, setRows] = useState(initialRows)
  const [yeniSatirlar, setYeniSatirlar] = useState<{ sira_no: string; tanim_adi: string }[]>([])
  const [modalYeni, setModalYeni] = useState(false)
  const [modalTek, setModalTek] = useState<YerelBilgiTanimRow | null>(null)
  const [topluMod, setTopluMod] = useState(false)
  const [topluDraft, setTopluDraft] = useState<YerelBilgiTanimRow[]>([])
  const [sunucuHata, setSunucuHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setRows(initialRows)
  }, [initialRows])

  function yeniSatirEkle() {
    setYeniSatirlar(prev => [...prev, { sira_no: '', tanim_adi: '' }])
  }
  function yeniSatirGuncelle(i: number, alan: 'sira_no' | 'tanim_adi', v: string) {
    setYeniSatirlar(prev => prev.map((r, j) => (j === i ? { ...r, [alan]: v } : r)))
  }
  function yeniSatirSil(i: number) {
    setYeniSatirlar(prev => prev.filter((_, j) => j !== i))
  }

  function modalYeniKaydet() {
    setSunucuHata(null)
    const parsed = yeniSatirlar
      .map(r => ({
        sira_no: r.sira_no.trim() === '' ? null : Number(r.sira_no),
        tanim_adi: r.tanim_adi.trim(),
      }))
      .filter(r => r.tanim_adi.length > 0)
    for (const p of parsed) {
      if (p.sira_no != null && !Number.isFinite(p.sira_no)) {
        setSunucuHata('Sıra no geçerli sayı olmalıdır.')
        return
      }
    }
    startTransition(async () => {
      const res = await topluEkle(parsed.map(p => ({ sira_no: p.sira_no, tanim_adi: p.tanim_adi })))
      if (res.hata) setSunucuHata(res.hata)
      else {
        setModalYeni(false)
        setYeniSatirlar([])
        router.refresh()
      }
    })
  }

  function tekKaydet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!modalTek) return
    setSunucuHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await tekGuncelle(modalTek.id, fd)
      if (res.hata) setSunucuHata(res.hata)
      else {
        setModalTek(null)
        router.refresh()
      }
    })
  }

  function topluModAc() {
    setSunucuHata(null)
    setTopluDraft(rows.map(r => ({ ...r })))
    setTopluMod(true)
  }

  function topluModKaydet() {
    setSunucuHata(null)
    startTransition(async () => {
      const res = await topluGuncelle(topluDraft)
      if (res.hata) setSunucuHata(res.hata)
      else {
        setTopluMod(false)
        router.refresh()
      }
    })
  }

  function handleToggle(r: YerelBilgiTanimRow) {
    setSunucuHata(null)
    startTransition(async () => {
      const res = await toggleAktif(r.id, r.aktif)
      if (res.hata) setSunucuHata(res.hata)
      else router.refresh()
    })
  }

  const sirali = useMemo(() => {
    return [...rows].sort((a, b) => {
      const sa = a.sira_no ?? 999999
      const sb = b.sira_no ?? 999999
      if (sa !== sb) return sa - sb
      return a.id - b.id
    })
  }, [rows])

  const geriBtn =
    'inline-flex items-center rounded-lg bg-slate-800 text-white text-sm px-4 py-2 font-medium hover:bg-slate-700 transition-colors'

  return (
    <div>
      <div className="mb-6 space-y-3">
        {geriHref && (
          <div className="flex justify-end">
            <Link href={geriHref} className={geriBtn}>
              {geriLabel}
            </Link>
          </div>
        )}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
            {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
          </div>
          {!saltOkunur && (
            <div className="flex flex-wrap items-center gap-2 justify-end shrink-0 lg:pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setSunucuHata(null)
                  setYeniSatirlar([])
                  setModalYeni(true)
                }}
                className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Yeni Tanım Ekle
              </button>
              <button
                type="button"
                onClick={() => (topluMod ? setTopluMod(false) : topluModAc())}
                className={`text-sm px-4 py-2 rounded-lg border font-medium ${
                  topluMod
                    ? 'border-amber-400 bg-amber-50 text-amber-900'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {topluMod ? 'Toplu düzenlemeyi kapat' : 'Toplu Düzenleme'}
              </button>
              {topluMod && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={topluModKaydet}
                  className="text-sm px-4 py-2 rounded-lg bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50"
                >
                  Toplu kaydet
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {sunucuHata && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{sunucuHata}</div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-24">Sıra No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Tanım Adı</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-36">Durum</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 w-32">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sirali.length === 0 && !topluMod && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-400">
                    Henüz kayıt yok. «Yeni Tanım Ekle» ile bir veya birden fazla satır ekleyebilirsiniz.
                  </td>
                </tr>
              )}
              {sirali.map(r => {
                const href =
                  satirDetayBase != null && satirDetayBase !== ''
                    ? `${satirDetayBase.replace(/\/$/, '')}/${r.id}`
                    : satirHref?.(r) ?? null
                const draft = topluMod ? topluDraft.find(d => d.id === r.id) : null
                const goster = draft ?? r
                return (
                  <tr
                    key={r.id}
                    className={`hover:bg-slate-50 ${href && !topluMod ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (topluMod || !href) return
                      router.push(href)
                    }}
                  >
                    <td className="px-4 py-3 tabular-nums text-slate-700">
                      {topluMod && draft ? (
                        <input
                          className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
                          value={draft.sira_no ?? ''}
                          onChange={e => {
                            const v = e.target.value
                            setTopluDraft(prev =>
                              prev.map(x =>
                                x.id === r.id
                                  ? { ...x, sira_no: v === '' ? null : Number(v) }
                                  : x,
                              ),
                            )
                          }}
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-slate-600">{r.sira_no ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {topluMod && draft ? (
                        <input
                          className="w-full max-w-md px-2 py-1 border border-slate-300 rounded text-sm"
                          value={draft.tanim_adi}
                          onChange={e =>
                            setTopluDraft(prev =>
                              prev.map(x => (x.id === r.id ? { ...x, tanim_adi: e.target.value } : x)),
                            )
                          }
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <span className="font-medium text-slate-800">{r.tanim_adi}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {topluMod && draft ? (
                        <select
                          className="text-sm border border-slate-300 rounded px-2 py-1"
                          value={draft.aktif ? '1' : '0'}
                          onChange={e =>
                            setTopluDraft(prev =>
                              prev.map(x =>
                                x.id === r.id ? { ...x, aktif: e.target.value === '1' } : x,
                              ),
                            )
                          }
                          onClick={e => e.stopPropagation()}
                        >
                          <option value="1">Aktif</option>
                          <option value="0">Pasif</option>
                        </select>
                      ) : (
                        <button
                          type="button"
                          disabled={isPending || saltOkunur}
                          onClick={e => {
                            e.stopPropagation()
                            handleToggle(r)
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                            r.aktif
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${r.aktif ? 'bg-green-500' : 'bg-slate-400'}`} />
                          {r.aktif ? 'Aktif' : 'Pasif'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      {!saltOkunur && !topluMod && (
                        <button
                          type="button"
                          onClick={() => {
                            setSunucuHata(null)
                            setModalTek(r)
                          }}
                          className="text-sm text-slate-600 hover:text-slate-900 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100"
                        >
                          Düzenle
                        </button>
                      )}
                      {saltOkunur && <span className="text-xs text-slate-400">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Çoklu yeni — Aile çocuk ekle benzeri */}
      <Modal open={modalYeni} onClose={() => setModalYeni(false)} title="Yeni Tanım Ekle" size="lg">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600">Birden fazla satır ekleyebilirsiniz.</p>
            <button
              type="button"
              onClick={yeniSatirEkle}
              className="text-xs font-medium border border-slate-300 px-2.5 py-1 rounded-lg hover:bg-slate-50"
            >
              + Satır Ekle
            </button>
          </div>
          {yeniSatirlar.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">Satır eklemek için «+ Satır Ekle» kullanın.</p>
          )}
          {yeniSatirlar.map((s, i) => (
            <div key={i} className="flex flex-wrap gap-2 items-end border-t border-slate-100 pt-3 first:border-0 first:pt-0">
              <div className="w-24">
                <label className="block text-xs text-slate-500 mb-1">Sıra No</label>
                <input
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
                  value={s.sira_no}
                  onChange={e => yeniSatirGuncelle(i, 'sira_no', e.target.value)}
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs text-slate-500 mb-1">Tanım Adı</label>
                <input
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
                  value={s.tanim_adi}
                  onChange={e => yeniSatirGuncelle(i, 'tanim_adi', e.target.value)}
                />
              </div>
              <button type="button" onClick={() => yeniSatirSil(i)} className="p-2 text-red-400 hover:text-red-600 mb-0.5">
                ✕
              </button>
            </div>
          ))}
          {sunucuHata && modalYeni && <p className="text-sm text-red-600">{sunucuHata}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalYeni(false)} className="px-4 py-2 text-sm border rounded-lg">
              İptal
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={modalYeniKaydet}
              className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
            >
              Kaydet
            </button>
          </div>
        </div>
      </Modal>

      {/* Tek satır düzenle */}
      <Modal open={!!modalTek} onClose={() => setModalTek(null)} title="Tanım Düzenle" size="md">
        {modalTek && (
          <form onSubmit={tekKaydet} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sıra No</label>
              <input
                name="sira_no"
                type="number"
                defaultValue={modalTek.sira_no ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tanım Adı *</label>
              <input
                name="tanim_adi"
                required
                defaultValue={modalTek.tanim_adi}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Durum</label>
              <select
                name="aktif"
                defaultValue={modalTek.aktif ? 'true' : 'false'}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
            </div>
            {sunucuHata && <p className="text-sm text-red-600">{sunucuHata}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModalTek(null)} className="px-4 py-2 text-sm border rounded-lg">
                İptal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg disabled:opacity-50"
              >
                Kaydet
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
