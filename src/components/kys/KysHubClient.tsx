'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'
import { KalemDuzenleDugmesi, SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import DenetimBelgeGecmisPanel from '@/components/denetim/DenetimBelgeGecmisPanel'
import {
  kysBaslikEkle,
  kysBaslikGuncelle,
  kysBelgeKaydet,
  kysBelgeYuklemeHazirla,
} from '@/app/(dashboard)/kys/actions'
import { kysBelgeStorageYukle } from '@/lib/kys-belge-yukle'
import { kysBelgeAuditDegerGoster, kysBelgeAuditDiffSatirlari } from '@/lib/kys-audit'
import { KYS_BELGE_MAX_BOYUT } from '@/lib/kys'
import SorumluBirimCokluSecim, { birimListToString, birimStringToList } from '@/components/kys/SorumluBirimCokluSecim'
import {
  KysListeAracCubugu,
  KysSortTh,
  kysListeSirala,
  useKysListeSayfalama,
  type KysListeSortYon,
} from '@/components/kys/KysListeKontrol'
import type { KysGoruntulemeGrubu } from '@/lib/kys-goruntuleme'
import type { KysBaslikSatir, KysMudurlukSecenek } from '@/components/kys/KysBaslikListeClient'
import type { Tables } from '@/types/database'

interface AltMenuKart {
  id: number
  baslik: string
  aciklama?: string
  href: string
  sira_no: number
}

interface Props {
  menuId: number
  menuLabel: string
  aciklama: string
  altMenuler: AltMenuKart[]
  basliklar: KysBaslikSatir[]
  mudurlukler: KysMudurlukSecenek[]
  auditLoglarByRefId: Record<string, Tables<'personel_audit_log'>[]>
  goruntulemelerByRefId: Record<string, KysGoruntulemeGrubu[]>
  saltOkunur?: boolean
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

export default function KysHubClient({
  menuId,
  menuLabel,
  aciklama,
  altMenuler,
  basliklar,
  mudurlukler,
  auditLoglarByRefId,
  goruntulemelerByRefId,
  saltOkunur = false,
}: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)

  // Başlık Ekle
  const [modalAcik, setModalAcik] = useState(false)
  const [yeniSatirlar, setYeniSatirlar] = useState<YeniBaslikSatiri[]>([bosSatir()])

  // Düzenle
  const [duzenleSatir, setDuzenleSatir] = useState<KysBaslikSatir | null>(null)
  const [duzenleBaslik, setDuzenleBaslik] = useState('')
  const [duzenleKod, setDuzenleKod] = useState('')
  const [duzenleBirimler, setDuzenleBirimler] = useState<string[]>([])
  const [duzenleAciklama, setDuzenleAciklama] = useState('')

  // Yükle
  const [yukleSatir, setYukleSatir] = useState<KysBaslikSatir | null>(null)
  const [sorumluBirimler, setSorumluBirimler] = useState<string[]>([])

  // Geçmiş
  const [gecmisSatir, setGecmisSatir] = useState<KysBaslikSatir | null>(null)
  const [arama, setArama] = useState('')

  const [baslikSortKey, setBaslikSortKey] = useState<string | null>('sira')
  const [baslikSortYon, setBaslikSortYon] = useState<KysListeSortYon>('asc')
  const [altSortKey, setAltSortKey] = useState<string | null>('sira')
  const [altSortYon, setAltSortYon] = useState<KysListeSortYon>('asc')

  const q = arama.trim().toLocaleLowerCase('tr-TR')

  const filtrelenmisBasliklar = useMemo(() => {
    if (!q) return basliklar
    return basliklar.filter(item => {
      const haystack = [item.kod, item.baslik, item.aciklama, item.sorumlu_birim, item.dosya_adi]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR')
      return haystack.includes(q)
    })
  }, [basliklar, q])

  const filtrelenmisAltMenuler = useMemo(() => {
    if (!q) return altMenuler
    return altMenuler.filter(item => {
      const haystack = [item.baslik, item.aciklama].filter(Boolean).join(' ').toLocaleLowerCase('tr-TR')
      return haystack.includes(q)
    })
  }, [altMenuler, q])

  const siraliBasliklar = useMemo(
    () =>
      kysListeSirala(filtrelenmisBasliklar, baslikSortKey, baslikSortYon, (item, key) => {
        if (key === 'sira') return item.sira_no
        if (key === 'kod') return item.kod ?? ''
        if (key === 'baslik') return item.baslik
        if (key === 'birim') return item.sorumlu_birim ?? ''
        if (key === 'belge') return item.belge_id != null ? 1 : 0
        return null
      }),
    [filtrelenmisBasliklar, baslikSortKey, baslikSortYon],
  )

  const siraliAltMenuler = useMemo(
    () =>
      kysListeSirala(filtrelenmisAltMenuler, altSortKey, altSortYon, (item, key) => {
        if (key === 'sira') return item.sira_no
        if (key === 'baslik') return item.baslik
        return null
      }),
    [filtrelenmisAltMenuler, altSortKey, altSortYon],
  )

  const baslikSayfa = useKysListeSayfalama(siraliBasliklar, 25)
  const altSayfa = useKysListeSayfalama(siraliAltMenuler, 25)

  function baslikSortDegistir(key: string) {
    if (baslikSortKey === key) setBaslikSortYon(y => (y === 'asc' ? 'desc' : 'asc'))
    else {
      setBaslikSortKey(key)
      setBaslikSortYon('asc')
    }
    baslikSayfa.setSayfa(1)
  }

  function altSortDegistir(key: string) {
    if (altSortKey === key) setAltSortYon(y => (y === 'asc' ? 'desc' : 'asc'))
    else {
      setAltSortKey(key)
      setAltSortYon('asc')
    }
    altSayfa.setSayfa(1)
  }

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
        if (res.hata || !res.id) { setHata(res.hata ?? 'Başlık eklenemedi.'); return }
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
          if (yuklemeHatasi) { setHata(`Dosya yüklenemedi: ${yuklemeHatasi}`); return }
          const kayitFd = new FormData()
          kayitFd.set('baslik_id', String(res.id))
          kayitFd.set('sorumlu_birim', birimListToString(satir.birimler))
          kayitFd.set('storage_path', hazirlik.path)
          kayitFd.set('dosya_adi', file.name)
          kayitFd.set('boyut', String(file.size))
          const kayit = await kysBelgeKaydet(kayitFd)
          if (kayit.hata) { setHata(kayit.hata); return }
        }
      }
      setModalAcik(false)
      setYeniSatirlar([bosSatir()])
      router.refresh()
    })
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
      if (res.hata) { setHata(res.hata); return }
      setDuzenleSatir(null)
      router.refresh()
    })
  }

  function yukleAc(satir: KysBaslikSatir) {
    setYukleSatir(satir)
    setSorumluBirimler(birimStringToList(satir.sorumlu_birim))
    setHata(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function yukleKaydet() {
    if (!yukleSatir) return
    const files = Array.from(fileRef.current?.files ?? [])
    if (files.length === 0) { setHata('Dosya seçin.'); return }
    if (files.some(file => file.size > KYS_BELGE_MAX_BOYUT)) { setHata('Dosya en fazla 50 MB olabilir.'); return }
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
          if (yuklemeHatasi) { setHata(`Dosya yüklenemedi: ${yuklemeHatasi}`); return }

          const kayitFd = new FormData()
          kayitFd.set('baslik_id', String(baslikId))
          kayitFd.set('sorumlu_birim', birimListToString(sorumluBirimler))
          kayitFd.set('storage_path', hazirlik.path)
          kayitFd.set('dosya_adi', file.name)
          kayitFd.set('boyut', String(file.size))
          const res = await kysBelgeKaydet(kayitFd)
          if (res.hata) { setHata(res.hata); return }
        }
        setYukleSatir(null)
        router.refresh()
      } catch {
        setHata('Belge yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.')
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Başlık + işlemler */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-bold text-slate-800">{menuLabel}</h1>
            {aciklama ? <p className="max-w-3xl text-sm text-slate-600">{aciklama}</p> : null}
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link
                href="/kys"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                <span className="text-base leading-none">{'<'}</span>
                KYS Yönetimi
              </Link>
              {!saltOkunur && (
                <Link
                  href={`/kys/m/${menuId}/baslik-ekle`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600"
                >
                  <span className="text-lg leading-none">+</span>
                  Başlık Ekle
                </Link>
              )}
            </div>
            <input
              type="search"
              value={arama}
              onChange={e => {
                setArama(e.target.value)
                baslikSayfa.setSayfa(1)
                altSayfa.setSayfa(1)
              }}
              placeholder="Başlık, kod, birim veya alt menü ara…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 sm:w-72"
            />
          </div>
        </div>
      </div>

      {/* Alt Menü Listesi */}
      {altMenuler.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-700">Alt Menüler</h2>
          <KysListeAracCubugu
            toplam={altSayfa.toplam}
            sayfa={altSayfa.sayfa}
            toplamSayfa={altSayfa.toplamSayfa}
            sayfaBoyutu={altSayfa.sayfaBoyutu}
            onSayfaBoyutu={altSayfa.setSayfaBoyutu}
            onSayfa={altSayfa.setSayfa}
            etiket="alt menü"
          />
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <KysSortTh label="Sıra No" sortKey="sira" aktifKey={altSortKey} yon={altSortYon} onSort={altSortDegistir} align="center" className="w-28" />
                    <KysSortTh label="Alt Menü" sortKey="baslik" aktifKey={altSortKey} yon={altSortYon} onSort={altSortDegistir} />
                    <th className="w-28 px-3 py-3 text-center font-semibold text-slate-700">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {altSayfa.sayfali.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-slate-400">
                        {q ? 'Arama kriterine uygun alt menü bulunamadı.' : 'Alt menü yok.'}
                      </td>
                    </tr>
                  ) : (
                    altSayfa.sayfali.map((k, i) => {
                    const globalIdx = altSayfa.baslangicSira + i
                    return (
                      <tr key={k.id} className="hover:bg-slate-50/80">
                        <td className="px-3 py-3 text-center tabular-nums text-slate-600">{globalIdx + 1}</td>
                        <td className="px-4 py-3">
                          <Link href={k.href} className="font-medium text-slate-800 hover:text-teal-700">
                            {k.baslik}
                          </Link>
                          {k.aciklama ? (
                            <span className="mt-0.5 block text-xs text-slate-500">{k.aciklama}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Link
                            href={k.href}
                            className="inline-flex rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                          >
                            Aç →
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Başlık Listesi */}
      {basliklar.length > 0 ? (
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-700">Başlıklar</h2>

        {saltOkunur ? (
          <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            Bu profil belgelerini yalnızca görüntüleyebilir.
          </p>
        ) : null}

        {hata && !modalAcik && !duzenleSatir && !yukleSatir ? (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{hata}</p>
        ) : null}

        <KysListeAracCubugu
          toplam={baslikSayfa.toplam}
          sayfa={baslikSayfa.sayfa}
          toplamSayfa={baslikSayfa.toplamSayfa}
          sayfaBoyutu={baslikSayfa.sayfaBoyutu}
          onSayfaBoyutu={baslikSayfa.setSayfaBoyutu}
          onSayfa={baslikSayfa.setSayfa}
          etiket="başlık"
        />

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <KysSortTh label="Sıra No" sortKey="sira" aktifKey={baslikSortKey} yon={baslikSortYon} onSort={baslikSortDegistir} align="center" className="w-28" />
                  <KysSortTh label="Kod" sortKey="kod" aktifKey={baslikSortKey} yon={baslikSortYon} onSort={baslikSortDegistir} className="w-28" />
                  <KysSortTh label="Başlık" sortKey="baslik" aktifKey={baslikSortKey} yon={baslikSortYon} onSort={baslikSortDegistir} />
                  <KysSortTh label="Sorumlu Birim" sortKey="birim" aktifKey={baslikSortKey} yon={baslikSortYon} onSort={baslikSortDegistir} />
                  <KysSortTh label="Belge Durumu" sortKey="belge" aktifKey={baslikSortKey} yon={baslikSortYon} onSort={baslikSortDegistir} />
                  <th className="w-40 px-3 py-3 text-center font-semibold text-slate-700">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {baslikSayfa.sayfali.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                      {q ? 'Arama kriterine uygun başlık bulunamadı.' : 'Henüz başlık yok.'}
                    </td>
                  </tr>
                ) : (
                  baslikSayfa.sayfali.map((item, i) => {
                    const belgeLogKey = item.belge_id != null ? String(item.belge_id) : ''
                    const loglar = auditLoglarByRefId[String(item.id)] ?? []
                    const goruntulemeler = belgeLogKey ? goruntulemelerByRefId[belgeLogKey] ?? [] : []
                    const globalIdx = baslikSayfa.baslangicSira + i
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="px-3 py-3 text-center tabular-nums text-slate-600">{globalIdx + 1}</td>
                        <td className="px-3 py-3 tabular-nums text-slate-500">
                          {item.kod
                            ? <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono">{item.kod}</span>
                            : <span className="text-slate-300">—</span>}
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
                            ) : null}
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
      </section>
      ) : null}

      {/* Başlık Ekle Modal */}
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
                  <label className="mb-1 block text-sm font-medium text-slate-700">Sorumlu Birim</label>
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

      {/* Düzenle Modal */}
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
            <button type="button" onClick={() => { setDuzenleSatir(null); setHata(null) }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
              İptal
            </button>
            <button type="button" disabled={isPending} onClick={duzenleKaydet} className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {isPending ? 'Kaydediliyor…' : 'Güncelle'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Yükle Modal */}
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

      {/* Geçmiş Panel */}
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
