'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'
import { KalemDuzenleDugmesi, SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import DenetimBelgeGecmisPanel from '@/components/denetim/DenetimBelgeGecmisPanel'
import { kysBaslikEkle, kysBaslikGuncelle, kysBelgeKaydet, kysBelgeYuklemeHazirla } from '@/app/(dashboard)/kys/actions'
import { kysBelgeStorageYukle } from '@/lib/kys-belge-yukle'
import { kysBelgeAuditDegerGoster, kysBelgeAuditDiffSatirlari } from '@/lib/kys-audit'
import { KYS_BELGE_MAX_BOYUT } from '@/lib/kys'
import SorumluBirimCokluSecim, { birimListToString, birimStringToList } from '@/components/kys/SorumluBirimCokluSecim'
import type { KysGoruntulemeGrubu } from '@/lib/kys-goruntuleme'
import type { Tables } from '@/types/database'

export type KysBaslikSatir = {
  id: number
  baslik: string
  aciklama: string | null
  kod: string | null
  sira_no: number
  belge_id: number | null
  sorumlu_birim: string | null
  dosya_adi: string | null
  yukleyen: string | null
}

export type KysMudurlukSecenek = { id: number; mudurluk_adi: string }

interface Props {
  menuId: number
  menuLabel: string
  aciklama: string
  parentLabel: string
  parentHref: string
  saltOkunur?: boolean
  basliklar: KysBaslikSatir[]
  mudurlukler: KysMudurlukSecenek[]
  auditLoglarByRefId: Record<string, Tables<'personel_audit_log'>[]>
  goruntulemelerByRefId: Record<string, KysGoruntulemeGrubu[]>
}

const IKON =
  'inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-40'

type YeniBaslikSatiri = {
  kod: string
  baslik: string
  aciklama: string
  birimler: string[]
  dosyalar: File[]
}

function bosSatir(): YeniBaslikSatiri {
  return { kod: '', baslik: '', aciklama: '', birimler: [], dosyalar: [] }
}

export default function KysBaslikListeClient({
  menuId,
  menuLabel,
  aciklama,
  parentLabel,
  parentHref,
  saltOkunur = false,
  basliklar,
  mudurlukler,
  auditLoglarByRefId,
  goruntulemelerByRefId,
}: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [modalAcik, setModalAcik] = useState(false)
  const [yeniSatirlar, setYeniSatirlar] = useState<YeniBaslikSatiri[]>([bosSatir()])
  const [hata, setHata] = useState<string | null>(null)
  const [duzenleSatir, setDuzenleSatir] = useState<KysBaslikSatir | null>(null)
  const [duzenleBaslik, setDuzenleBaslik] = useState('')
  const [duzenleKod, setDuzenleKod] = useState('')
  const [duzenleAciklama, setDuzenleAciklama] = useState('')
  const [duzenleBirimler, setDuzenleBirimler] = useState<string[]>([])
  const [yukleSatir, setYukleSatir] = useState<KysBaslikSatir | null>(null)
  const [sorumluBirimler, setSorumluBirimler] = useState<string[]>([])
  const [gecmisSatir, setGecmisSatir] = useState<KysBaslikSatir | null>(null)
  const [isPending, startTransition] = useTransition()

  function kaydet() {
    setHata(null)
    startTransition(async () => {
      for (const satir of yeniSatirlar) {
        if (satir.baslik.trim().length < 2) continue
        const fd = new FormData()
        fd.set('menu_id', String(menuId))
        fd.set('baslik', satir.baslik)
        fd.set('kod', satir.kod)
        fd.set('aciklama', satir.aciklama)
        fd.set('sorumlu_birim', birimListToString(satir.birimler))
        const res = await kysBaslikEkle(fd)
        if (res.hata || !res.id) {
          setHata(res.hata ?? 'Başlık eklenemedi.')
          return
        }
        for (const file of satir.dosyalar) {
          const hazirlikFd = new FormData()
          hazirlikFd.set('baslik_id', String(res.id))
          hazirlikFd.set('dosya_adi', file.name)
          hazirlikFd.set('boyut', String(file.size))
          const hazirlik = await kysBelgeYuklemeHazirla(hazirlikFd)
          if (hazirlik.hata || !hazirlik.path || !hazirlik.token) {
            setHata(hazirlik.hata ?? 'Yükleme başlatılamadı.')
            return
          }
          const yuklemeHatasi = await kysBelgeStorageYukle(hazirlik.path, hazirlik.token, file)
          if (yuklemeHatasi) {
            setHata(`Dosya yüklenemedi: ${yuklemeHatasi}`)
            return
          }
          const kayitFd = new FormData()
          kayitFd.set('baslik_id', String(res.id))
          kayitFd.set('sorumlu_birim', birimListToString(satir.birimler))
          kayitFd.set('storage_path', hazirlik.path)
          kayitFd.set('dosya_adi', file.name)
          kayitFd.set('boyut', String(file.size))
          const kayit = await kysBelgeKaydet(kayitFd)
          if (kayit.hata) {
            setHata(kayit.hata)
            return
          }
        }
      }
      setModalAcik(false)
      setYeniSatirlar([bosSatir()])
      router.refresh()
    })
  }

  function yukleAc(satir: KysBaslikSatir) {
    setYukleSatir(satir)
    setSorumluBirimler(birimStringToList(satir.sorumlu_birim))
    setHata(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function duzenleAc(satir: KysBaslikSatir) {
    setDuzenleSatir(satir)
    setDuzenleBaslik(satir.baslik)
    setDuzenleKod(satir.kod ?? '')
    setDuzenleAciklama(satir.aciklama ?? '')
    setDuzenleBirimler(birimStringToList(satir.sorumlu_birim))
    setHata(null)
  }

  function duzenleKaydet() {
    if (!duzenleSatir) return
    const fd = new FormData()
    fd.set('id', String(duzenleSatir.id))
    fd.set('baslik', duzenleBaslik)
    fd.set('kod', duzenleKod)
    fd.set('aciklama', duzenleAciklama)
    fd.set('sorumlu_birim', birimListToString(duzenleBirimler))
    setHata(null)
    startTransition(async () => {
      const res = await kysBaslikGuncelle(fd)
      if (res.hata) {
        setHata(res.hata)
        return
      }
      setDuzenleSatir(null)
      router.refresh()
    })
  }

  function yukleKaydet() {
    if (!yukleSatir) return
    const files = Array.from(fileRef.current?.files ?? [])
    if (files.length === 0) {
      setHata('Dosya seçin.')
      return
    }
    if (files.some(file => file.size > KYS_BELGE_MAX_BOYUT)) {
      setHata('Dosya en fazla 50 MB olabilir.')
      return
    }
    setHata(null)
    const baslikId = yukleSatir.id
    startTransition(async () => {
      try {
        for (const file of files) {
          const hazirlikFd = new FormData()
          hazirlikFd.set('baslik_id', String(baslikId))
          hazirlikFd.set('dosya_adi', file.name)
          hazirlikFd.set('boyut', String(file.size))
          const hazirlik = await kysBelgeYuklemeHazirla(hazirlikFd)
          if (hazirlik.hata || !hazirlik.path || !hazirlik.token) {
            setHata(hazirlik.hata ?? 'Yükleme başlatılamadı.')
            return
          }

          const yuklemeHatasi = await kysBelgeStorageYukle(hazirlik.path, hazirlik.token, file)
          if (yuklemeHatasi) {
            setHata(`Dosya yüklenemedi: ${yuklemeHatasi}`)
            return
          }

          const kayitFd = new FormData()
          kayitFd.set('baslik_id', String(baslikId))
          kayitFd.set('sorumlu_birim', birimListToString(sorumluBirimler))
          kayitFd.set('storage_path', hazirlik.path)
          kayitFd.set('dosya_adi', file.name)
          kayitFd.set('boyut', String(file.size))
          const res = await kysBelgeKaydet(kayitFd)
          if (res.hata) {
            setHata(res.hata)
            return
          }
        }
        setYukleSatir(null)
        router.refresh()
      } catch {
        setHata('Belge yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={parentHref} className="mb-2 inline-flex text-sm text-slate-500 hover:text-slate-700">
            ← {parentLabel}
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">{menuLabel}</h1>
          {aciklama ? <p className="mt-1 max-w-3xl text-sm text-slate-600">{aciklama}</p> : null}
        </div>
        {!saltOkunur && (
          <Link
            href={`/kys/m/${menuId}/baslik-ekle`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600"
          >
            <span className="text-lg leading-none">+</span>
            Başlık Ekle
          </Link>
        )}
      </div>

      {saltOkunur ? (
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Bu profil belgelerini yalnızca görüntüleyebilir.
        </p>
      ) : null}

      {hata && !modalAcik && !duzenleSatir && !yukleSatir ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{hata}</p>
      ) : null}

      {basliklar.length > 0 ? (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="w-20 px-3 py-3 text-center font-semibold text-slate-700">Sıra No</th>
                <th className="w-28 px-3 py-3 text-left font-semibold text-slate-700">Kod</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Başlık</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Sorumlu Birim</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Belge Durumu</th>
                <th className="w-36 px-3 py-3 text-center font-semibold text-slate-700">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {basliklar.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    Bu menüde henüz başlık yok. “Başlık Ekle” ile oluşturabilirsiniz.
                  </td>
                </tr>
              ) : (
                basliklar.map((item, i) => {
                  const belgeLogKey = item.belge_id != null ? String(item.belge_id) : ''
                  const loglar = auditLoglarByRefId[String(item.id)] ?? []
                  const goruntulemeler = belgeLogKey ? goruntulemelerByRefId[belgeLogKey] ?? [] : []
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="px-3 py-3 text-center tabular-nums text-slate-600">{i + 1}</td>
                      <td className="px-3 py-3 tabular-nums text-slate-500">
                        {item.kod ? <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono">{item.kod}</span> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">{item.baslik}</span>
                        {item.aciklama ? (
                          <span className="mt-0.5 block text-xs text-slate-500">{item.aciklama}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.sorumlu_birim || '—'}
                        {item.yukleyen ? (
                          <span className="mt-0.5 block text-[11px] text-slate-400">{item.yukleyen}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            item.belge_id != null
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                          title={item.dosya_adi ?? undefined}
                        >
                          {item.belge_id != null ? 'Belge yüklendi' : 'Belge bekleniyor'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <SaatGecmisDugmesi
                            sayi={loglar.length + goruntulemeler.reduce((n, g) => n + g.tarihler.length, 0)}
                            onClick={() => setGecmisSatir(item)}
                            title="Başlık, belge ve görüntüleme geçmişi"
                          />
                          {!saltOkunur && (
                            <KalemDuzenleDugmesi
                              disabled={isPending}
                              onClick={() => duzenleAc(item)}
                              title="Başlık ve sorumlu birimi düzenle"
                            />
                          )}
                          {item.belge_id != null ? (
                            <a
                              href={`/kys/onizle?id=${item.belge_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className={`${IKON} text-indigo-600 hover:bg-indigo-50`}
                              title="Önizle"
                              aria-label="Önizle"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <circle cx="11" cy="11" r="7" />
                                <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
                              </svg>
                            </a>
                          ) : (
                            <span className={`${IKON} text-slate-300`} title="Belge yok" aria-hidden>
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <circle cx="11" cy="11" r="7" />
                                <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
                              </svg>
                            </span>
                          )}
                          {!saltOkunur && (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => yukleAc(item)}
                              className={`${IKON} text-emerald-700 hover:bg-emerald-50`}
                              title={item.belge_id != null ? 'Belgeyi değiştir' : 'Belge ekle'}
                              aria-label="Yükle"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0-12l-4 4m4-4l4 4" />
                              </svg>
                            </button>
                          )}
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
      ) : null}

      <Modal open={modalAcik} onClose={() => { setModalAcik(false); setHata(null) }} title={`${menuLabel} — Başlık Ekle`} size="xl">
        <div className="space-y-4">
          {yeniSatirlar.map((satir, idx) => (
            <div key={idx} className="space-y-3 rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Başlık Satırı #{idx + 1}</span>
                {yeniSatirlar.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setYeniSatirlar(yeniSatirlar.filter((_, i) => i !== idx))}
                    className="text-xs text-red-600"
                  >
                    Satırı Sil
                  </button>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                <div className="lg:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Kod</label>
                  <input
                    value={satir.kod}
                    onChange={e => setYeniSatirlar(yeniSatirlar.map((s, i) => (i === idx ? { ...s, kod: e.target.value } : s)))}
                    maxLength={40}
                    placeholder="KYS-01"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="lg:col-span-3">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Başlık</label>
                  <input
                    value={satir.baslik}
                    onChange={e => setYeniSatirlar(yeniSatirlar.map((s, i) => (i === idx ? { ...s, baslik: e.target.value } : s)))}
                    maxLength={120}
                    placeholder="Prosedür Adı"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="lg:col-span-4">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Sorumlu Birim (çoklu)</label>
                  <SorumluBirimCokluSecim
                    value={satir.birimler}
                    onChange={next => setYeniSatirlar(yeniSatirlar.map((s, i) => (i === idx ? { ...s, birimler: next } : s)))}
                    mudurlukler={mudurlukler}
                  />
                </div>
                <div className="lg:col-span-3">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Dosyalar</label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm,application/pdf"
                    onChange={e =>
                      setYeniSatirlar(
                        yeniSatirlar.map((s, i) =>
                          i === idx ? { ...s, dosyalar: Array.from(e.target.files ?? []) } : s,
                        ),
                      )
                    }
                    className="block w-full text-sm text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2 file:py-1.5 file:text-xs file:font-medium"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setYeniSatirlar([...yeniSatirlar, bosSatir()])}
            className="rounded-lg border border-dashed border-slate-400 px-3 py-2 text-xs font-medium text-slate-700"
          >
            + Satır Ekle
          </button>
          {hata ? <p className="text-sm text-red-600">{hata}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setModalAcik(false); setHata(null) }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">
              İptal
            </button>
            <button type="button" disabled={isPending} onClick={kaydet} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={duzenleSatir != null} onClose={() => { setDuzenleSatir(null); setHata(null) }} title="Başlığı Düzenle" size="md">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Kod <span className="font-normal text-slate-400">(isteğe bağlı)</span></label>
            <input
              value={duzenleKod}
              onChange={e => setDuzenleKod(e.target.value)}
              maxLength={40}
              placeholder="Örn. KYS-01"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Başlık</label>
            <input
              value={duzenleBaslik}
              onChange={e => setDuzenleBaslik(e.target.value)}
              maxLength={120}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Sorumlu Birim</label>
            <SorumluBirimCokluSecim
              value={duzenleBirimler}
              onChange={setDuzenleBirimler}
              mudurlukler={mudurlukler}
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
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDuzenleSatir(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
              İptal
            </button>
            <button type="button" disabled={isPending} onClick={duzenleKaydet} className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {isPending ? 'Kaydediliyor…' : 'Güncelle'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={yukleSatir != null}
        onClose={() => setYukleSatir(null)}
        title={yukleSatir ? `${yukleSatir.baslik} — Belge Yükle` : 'Belge Yükle'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Sorumlu Birim</label>
            <SorumluBirimCokluSecim
              value={sorumluBirimler}
              onChange={setSorumluBirimler}
              mudurlukler={mudurlukler}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Dosya (PDF / Word / Excel)</label>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm,application/pdf"
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
            />
          </div>
          {hata ? <p className="text-sm text-red-600">{hata}</p> : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setYukleSatir(null)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              İptal
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={yukleKaydet}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {isPending ? 'Yükleniyor…' : 'Yükle'}
            </button>
          </div>
        </div>
      </Modal>

      <DenetimBelgeGecmisPanel
        acik={gecmisSatir != null}
        onKapat={() => setGecmisSatir(null)}
        auditLoglar={gecmisSatir ? auditLoglarByRefId[String(gecmisSatir.id)] ?? [] : []}
        goruntulemeler={
          gecmisSatir?.belge_id != null
            ? goruntulemelerByRefId[String(gecmisSatir.belge_id)] ?? []
            : []
        }
        baslik={`${menuLabel} — Belge Geçmişi`}
        diffSatirlari={kysBelgeAuditDiffSatirlari}
        degerGoster={kysBelgeAuditDegerGoster}
      />
    </div>
  )
}
