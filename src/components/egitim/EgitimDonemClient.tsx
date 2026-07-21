'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import { GozDetayLink, KalemDuzenleDugmesi, SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import {
  egitimDonemAuditDiffSatirlari,
  egitimDonemAuditDegerGoster,
} from '@/lib/egitim-donem-audit'
import type { Tables } from '@/types/database'

export interface EgitimDonem {
  id:               number
  yil:              number
  sira_no:          string | null
  donem_adi:        string
  baslangic_tarihi: string
  bitis_tarihi:     string
  durum:            'Açık' | 'Kapalı'
  egitim_sayisi:    number
}

interface Props {
  donemler:   EgitimDonem[]
  onEkle:     (fd: FormData) => Promise<{ hata?: string }>
  onGuncelle: (id: number, fd: FormData) => Promise<{ hata?: string }>
  onKapat:    (id: number)   => Promise<{ hata?: string }>
  auditLoglarByRefId?: Record<string, Tables<'personel_audit_log'>[]>
}

function tarih(t: string) {
  return new Date(t).toLocaleDateString('tr-TR')
}

export default function EgitimDonemClient({
  donemler,
  onEkle,
  onGuncelle,
  onKapat,
  auditLoglarByRefId = {},
}: Props) {
  const [yilFiltre, setYilFiltre]     = useState(new Date().getFullYear())
  const [durumFiltre, setDurumFiltre] = useState<'Tümü' | 'Açık' | 'Kapalı'>('Tümü')
  const [formAcik, setFormAcik]       = useState(false)
  const [secili, setSecili]           = useState<EgitimDonem | null>(null)
  const [hata, setHata]               = useState<string | null>(null)
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()

  const tumYillar = useMemo(() => {
    const s = new Set(donemler.map(d => d.yil)); s.add(new Date().getFullYear())
    return Array.from(s).sort((a, b) => b - a)
  }, [donemler])

  const filtreli = useMemo(() => {
    let list = donemler.filter(d => d.yil === yilFiltre)
    if (durumFiltre !== 'Tümü') list = list.filter(d => d.durum === durumFiltre)
    return list.sort((a, b) => b.id - a.id)
  }, [donemler, yilFiltre, durumFiltre])

  function yeniEkleAc()             { setSecili(null); setHata(null); setFormAcik(true) }
  function duzenleAc(d: EgitimDonem){ setSecili(d);    setHata(null); setFormAcik(true) }
  function kapat()                   { setFormAcik(false); setSecili(null); setHata(null) }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = secili ? await onGuncelle(secili.id, fd) : await onEkle(fd)
      if (res.hata) setHata(res.hata)
      else kapat()
    })
  }

  function handleKapat(id: number) {
    if (!confirm('Bu dönem kapatılacak. Onaylıyor musunuz?')) return
    startTransition(async () => { const r = await onKapat(id); if (r.hata) alert(r.hata) })
  }

  const d = secili
  const buYil = new Date().getFullYear()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Eğitim Takvimi</h1>
          <p className="text-sm text-slate-500 mt-0.5">Dönem bazlı eğitim planlaması ve takibi</p>
        </div>
        <button onClick={yeniEkleAc}
          className="intrada-btn intrada-btn-ekle">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Yeni Dönem
        </button>
      </div>

      {/* Filtreler */}
      <div className="flex items-center gap-3 mb-4">
        <select value={yilFiltre} onChange={e => setYilFiltre(Number(e.target.value))}
          className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
          {tumYillar.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {(['Tümü', 'Açık', 'Kapalı'] as const).map(f => (
          <button key={f} onClick={() => setDurumFiltre(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              durumFiltre === f ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            }`}>{f}</button>
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
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-24">Eğitim</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-20">Durum</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-36">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtreli.length === 0 && (
              <tr><td colSpan={7} className="text-center py-14 text-slate-400">{yilFiltre} yılında dönem kaydı yok.</td></tr>
            )}
            {filtreli.map(d => (
              <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{d.sira_no ?? '—'}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{d.donem_adi}</td>
                <td className="px-4 py-3 text-center text-xs text-slate-500 tabular-nums">{tarih(d.baslangic_tarihi)}</td>
                <td className="px-4 py-3 text-center text-xs text-slate-500 tabular-nums">{tarih(d.bitis_tarihi)}</td>
                <td className="px-4 py-3 text-center">
                  <Link href={`/egitim/${d.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800">
                    <span className="w-6 h-6 bg-indigo-50 rounded-full flex items-center justify-center font-bold">
                      {d.egitim_sayisi}
                    </span>
                    eğitim
                  </Link>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                    d.durum === 'Açık' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>{d.durum}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <SaatGecmisDugmesi
                      sayi={(auditLoglarByRefId[String(d.id)] ?? []).length}
                      onClick={() => setGecmisRefId(String(d.id))}
                      title="Dönem işlem geçmişi"
                    />
                    <GozDetayLink href={`/egitim/${d.id}`} title="Detay" />
                    <KalemDuzenleDugmesi onClick={() => duzenleAc(d)} title="Düzenle" />
                    {d.durum === 'Açık' && (
                      <button onClick={() => handleKapat(d.id)} disabled={isPending}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Kapat">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
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

      {/* Form Modal */}
      <Modal open={formAcik} onClose={kapat} title={d ? 'Dönem Düzenle' : 'Yeni Dönem Ekle'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Yıl *</label>
              <input name="yil" type="number" required defaultValue={d?.yil ?? buYil} min={2000} max={2100}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sıra No</label>
              <input name="sira_no" defaultValue={d?.sira_no ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Dönem Adı *</label>
            <input name="donem_adi" required defaultValue={d?.donem_adi ?? ''} placeholder="Örn: 2024 1. Yarıyıl"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Başlangıç *</label>
              <input name="baslangic_tarihi" type="date" required defaultValue={d?.baslangic_tarihi ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Bitiş *</label>
              <input name="bitis_tarihi" type="date" required defaultValue={d?.bitis_tarihi ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
          </div>
          {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={kapat}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">İptal</button>
            <button type="submit" disabled={isPending}
              className="intrada-btn intrada-btn-kaydet">
              {isPending ? 'Kaydediliyor…' : d ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      <AuditGecmisPanel
        acik={gecmisRefId != null}
        onKapat={() => setGecmisRefId(null)}
        auditLoglar={gecmisRefId ? (auditLoglarByRefId[gecmisRefId] ?? []) : []}
        baslik="Eğitim Takvimi — Dönem Geçmişi"
        diffSatirlari={egitimDonemAuditDiffSatirlari}
        degerGoster={egitimDonemAuditDegerGoster}
      />
    </div>
  )
}
