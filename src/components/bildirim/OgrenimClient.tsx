'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import OgrenimIsaretAciklama from '@/components/bildirim/OgrenimIsaretAciklama'
import { CopKutusuSilDugmesi, KalemDuzenleDugmesi, SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import { useIntradaTabRefresh } from '@/lib/intrada-tab-sync'
import { ogrenimAuditDegerGoster, ogrenimAuditDiffSatirlari } from '@/lib/ogrenim-audit'
import { sortBildirimOgrenimList } from '@/lib/ogrenim-sira'
import type { OgrenimTopluSatir } from '@/app/(dashboard)/bildirim/ogrenim/actions'
import type { Tables } from '@/types/database'

type Ogrenim = Tables<'calisan_ogrenim'> & {
  ad_soyad?: string | null
  tckn?: string | null
  kadro_unvani?: string | null
  gorev_unvani?: string | null
}

function formatGGAAYYYY(val: string | null | undefined): string {
  if (!val) return '—'
  const d = val.includes('-') ? val : val.split('.').reverse().join('-')
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(d)
  if (!m) return val
  const [, y, a, g] = m
  return `${g!.padStart(2, '0')}.${a!.padStart(2, '0')}.${y}`
}

function mezuniyetGoster(row: Ogrenim): string {
  if (row.mezuniyet_tarihi) return formatGGAAYYYY(row.mezuniyet_tarihi)
  if (row.mezuniyet_yili) return `01.01.${row.mezuniyet_yili}`
  return '—'
}

function mezuniyetInput(row: Ogrenim): string {
  const g = mezuniyetGoster(row)
  return g === '—' ? '' : g
}

type TopluForm = {
  ogrenim_turu: string
  okul_adi: string
  bolum: string
  meslegi: string
  mezuniyet_tarihi: string
  varsayilan: boolean
  kadrosu_ile_ilgili: boolean
  teknik_ogrenim: boolean
}

function topluBaslangic(kayitlar: Ogrenim[]): Record<number, TopluForm> {
  const m: Record<number, TopluForm> = {}
  for (const k of kayitlar) {
    m[k.id] = {
      ogrenim_turu: k.ogrenim_turu ?? '',
      okul_adi: k.okul_adi ?? '',
      bolum: k.bolum ?? '',
      meslegi: k.meslegi ?? '',
      mezuniyet_tarihi: mezuniyetInput(k),
      varsayilan: !!(k.varsayilan ?? k.aktif),
      kadrosu_ile_ilgili: !!k.kadrosu_ile_ilgili,
      teknik_ogrenim: !!k.teknik_ogrenim,
    }
  }
  return m
}

interface Props {
  kayitlar: Ogrenim[]
  ogrenimTurleri: { id: number; isim: string }[]
  onGuncelle: (id: number, fd: FormData) => Promise<{ hata?: string }>
  onSil: (id: number) => Promise<{ hata?: string }>
  onTopluKaydet?: (satirlar: OgrenimTopluSatir[]) => Promise<{ hata?: string; kaydedilen?: number }>
  auditLoglarByRefId?: Record<string, Tables<'personel_audit_log'>[]>
}

export default function OgrenimClient({
  kayitlar,
  ogrenimTurleri,
  onGuncelle,
  onSil,
  onTopluKaydet,
  auditLoglarByRefId = {},
}: Props) {
  const router = useRouter()
  useIntradaTabRefresh('ogrenim', router)

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const ok =
        e.data === 'refresh' ||
        (typeof e.data === 'object' &&
          e.data != null &&
          (e.data as { source?: string; type?: string }).source === 'intrada-ogrenim-yeni' &&
          (e.data as { type?: string }).type === 'refresh')
      if (ok) router.refresh()
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [router])

  const [arama, setArama] = useState('')
  const [sekme, setSekme] = useState<'liste' | 'toplu'>('liste')
  const [formAcik, setFormAcik] = useState(false)
  const [secili, setSecili] = useState<Ogrenim | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [topluMesaj, setTopluMesaj] = useState<string | null>(null)
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [toplu, setToplu] = useState(() => topluBaslangic(kayitlar))

  useEffect(() => {
    setToplu(topluBaslangic(kayitlar))
  }, [kayitlar])

  const filtreli = useMemo(() => {
    const q = arama.toLocaleLowerCase('tr-TR')
    const filtered = kayitlar.filter(
      (k) =>
        !q ||
        (k.ad_soyad ?? '').toLocaleLowerCase('tr-TR').includes(q) ||
        (k.tckn ?? '').includes(q) ||
        (k.kadro_unvani ?? '').toLocaleLowerCase('tr-TR').includes(q) ||
        (k.gorev_unvani ?? '').toLocaleLowerCase('tr-TR').includes(q) ||
        k.sicil_no.toLocaleLowerCase('tr-TR').includes(q) ||
        (k.ogrenim_turu ?? '').toLocaleLowerCase('tr-TR').includes(q) ||
        (k.okul_adi ?? '').toLocaleLowerCase('tr-TR').includes(q) ||
        (k.meslegi ?? '').toLocaleLowerCase('tr-TR').includes(q)
    )
    return sortBildirimOgrenimList(filtered)
  }, [kayitlar, arama])

  function duzenleAc(k: Ogrenim) {
    setSecili(k)
    setHata(null)
    setFormAcik(true)
  }

  function kapat() {
    setFormAcik(false)
    setSecili(null)
    setHata(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHata(null)
    if (!secili) return
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await onGuncelle(secili.id, fd)
      if (res.hata) setHata(res.hata)
      else kapat()
    })
  }

  function handleSil(id: number) {
    if (!confirm('Bu kayıt silinecek. Onaylıyor musunuz?')) return
    startTransition(async () => {
      const res = await onSil(id)
      if (res.hata) alert(res.hata)
    })
  }

  function handleTopluKaydet() {
    if (!onTopluKaydet) return
    const degisen: OgrenimTopluSatir[] = []
    for (const k of kayitlar) {
      const t = toplu[k.id]
      if (!t) continue
      const ayni =
        (t.ogrenim_turu || '') === (k.ogrenim_turu ?? '') &&
        (t.okul_adi || '') === (k.okul_adi ?? '') &&
        (t.bolum || '') === (k.bolum ?? '') &&
        (t.meslegi || '') === (k.meslegi ?? '') &&
        t.mezuniyet_tarihi === mezuniyetInput(k) &&
        t.varsayilan === !!(k.varsayilan ?? k.aktif) &&
        t.kadrosu_ile_ilgili === !!k.kadrosu_ile_ilgili &&
        t.teknik_ogrenim === !!k.teknik_ogrenim
      if (ayni) continue
      degisen.push({
        id: k.id,
        ogrenim_turu: t.ogrenim_turu || null,
        okul_adi: t.okul_adi || null,
        bolum: t.bolum || null,
        meslegi: t.meslegi || null,
        mezuniyet_tarihi: t.mezuniyet_tarihi || null,
        varsayilan: t.varsayilan,
        kadrosu_ile_ilgili: t.kadrosu_ile_ilgili,
        teknik_ogrenim: t.teknik_ogrenim,
      })
    }
    if (!degisen.length) {
      setTopluMesaj('Değişiklik yapılmadı.')
      return
    }
    setTopluMesaj(null)
    startTransition(async () => {
      const res = await onTopluKaydet(degisen)
      if (res.hata) setTopluMesaj(res.hata)
      else {
        setTopluMesaj(`${res.kaydedilen ?? degisen.length} kayıt güncellendi.`)
        router.refresh()
      }
    })
  }

  const k = secili

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Öğrenim Bildirimi</h1>
          <p className="text-sm text-slate-500 mt-0.5">Personel öğrenim ve diploma kayıtları</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
            <button
              type="button"
              className={`px-4 py-1.5 text-sm rounded-md ${sekme === 'liste' ? 'bg-white shadow' : ''}`}
              onClick={() => setSekme('liste')}
            >
              Kayıt Listesi
            </button>
            <button
              type="button"
              className={`px-4 py-1.5 text-sm rounded-md ${sekme === 'toplu' ? 'bg-white shadow' : ''}`}
              onClick={() => setSekme('toplu')}
            >
              Toplu Güncelle
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              window.open('/bildirim/ogrenim/yeni', '_blank')
            }}
            className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Kayıt
          </button>
        </div>
      </div>

      {sekme === 'liste' && (
        <div className="mb-4">
          <input
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Ad, sicil, ünvan, öğrenim türü, okul veya meslek ara…"
            className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>
      )}

      {sekme === 'toplu' && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-600">Değişen satırlar kaydedilir.</p>
          <button
            type="button"
            onClick={handleTopluKaydet}
            disabled={isPending || !onTopluKaydet}
            className="bg-green-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {isPending ? 'Kaydediliyor…' : 'Toplu Kaydet'}
          </button>
        </div>
      )}
      {topluMesaj && <p className="mb-4 text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg">{topluMesaj}</p>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[1180px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-20">Sıra No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-32">Sicil No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Ad Soyad</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[8rem]">Kadro Ünvanı</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[8rem]">Görev Ünvanı</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-36">Öğrenim Türü</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[8rem]">Okul / Bölüm</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-28">Mesleği</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Mezuniyet Tarihi</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-24">
                <span className="inline-flex items-center gap-1">Varsayılan <OgrenimIsaretAciklama tur="varsayilan" /></span>
              </th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">
                <span className="inline-flex items-center gap-1">Kadrosu İle İlgili <OgrenimIsaretAciklama tur="kadrosu_ile_ilgili" /></span>
              </th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">
                <span className="inline-flex items-center gap-1">Teknik Öğrenim <OgrenimIsaretAciklama tur="teknik_ogrenim" /></span>
              </th>
              {sekme === 'liste' && (
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">İşlem</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(sekme === 'liste' ? filtreli : kayitlar).length === 0 && (
              <tr>
                <td colSpan={sekme === 'liste' ? 13 : 12} className="text-center py-14 text-slate-400">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
            {(sekme === 'liste' ? filtreli : kayitlar).map((row, idx) => {
              const vars = row.varsayilan ?? row.aktif
              const refId = String(row.id)
              const auditLoglar = auditLoglarByRefId[refId] ?? []
              const t = toplu[row.id]
              return (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-500 tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.sicil_no}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{row.ad_soyad ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{row.kadro_unvani?.trim() || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{row.gorev_unvani?.trim() || '—'}</td>
                  {sekme === 'toplu' && t ? (
                    <>
                      <td className="px-2 py-2">
                        <select
                          value={t.ogrenim_turu}
                          onChange={e => setToplu(prev => ({ ...prev, [row.id]: { ...t, ogrenim_turu: e.target.value } }))}
                          className="w-full min-w-[8rem] px-1 py-1 border border-slate-300 rounded text-xs bg-white"
                        >
                          <option value="">—</option>
                          {ogrenimTurleri.map(o => (
                            <option key={o.id} value={o.isim}>
                              {o.isim}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          value={t.okul_adi}
                          onChange={e => setToplu(prev => ({ ...prev, [row.id]: { ...t, okul_adi: e.target.value } }))}
                          placeholder="Okul"
                          className="w-full min-w-[7rem] px-1 py-1 border border-slate-300 rounded text-xs mb-1"
                        />
                        <input
                          value={t.bolum}
                          onChange={e => setToplu(prev => ({ ...prev, [row.id]: { ...t, bolum: e.target.value } }))}
                          placeholder="Bölüm"
                          className="w-full px-1 py-1 border border-slate-300 rounded text-xs"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          value={t.meslegi}
                          onChange={e => setToplu(prev => ({ ...prev, [row.id]: { ...t, meslegi: e.target.value } }))}
                          className="w-full min-w-[6rem] px-1 py-1 border border-slate-300 rounded text-xs"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          value={t.mezuniyet_tarihi}
                          onChange={e => setToplu(prev => ({ ...prev, [row.id]: { ...t, mezuniyet_tarihi: e.target.value } }))}
                          placeholder="gg.aa.yyyy"
                          className="w-28 px-1 py-1 border border-slate-300 rounded text-xs"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={t.varsayilan}
                          onChange={e => setToplu(prev => ({ ...prev, [row.id]: { ...t, varsayilan: e.target.checked } }))}
                          className="w-4 h-4 rounded border-slate-300"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={t.kadrosu_ile_ilgili}
                          onChange={e => setToplu(prev => ({ ...prev, [row.id]: { ...t, kadrosu_ile_ilgili: e.target.checked } }))}
                          className="w-4 h-4 rounded border-slate-300"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={t.teknik_ogrenim}
                          onChange={e => setToplu(prev => ({ ...prev, [row.id]: { ...t, teknik_ogrenim: e.target.checked } }))}
                          className="w-4 h-4 rounded border-slate-300"
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                          {row.ogrenim_turu ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span>{row.okul_adi ?? '—'}</span>
                        {row.bolum && <span className="text-slate-400 text-xs ml-1">/ {row.bolum}</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{row.meslegi ?? '—'}</td>
                      <td className="px-4 py-3 text-center text-slate-500 tabular-nums">{mezuniyetGoster(row)}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            vars ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {vars ? 'Evet' : 'Hayır'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            row.kadrosu_ile_ilgili ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {row.kadrosu_ile_ilgili ? 'Evet' : 'Hayır'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            row.teknik_ogrenim ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {row.teknik_ogrenim ? 'Evet' : 'Hayır'}
                        </span>
                      </td>
                    </>
                  )}
                  {sekme === 'liste' && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <SaatGecmisDugmesi
                          sayi={auditLoglar.length}
                          onClick={() => setGecmisRefId(refId)}
                          title="Öğrenim kaydı değişiklik geçmişi"
                        />
                        <KalemDuzenleDugmesi onClick={() => duzenleAc(row)} title="Düzenle" />
                        <CopKutusuSilDugmesi
                          onClick={() => handleSil(row.id)}
                          disabled={isPending}
                          title="Sil"
                        />
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal open={formAcik && !!k} onClose={kapat} title="Kayıt Düzenle" size="xl">
        {k && (
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Öğrenim Türü</label>
                <select
                  name="ogrenim_turu"
                  defaultValue={k.ogrenim_turu ?? ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                  required
                >
                  <option value="">— Seçiniz —</option>
                  {ogrenimTurleri.map((t) => (
                    <option key={t.id} value={t.isim}>
                      {t.isim}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Okul Adı</label>
                <input
                  name="okul_adi"
                  defaultValue={k.okul_adi ?? ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Bölüm</label>
                <input
                  name="bolum"
                  defaultValue={k.bolum ?? ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mesleği</label>
                <input
                  name="meslegi"
                  defaultValue={k.meslegi ?? ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mezuniyet Tarihi (gg.aa.yyyy)</label>
                <input
                  name="mezuniyet_tarihi"
                  type="text"
                  placeholder="gg.aa.yyyy"
                  defaultValue={k.mezuniyet_tarihi ? formatGGAAYYYY(k.mezuniyet_tarihi) : ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                name="varsayilan"
                type="checkbox"
                id="varsayilan_cb"
                defaultChecked={k.varsayilan ?? k.aktif}
                className="w-4 h-4 rounded border-slate-300"
              />
              <label htmlFor="varsayilan_cb" className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                Varsayılan öğrenim
                <OgrenimIsaretAciklama tur="varsayilan" />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                name="kadrosu_ile_ilgili"
                type="checkbox"
                id="kadrosu_ile_ilgili_cb"
                defaultChecked={k.kadrosu_ile_ilgili ?? false}
                className="w-4 h-4 rounded border-slate-300"
              />
              <label htmlFor="kadrosu_ile_ilgili_cb" className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                Kadrosu ile ilgili
                <OgrenimIsaretAciklama tur="kadrosu_ile_ilgili" />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                name="teknik_ogrenim"
                type="checkbox"
                id="teknik_ogrenim_cb"
                defaultChecked={k.teknik_ogrenim ?? false}
                className="w-4 h-4 rounded border-slate-300"
              />
              <label htmlFor="teknik_ogrenim_cb" className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                Teknik Öğrenim
                <OgrenimIsaretAciklama tur="teknik_ogrenim" />
              </label>
            </div>
            {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
            <div className="flex justify-end gap-3 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={kapat}
                className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Kaydediliyor…' : 'Güncelle'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <AuditGecmisPanel
        acik={gecmisRefId != null}
        onKapat={() => setGecmisRefId(null)}
        auditLoglar={gecmisRefId ? (auditLoglarByRefId[gecmisRefId] ?? []) : []}
        baslik="Öğrenim Kaydı Geçmişi"
        diffSatirlari={ogrenimAuditDiffSatirlari}
        degerGoster={ogrenimAuditDegerGoster}
      />
    </div>
  )
}
