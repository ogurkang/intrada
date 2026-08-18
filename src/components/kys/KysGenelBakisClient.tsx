'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import Modal from '@/components/ui/Modal'
import { GozDetayLink, SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import { kysAnaAltMenuEkle, kysAltMenuEkle } from '@/app/(dashboard)/kys/actions'
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

export default function KysGenelBakisClient({
  anaMenuler,
  auditLoglarByRefId,
  saltOkunur = false,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)
  const [anaMenuAcik, setAnaMenuAcik] = useState(false)
  const [altMenuAcik, setAltMenuAcik] = useState(false)
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)
  const [menuParentId, setMenuParentId] = useState('')
  const [menuAdi, setMenuAdi] = useState('')
  const [menuAciklama, setMenuAciklama] = useState('')

  function menuFormSifirla() {
    setMenuAdi('')
    setMenuAciklama('')
    setHata(null)
  }

  function anaMenuAc() {
    menuFormSifirla()
    setAnaMenuAcik(true)
  }

  function altMenuAc() {
    menuFormSifirla()
    setMenuParentId(anaMenuler[0] ? String(anaMenuler[0].id) : '')
    setAltMenuAcik(true)
  }

  function kaydetAnaMenu() {
    setHata(null)
    const fd = new FormData()
    fd.set('baslik', menuAdi)
    fd.set('aciklama', menuAciklama)
    startTransition(async () => {
      const res = await kysAnaAltMenuEkle(fd)
      if (res.hata) {
        setHata(res.hata)
        return
      }
      setAnaMenuAcik(false)
      menuFormSifirla()
      router.refresh()
    })
  }

  function kaydetAltMenu() {
    setHata(null)
    const fd = new FormData()
    fd.set('parent_id', menuParentId)
    fd.set('baslik', menuAdi)
    fd.set('aciklama', menuAciklama)
    startTransition(async () => {
      const res = await kysAltMenuEkle(fd)
      if (res.hata) {
        setHata(res.hata)
        return
      }
      setAltMenuAcik(false)
      menuFormSifirla()
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

      <Modal open={anaMenuAcik} onClose={() => setAnaMenuAcik(false)} title="Ana Alt Menü Ekle" size="md">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Menü Adı</label>
            <input
              value={menuAdi}
              onChange={e => setMenuAdi(e.target.value)}
              maxLength={120}
              placeholder="Örn. Kalite El Kitabı"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Açıklama (isteğe bağlı)</label>
            <textarea
              value={menuAciklama}
              onChange={e => setMenuAciklama(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          {hata ? <p className="text-sm text-red-600">{hata}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAnaMenuAcik(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
              İptal
            </button>
            <button type="button" disabled={isPending} onClick={kaydetAnaMenu} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={altMenuAcik} onClose={() => setAltMenuAcik(false)} title="Alt Menü Ekle" size="md">
        <div className="space-y-4">
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
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Menü Adı</label>
            <input
              value={menuAdi}
              onChange={e => setMenuAdi(e.target.value)}
              maxLength={120}
              placeholder="Örn. Prosedürler"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Açıklama (isteğe bağlı)</label>
            <textarea
              value={menuAciklama}
              onChange={e => setMenuAciklama(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          {hata ? <p className="text-sm text-red-600">{hata}</p> : null}
          <div className="flex justify-end gap-2">
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
