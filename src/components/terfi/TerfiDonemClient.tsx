'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import TerfiDonemGecmisPanel from '@/components/terfi/TerfiDonemGecmisPanel'
import type { Tables } from '@/types/database'
import { broadcastIntradaRefresh } from '@/lib/intrada-tab-sync'

type TD = Tables<'terfi_donem'> & { kayit_sayisi?: number }
type AuditLog = Tables<'personel_audit_log'>

interface Props {
  donemler: TD[]
  auditLoglarByDonemId: Record<string, AuditLog[]>
  onEkle: (fd: FormData) => Promise<{ hata?: string }>
  onGuncelle: (id: number, fd: FormData) => Promise<{ hata?: string }>
  onKapat: (id: number) => Promise<{ hata?: string }>
  onAc: (id: number) => Promise<{ hata?: string }>
}

function tarih(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

export default function TerfiDonemClient({ donemler, auditLoglarByDonemId, onEkle, onGuncelle, onKapat, onAc }: Props) {
  const router = useRouter()
  const [yilFiltre, setYilFiltre] = useState(new Date().getFullYear())
  const [durumFiltre, setDurumFiltre] = useState<'Tümü' | 'Açık' | 'Kapalı'>('Tümü')
  const [formAcik, setFormAcik] = useState(false)
  const [seciliDonem, setSeciliDonem] = useState<TD | null>(null)
  const [gecmisDonem, setGecmisDonem] = useState<TD | null>(null)
  const [sunuciHata, setSunuciHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const tumYillar = useMemo(() => {
    const s = new Set(donemler.map((d) => d.yil))
    s.add(new Date().getFullYear())
    return Array.from(s).sort((a, b) => b - a)
  }, [donemler])

  const filtreli = useMemo(() => {
    let list = donemler.filter((d) => d.yil === yilFiltre)
    if (durumFiltre !== 'Tümü') list = list.filter((d) => d.durum === durumFiltre)
    return list.sort((a, b) => b.id - a.id)
  }, [donemler, yilFiltre, durumFiltre])

  function yeniEkleAc() {
    setSeciliDonem(null)
    setSunuciHata(null)
    setFormAcik(true)
  }
  function duzenleAc(d: TD) {
    setSeciliDonem(d)
    setSunuciHata(null)
    setFormAcik(true)
  }
  function kapat() {
    setFormAcik(false)
    setSeciliDonem(null)
    setSunuciHata(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSunuciHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = seciliDonem ? await onGuncelle(seciliDonem.id, fd) : await onEkle(fd)
      if (res.hata) setSunuciHata(res.hata)
      else {
        kapat()
        broadcastIntradaRefresh('terfi')
        router.refresh()
      }
    })
  }

  function handleKapat(id: number) {
    if (!confirm('Bu dönem kapatılacak. Onaylıyor musunuz?')) return
    startTransition(async () => {
      const res = await onKapat(id)
      if (res.hata) alert(res.hata)
      else {
        broadcastIntradaRefresh('terfi')
        router.refresh()
      }
    })
  }

  function handleAc(id: number) {
    if (!confirm('Bu dönem tekrar açılacak. Onaylıyor musunuz?')) return
    startTransition(async () => {
      const res = await onAc(id)
      if (res.hata) alert(res.hata)
      else {
        broadcastIntradaRefresh('terfi')
        router.refresh()
      }
    })
  }

  const d = seciliDonem
  const buYil = new Date().getFullYear()

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Terfi Hareketleri</h1>
          <p className="text-sm text-slate-500 mt-0.5">Dönem bazlı terfi işlemleri — Terfi Ettir önizlemesi</p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
          <button
            type="button"
            onClick={yeniEkleAc}
            className="flex items-center justify-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Dönem
          </button>
          <Link
            href="/terfi/bilgiler"
            className="text-center text-sm font-medium text-slate-700 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            Terfi Bilgileri
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <select
          value={yilFiltre}
          onChange={(e) => setYilFiltre(Number(e.target.value))}
          className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
          {tumYillar.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        {(['Tümü', 'Açık', 'Kapalı'] as const).map((x) => (
          <button
            key={x}
            type="button"
            onClick={() => setDurumFiltre(x)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              durumFiltre === x
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            }`}>
            {x}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-24">Sıra No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Dönem Adı</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Başlangıç</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Bitiş</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-24">Durum</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-48">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtreli.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-14 text-slate-400">
                  {yilFiltre} yılında dönem kaydı yok.
                </td>
              </tr>
            )}
            {filtreli.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.sira_no ?? '—'}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{row.donem_adi ?? `${row.yil} Dönemi`}</td>
                <td className="px-4 py-3 text-center text-xs text-slate-500 tabular-nums">{tarih(row.baslangic_tarihi)}</td>
                <td className="px-4 py-3 text-center text-xs text-slate-500 tabular-nums">{tarih(row.bitis_tarihi)}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      row.durum === 'Açık' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                    {row.durum}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1 flex-wrap">
                    <Link
                      href={`/terfi/donem/${row.id}`}
                      title="Dönem detayı"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                        />
                      </svg>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setGecmisDonem(row)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      title="Dönem işlem geçmişi">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3.5 2" />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.5 9.5A9 9 0 113 12m.5-2.5L1.75 7.25M3.5 9.5L6 8.75"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => duzenleAc(row)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Düzenle">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    {row.durum === 'Açık' && (
                      <button
                        type="button"
                        onClick={() => handleKapat(row.id)}
                        disabled={isPending}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Kapat">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                          />
                        </svg>
                      </button>
                    )}
                    {row.durum === 'Kapalı' && (
                      <button
                        type="button"
                        onClick={() => handleAc(row.id)}
                        disabled={isPending}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40"
                        title="Aç">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={formAcik} onClose={kapat} title={d ? 'Dönem Düzenle' : 'Yeni Dönem Ekle'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Yıl *</label>
              <input
                name="yil"
                type="number"
                required
                defaultValue={d?.yil ?? buYil}
                min={2000}
                max={2100}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sıra No</label>
              <input
                name="sira_no"
                type="text"
                defaultValue={d?.sira_no ?? ''}
                placeholder="2026/1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Dönem Adı</label>
            <input
              name="donem_adi"
              type="text"
              defaultValue={d?.donem_adi ?? ''}
              placeholder="Mart–Nisan 2026"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Başlangıç *</label>
              <input
                name="baslangic_tarihi"
                type="date"
                required
                defaultValue={d?.baslangic_tarihi?.slice(0, 10) ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Bitiş *</label>
              <input
                name="bitis_tarihi"
                type="date"
                required
                defaultValue={d?.bitis_tarihi?.slice(0, 10) ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
          </div>
          {sunuciHata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{sunuciHata}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={kapat}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              İptal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50">
              {isPending ? 'Kaydediliyor…' : d ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      <TerfiDonemGecmisPanel
        acik={gecmisDonem != null}
        onKapat={() => setGecmisDonem(null)}
        auditLoglar={gecmisDonem ? (auditLoglarByDonemId[String(gecmisDonem.id)] ?? []) : []}
        baslik={
          gecmisDonem
            ? `Dönem Geçmişi — ${gecmisDonem.donem_adi ?? `${gecmisDonem.yil} Dönemi`}`
            : undefined
        }
      />
    </div>
  )
}
