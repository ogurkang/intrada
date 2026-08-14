'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import Modal from '@/components/ui/Modal'
import {
  GozDetayLink,
  KalemDuzenleDugmesi,
  SaatGecmisDugmesi,
} from '@/components/ui/TabloIslemIkonlari'
import {
  denetimAnaAltMenuEkle,
  denetimAltMenuEkle,
  denetimDonemAc,
  denetimDonemEkle,
  denetimDonemGuncelle,
  denetimDonemKapat,
} from '@/app/(dashboard)/denetim/actions'
import {
  denetimDonemAuditDegerGoster,
  denetimDonemAuditDiffSatirlari,
} from '@/lib/denetim-audit'
import { denetimTarihGoster } from '@/lib/denetim'
import type { Tables } from '@/types/database'

export type DenetimDonemSatir = {
  id: number
  sira_no: number
  donem_adi: string
  baslangic_tarihi: string
  bitis_tarihi: string
  durum: 'Açık' | 'Kapalı'
}

export type DenetimAnaMenuSecenek = {
  id: number
  donem_id: number
  donem_adi: string
  baslik: string
  donemKapali: boolean
}

interface Props {
  donemler: DenetimDonemSatir[]
  acikDonemVar: boolean
  auditLoglarByRefId: Record<string, Tables<'personel_audit_log'>[]>
  anaMenuler: DenetimAnaMenuSecenek[]
}

export default function DenetimDonemListeClient({
  donemler,
  acikDonemVar,
  auditLoglarByRefId,
  anaMenuler,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)
  const [ekleAcik, setEkleAcik] = useState(false)
  const [anaMenuAcik, setAnaMenuAcik] = useState(false)
  const [altMenuAcik, setAltMenuAcik] = useState(false)
  const [duzenle, setDuzenle] = useState<DenetimDonemSatir | null>(null)
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)

  const [donemAdi, setDonemAdi] = useState('')
  const [baslangic, setBaslangic] = useState('')
  const [bitis, setBitis] = useState('')
  const [menuDonemId, setMenuDonemId] = useState('')
  const [menuParentId, setMenuParentId] = useState('')
  const [menuAdi, setMenuAdi] = useState('')
  const [menuAciklama, setMenuAciklama] = useState('')

  function formSifirla() {
    setDonemAdi('')
    setBaslangic('')
    setBitis('')
    setHata(null)
  }

  function menuFormSifirla() {
    setMenuAdi('')
    setMenuAciklama('')
    setHata(null)
  }

  const acikDonem = donemler.find(d => d.durum === 'Açık')
  const acikAnaMenuler = anaMenuler.filter(m => String(m.donem_id) === (menuDonemId || String(acikDonem?.id ?? '')))

  function anaMenuAc() {
    menuFormSifirla()
    setMenuDonemId(acikDonem ? String(acikDonem.id) : donemler[0] ? String(donemler[0].id) : '')
    setAnaMenuAcik(true)
  }

  function altMenuAc() {
    menuFormSifirla()
    const varsayilanDonem = acikDonem ?? donemler[0]
    setMenuDonemId(varsayilanDonem ? String(varsayilanDonem.id) : '')
    const ilk = anaMenuler.find(m => m.donem_id === varsayilanDonem?.id)
    setMenuParentId(ilk ? String(ilk.id) : '')
    setAltMenuAcik(true)
  }

  function ekleAc() {
    formSifirla()
    setEkleAcik(true)
  }

  function duzenleAc(d: DenetimDonemSatir) {
    setDuzenle(d)
    setDonemAdi(d.donem_adi)
    setBaslangic(d.baslangic_tarihi.slice(0, 10))
    setBitis(d.bitis_tarihi.slice(0, 10))
    setHata(null)
  }

  function kaydetEkle() {
    setHata(null)
    const fd = new FormData()
    fd.set('donem_adi', donemAdi)
    fd.set('baslangic_tarihi', baslangic)
    fd.set('bitis_tarihi', bitis)
    startTransition(async () => {
      const res = await denetimDonemEkle(fd)
      if (res.hata) {
        setHata(res.hata)
        return
      }
      setEkleAcik(false)
      formSifirla()
      if (res.id) router.push(`/denetim/donemler/${res.id}`)
      else router.refresh()
    })
  }

  function kaydetAnaMenu() {
    setHata(null)
    const fd = new FormData()
    fd.set('donem_id', menuDonemId)
    fd.set('baslik', menuAdi)
    fd.set('aciklama', menuAciklama)
    startTransition(async () => {
      const res = await denetimAnaAltMenuEkle(fd)
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
      const res = await denetimAltMenuEkle(fd)
      if (res.hata) {
        setHata(res.hata)
        return
      }
      setAltMenuAcik(false)
      menuFormSifirla()
      router.refresh()
    })
  }

  function kaydetGuncelle() {
    if (!duzenle) return
    setHata(null)
    const fd = new FormData()
    fd.set('id', String(duzenle.id))
    fd.set('donem_adi', donemAdi)
    fd.set('baslangic_tarihi', baslangic)
    fd.set('bitis_tarihi', bitis)
    startTransition(async () => {
      const res = await denetimDonemGuncelle(fd)
      if (res.hata) {
        setHata(res.hata)
        return
      }
      setDuzenle(null)
      router.refresh()
    })
  }

  function toggleDurum(d: DenetimDonemSatir) {
    setHata(null)
    startTransition(async () => {
      const res = d.durum === 'Açık' ? await denetimDonemKapat(d.id) : await denetimDonemAc(d.id)
      if (res.hata) {
        setHata(res.hata)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Denetim Yönetimi</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Dönem ekleyin; her dönem Genel Bakış altında yer alır. Ana alt menü (Mali Bilgiler gibi) dönem
            altına, alt menü (Gelir Tarifesi gibi) ise ana alt menünün altına eklenir.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={ekleAc}
            disabled={isPending || acikDonemVar}
            title={acikDonemVar ? 'Önce açık dönemi kapatın' : undefined}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
          >
            + Dönem Ekle
          </button>
          <button
            type="button"
            onClick={anaMenuAc}
            disabled={isPending || donemler.length === 0}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
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
      </div>

      {hata && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{hata}</p>
      )}
      {acikDonemVar && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg">
          Açık bir dönem varken yeni dönem oluşturulamaz. Yeni dönem için önce mevcut açık dönemi pasife (kapalı) alın.
        </p>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-center px-3 py-3 font-semibold text-slate-700 w-20">Sıra No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Dönem Adı</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-700 w-28">Başlangıç</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-700 w-28">Bitiş</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-700 w-24">Durum</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-700 w-36">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {donemler.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    Henüz dönem yok. Yeni dönem oluşturarak başlayın.
                  </td>
                </tr>
              ) : (
                donemler.map(d => {
                  const refId = String(d.id)
                  const loglar = auditLoglarByRefId[refId] ?? []
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80">
                      <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">{d.sira_no}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{d.donem_adi}</td>
                      <td className="px-3 py-2.5 text-center text-slate-600">{denetimTarihGoster(d.baslangic_tarihi)}</td>
                      <td className="px-3 py-2.5 text-center text-slate-600">{denetimTarihGoster(d.bitis_tarihi)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => toggleDurum(d)}
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            d.durum === 'Açık'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                          title={d.durum === 'Açık' ? 'Pasife al (kapat)' : 'Aktife al (aç)'}
                        >
                          {d.durum === 'Açık' ? 'Aktif' : 'Pasif'}
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <SaatGecmisDugmesi
                            sayi={loglar.length}
                            onClick={() => setGecmisRefId(refId)}
                            title="Dönem geçmişi"
                          />
                          <KalemDuzenleDugmesi
                            title="Düzenle"
                            onClick={() => duzenleAc(d)}
                          />
                          <GozDetayLink href={`/denetim/donemler/${d.id}`} title="Detay" />
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

      <Modal
        open={ekleAcik}
        onClose={() => setEkleAcik(false)}
        title="Yeni Denetim Dönemi"
        size="md"
      >
        <DonemForm
          donemAdi={donemAdi}
          setDonemAdi={setDonemAdi}
          baslangic={baslangic}
          setBaslangic={setBaslangic}
          bitis={bitis}
          setBitis={setBitis}
          hata={hata}
          isPending={isPending}
          onKaydet={kaydetEkle}
          onIptal={() => setEkleAcik(false)}
          kaydetLabel="Oluştur"
        />
      </Modal>

      <Modal
        open={duzenle != null}
        onClose={() => setDuzenle(null)}
        title="Dönemi Düzenle"
        size="md"
      >
        <DonemForm
          donemAdi={donemAdi}
          setDonemAdi={setDonemAdi}
          baslangic={baslangic}
          setBaslangic={setBaslangic}
          bitis={bitis}
          setBitis={setBitis}
          hata={hata}
          isPending={isPending}
          onKaydet={kaydetGuncelle}
          onIptal={() => setDuzenle(null)}
          kaydetLabel="Güncelle"
          siraNo={duzenle?.sira_no}
        />
      </Modal>

      <Modal
        open={anaMenuAcik}
        onClose={() => setAnaMenuAcik(false)}
        title="Ana Alt Menü Ekle"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Dönem</label>
            <select
              value={menuDonemId}
              onChange={e => setMenuDonemId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {donemler.map(d => (
                <option key={d.id} value={d.id} disabled={d.durum === 'Kapalı'}>
                  {d.donem_adi} {d.durum === 'Kapalı' ? '(kapalı)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Menü Adı</label>
            <input
              value={menuAdi}
              onChange={e => setMenuAdi(e.target.value)}
              maxLength={120}
              placeholder="Örn. Mali Bilgiler"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Açıklama (isteğe bağlı)</label>
            <textarea
              value={menuAciklama}
              onChange={e => setMenuAciklama(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {hata ? <p className="text-sm text-red-600">{hata}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAnaMenuAcik(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
              İptal
            </button>
            <button type="button" disabled={isPending} onClick={kaydetAnaMenu} className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={altMenuAcik}
        onClose={() => setAltMenuAcik(false)}
        title="Alt Menü Ekle"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Dönem</label>
            <select
              value={menuDonemId}
              onChange={e => {
                setMenuDonemId(e.target.value)
                const ilk = anaMenuler.find(m => String(m.donem_id) === e.target.value)
                setMenuParentId(ilk ? String(ilk.id) : '')
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {donemler.map(d => (
                <option key={d.id} value={d.id} disabled={d.durum === 'Kapalı'}>
                  {d.donem_adi} {d.durum === 'Kapalı' ? '(kapalı)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ana Alt Menü</label>
            <select
              value={menuParentId}
              onChange={e => setMenuParentId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Seçiniz</option>
              {acikAnaMenuler.map(m => (
                <option key={m.id} value={m.id} disabled={m.donemKapali}>
                  {m.baslik}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Menü Adı</label>
            <input
              value={menuAdi}
              onChange={e => setMenuAdi(e.target.value)}
              maxLength={120}
              placeholder="Örn. Gelir Tarifesi"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Açıklama (isteğe bağlı)</label>
            <textarea
              value={menuAciklama}
              onChange={e => setMenuAciklama(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
        baslik="Denetim Dönemi Geçmişi"
        diffSatirlari={denetimDonemAuditDiffSatirlari}
        degerGoster={denetimDonemAuditDegerGoster}
      />
    </div>
  )
}

function DonemForm({
  donemAdi,
  setDonemAdi,
  baslangic,
  setBaslangic,
  bitis,
  setBitis,
  hata,
  isPending,
  onKaydet,
  onIptal,
  kaydetLabel,
  siraNo,
}: {
  donemAdi: string
  setDonemAdi: (v: string) => void
  baslangic: string
  setBaslangic: (v: string) => void
  bitis: string
  setBitis: (v: string) => void
  hata: string | null
  isPending: boolean
  onKaydet: () => void
  onIptal: () => void
  kaydetLabel: string
  siraNo?: number
}) {
  return (
    <div className="space-y-4">
      {siraNo != null && (
        <p className="text-xs text-slate-500">
          Sıra No: <span className="font-mono text-slate-700">{siraNo}</span> (otomatik)
        </p>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Dönem Adı</label>
        <input
          value={donemAdi}
          onChange={e => setDonemAdi(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          placeholder="Örn. 2025 Sayıştay Denetimi"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Başlangıç</label>
          <input
            type="date"
            value={baslangic}
            onChange={e => setBaslangic(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Bitiş</label>
          <input
            type="date"
            value={bitis}
            onChange={e => setBitis(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>
      </div>
      {hata && <p className="text-sm text-red-600">{hata}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onIptal}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          İptal
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onKaydet}
          className="rounded-lg bg-blue-700 text-white px-4 py-2 text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
        >
          {isPending ? 'Kaydediliyor…' : kaydetLabel}
        </button>
      </div>
    </div>
  )
}
