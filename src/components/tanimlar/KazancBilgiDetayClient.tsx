'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { broadcastIntradaRefresh, useIntradaTabRefresh } from '@/lib/intrada-tab-sync'
import Modal from '@/components/ui/Modal'
import { useTanimlarSaltOkunur } from '@/components/tanimlar/TanimlarSaltOkunurContext'
import {
  kazancOgrenimlerSekmeListesi,
  kazancOgrenimSekmesi,
  type KazancOgrenimSekmesi,
} from '@/lib/kazanc-ogrenim-grup'
import {
  kazancGrupAnahtar,
  kazancSatirlariGrupla,
  grupOgrenimEtiket,
  type KazancBilgiListeRow,
} from '@/lib/kazanc-bilgi-grup'
import type { KazancGrupKayitGuncelle } from '@/app/(dashboard)/tanimlar/kazanc-bilgi/actions'
import {
  kazancBilgiGrupGuncelle,
  kazancBilgiTopluGrupGuncelle,
  kazancBilgiTopluSil,
} from '@/app/(dashboard)/tanimlar/kazanc-bilgi/actions'

const DERECE_SEC = Array.from({ length: 15 }, (_, i) => i + 1)

const SEKME_ETIKET: Record<KazancOgrenimSekmesi, string> = {
  lisans_onlisans: 'Lisans / Önlisans',
  lise_meslek: 'Meslek Lisesi / Lise',
}

type TopluGrupForm = {
  eskiSatirIds: number[]
  ogrenim_ids: number[]
  sira_no: string
  derece: string
  ek_gosterge: string
  ek_odeme: string
  oht: string
  yan_odeme: string
  sds_orani: string
}

interface Props {
  unvanId: number
  unvanAdi: string
  data: KazancBilgiListeRow[]
  ogrenimler: { id: number; isim: string }[]
}

function ogrenimDereceMusait(
  data: KazancBilgiListeRow[],
  ogrenimId: number,
  derece: number,
  haricSatirId: Set<number>,
): boolean {
  for (const r of data) {
    if (haricSatirId.has(r.id)) continue
    if (r.ogrenim_id === ogrenimId && r.derece === derece) return false
  }
  return true
}

export default function KazancBilgiDetayClient({ unvanId, unvanAdi, data, ogrenimler }: Props) {
  const router = useRouter()
  useIntradaTabRefresh('kazanc', router)
  const saltOkunur = useTanimlarSaltOkunur()
  const [gorunum, setGorunum] = useState<'liste' | 'toplu'>('liste')
  const [ogrenimSekmesi, setOgrenimSekmesi] = useState<KazancOgrenimSekmesi>('lisans_onlisans')

  const [duzenleGrup, setDuzenleGrup] = useState<KazancBilgiListeRow[] | null>(null)
  const [editSekme, setEditSekme] = useState<KazancOgrenimSekmesi>('lisans_onlisans')
  const [editOgrenimIds, setEditOgrenimIds] = useState<Set<number>>(() => new Set())
  const [editDerece, setEditDerece] = useState(1)
  const [editSiraNo, setEditSiraNo] = useState('')
  const [editEkGosterge, setEditEkGosterge] = useState('')
  const [editEkOdeme, setEditEkOdeme] = useState('')
  const [editOht, setEditOht] = useState('')
  const [editYanOdeme, setEditYanOdeme] = useState('')
  const [editSds, setEditSds] = useState('')

  const [hata, setHata] = useState<string | null>(null)
  const [topluHata, setTopluHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const gruplarFull = useMemo(() => kazancSatirlariGrupla(data), [data])

  const filtreliGruplar = useMemo(
    () =>
      gruplarFull.filter((g) =>
        g.some((r) => kazancOgrenimSekmesi(r.ogrenim_adi) === ogrenimSekmesi),
      ),
    [gruplarFull, ogrenimSekmesi],
  )

  const topluBaslangic = useMemo(() => {
    const m: Record<string, TopluGrupForm> = {}
    for (const g of gruplarFull) {
      const r0 = g[0]
      const k = kazancGrupAnahtar(r0)
      m[k] = {
        eskiSatirIds: g.map((x) => x.id),
        ogrenim_ids: g.map((x) => x.ogrenim_id),
        sira_no: r0.sira_no != null ? String(r0.sira_no) : '',
        derece: String(r0.derece),
        ek_gosterge: r0.ek_gosterge ?? '',
        ek_odeme: r0.ek_odeme ?? '',
        oht: r0.oht ?? '',
        yan_odeme: r0.yan_odeme ?? '',
        sds_orani: r0.sds_orani ?? '',
      }
    }
    return m
  }, [gruplarFull])

  const [topluState, setTopluState] = useState(topluBaslangic)
  const [topluSekme, setTopluSekme] = useState<Record<string, KazancOgrenimSekmesi>>({})

  useEffect(() => {
    setTopluState(topluBaslangic)
  }, [topluBaslangic])

  useEffect(() => {
    if (!duzenleGrup?.length) return
    const g = duzenleGrup
    setEditSekme('lisans_onlisans')
    setEditOgrenimIds(new Set(g.map((r) => r.ogrenim_id)))
    setEditDerece(g[0].derece)
    setEditSiraNo(g[0].sira_no != null ? String(g[0].sira_no) : '')
    setEditEkGosterge(g[0].ek_gosterge ?? '')
    setEditEkOdeme(g[0].ek_odeme ?? '')
    setEditOht(g[0].oht ?? '')
    setEditYanOdeme(g[0].yan_odeme ?? '')
    setEditSds(g[0].sds_orani ?? '')
    setHata(null)
  }, [duzenleGrup])

  const ogrenimlerEditSekmede = useMemo(
    () => kazancOgrenimlerSekmeListesi(ogrenimler, editSekme),
    [ogrenimler, editSekme],
  )

  function topluGrupAlan(grupKey: string, field: keyof TopluGrupForm, val: string) {
    setTopluState((prev) => {
      const s = prev[grupKey]
      if (!s) return prev
      if (field === 'derece') {
        const nd = parseInt(val, 10)
        if (!Number.isFinite(nd)) return { ...prev, [grupKey]: { ...s, derece: val } }
        const haric = new Set(s.eskiSatirIds)
        const keep = s.ogrenim_ids.filter((oid) => ogrenimDereceMusait(data, oid, nd, haric))
        return { ...prev, [grupKey]: { ...s, derece: val, ogrenim_ids: keep } }
      }
      return { ...prev, [grupKey]: { ...s, [field]: val } }
    })
  }

  function topluToggleOgrenim(grupKey: string, oid: number) {
    setTopluHata(null)
    setTopluState((prev) => {
      const s = prev[grupKey]
      if (!s) return prev
      const haric = new Set(s.eskiSatirIds)
      const d = parseInt(s.derece, 10)
      if (!Number.isFinite(d)) return prev
      const has = s.ogrenim_ids.includes(oid)
      if (has) {
        return {
          ...prev,
          [grupKey]: { ...s, ogrenim_ids: s.ogrenim_ids.filter((x) => x !== oid) },
        }
      }
      if (!ogrenimDereceMusait(data, oid, d, haric)) {
        setTopluHata('Bu öğrenim bu dereceyle başka bir kayıtta zaten var.')
        return prev
      }
      return { ...prev, [grupKey]: { ...s, ogrenim_ids: [...s.ogrenim_ids, oid] } }
    })
  }

  function topluKaydet() {
    setTopluHata(null)
    const kayitlar: KazancGrupKayitGuncelle[] = []
    for (const g of gruplarFull) {
      const k = kazancGrupAnahtar(g[0])
      const s = topluState[k]
      if (!s) continue
      if (!s.ogrenim_ids.length) {
        setTopluHata('Her grupta en az bir öğrenim seçili olmalıdır.')
        return
      }
      const derece = parseInt(s.derece, 10)
      if (!Number.isFinite(derece)) {
        setTopluHata('Derece geçerli olmalıdır.')
        return
      }
      kayitlar.push({
        eskiSatirIds: s.eskiSatirIds,
        ogrenim_ids: s.ogrenim_ids,
        sira_no: s.sira_no.trim() ? parseInt(s.sira_no, 10) : null,
        unvan_id: unvanId,
        derece,
        ek_gosterge: s.ek_gosterge.trim() || null,
        ek_odeme: s.ek_odeme.trim() || null,
        oht: s.oht.trim() || null,
        yan_odeme: s.yan_odeme.trim() || null,
        sds_orani: s.sds_orani.trim() || null,
      })
    }
    startTransition(async () => {
      const res = await kazancBilgiTopluGrupGuncelle(kayitlar, unvanId)
      if (res.hata) setTopluHata(res.hata)
      else {
        broadcastIntradaRefresh('kazanc')
        router.refresh()
      }
    })
  }

  function duzenleModalKaydet() {
    if (!duzenleGrup?.length) return
    setHata(null)
    const ids = [...editOgrenimIds]
    if (!ids.length) {
      setHata('En az bir öğrenim seçin.')
      return
    }
    const haric = new Set(duzenleGrup.map((r) => r.id))
    for (const oid of ids) {
      if (!ogrenimDereceMusait(data, oid, editDerece, haric)) {
        setHata('Seçilen öğrenimlerden biri bu dereceyle başka kayıtta zaten tanımlı.')
        return
      }
    }
    startTransition(async () => {
      const res = await kazancBilgiGrupGuncelle(
        duzenleGrup.map((r) => r.id),
        {
          ogrenim_ids: ids,
          sira_no: editSiraNo.trim() ? parseInt(editSiraNo, 10) : null,
          unvan_id: unvanId,
          derece: editDerece,
          ek_gosterge: editEkGosterge.trim() || null,
          ek_odeme: editEkOdeme.trim() || null,
          oht: editOht.trim() || null,
          yan_odeme: editYanOdeme.trim() || null,
          sds_orani: editSds.trim() || null,
        },
        unvanId,
      )
      if (res.hata) setHata(res.hata)
      else {
        setDuzenleGrup(null)
        broadcastIntradaRefresh('kazanc')
        router.refresh()
      }
    })
  }

  function editToggleOgrenim(oid: number) {
    if (!duzenleGrup) return
    const haric = new Set(duzenleGrup.map((r) => r.id))
    setEditOgrenimIds((prev) => {
      const n = new Set(prev)
      if (n.has(oid)) {
        setHata(null)
        n.delete(oid)
        return n
      }
      if (!ogrenimDereceMusait(data, oid, editDerece, haric)) {
        setHata('Bu öğrenim bu dereceyle başka kayıtta zaten var.')
        return prev
      }
      setHata(null)
      n.add(oid)
      return n
    })
  }

  function grupSil(grup: KazancBilgiListeRow[]) {
    const ids = grup.map((r) => r.id)
    if (!confirm(`${ids.length} kayıt silinsin mi?`)) return
    startTransition(async () => {
      const res = await kazancBilgiTopluSil(ids, unvanId)
      if (res.hata) alert(res.hata)
      else {
        broadcastIntradaRefresh('kazanc')
        router.refresh()
      }
    })
  }

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{unvanAdi}</h1>
            <p className="text-sm text-slate-500 mt-0.5">Aynı puanlı öğrenimler tek satırda listelenir</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0 sm:justify-end">
            <Link
              href="/tanimlar/kazanc-bilgi"
              className="text-sm border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 font-medium"
            >
              ← Kazanç listesi
            </Link>
            {!saltOkunur && (
              <Link
                href={`/tanimlar/kazanc-bilgi/${unvanId}/toplu-ekle`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 font-medium"
              >
                Kazanç Bilgisi Ekle
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 w-fit">
              <button
                type="button"
                onClick={() => setGorunum('liste')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                  gorunum === 'liste' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
                }`}
              >
                Listele
              </button>
              <button
                type="button"
                onClick={() => setGorunum('toplu')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                  gorunum === 'toplu' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
                }`}
              >
                Toplu düzenle
              </button>
            </div>
            {gorunum === 'toplu' && !saltOkunur && (
              <button
                type="button"
                disabled={isPending || data.length === 0}
                onClick={topluKaydet}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
              >
                {isPending ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Öğrenim grubu</span>
          {(['lisans_onlisans', 'lise_meslek'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setOgrenimSekmesi(k)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border ${
                ogrenimSekmesi === k
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              }`}
            >
              {SEKME_ETIKET[k]}
            </button>
          ))}
        </div>
      </div>

      {gorunum === 'liste' && (
        <>
          {hata && !duzenleGrup && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{hata}</div>
          )}
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm min-w-[880px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 w-14">Sıra no</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 min-w-[12rem]">Öğrenim</th>
                  <th className="text-center px-2 py-3 font-semibold text-slate-600">Derece</th>
                  <th className="text-right px-2 py-3 font-semibold text-slate-600">Ek Gösterge</th>
                  <th className="text-right px-2 py-3 font-semibold text-slate-600">Ek Ödeme</th>
                  <th className="text-right px-2 py-3 font-semibold text-slate-600">ÖHT</th>
                  <th className="text-right px-2 py-3 font-semibold text-slate-600">Yan Ödeme</th>
                  <th className="text-right px-2 py-3 font-semibold text-slate-600">SDS</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 w-28">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtreliGruplar.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      Bu öğrenim grubunda kayıt yok. «Kazanç Bilgisi Ekle» ile yeni sekmede toplu ekleyin.
                    </td>
                  </tr>
                )}
                {filtreliGruplar.map((grup) => {
                  const r0 = grup[0]
                  const gkey = kazancGrupAnahtar(r0)
                  return (
                    <tr key={gkey}>
                      <td className="px-3 py-2.5 tabular-nums">{r0.sira_no ?? '—'}</td>
                      <td className="px-3 py-2.5 text-slate-800">{grupOgrenimEtiket(grup)}</td>
                      <td className="px-2 py-2.5 text-center tabular-nums">{r0.derece}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-xs">{r0.ek_gosterge ?? '—'}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-xs">{r0.ek_odeme ?? '—'}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-xs">{r0.oht ?? '—'}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-xs">{r0.yan_odeme ?? '—'}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-xs">{r0.sds_orani ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right">
                        {!saltOkunur && (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setHata(null)
                                setDuzenleGrup(grup)
                              }}
                              className="text-sky-600 hover:text-sky-800 text-xs font-medium"
                            >
                              Düzenle
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => grupSil(grup)}
                              className="text-red-600 hover:text-red-800 text-xs font-medium"
                            >
                              Sil
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {gorunum === 'toplu' && !saltOkunur && (
        <div className="space-y-4">
          {topluHata && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{topluHata}</div>
          )}
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs min-w-[980px]">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="p-2 text-left w-12">Sıra</th>
                  <th className="p-2 text-left min-w-[14rem]">Öğrenim (çoklu)</th>
                  <th className="p-2">Drc</th>
                  <th className="p-2">Ek Göst</th>
                  <th className="p-2">Ek Öd</th>
                  <th className="p-2">ÖHT</th>
                  <th className="p-2">Yan Öd</th>
                  <th className="p-2">SDS</th>
                </tr>
              </thead>
              <tbody>
                {filtreliGruplar.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400">
                      Bu öğrenim grubunda satır yok.
                    </td>
                  </tr>
                )}
                {filtreliGruplar.map((grup) => {
                  const r0 = grup[0]
                  const gkey = kazancGrupAnahtar(r0)
                  const s = topluState[gkey]
                  if (!s) return null
                  const ts = topluSekme[gkey] ?? 'lisans_onlisans'
                  const haric = new Set(s.eskiSatirIds)
                  const liste = kazancOgrenimlerSekmeListesi(ogrenimler, ts)
                  return (
                    <tr key={gkey} className="border-b border-slate-100 align-top">
                      <td className="p-1">
                        <input
                          className="w-12 border rounded px-1 py-0.5"
                          value={s.sira_no}
                          onChange={(e) => topluGrupAlan(gkey, 'sira_no', e.target.value)}
                        />
                      </td>
                      <td className="p-1">
                        <div className="flex flex-wrap gap-0.5 mb-1">
                          {(['lisans_onlisans', 'lise_meslek'] as const).map((k) => (
                            <button
                              key={k}
                              type="button"
                              onClick={() => setTopluSekme((prev) => ({ ...prev, [gkey]: k }))}
                              className={`px-1.5 py-0.5 text-[10px] rounded border ${
                                ts === k ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-300 text-slate-600'
                              }`}
                            >
                              {k === 'lisans_onlisans' ? 'L/Ö' : 'M/L'}
                            </button>
                          ))}
                        </div>
                        <div className="max-h-24 overflow-y-auto border rounded px-1 py-0.5 bg-white space-y-0.5">
                          {liste.map((o) => {
                            const checked = s.ogrenim_ids.includes(o.id)
                            const d = parseInt(s.derece, 10)
                            const musait = !checked && Number.isFinite(d) ? ogrenimDereceMusait(data, o.id, d, haric) : true
                            return (
                              <label
                                key={o.id}
                                className={`flex items-center gap-1 ${!musait && !checked ? 'text-slate-400' : 'text-slate-800'}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={!musait && !checked}
                                  onChange={() => topluToggleOgrenim(gkey, o.id)}
                                />
                                <span className="truncate">{o.isim}</span>
                              </label>
                            )
                          })}
                        </div>
                      </td>
                      <td className="p-1">
                        <select
                          className="w-11 border rounded px-0.5"
                          value={s.derece}
                          onChange={(e) => topluGrupAlan(gkey, 'derece', e.target.value)}
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
                          className="w-14 border rounded px-1"
                          value={s.ek_gosterge}
                          onChange={(e) => topluGrupAlan(gkey, 'ek_gosterge', e.target.value)}
                        />
                      </td>
                      <td className="p-1">
                        <input
                          className="w-14 border rounded px-1"
                          value={s.ek_odeme}
                          onChange={(e) => topluGrupAlan(gkey, 'ek_odeme', e.target.value)}
                        />
                      </td>
                      <td className="p-1">
                        <input
                          className="w-12 border rounded px-1"
                          value={s.oht}
                          onChange={(e) => topluGrupAlan(gkey, 'oht', e.target.value)}
                        />
                      </td>
                      <td className="p-1">
                        <input
                          className="w-12 border rounded px-1"
                          value={s.yan_odeme}
                          onChange={(e) => topluGrupAlan(gkey, 'yan_odeme', e.target.value)}
                        />
                      </td>
                      <td className="p-1">
                        <input
                          className="w-12 border rounded px-1"
                          value={s.sds_orani}
                          onChange={(e) => topluGrupAlan(gkey, 'sds_orani', e.target.value)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={!!duzenleGrup?.length} onClose={() => setDuzenleGrup(null)} title="Kazanç bilgisi düzenle" size="lg">
        {duzenleGrup && duzenleGrup.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Öğrenimleri çoklu seçin; puanlar tüm seçilenler için geçerli olur.
            </p>
            <label className="text-sm block">
              <span className="text-slate-600">Sıra no</span>
              <input
                type="number"
                value={editSiraNo}
                onChange={(e) => setEditSiraNo(e.target.value)}
                className="mt-1 w-full border rounded-lg px-2 py-1.5"
              />
            </label>
            <div className="flex gap-2">
              {(['lisans_onlisans', 'lise_meslek'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setEditSekme(k)}
                  className={`px-3 py-1.5 text-sm rounded-lg border ${
                    editSekme === k ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-300 text-slate-600'
                  }`}
                >
                  {SEKME_ETIKET[k]}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <span>Derece</span>
              <select
                value={editDerece}
                onChange={(e) => {
                  const d = parseInt(e.target.value, 10) || 1
                  setEditDerece(d)
                  const haric = new Set(duzenleGrup.map((r) => r.id))
                  setEditOgrenimIds((prev) => {
                    const n = new Set<number>()
                    for (const id of prev) {
                      if (ogrenimDereceMusait(data, id, d, haric)) n.add(id)
                    }
                    return n
                  })
                }}
                className="border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
              >
                {DERECE_SEC.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-3">
              {ogrenimlerEditSekmede.length === 0 ? (
                <p className="text-sm text-slate-500">Bu sekmede tanımlı öğrenim yok.</p>
              ) : (
                ogrenimlerEditSekmede.map((o) => {
                  const checked = editOgrenimIds.has(o.id)
                  const haric = new Set(duzenleGrup.map((r) => r.id))
                  const musait = checked || ogrenimDereceMusait(data, o.id, editDerece, haric)
                  return (
                    <label
                      key={o.id}
                      className={`flex items-center gap-2 text-sm ${!musait ? 'text-slate-400' : 'text-slate-800'}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!musait}
                        onChange={() => editToggleOgrenim(o.id)}
                      />
                      <span>{o.isim}</span>
                      {!musait && !checked && <span className="text-xs">(başka kayıtta)</span>}
                    </label>
                  )
                })
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <label className="text-sm">
                Ek Gösterge
                <input
                  value={editEkGosterge}
                  onChange={(e) => setEditEkGosterge(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-2 py-1.5 tabular-nums"
                />
              </label>
              <label className="text-sm">
                Ek Ödeme
                <input
                  value={editEkOdeme}
                  onChange={(e) => setEditEkOdeme(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-2 py-1.5 tabular-nums"
                />
              </label>
              <label className="text-sm">
                ÖHT
                <input
                  value={editOht}
                  onChange={(e) => setEditOht(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-2 py-1.5 tabular-nums"
                />
              </label>
              <label className="text-sm">
                Yan Ödeme
                <input
                  value={editYanOdeme}
                  onChange={(e) => setEditYanOdeme(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-2 py-1.5 tabular-nums"
                />
              </label>
              <label className="text-sm">
                SDS
                <input
                  value={editSds}
                  onChange={(e) => setEditSds(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-2 py-1.5 tabular-nums"
                />
              </label>
            </div>
            {hata && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{hata}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDuzenleGrup(null)}
                className="px-3 py-1.5 border rounded-lg text-sm"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={duzenleModalKaydet}
                className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-sm disabled:opacity-50"
              >
                Kaydet
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
