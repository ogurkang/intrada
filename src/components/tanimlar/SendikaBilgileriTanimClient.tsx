'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import { KalemDuzenleDugmesi, SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import TanimAktifSecim from '@/components/tanimlar/TanimAktifSecim'
import { useTanimlarSaltOkunur } from '@/components/tanimlar/TanimlarSaltOkunurContext'
import { tanimSendikaAuditDegerGoster, tanimSendikaAuditDiffSatirlari } from '@/lib/tanim-sendika-audit'
import type { Tables } from '@/types/database'
import { sendikaBilgileriGuncelle } from '@/app/(dashboard)/tanimlar/sendika-bilgileri/actions'

type SendikaRow = Tables<'tanim_sendika'>

const STATU_SECENEKLER = ['Memur', 'İşçi'] as const

type Props = {
  data: SendikaRow[]
  auditLoglarByRefId?: Record<string, Tables<'personel_audit_log'>[]>
}

export default function SendikaBilgileriTanimClient({ data, auditLoglarByRefId = {} }: Props) {
  const router = useRouter()
  const saltOkunur = useTanimlarSaltOkunur()
  const [duzenleSatir, setDuzenleSatir] = useState<SendikaRow | null>(null)
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)
  const [sunuciHata, setSunuciHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function duzenleKaydet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!duzenleSatir) return
    setSunuciHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await sendikaBilgileriGuncelle(duzenleSatir.id, fd)
      if (res.hata) setSunuciHata(res.hata)
      else {
        setDuzenleSatir(null)
        router.refresh()
      }
    })
  }

  const gecmisLoglar = gecmisRefId ? auditLoglarByRefId[gecmisRefId] ?? [] : []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Sendika Bilgileri</h1>
        {!saltOkunur && (
          <Link
            href="/tanimlar/sendika-bilgileri/ekle"
            className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Sendika Bilgileri Ekle
          </Link>
        )}
      </div>

      {sunuciHata && !duzenleSatir && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{sunuciHata}</div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 font-semibold text-slate-600 w-20">Sıra No</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600 w-28">Statü</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Kısa Ad</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Uzun Ad</th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600 w-28">Durum</th>
              <th className="text-right px-5 py-3 font-semibold text-slate-600 w-28">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400">
                  Henüz kayıt yok.
                </td>
              </tr>
            )}
            {data.map((row, i) => (
              <tr key={row.id} className={!row.aktif ? 'bg-slate-50/80' : ''}>
                <td className="px-5 py-3 text-slate-500 tabular-nums">{i + 1}</td>
                <td className="px-5 py-3 text-slate-700">{row.statu}</td>
                <td className="px-5 py-3 font-medium text-slate-800">{row.kisa_ad}</td>
                <td className="px-5 py-3 text-slate-700">{row.uzun_ad}</td>
                <td className="px-5 py-3 text-center">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      row.aktif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {row.aktif ? 'Aktif' : 'Pasif'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end items-center gap-1">
                    <SaatGecmisDugmesi
                      sayi={(auditLoglarByRefId[String(row.id)] ?? []).length}
                      onClick={() => setGecmisRefId(String(row.id))}
                    />
                    {!saltOkunur && (
                      <KalemDuzenleDugmesi
                        onClick={() => {
                          setSunuciHata(null)
                          setDuzenleSatir(row)
                        }}
                        disabled={isPending}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!duzenleSatir}
        title="Sendika Bilgileri — Düzenle"
        onClose={() => {
          setDuzenleSatir(null)
          setSunuciHata(null)
        }}
      >
        {duzenleSatir && (
          <form onSubmit={duzenleKaydet} className="space-y-4">
            {sunuciHata && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{sunuciHata}</div>
            )}
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span className="font-medium">Statü</span>
              <select
                name="statu"
                defaultValue={duzenleSatir.statu}
                required
                className="border border-slate-300 rounded-lg px-3 py-2"
              >
                {STATU_SECENEKLER.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span className="font-medium">Kısa Ad</span>
              <input
                name="kisa_ad"
                type="text"
                required
                defaultValue={duzenleSatir.kisa_ad}
                className="border border-slate-300 rounded-lg px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span className="font-medium">Uzun Ad</span>
              <input
                name="uzun_ad"
                type="text"
                required
                defaultValue={duzenleSatir.uzun_ad}
                className="border border-slate-300 rounded-lg px-3 py-2"
              />
            </label>
            <TanimAktifSecim defaultAktif={duzenleSatir.aktif} />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDuzenleSatir(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
              >
                {isPending ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <AuditGecmisPanel
        acik={gecmisRefId != null}
        onKapat={() => setGecmisRefId(null)}
        auditLoglar={gecmisLoglar}
        baslik="Sendika tanımı — işlem geçmişi"
        diffSatirlari={tanimSendikaAuditDiffSatirlari}
        degerGoster={tanimSendikaAuditDegerGoster}
      />
    </div>
  )
}
