'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import Modal from '@/components/ui/Modal'
import { SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import SilOnayModal from '@/components/ui/SilOnayModal'
import KysKlasorKart from '@/components/kys/KysKlasorKart'
import {
  kysAnaAltMenuTopluEkle,
  kysAltMenuTopluEkle,
  kysBaslikEkle,
  kysMenuGuncelle,
  kysMenuSil,
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
  altMenuler: { id: number; baslik: string; aciklama: string | null }[]
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
  const [baslikAcik, setBaslikAcik] = useState(false)
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)
  const [menuParentId, setMenuParentId] = useState('')
  const [baslikAnaId, setBaslikAnaId] = useState('')
  const [baslikAltId, setBaslikAltId] = useState('')
  const [baslikAd, setBaslikAd] = useState('')
  const [baslikNot, setBaslikNot] = useState('')
  const [baslikKod, setBaslikKod] = useState('')
  const [anaSatirlar, setAnaSatirlar] = useState<MenuSatirForm[]>([boshSatir()])
  const [altSatirlar, setAltSatirlar] = useState<MenuSatirForm[]>([boshSatir()])
  const [duzenleMenu, setDuzenleMenu] = useState<{ id: number; baslik: string; aciklama: string | null; tur: 'ana' | 'alt' } | null>(null)
  const [duzenleAdi, setDuzenleAdi] = useState('')
  const [duzenleAciklama, setDuzenleAciklama] = useState('')
  const [silOnay, setSilOnay] = useState<{ id: number; baslik: string } | null>(null)
  const [silEngelMesaj, setSilEngelMesaj] = useState<string | null>(null)

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

  function baslikEkleAc() {
    const ilk = anaMenuler[0]
    setBaslikAnaId(ilk ? String(ilk.id) : '')
    setBaslikAltId('')
    setBaslikAd('')
    setBaslikNot('')
    setBaslikKod('')
    setHata(null)
    setBaslikAcik(true)
  }

  const baslikAna = anaMenuler.find(m => String(m.id) === baslikAnaId)
  const baslikAltMenuler = baslikAna?.altMenuler ?? []

  function kaydetBaslik() {
    setHata(null)
    const menuId = baslikAltId || baslikAnaId
    const fd = new FormData()
    fd.set('menu_id', menuId)
    fd.set('baslik', baslikAd)
    fd.set('aciklama', baslikNot)
    fd.set('kod', baslikKod)
    startTransition(async () => {
      const res = await kysBaslikEkle(fd)
      if (res.hata) {
        setHata(res.hata)
        return
      }
      setBaslikAcik(false)
      router.refresh()
    })
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

  function duzenleAc(menu: { id: number; baslik: string; aciklama: string | null }, tur: 'ana' | 'alt') {
    setDuzenleMenu({ ...menu, tur })
    setDuzenleAdi(menu.baslik)
    setDuzenleAciklama(menu.aciklama ?? '')
    setHata(null)
  }

  function kaydetDuzenle() {
    if (!duzenleMenu) return
    setHata(null)
    const fd = new FormData()
    fd.set('id', String(duzenleMenu.id))
    fd.set('baslik', duzenleAdi)
    fd.set('aciklama', duzenleAciklama)
    startTransition(async () => {
      const res = await kysMenuGuncelle(fd)
      if (res.hata) {
        setHata(res.hata)
        return
      }
      setDuzenleMenu(null)
      router.refresh()
    })
  }

  function silIste(menu: { id: number; baslik: string }) {
    setSilOnay(menu)
    setHata(null)
  }

  function silOnayla() {
    if (!silOnay) return
    const fd = new FormData()
    fd.set('id', String(silOnay.id))
    startTransition(async () => {
      const res = await kysMenuSil(fd)
      if (res.hata) {
        setSilOnay(null)
        setSilEngelMesaj(res.hata)
        return
      }
      setSilOnay(null)
      setDuzenleMenu(null)
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
            <button
              type="button"
              onClick={baslikEkleAc}
              disabled={isPending || anaMenuler.length === 0}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50"
            >
              + Başlık Ekle
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

      {anaMenuler.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
          Henüz menü yok. “Ana Alt Menü Ekle” ile başlayın.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {anaMenuler.map(m => {
            const refId = String(m.id)
            const loglar = auditLoglarByRefId[refId] ?? []
            const altOzet = m.altMenuler.length > 0
              ? `${m.altMenuler.length} alt menü`
              : 'Henüz alt menü yok'
            const aciklamaMetin = m.aciklama ? `${m.aciklama} · ${altOzet}` : altOzet
            return (
              <KysKlasorKart
                key={m.id}
                href={kysMenuYolu(m.id)}
                baslik={m.baslik}
                aciklama={aciklamaMetin}
                onDuzenle={saltOkunur ? undefined : () => duzenleAc(m, 'ana')}
                duzenleDisabled={isPending}
                ekstra={
                  <SaatGecmisDugmesi
                    sayi={loglar.length}
                    onClick={() => setGecmisRefId(refId)}
                    title="Menü geçmişi"
                  />
                }
              />
            )
          })}
        </div>
      )}

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

      <Modal open={baslikAcik} onClose={() => setBaslikAcik(false)} title="Başlık Ekle" size="md">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ana Alt Menü</label>
            <select
              value={baslikAnaId}
              onChange={e => {
                setBaslikAnaId(e.target.value)
                setBaslikAltId('')
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {anaMenuler.map(m => (
                <option key={m.id} value={m.id}>{m.baslik}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Alt Menü</label>
            <select
              value={baslikAltId}
              onChange={e => setBaslikAltId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Ana alt menüye ekle</option>
              {baslikAltMenuler.map(a => (
                <option key={a.id} value={a.id}>{a.baslik}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Kod (isteğe bağlı)</label>
            <input
              value={baslikKod}
              onChange={e => setBaslikKod(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Başlık</label>
            <input
              value={baslikAd}
              onChange={e => setBaslikAd(e.target.value)}
              maxLength={120}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Açıklama (isteğe bağlı)</label>
            <textarea
              value={baslikNot}
              onChange={e => setBaslikNot(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          {hata ? <p className="text-sm text-red-600">{hata}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setBaslikAcik(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
              İptal
            </button>
            <button type="button" disabled={isPending} onClick={kaydetBaslik} className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
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

      <Modal
        open={duzenleMenu != null}
        onClose={() => { setDuzenleMenu(null); setHata(null) }}
        title={duzenleMenu?.tur === 'alt' ? 'Alt Menüyü Düzenle' : 'Ana Alt Menüyü Düzenle'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Menü Adı</label>
            <input
              value={duzenleAdi}
              onChange={e => setDuzenleAdi(e.target.value)}
              maxLength={120}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Açıklama (isteğe bağlı)</label>
            <textarea
              value={duzenleAciklama}
              onChange={e => setDuzenleAciklama(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          {hata ? <p className="text-sm text-red-600">{hata}</p> : null}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => duzenleMenu && silIste(duzenleMenu)}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Sil
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setDuzenleMenu(null); setHata(null) }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
                İptal
              </button>
              <button type="button" disabled={isPending} onClick={kaydetDuzenle} className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {isPending ? 'Kaydediliyor…' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <SilOnayModal
        open={silOnay != null}
        onClose={() => setSilOnay(null)}
        mesaj={`“${silOnay?.baslik ?? ''}” menüsünü silmek istediğinize emin misiniz?`}
        onEvet={silOnayla}
        pending={isPending}
      />

      <Modal open={silEngelMesaj != null} onClose={() => setSilEngelMesaj(null)} title="Silme işlemi yapılamadı" size="md">
        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-800">{silEngelMesaj}</p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setSilEngelMesaj(null)}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white"
            >
              Tamam
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
