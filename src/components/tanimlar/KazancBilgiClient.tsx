'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { useIntradaTabRefresh } from '@/lib/intrada-tab-sync'
import Modal from '@/components/ui/Modal'
import { useTanimlarSaltOkunur } from '@/components/tanimlar/TanimlarSaltOkunurContext'
import type { Tables } from '@/types/database'
import type { KazancTopluGuncelleme } from '@/app/(dashboard)/tanimlar/kazanc-bilgi/actions'

type Row = Tables<'tanim_kazanc_bilgisi'> & { unvan_adi: string; ogrenim_adi: string }

const DERECE_SEC = Array.from({ length: 15 }, (_, i) => i + 1)

interface Props {
  data: Row[]
  unvanlar: { id: number; unvan_adi: string }[]
  ogrenimler: { id: number; isim: string }[]
  onGuncelle: (id: number, fd: FormData) => Promise<{ hata?: string }>
  onSil: (id: number) => Promise<{ hata?: string }>
  onTopluGuncelle: (g: KazancTopluGuncelleme[]) => Promise<{ hata?: string }>
}

function rowToInline(r: Row): Record<string, string> {
  return {
    sira_no: r.sira_no != null ? String(r.sira_no) : '',
    unvan_id: String(r.unvan_id),
    ogrenim_id: String(r.ogrenim_id),
    derece: String(r.derece),
    ek_gosterge: r.ek_gosterge ?? '',
    ek_odeme: r.ek_odeme ?? '',
    oht: r.oht ?? '',
    yan_odeme: r.yan_odeme ?? '',
    sds_orani: r.sds_orani ?? '',
  }
}

export default function KazancBilgiClient({ data, unvanlar, ogrenimler, onGuncelle, onSil, onTopluGuncelle }: Props) {
  const router = useRouter()
  useIntradaTabRefresh('kazanc', router)
  const saltOkunur = useTanimlarSaltOkunur()
  const [sekme, setSekme] = useState<'liste' | 'toplu'>('liste')
  const [duzenle, setDuzenle] = useState<Row | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [topluHata, setTopluHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const topluBaslangic = useMemo(() => {
    const m: Record<number, Record<string, string>> = {}
    for (const r of data) m[r.id] = rowToInline(r)
    return m
  }, [data])

  const [topluState, setTopluState] = useState(topluBaslangic)

  useEffect(() => {
    setTopluState(topluBaslangic)
  }, [topluBaslangic])

  function topluAlan(id: number, key: string, val: string) {
    setTopluState((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), [key]: val },
    }))
  }

  function topluKaydet() {
    setTopluHata(null)
    const guncellemeler: KazancTopluGuncelleme[] = []
    for (const r of data) {
      const s = topluState[r.id]
      if (!s) continue
      const unvan_id = parseInt(s.unvan_id, 10)
      const ogrenim_id = parseInt(s.ogrenim_id, 10)
      const derece = parseInt(s.derece, 10)
      if (!Number.isFinite(unvan_id) || !Number.isFinite(ogrenim_id) || !Number.isFinite(derece)) {
        setTopluHata('Tüm satırlarda unvan, öğrenim ve derece geçerli olmalıdır.')
        return
      }
      guncellemeler.push({
        id: r.id,
        sira_no: s.sira_no.trim() ? parseInt(s.sira_no, 10) : null,
        unvan_id,
        ogrenim_id,
        derece,
        ek_gosterge: s.ek_gosterge.trim() || null,
        ek_odeme: s.ek_odeme.trim() || null,
        oht: s.oht.trim() || null,
        yan_odeme: s.yan_odeme.trim() || null,
        sds_orani: s.sds_orani.trim() || null,
      })
    }
    startTransition(async () => {
      const res = await onTopluGuncelle(guncellemeler)
      if (res.hata) setTopluHata(res.hata)
    })
  }

  function duzenleKaydet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!duzenle) return
    setHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await onGuncelle(duzenle.id, fd)
      if (res.hata) setHata(res.hata)
      else setDuzenle(null)
    })
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Kazanç Bilgileri</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setSekme('liste')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                sekme === 'liste' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
              }`}
            >
              Liste
            </button>
            <button
              type="button"
              onClick={() => setSekme('toplu')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                sekme === 'toplu' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
              }`}
            >
              Toplu düzenle
            </button>
          </div>
          {!saltOkunur && (
            <Link
              href="/tanimlar/kazanc-bilgi/ekle"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 font-medium"
            >
              Kazanç Bilgisi Ekle
            </Link>
          )}
        </div>
      </div>

      {sekme === 'liste' && (
        <>
          {hata && !duzenle && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{hata}</div>
          )}
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 w-14">Sıra</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 min-w-[8rem]">Unvan</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 min-w-[7rem]">Öğrenim</th>
                  <th className="text-center px-2 py-3 font-semibold text-slate-600">D</th>
                  <th className="text-right px-2 py-3 font-semibold text-slate-600">Ek Göst.</th>
                  <th className="text-right px-2 py-3 font-semibold text-slate-600">Ek Öd.</th>
                  <th className="text-right px-2 py-3 font-semibold text-slate-600">ÖHT</th>
                  <th className="text-right px-2 py-3 font-semibold text-slate-600">Yan Öd.</th>
                  <th className="text-right px-2 py-3 font-semibold text-slate-600">SDS</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 w-28">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-center py-12 text-slate-400">
                      Kayıt yok. &quot;Kazanç Bilgisi Ekle&quot; yeni sekmede açılır.
                    </td>
                  </tr>
                )}
                {data.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2.5 tabular-nums">{r.sira_no ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-800">{r.unvan_adi}</td>
                    <td className="px-3 py-2.5 text-slate-700">{r.ogrenim_adi}</td>
                    <td className="px-2 py-2.5 text-center tabular-nums">{r.derece}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-xs">{r.ek_gosterge ?? '—'}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-xs">{r.ek_odeme ?? '—'}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-xs">{r.oht ?? '—'}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-xs">{r.yan_odeme ?? '—'}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-xs">{r.sds_orani ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      {!saltOkunur && (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setHata(null)
                              setDuzenle(r)
                            }}
                            className="text-sky-600 hover:text-sky-800 text-xs font-medium"
                          >
                            Düzenle
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              if (!confirm('Bu satır silinsin mi?')) return
                              startTransition(async () => {
                                const res = await onSil(r.id)
                                if (res.hata) alert(res.hata)
                              })
                            }}
                            className="text-red-600 hover:text-red-800 text-xs font-medium"
                          >
                            Sil
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {sekme === 'toplu' && !saltOkunur && (
        <div className="space-y-4">
          {topluHata && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{topluHata}</div>
          )}
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs min-w-[1020px]">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="p-2 text-left">Sıra</th>
                  <th className="p-2 text-left">Unvan</th>
                  <th className="p-2 text-left">Öğrenim</th>
                  <th className="p-2">D</th>
                  <th className="p-2">Ek Göst</th>
                  <th className="p-2">Ek Öd</th>
                  <th className="p-2">ÖHT</th>
                  <th className="p-2">Yan Öd</th>
                  <th className="p-2">SDS</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => {
                  const s = topluState[r.id] ?? rowToInline(r)
                  return (
                    <tr key={r.id} className="border-b border-slate-100">
                      <td className="p-1">
                        <input
                          className="w-12 border rounded px-1 py-0.5"
                          value={s.sira_no}
                          onChange={(e) => topluAlan(r.id, 'sira_no', e.target.value)}
                        />
                      </td>
                      <td className="p-1">
                        <select
                          className="max-w-[10rem] border rounded px-1 py-0.5"
                          value={s.unvan_id}
                          onChange={(e) => topluAlan(r.id, 'unvan_id', e.target.value)}
                        >
                          {unvanlar.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.unvan_adi}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-1">
                        <select
                          className="max-w-[9rem] border rounded px-1 py-0.5"
                          value={s.ogrenim_id}
                          onChange={(e) => topluAlan(r.id, 'ogrenim_id', e.target.value)}
                        >
                          {ogrenimler.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.isim}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-1">
                        <select
                          className="w-12 border rounded px-0.5"
                          value={s.derece}
                          onChange={(e) => topluAlan(r.id, 'derece', e.target.value)}
                        >
                          {DERECE_SEC.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-1">
                        <input
                          className="w-16 border rounded px-1"
                          value={s.ek_gosterge}
                          onChange={(e) => topluAlan(r.id, 'ek_gosterge', e.target.value)}
                        />
                      </td>
                      <td className="p-1">
                        <input
                          className="w-16 border rounded px-1"
                          value={s.ek_odeme}
                          onChange={(e) => topluAlan(r.id, 'ek_odeme', e.target.value)}
                        />
                      </td>
                      <td className="p-1">
                        <input
                          className="w-14 border rounded px-1"
                          value={s.oht}
                          onChange={(e) => topluAlan(r.id, 'oht', e.target.value)}
                        />
                      </td>
                      <td className="p-1">
                        <input
                          className="w-14 border rounded px-1"
                          value={s.yan_odeme}
                          onChange={(e) => topluAlan(r.id, 'yan_odeme', e.target.value)}
                        />
                      </td>
                      <td className="p-1">
                        <input
                          className="w-14 border rounded px-1"
                          value={s.sds_orani}
                          onChange={(e) => topluAlan(r.id, 'sds_orani', e.target.value)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            disabled={isPending || data.length === 0}
            onClick={topluKaydet}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            {isPending ? 'Kaydediliyor…' : 'Toplu kaydet'}
          </button>
        </div>
      )}

      <Modal open={!!duzenle} onClose={() => setDuzenle(null)} title="Kazanç bilgisi düzenle" size="lg">
        {duzenle && (
          <form onSubmit={duzenleKaydet} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="text-slate-600">Sıra no</span>
                <input
                  name="sira_no"
                  type="number"
                  defaultValue={duzenle.sira_no ?? ''}
                  className="mt-1 w-full border rounded-lg px-2 py-1.5"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="text-sm">
                <span className="text-slate-600">Unvan</span>
                <select
                  name="unvan_id"
                  defaultValue={duzenle.unvan_id}
                  className="mt-1 w-full border rounded-lg px-2 py-1.5 bg-white"
                  required
                >
                  {unvanlar.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.unvan_adi}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="text-slate-600">Öğrenim</span>
                <select
                  name="ogrenim_id"
                  defaultValue={duzenle.ogrenim_id}
                  className="mt-1 w-full border rounded-lg px-2 py-1.5 bg-white"
                  required
                >
                  {ogrenimler.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.isim}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="text-slate-600">Derece</span>
                <select
                  name="derece"
                  defaultValue={duzenle.derece}
                  className="mt-1 w-full border rounded-lg px-2 py-1.5 bg-white"
                  required
                >
                  {DERECE_SEC.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <label className="text-sm">
                Ek Gösterge
                <input
                  name="ek_gosterge"
                  defaultValue={duzenle.ek_gosterge ?? ''}
                  className="mt-1 w-full border rounded-lg px-2 py-1.5 tabular-nums"
                />
              </label>
              <label className="text-sm">
                Ek Ödeme
                <input
                  name="ek_odeme"
                  defaultValue={duzenle.ek_odeme ?? ''}
                  className="mt-1 w-full border rounded-lg px-2 py-1.5 tabular-nums"
                />
              </label>
              <label className="text-sm">
                ÖHT
                <input name="oht" defaultValue={duzenle.oht ?? ''} className="mt-1 w-full border rounded-lg px-2 py-1.5 tabular-nums" />
              </label>
              <label className="text-sm">
                Yan Ödeme
                <input
                  name="yan_odeme"
                  defaultValue={duzenle.yan_odeme ?? ''}
                  className="mt-1 w-full border rounded-lg px-2 py-1.5 tabular-nums"
                />
              </label>
              <label className="text-sm">
                SDS
                <input
                  name="sds_orani"
                  defaultValue={duzenle.sds_orani ?? ''}
                  className="mt-1 w-full border rounded-lg px-2 py-1.5 tabular-nums"
                />
              </label>
            </div>
            {hata && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{hata}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setDuzenle(null)} className="px-3 py-1.5 border rounded-lg text-sm">
                İptal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-sm disabled:opacity-50"
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
