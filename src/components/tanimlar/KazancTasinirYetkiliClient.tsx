'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import { KalemDuzenleDugmesi, SaatGecmisDugmesi, CopKutusuSilDugmesi } from '@/components/ui/TabloIslemIkonlari'
import { useTanimlarSaltOkunur } from '@/components/tanimlar/TanimlarSaltOkunurContext'
import {
  tanimKazancTasinirAuditDegerGoster,
  tanimKazancTasinirAuditDiffSatirlari,
} from '@/lib/kazanc-tasinir-yetkili'
import { TASINIR_GOREVI_OPTIONS } from '@/lib/tasinir-gorevi'
import type { Tables } from '@/types/database'
import {
  kazancTasinirYetkiliGuncelle,
  kazancTasinirYetkiliSil,
} from '@/app/(dashboard)/tanimlar/kazanc-bilgi/tasinir-actions'

type TasinirRow = Tables<'tanim_kazanc_tasinir_yetkili'>

type Props = {
  data: TasinirRow[]
  auditLoglarByRefId?: Record<string, Tables<'personel_audit_log'>[]>
}

export default function KazancTasinirYetkiliClient({ data, auditLoglarByRefId = {} }: Props) {
  const router = useRouter()
  const saltOkunur = useTanimlarSaltOkunur()
  const [duzenleSatir, setDuzenleSatir] = useState<TasinirRow | null>(null)
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)
  const [sunuciHata, setSunuciHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function duzenleKaydet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!duzenleSatir) return
    setSunuciHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await kazancTasinirYetkiliGuncelle(duzenleSatir.id, fd)
      if (res.hata) setSunuciHata(res.hata)
      else {
        setDuzenleSatir(null)
        router.refresh()
      }
    })
  }

  function sil(row: TasinirRow) {
    if (!confirm(`${row.gorev_adi} tanımı silinecek. Onaylıyor musunuz?`)) return
    setSunuciHata(null)
    startTransition(async () => {
      const res = await kazancTasinirYetkiliSil(row.id)
      if (res.hata) setSunuciHata(res.hata)
      else router.refresh()
    })
  }

  const gecmisLoglar = gecmisRefId ? auditLoglarByRefId[gecmisRefId] ?? [] : []

  return (
    <div>
      {sunuciHata && !duzenleSatir && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{sunuciHata}</div>
      )}

      <p className="text-sm text-slate-500 mb-4">
        Personel kartı Görevlendirme Bilgileri › Taşınır Görevi seçeneklerine kazanç puanı tanımlanır.
        Bu puan, kadro yan ödemesine eklenerek Terfi Bilgileri’nde gösterilir.
      </p>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 font-semibold text-slate-600 w-20">Sıra No</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Taşınır Görevi</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600 w-40">Puan</th>
              <th className="text-right px-5 py-3 font-semibold text-slate-600 w-32">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-12 text-slate-400">
                  Henüz kayıt yok. «Tanım Ekle» ile taşınır görevi kazanç puanı girin.
                </td>
              </tr>
            )}
            {data.map((row, i) => (
              <tr key={row.id}>
                <td className="px-5 py-3 text-slate-500 tabular-nums">{i + 1}</td>
                <td className="px-5 py-3 font-medium text-slate-800">{row.gorev_adi}</td>
                <td className="px-5 py-3 tabular-nums text-slate-700">{row.tutar?.trim() || '—'}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-end items-center gap-1">
                    <SaatGecmisDugmesi
                      sayi={(auditLoglarByRefId[String(row.id)] ?? []).length}
                      onClick={() => setGecmisRefId(String(row.id))}
                    />
                    {!saltOkunur && (
                      <>
                        <KalemDuzenleDugmesi
                          onClick={() => {
                            setSunuciHata(null)
                            setDuzenleSatir(row)
                          }}
                          disabled={isPending}
                        />
                        <CopKutusuSilDugmesi onClick={() => sil(row)} disabled={isPending} />
                      </>
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
        title="Taşınır Yetkilisi — Düzenle"
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
              <span className="font-medium">Taşınır Görevi</span>
              <select
                name="gorev_adi"
                defaultValue={duzenleSatir.gorev_adi}
                required
                className="border border-slate-300 rounded-lg px-3 py-2"
              >
                {TASINIR_GOREVI_OPTIONS.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span className="font-medium">Puan</span>
              <input
                name="tutar"
                type="text"
                required
                defaultValue={duzenleSatir.tutar ?? ''}
                className="border border-slate-300 rounded-lg px-3 py-2"
              />
            </label>
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
        baslik="Taşınır yetkilisi tanımı — işlem geçmişi"
        diffSatirlari={tanimKazancTasinirAuditDiffSatirlari}
        degerGoster={tanimKazancTasinirAuditDegerGoster}
      />
    </div>
  )
}
