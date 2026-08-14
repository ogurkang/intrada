'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import Modal from '@/components/ui/Modal'
import {
  GozDetayLink,
  KalemDuzenleDugmesi,
  SaatGecmisDugmesi,
} from '@/components/ui/TabloIslemIkonlari'
import { denetimDonemAc, denetimDonemEkle, denetimDonemGuncelle, denetimDonemKapat } from '@/app/(dashboard)/denetim/actions'
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

interface Props {
  donemler: DenetimDonemSatir[]
  acikDonemVar: boolean
  auditLoglarByRefId: Record<string, Tables<'personel_audit_log'>[]>
}

export default function DenetimDonemListeClient({ donemler, acikDonemVar, auditLoglarByRefId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)
  const [ekleAcik, setEkleAcik] = useState(false)
  const [duzenle, setDuzenle] = useState<DenetimDonemSatir | null>(null)
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)

  const [donemAdi, setDonemAdi] = useState('')
  const [baslangic, setBaslangic] = useState('')
  const [bitis, setBitis] = useState('')

  function formSifirla() {
    setDonemAdi('')
    setBaslangic('')
    setBitis('')
    setHata(null)
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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link href="/denetim" className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2">
            ← Denetim Yönetimi
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Denetim Dönemleri</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Her dönem içinde karar, mali, taşınmaz, performans ve iç kontrol menüleri standart olarak yer alır.
            Açık dönem kapanmadan yeni dönem açılamaz.
          </p>
        </div>
        <button
          type="button"
          onClick={ekleAc}
          disabled={isPending || acikDonemVar}
          title={acikDonemVar ? 'Önce açık dönemi kapatın' : undefined}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 text-white px-4 py-2 text-sm font-medium hover:bg-blue-600 disabled:opacity-50 whitespace-nowrap"
        >
          + Yeni Dönem
        </button>
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
