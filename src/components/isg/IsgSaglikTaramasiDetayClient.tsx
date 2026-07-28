'use client'

import { useState, useMemo, useTransition, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import type { Tables } from '@/types/database'
import type { IsgSaglikTaramasiPersonel } from '@/lib/isg-saglik-taramasi-personel'
import type { IsgSaglikKayitTur } from '@/lib/isg-saglik-taramasi-kayit-audit'

export interface IsgSaglikTaramasiDonemOzet {
  id: number
  sira_no: number
  donem_adi: string
  baslangic_tarihi: string
  bitis_tarihi: string
}

interface Props {
  donem: IsgSaglikTaramasiDonemOzet
  personeller: IsgSaglikTaramasiPersonel[]
  taramaKeys: string[]
  muayeneKeys: string[]
  kayitAuditLoglarByRefId?: Record<string, Tables<'personel_audit_log'>[]>
  onKaydet?: (
    donemId: number,
    kayitlar: { sicil_no: string; tarama: boolean; muayene: boolean }[],
    mudurlukMap: Record<string, string>,
  ) => Promise<{ hata?: string }>
}

function IsaretTikGecmis({ logs }: { logs: Tables<'personel_audit_log'>[] | undefined }) {
  const [konum, setKonum] = useState<{ x: number; y: number } | null>(null)
  const latest = logs?.[0]

  const icerik = latest ? (
    <>
      <p className="font-medium text-white">{latest.islem}</p>
      <p className="text-slate-200 mt-0.5">{latest.ozet}</p>
      <p className="text-slate-400 mt-1 tabular-nums">
        {new Date(latest.created_at).toLocaleString('tr-TR')}
        {latest.actor_email ? ` · ${latest.actor_email}` : ''}
      </p>
    </>
  ) : (
    <p className="text-slate-300 italic">Kayıt yok</p>
  )

  const titleMetin = latest ? `${latest.islem}: ${latest.ozet}` : 'Kayıt yok'

  return (
    <>
      <span
        className="inline-flex cursor-help"
        title={titleMetin}
        onMouseEnter={e => {
          const r = e.currentTarget.getBoundingClientRect()
          setKonum({ x: r.left + r.width / 2, y: r.top })
        }}
        onMouseLeave={() => setKonum(null)}
      >
        <svg
          className="w-4 h-4 mx-auto text-emerald-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
      {konum &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed z-[200] pointer-events-none w-max max-w-[240px] px-3 py-2 rounded-lg bg-slate-800 text-[11px] leading-snug shadow-lg border border-slate-700"
            style={{ left: konum.x, top: konum.y, transform: 'translate(-50%, calc(-100% - 8px))' }}
          >
            {icerik}
            <span
              className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-slate-800"
              aria-hidden
            />
          </div>,
          document.body,
        )}
    </>
  )
}

function tarihAraligi(bas: string, bit: string) {
  const fmt = (t: string) => new Date(t).toLocaleDateString('tr-TR')
  return `${fmt(bas)} – ${fmt(bit)}`
}

const EXCEL_YESIL = '#217346'

export default function IsgSaglikTaramasiDetayClient({
  donem,
  personeller,
  taramaKeys,
  muayeneKeys,
  kayitAuditLoglarByRefId = {},
  onKaydet,
}: Props) {
  const taramaSet = useMemo(() => new Set(taramaKeys), [taramaKeys])
  const muayeneSet = useMemo(() => new Set(muayeneKeys), [muayeneKeys])

  const [mudFiltre, setMudFiltre] = useState('')
  const [statuFiltre, setStatuFiltre] = useState('')
  const [arama, setArama] = useState('')
  const [isaretleMode, setIsaretleMode] = useState(false)
  const [yerelTarama, setYerelTarama] = useState<Set<string>>(() => new Set(taramaKeys))
  const [yerelMuayene, setYerelMuayene] = useState<Set<string>>(() => new Set(muayeneKeys))
  const [isPending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)
  const [excelYukleniyor, setExcelYukleniyor] = useState(false)

  useEffect(() => {
    if (!isaretleMode) {
      setYerelTarama(new Set(taramaKeys))
      setYerelMuayene(new Set(muayeneKeys))
    }
  }, [taramaKeys, muayeneKeys, isaretleMode])

  const mudurluler = useMemo(
    () =>
      [...new Set(personeller.map(p => p.mudurluk ?? 'Belirtilmemiş'))].sort((a, b) =>
        a.localeCompare(b, 'tr'),
      ),
    [personeller],
  )

  const statuler = useMemo(
    () => [...new Set(personeller.map(p => p.statu))].sort((a, b) => a.localeCompare(b, 'tr')),
    [personeller],
  )

  const filtreli = useMemo(() => {
    const q = arama.toLocaleLowerCase('tr-TR')
    return personeller.filter(p => {
      if (mudFiltre && (p.mudurluk ?? 'Belirtilmemiş') !== mudFiltre) return false
      if (statuFiltre && p.statu !== statuFiltre) return false
      if (
        q &&
        !(p.ad_soyad ?? '').toLocaleLowerCase('tr-TR').includes(q) &&
        !p.sicil_no.toLocaleLowerCase('tr-TR').includes(q)
      ) {
        return false
      }
      return true
    })
  }, [personeller, mudFiltre, statuFiltre, arama])

  const aktifTarama = isaretleMode ? yerelTarama : taramaSet
  const aktifMuayene = isaretleMode ? yerelMuayene : muayeneSet

  function auditRef(sicil: string, tur: IsgSaglikKayitTur) {
    return `${sicil}:${tur}:${donem.id}`
  }

  function toggle(sicil: string, tur: IsgSaglikKayitTur) {
    if (!isaretleMode) return
    if (tur === 'tarama') {
      setYerelTarama(prev => {
        const n = new Set(prev)
        if (n.has(sicil)) n.delete(sicil)
        else n.add(sicil)
        return n
      })
    } else {
      setYerelMuayene(prev => {
        const n = new Set(prev)
        if (n.has(sicil)) n.delete(sicil)
        else n.add(sicil)
        return n
      })
    }
  }

  async function handleKaydet() {
    if (!onKaydet) return
    setHata(null)
    const mudurlukMap = Object.fromEntries(personeller.map(p => [p.sicil_no, p.mudurluk ?? '']))
    const kayitlar = personeller.map(p => ({
      sicil_no: p.sicil_no,
      tarama: yerelTarama.has(p.sicil_no),
      muayene: yerelMuayene.has(p.sicil_no),
    }))
    startTransition(async () => {
      const res = await onKaydet(donem.id, kayitlar, mudurlukMap)
      if (res?.hata) {
        setHata(res.hata)
        return
      }
      setIsaretleMode(false)
      window.location.reload()
    })
  }

  async function excelIndir() {
    setExcelYukleniyor(true)
    try {
      const p = new URLSearchParams()
      if (mudFiltre) p.set('m', mudFiltre)
      if (statuFiltre) p.set('s', statuFiltre)
      const qs = p.toString()
      const res = await fetch(
        `/api/isg/saglik-taramasi/${donem.id}/excel${qs ? `?${qs}` : ''}`,
      )
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert((j as { error?: string }).error ?? 'Excel indirilemedi.')
        return
      }
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `Saglik_Taramasi_Donem_${donem.sira_no}.xlsx`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      alert('Excel indirilemedi.')
    } finally {
      setExcelYukleniyor(false)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/isg/islemler/saglik-taramasi"
            className="text-sm text-slate-500 hover:text-slate-800 transition-colors shrink-0"
          >
            ← Dönem Listesi
          </Link>
          <span className="text-slate-300 shrink-0">/</span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-800">{donem.donem_adi}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Sıra {donem.sira_no} · {tarihAraligi(donem.baslangic_tarihi, donem.bitis_tarihi)} ·{' '}
              {personeller.length} personel
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={excelIndir}
          disabled={excelYukleniyor || filtreli.length === 0}
          className="inline-flex items-center gap-2 text-white text-sm px-4 py-2 rounded-lg transition-colors font-medium whitespace-nowrap shrink-0 disabled:opacity-50"
          style={{ backgroundColor: EXCEL_YESIL }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {excelYukleniyor ? 'Hazırlanıyor…' : 'Excel İndir'}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={arama}
            onChange={e => setArama(e.target.value)}
            placeholder="Ad veya sicil ara…"
            className="w-full sm:w-52 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={mudFiltre}
              onChange={e => setMudFiltre(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white min-w-[10rem]"
            >
              <option value="">Tüm Müdürlükler</option>
              {mudurluler.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={statuFiltre}
              onChange={e => setStatuFiltre(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white min-w-[9rem]"
            >
              <option value="">Tüm Statüler</option>
              {statuler.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          {!isaretleMode ? (
            <button
              type="button"
              onClick={() => {
                setIsaretleMode(true)
                setYerelTarama(new Set(taramaKeys))
                setYerelMuayene(new Set(muayeneKeys))
              }}
              className="px-4 py-2 text-sm font-medium text-emerald-700 border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              Tarama / Muayene İşaretle
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsaretleMode(false)
                  setYerelTarama(new Set(taramaKeys))
                  setYerelMuayene(new Set(muayeneKeys))
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleKaydet}
                disabled={isPending || !onKaydet}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          )}
        </div>
      </div>

      {hata && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {hata}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-24">Sicil</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Ad Soyad</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-28">Statü</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Müdürlük</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-24">Tarama</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-24">Muayene</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtreli.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-14 text-slate-400">
                    Personel bulunamadı.
                  </td>
                </tr>
              )}
              {filtreli.map(p => (
                <tr key={p.sicil_no} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{p.sicil_no}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{p.ad_soyad}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{p.statu}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{p.mudurluk ?? '—'}</td>
                  <td className="px-4 py-2.5 text-center">
                    {isaretleMode ? (
                      <input
                        type="checkbox"
                        checked={aktifTarama.has(p.sicil_no)}
                        onChange={() => toggle(p.sicil_no, 'tarama')}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    ) : aktifTarama.has(p.sicil_no) ? (
                      <IsaretTikGecmis logs={kayitAuditLoglarByRefId[auditRef(p.sicil_no, 'tarama')]} />
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {isaretleMode ? (
                      <input
                        type="checkbox"
                        checked={aktifMuayene.has(p.sicil_no)}
                        onChange={() => toggle(p.sicil_no, 'muayene')}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    ) : aktifMuayene.has(p.sicil_no) ? (
                      <IsaretTikGecmis logs={kayitAuditLoglarByRefId[auditRef(p.sicil_no, 'muayene')]} />
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
