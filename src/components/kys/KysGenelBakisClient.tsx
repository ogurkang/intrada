'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import Modal from '@/components/ui/Modal'
import { GozDetayLink, SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import {
  kysAnaAltMenuTopluEkle,
  kysAltMenuTopluEkle,
  type KysBulkMenuSatir,
} from '@/app/(dashboard)/kys/actions'
import { kysMenuAuditDegerGoster, kysMenuAuditDiffSatirlari } from '@/lib/kys-audit'
import { kysMenuYolu } from '@/lib/kys'
import type { Tables } from '@/types/database'

export type KysAnaMenuSatir = {
  id: number
  baslik: string
  aciklama: string | null
  sira_no: number
  altMenuler: { id: number; baslik: string }[]
}

interface Props {
  anaMenuler: KysAnaMenuSatir[]
  auditLoglarByRefId: Record<string, Tables<'personel_audit_log'>[]>
  saltOkunur?: boolean
}

type MenuSatirForm = { baslik: string; aciklama: string }

function boshSatir(): MenuSatirForm {
  return { baslik: '', aciklama: '' }
}

export default function KysGenelBakisClient({
  anaMenuler,
  auditLoglarByRefId,
  saltOkunur = false,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)
  const [uyarilar, setUyarilar] = useState<string[]>([])
  const [anaMenuAcik, setAnaMenuAcik] = useState(false)
  const [altMenuAcik, setAltMenuAcik] = useState(false)
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)
  const [menuParentId, setMenuParentId] = useState('')
  const [anaSatirlar, setAnaSatirlar] = useState<MenuSatirForm[]>([boshSatir()])
  const [altSatirlar, setAltSatirlar] = useState<MenuSatirForm[]>([boshSatir()])

  function anaMenuAc() {
    setAnaSatirlar([boshSatir()])
    setHata(null)
    setUyarilar([])
    setAnaMenuAcik(true)
  }

  function altMenuAc() {
    setAltSatirlar([boshSatir()])
    setMenuParentId(anaMenuler[0] ? String(anaMenuler[0].id) : '')
    setHata(null)
    setUyarilar([])
    setAltMenuAcik(true)
  }

  function satirGuncelle(
    list: MenuSatirForm[],
    setList: (v: MenuSatirForm[]) => void,
    idx: number,
    key: keyof MenuSatirForm,
    val: string,
  ) {
    const next = list.map((s, i) => (i === idx ? { ...s, [key]: val } : s))
    setList(next)
  }

  function satirEkle(list: MenuSatirForm[], setList: (v: MenuSatirForm[]) => void) {
    setList([...list, boshSatir()])
  }

  function satirSil(list: MenuSatirForm[], setList: (v: MenuSatirForm[]) => void, idx: number) {
    if (list.length === 1) return
    setList(list.filter((_, i) => i !== idx))
  }

  function kaydetAnaMenu() {
    setHata(null)
    setUyarilar([])
    const payload: KysBulkMenuSatir[] = anaSatirlar
      .filter(s => s.baslik.trim().length >= 2)
      .map(s => ({ baslik: s.baslik.trim(), aciklama: s.aciklama.trim() || undefined }))
    if (payload.length === 0) {
      setHata('En az bir menü adı (2+ karakter) girin.')
      return
    }
    startTransition(async () => {
      const res = await kysAnaAltMenuTopluEkle(payload)
      if (res.hata) {
        setHata(res.hata)
        return
      }
      if (res.hatalar?.length) setUyarilar(res.hatalar)
      setAnaMenuAcik(false)
      router.refresh()
    })
  }

  function kaydetAltMenu() {
    setHata(null)
    setUyarilar([])
    const parentId = Number.parseInt(menuParentId, 10)
    if (!Number.isFinite(parentId) || parentId <= 0) {
      setHata('Ana alt menü seçin.')
      return
    }
    const payload: KysBulkMenuSatir[] = altSatirlar
      .filter(s => s.baslik.trim().length >= 2)
      .map(s => ({ baslik: s.baslik.trim(), aciklama: s.aciklama.trim() || undefined }))
    if (payload.length === 0) {
      setHata('En az bir menü adı (2+ karakter) girin.')
      return
    }
    startTransition(async () => {
      const res = await kysAltMenuTopluEkle(parentId, payload)
      if (res.hata) {
        setHata(res.hata)
        return
      }
      if (res.hatalar?.length) setUyarilar(res.hatalar)
      setAltMenuAcik(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">KYS Yönetimi</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Ana alt menü ekleyin; alt menüler bunların altına yerleşir. Her alt menüde başlık ekleyip belge
            yükleyebilirsiniz. Belgeler yalnızca görüntülenir.
          </p>
        </div>
        {!saltOkunur && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={anaMenuAc}
              disabled={isPending}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-50"
            >
              + Ana Alt Menü Ekle
            </button>
            <button
              type="button"
              onClick={altMenuAc}
              disabled={isPending || anaMenuler.length === 0}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              + Alt Menü Ekle
            </button>
          </div>
        )}
      </div>

      {hata ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{hata}</p>
      ) : null}
      {uyarilar.length > 0 ? (
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Bazı satırlar eklenemedi: {uyarilar.join('; ')}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="w-20 px-3 py-3 text-center font-semibold text-slate-700">Sıra No</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Ana Alt Menü</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Alt Menüler</th>
                <th className="w-28 px-3 py-3 text-center font-semibold text-slate-700">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {anaMenuler.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    Henüz menü yok. “Ana Alt Menü Ekle” ile başlayın.
                  </td>
                </tr>
              ) : (
                anaMenuler.map((m, i) => {
                  const refId = String(m.id)
                  const loglar = auditLoglarByRefId[refId] ?? []
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80">
                      <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-slate-800">{m.baslik}</span>
                        {m.aciklama ? (
                          <span className="mt-0.5 block text-xs text-slate-500">{m.aciklama}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {m.altMenuler.length === 0 ? (
                          <span className="text-slate-400">Henüz alt menü yok</span>
                        ) : (
                          <span className="flex flex-wrap gap-1">
                            {m.altMenuler.map(a => (
                              <a
                                key={a.id}
                                href={kysMenuYolu(a.id)}
                                className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-200"
                              >
                                {a.baslik}
                              </a>
                            ))}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <SaatGecmisDugmesi
                            sayi={loglar.length}
                            onClick={() => setGecmisRefId(refId)}
                            title="Menü geçmişi"
                          />
                          <GozDetayLink href={kysMenuYolu(m.id)} title="Detay" />
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={anaMenuAcik} onClose={() => setAnaMenuAcik(false)} title="Ana Alt Menü Ekle" size="lg">
        <div className="space-y-3">
          <p className="text-xs text-slate-500">Her satır bir ayrı ana alt menü olarak eklenir.</p>
          <div className="space-y-2">
            {anaSatirlar.map((satir, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="flex-1 space-y-1">
                  <input
                    value={satir.baslik}
                    onChange={e => satirGuncelle(anaSatirlar, setAnaSatirlar, idx, 'baslik', e.target.value)}
                    maxLength={120}
                    placeholder={`Menü adı ${idx + 1}`}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <input
                    value={satir.aciklama}
                    onChange={e => satirGuncelle(anaSatirlar, setAnaSatirlar, idx, 'aciklama', e.target.value)}
                    maxLength={200}
                    placeholder="Açıklama (isteğe bağlı)"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => satirSil(anaSatirlar, setAnaSatirlar, idx)}
                  disabled={anaSatirlar.length === 1}
                  className="mt-1 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
                  title="Satırı kaldır"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => satirEkle(anaSatirlar, setAnaSatirlar)}
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-teal-400 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50"
          >
            + Satır Ekle
          </button>
          {hata ? <p className="text-sm text-red-600">{hata}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setAnaMenuAcik(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
              İptal
            </button>
            <button type="button" disabled={isPending} onClick={kaydetAnaMenu} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={altMenuAcik} onClose={() => setAltMenuAcik(false)} title="Alt Menü Ekle" size="lg">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ana Alt Menü</label>
            <select
              value={menuParentId}
              onChange={e => setMenuParentId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {anaMenuler.map(m => (
                <option key={m.id} value={m.id}>{m.baslik}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-500">Her satır seçili ana alt menüye ayrı bir alt menü olarak eklenir.</p>
          <div className="space-y-2">
            {altSatirlar.map((satir, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="flex-1 space-y-1">
                  <input
                    value={satir.baslik}
                    onChange={e => satirGuncelle(altSatirlar, setAltSatirlar, idx, 'baslik', e.target.value)}
                    maxLength={120}
                    placeholder={`Alt menü adı ${idx + 1}`}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    value={satir.aciklama}
                    onChange={e => satirGuncelle(altSatirlar, setAltSatirlar, idx, 'aciklama', e.target.value)}
                    maxLength={200}
                    placeholder="Açıklama (isteğe bağlı)"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => satirSil(altSatirlar, setAltSatirlar, idx)}
                  disabled={altSatirlar.length === 1}
                  className="mt-1 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
                  title="Satırı kaldır"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => satirEkle(altSatirlar, setAltSatirlar)}
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-emerald-400 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
          >
            + Satır Ekle
          </button>
          {hata ? <p className="text-sm text-red-600">{hata}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setAltMenuAcik(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
              İptal
            </button>
            <button type="button" disabled={isPending} onClick={kaydetAltMenu} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>
      </Modal>

      <AuditGecmisPanel
        acik={gecmisRefId != null}
        onKapat={() => setGecmisRefId(null)}
        auditLoglar={gecmisRefId ? auditLoglarByRefId[gecmisRefId] ?? [] : []}
        baslik="Menü Geçmişi"
        diffSatirlari={kysMenuAuditDiffSatirlari}
        degerGoster={kysMenuAuditDegerGoster}
      />
    </div>
  )
}
