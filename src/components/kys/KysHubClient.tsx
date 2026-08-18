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
import type { KysGoruntulemeGrubu } from '@/lib/kys-goruntuleme'
import type { KysBaslikSatir, KysMudurlukSecenek } from '@/components/kys/KysBaslikListeClient'
import type { Tables } from '@/types/database'

interface AltMenuKart {
  id: number
  baslik: string
  aciklama?: string
  href: string
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
  const [yeniBaslik, setYeniBaslik] = useState('')
  const [yeniKod, setYeniKod] = useState('')
  const [yeniBirim, setYeniBirim] = useState('')

  // Düzenle
  const [duzenleSatir, setDuzenleSatir] = useState<KysBaslikSatir | null>(null)
  const [duzenleBaslik, setDuzenleBaslik] = useState('')
  const [duzenleKod, setDuzenleKod] = useState('')
  const [duzenleBirim, setDuzenleBirim] = useState('')
  const [duzenleAciklama, setDuzenleAciklama] = useState('')

  // Yükle
  const [yukleSatir, setYukleSatir] = useState<KysBaslikSatir | null>(null)
  const [sorumluBirim, setSorumluBirim] = useState('')

  // Geçmiş
  const [gecmisSatir, setGecmisSatir] = useState<KysBaslikSatir | null>(null)

  function kaydet() {
    const fd = new FormData()
    fd.set('menu_id', String(menuId))
    fd.set('baslik', yeniBaslik)
    fd.set('kod', yeniKod)
    fd.set('sorumlu_birim', yeniBirim)
    setHata(null)
    startTransition(async () => {
      const res = await kysBaslikEkle(fd)
      if (res.hata) { setHata(res.hata); return }
      setModalAcik(false)
      setYeniBaslik(''); setYeniKod(''); setYeniBirim('')
      router.refresh()
    })
  }

  function duzenleAc(satir: KysBaslikSatir) {
    setDuzenleSatir(satir)
    setDuzenleBaslik(satir.baslik)
    setDuzenleKod(satir.kod ?? '')
    setDuzenleAciklama(satir.aciklama ?? '')
    setDuzenleBirim(satir.sorumlu_birim ?? '')
    setHata(null)
  }

  function duzenleKaydet() {
    if (!duzenleSatir) return
    const fd = new FormData()
    fd.set('id', String(duzenleSatir.id))
    fd.set('baslik', duzenleBaslik)
    fd.set('kod', duzenleKod)
    fd.set('aciklama', duzenleAciklama)
    fd.set('sorumlu_birim', duzenleBirim)
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
    setSorumluBirim(satir.sorumlu_birim ?? '')
    setHata(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function yukleKaydet() {
    if (!yukleSatir) return
    const file = fileRef.current?.files?.[0]
    if (!file) { setHata('Dosya seçin.'); return }
    if (file.size > KYS_BELGE_MAX_BOYUT) { setHata('Dosya en fazla 15 MB olabilir.'); return }
    setHata(null)
    const baslikId = yukleSatir.id
    startTransition(async () => {
      try {
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
        kayitFd.set('sorumlu_birim', sorumluBirim)
        kayitFd.set('storage_path', hazirlik.path)
        kayitFd.set('dosya_adi', file.name)
        kayitFd.set('boyut', String(file.size))
        const res = await kysBelgeKaydet(kayitFd)
        if (res.hata) { setHata(res.hata); return }
        setYukleSatir(null)
        router.refresh()
      } catch {
        setHata('Belge yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.')
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Başlık + geri */}
      <div>
        <Link href="/kys" className="mb-2 inline-flex text-sm text-slate-500 hover:text-slate-700">
          ← KYS Yönetimi
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">{menuLabel}</h1>
        {aciklama ? <p className="mt-1 max-w-3xl text-sm text-slate-600">{aciklama}</p> : null}
      </div>

      {/* Alt Menü Kartları */}
      {altMenuler.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold text-slate-700">Alt Menüler</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {altMenuler.map(k => (
              <Link
                key={k.id}
                href={k.href}
                className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold leading-snug text-slate-800">{k.baslik}</h3>
                    {k.aciklama ? <p className="mt-2 text-xs leading-relaxed text-slate-600">{k.aciklama}</p> : null}
                    <span className="mt-3 inline-block text-xs font-medium text-slate-500 group-hover:text-slate-800">Aç →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Başlık Listesi */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-700">Başlıklar</h2>
          {!saltOkunur && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => { setHata(null); setModalAcik(true) }}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-50"
            >
              <span className="text-lg leading-none">+</span>
              Başlık Ekle
            </button>
          )}
        </div>

        {saltOkunur ? (
          <p className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            Bu profil belgelerini yalnızca görüntüleyebilir.
          </p>
        ) : null}

        {hata && !modalAcik && !duzenleSatir && !yukleSatir ? (
          <p className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{hata}</p>
        ) : null}

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
                      Henüz başlık yok. "Başlık Ekle" ile oluşturabilirsiniz.
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

      {/* Başlık Ekle Modal */}
      <Modal open={modalAcik} onClose={() => { setModalAcik(false); setHata(null) }} title={`${menuLabel} — Başlık Ekle`} size="md">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Kod <span className="font-normal text-slate-400">(isteğe bağlı)</span></label>
            <input
              value={yeniKod}
              onChange={e => setYeniKod(e.target.value)}
              maxLength={40}
              placeholder="Örn. KYS-01"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Başlık</label>
            <input
              value={yeniBaslik}
              onChange={e => setYeniBaslik(e.target.value)}
              maxLength={120}
              placeholder="Örn. Prosedür Adı"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Sorumlu Birim <span className="font-normal text-slate-400">(isteğe bağlı)</span></label>
            <select
              value={yeniBirim}
              onChange={e => setYeniBirim(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Seçiniz</option>
              {mudurlukler.map(m => (
                <option key={m.id} value={m.mudurluk_adi}>{m.mudurluk_adi}</option>
              ))}
            </select>
          </div>
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
            <select
              value={duzenleBirim}
              onChange={e => setDuzenleBirim(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Seçiniz</option>
              {mudurlukler.map(m => (
                <option key={m.id} value={m.mudurluk_adi}>{m.mudurluk_adi}</option>
              ))}
              {duzenleBirim && !mudurlukler.some(m => m.mudurluk_adi === duzenleBirim) ? (
                <option value={duzenleBirim}>{duzenleBirim} (pasif / eski)</option>
              ) : null}
            </select>
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
            <select
              value={sorumluBirim}
              onChange={e => setSorumluBirim(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="">Seçiniz</option>
              {mudurlukler.map(m => (
                <option key={m.id} value={m.mudurluk_adi}>{m.mudurluk_adi}</option>
              ))}
              {sorumluBirim && !mudurlukler.some(m => m.mudurluk_adi === sorumluBirim) ? (
                <option value={sorumluBirim}>{sorumluBirim} (pasif / eski)</option>
              ) : null}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Dosya (PDF / Word / Excel)</label>
            <input
              ref={fileRef}
              type="file"
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
