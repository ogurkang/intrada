'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import { GozDetayLink, KalemDuzenleDugmesi, SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import {
  isgSaglikDonemAuditDiffSatirlari,
  isgSaglikDonemAuditDegerGoster,
} from '@/lib/isg-saglik-taramasi-donem-audit'
import type { Tables } from '@/types/database'

export interface IsgSaglikTaramasiDonem {
  id: number
  sira_no: number
  donem_adi: string
  baslangic_tarihi: string
  bitis_tarihi: string
}

interface Props {
  donemler: IsgSaglikTaramasiDonem[]
  onEkle: (fd: FormData) => Promise<{ hata?: string }>
  onGuncelle: (id: number, fd: FormData) => Promise<{ hata?: string }>
  auditLoglarByRefId?: Record<string, Tables<'personel_audit_log'>[]>
}

function tarih(t: string) {
  return new Date(t).toLocaleDateString('tr-TR')
}

function tarihAraligi(bas: string, bit: string) {
  return `${tarih(bas)} – ${tarih(bit)}`
}

export default function IsgSaglikTaramasiDonemClient({
  donemler,
  onEkle,
  onGuncelle,
  auditLoglarByRefId = {},
}: Props) {
  const [formAcik, setFormAcik] = useState(false)
  const [secili, setSecili] = useState<IsgSaglikTaramasiDonem | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function yeniEkleAc() {
    setSecili(null)
    setHata(null)
    setFormAcik(true)
  }

  function duzenleAc(d: IsgSaglikTaramasiDonem) {
    setSecili(d)
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
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = secili ? await onGuncelle(secili.id, fd) : await onEkle(fd)
      if (res.hata) setHata(res.hata)
      else kapat()
    })
  }

  const d = secili

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/isg/islemler"
            className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
          >
            ← İşlemler
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Sağlık Taraması</h1>
          <p className="text-sm text-slate-500 mt-0.5">Dönem bazlı tarama ve muayene takibi</p>
        </div>
        <button
          type="button"
          onClick={yeniEkleAc}
          className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Dönem Ekle
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-24">Sıra No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Dönem Adı</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Tarihi</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-36">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {donemler.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-14 text-slate-400">
                  Henüz dönem kaydı yok. Dönem Ekle ile başlayın.
                </td>
              </tr>
            )}
            {donemler.map(row => (
              <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.sira_no}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{row.donem_adi}</td>
                <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">
                  {tarihAraligi(row.baslangic_tarihi, row.bitis_tarihi)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <SaatGecmisDugmesi
                      sayi={(auditLoglarByRefId[String(row.id)] ?? []).length}
                      onClick={() => setGecmisRefId(String(row.id))}
                      title="Dönem işlem geçmişi"
                    />
                    <GozDetayLink
                      href={`/isg/islemler/saglik-taramasi/${row.id}`}
                      title="Detay"
                    />
                    <KalemDuzenleDugmesi onClick={() => duzenleAc(row)} title="Düzenle" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={formAcik} onClose={kapat} title={d ? 'Dönem Düzenle' : 'Yeni Dönem Ekle'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {d && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sıra No</label>
              <input
                type="text"
                readOnly
                value={d.sira_no}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500"
              />
            </div>
          )}
          {!d && (
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
              Sıra numarası kayıt anında otomatik atanır.
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Dönem Adı *</label>
            <input
              name="donem_adi"
              required
              defaultValue={d?.donem_adi ?? ''}
              placeholder="Örn: 2026 1. Dönem Sağlık Taraması"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Dönem Başlangıcı *</label>
              <input
                name="baslangic_tarihi"
                type="date"
                required
                defaultValue={d?.baslangic_tarihi ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Dönem Bitişi *</label>
              <input
                name="bitis_tarihi"
                type="date"
                required
                defaultValue={d?.bitis_tarihi ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
          </div>
          {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={kapat}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50"
            >
              {isPending ? 'Kaydediliyor…' : d ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      <AuditGecmisPanel
        acik={gecmisRefId != null}
        onKapat={() => setGecmisRefId(null)}
        auditLoglar={gecmisRefId ? (auditLoglarByRefId[gecmisRefId] ?? []) : []}
        baslik="Sağlık Taraması — Dönem Geçmişi"
        diffSatirlari={isgSaglikDonemAuditDiffSatirlari}
        degerGoster={isgSaglikDonemAuditDegerGoster}
      />
    </div>
  )
}
