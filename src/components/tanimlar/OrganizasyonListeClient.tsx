'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import { SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import { useTanimlarSaltOkunur } from '@/components/tanimlar/TanimlarSaltOkunurContext'
import { organizasyonAuditDegerGoster, organizasyonAuditDiffSatirlari } from '@/lib/organizasyon-audit'
import type { OrganizasyonKayit } from '@/app/(dashboard)/tanimlar/organizasyon/page'
import type { Tables } from '@/types/database'

interface Props {
  data: OrganizasyonKayit[]
  auditLoglarByRefId?: Record<string, Tables<'personel_audit_log'>[]>
  onAdd: (formData: FormData) => Promise<{ hata?: string }>
  onUpdate: (id: number, formData: FormData) => Promise<{ hata?: string }>
  onToggle: (id: number, aktif: boolean) => Promise<{ hata?: string }>
}

export default function OrganizasyonListeClient({
  data,
  auditLoglarByRefId = {},
  onAdd,
  onUpdate,
  onToggle,
}: Props) {
  const saltOkunur = useTanimlarSaltOkunur()
  const [modalAcik, setModalAcik] = useState(false)
  const [secili, setSecili] = useState<OrganizasyonKayit | null>(null)
  const [sunuciHata, setSunuciHata] = useState<string | null>(null)
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const gecmisLoglar = gecmisRefId ? auditLoglarByRefId[gecmisRefId] ?? [] : []

  function yeniEkle() {
    setSecili(null)
    setSunuciHata(null)
    setModalAcik(true)
  }

  function duzenle(item: OrganizasyonKayit) {
    setSecili(item)
    setSunuciHata(null)
    setModalAcik(true)
  }

  function kapat() {
    setModalAcik(false)
    setSecili(null)
    setSunuciHata(null)
  }

  function handleToggle(item: OrganizasyonKayit) {
    startTransition(async () => {
      const res = await onToggle(item.id, item.aktif)
      if (res?.hata) setSunuciHata(res.hata)
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSunuciHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = secili ? await onUpdate(secili.id, fd) : await onAdd(fd)
      if (res?.hata) setSunuciHata(res.hata)
      else kapat()
    })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Organizasyon</h1>
        {!saltOkunur && (
          <button
            type="button"
            onClick={yeniEkle}
            className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Oluştur
          </button>
        )}
      </div>

      {sunuciHata && !modalAcik && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{sunuciHata}</div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 font-semibold text-slate-600 w-16">#</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Organizasyon Adı</th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600 w-28">Birim Sayısı</th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600 w-28">Durum</th>
              <th className="text-right px-5 py-3 font-semibold text-slate-600 w-44">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400">
                  Henüz kayıt yok. &ldquo;Oluştur&rdquo; butonu ile başlayın.
                </td>
              </tr>
            )}
            {data.map((item, i) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 text-slate-400 tabular-nums">{i + 1}</td>
                <td className="px-5 py-3 font-medium text-slate-800">{item.organizasyon_adi}</td>
                <td className="px-5 py-3 text-center text-slate-600 tabular-nums">{item.birim_sayisi}</td>
                <td className="px-5 py-3 text-center">
                  <button
                    onClick={() => handleToggle(item)}
                    disabled={isPending || saltOkunur}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                      item.aktif
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${item.aktif ? 'bg-green-500' : 'bg-slate-400'}`} />
                    {item.aktif ? 'Aktif' : 'Pasif'}
                  </button>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <SaatGecmisDugmesi
                      sayi={(auditLoglarByRefId[String(item.id)] ?? []).length}
                      onClick={() => setGecmisRefId(String(item.id))}
                    />
                    <Link
                      href={`/tanimlar/organizasyon/${item.id}`}
                      title="Detay"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Link>
                    {!saltOkunur && (
                      <button
                        onClick={() => duzenle(item)}
                        title="Düzenle"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
            Toplam {data.length} kayıt
          </div>
        )}
      </div>

      <Modal
        open={modalAcik}
        onClose={kapat}
        title={secili ? 'Organizasyon Düzenle' : 'Yeni Organizasyon'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Organizasyon Adı</label>
            <input
              name="organizasyon_adi"
              type="text"
              required
              defaultValue={secili?.organizasyon_adi ?? ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              placeholder="Organizasyon adı girin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Durum</label>
            <select
              name="aktif"
              defaultValue={secili ? String(secili.aktif) : 'true'}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            >
              <option value="true">Aktif</option>
              <option value="false">Pasif</option>
            </select>
          </div>

          {sunuciHata && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{sunuciHata}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={kapat}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isPending || saltOkunur}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Kaydediliyor…' : secili ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      <AuditGecmisPanel
        acik={gecmisRefId !== null}
        onKapat={() => setGecmisRefId(null)}
        auditLoglar={gecmisLoglar}
        baslik="Organizasyon Değişiklik Geçmişi"
        diffSatirlari={organizasyonAuditDiffSatirlari}
        degerGoster={organizasyonAuditDegerGoster}
      />
    </div>
  )
}
