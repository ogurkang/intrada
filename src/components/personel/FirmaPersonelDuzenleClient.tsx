'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Tables } from '@/types/database'
import { firmaCalisanDetayHref } from '@/lib/firma-calisan-link'
import {
  etkinYerleskeIdKaynak,
  yerleskeSecenekleriKaynak,
  type YerleskeSecenek,
} from '@/lib/yerleske-adresi'

type FC = Tables<'firma_calisanlar'>

interface Props {
  kayit: FC
  mudurluler: string[]
  ogrenimler: string[]
  ayrilisNedenleri: string[]
  yerleskeHarita: Record<string, YerleskeSecenek[]>
  sirketYerleskeHarita: Record<string, YerleskeSecenek[]>
  seciliYerleskeId: number | null
  onGuncelle: (id: number, fd: FormData) => Promise<{ hata?: string }>
}

export default function FirmaPersonelDuzenleClient({
  kayit,
  mudurluler,
  ogrenimler,
  ayrilisNedenleri,
  yerleskeHarita,
  sirketYerleskeHarita,
  seciliYerleskeId,
  onGuncelle,
}: Props) {
  const router = useRouter()
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const k = kayit

  const mudMap = useMemo(() => new Map(Object.entries(yerleskeHarita)), [yerleskeHarita])
  const sirketMap = useMemo(() => new Map(Object.entries(sirketYerleskeHarita)), [sirketYerleskeHarita])

  const [gorevMud, setGorevMud] = useState(k.gorev_mudurlugu ?? '')
  const [yerleskeId, setYerleskeId] = useState(
    seciliYerleskeId != null ? String(seciliYerleskeId) : '',
  )

  const yerleskeSecenekleri = useMemo(
    () => yerleskeSecenekleriKaynak(mudMap, sirketMap, 'firma', gorevMud, gorevMud),
    [mudMap, sirketMap, gorevMud],
  )

  function gorevMudDegisti(yeniMud: string) {
    setGorevMud(yeniMud)
    const list = yerleskeSecenekleriKaynak(mudMap, sirketMap, 'firma', yeniMud, yeniMud)
    const etkin = etkinYerleskeIdKaynak(mudMap, sirketMap, 'firma', yeniMud, null, yeniMud)
    setYerleskeId(etkin != null ? String(etkin) : list[0] ? String(list[0].id) : '')
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await onGuncelle(k.id, fd)
      if (res.hata) setHata(res.hata)
      else router.push(firmaCalisanDetayHref(k))
    })
  }

  const detayHref = firmaCalisanDetayHref(k)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">ADABEL Personeli Düzenle — {k.ad_soyad}</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Ad Soyad *</label>
              <input name="ad_soyad" required defaultValue={k.ad_soyad}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sicil No</label>
              <input name="sicil_no" defaultValue={k.sicil_no ?? ''} placeholder="Firma içi sicil"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">TCKN</label>
              <input name="tckn" defaultValue={k.tckn ?? ''} maxLength={11}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Cinsiyet</label>
              <select name="cinsiyet" defaultValue={k.cinsiyet ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
                <option value="">—</option>
                <option value="Erkek">Erkek</option>
                <option value="Kadın">Kadın</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Doğum Tarihi</label>
              <input name="dogum_tarihi" type="date" defaultValue={k.dogum_tarihi ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Öğrenim</label>
              {ogrenimler.length ? (
                <select name="ogrenim" defaultValue={k.ogrenim ?? ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
                  <option value="">— Seçin —</option>
                  {ogrenimler.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input name="ogrenim" defaultValue={k.ogrenim ?? ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefon</label>
              <input name="telefon" defaultValue={k.telefon ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">E-posta</label>
              <input name="e_posta" type="email" defaultValue={k.e_posta ?? ''} placeholder="ornek@adapazari.bel.tr"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kuruma Giriş Tarihi</label>
              <input name="kuruma_giris_tarihi" type="date" defaultValue={k.kuruma_giris_tarihi ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Görev Yeri</label>
              {mudurluler.length ? (
                <select
                  name="gorev_mudurlugu"
                  value={gorevMud}
                  onChange={e => gorevMudDegisti(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
                  <option value="">— Seçin —</option>
                  {mudurluler.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <input
                  name="gorev_mudurlugu"
                  value={gorevMud}
                  onChange={e => gorevMudDegisti(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="Tanımlar > Müdürlükler'den ekleyin" />
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Yerleşke Adresi</label>
              {yerleskeSecenekleri.length === 0 ? (
                <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  Görev yeri için tanımlı yerleşke yok.
                </p>
              ) : (
                <select
                  name="yerleske_adresi_id"
                  value={yerleskeId}
                  onChange={e => setYerleskeId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
                  {yerleskeSecenekleri.map(y => (
                    <option key={y.id} value={y.id}>{y.ad}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Görevi</label>
              <input name="gorevi" defaultValue={k.gorevi ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mesleği</label>
              <input name="meslegi" defaultValue={k.meslegi ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Ayrılış (doldurun = ayrıldı)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Ayrılış Tarihi</label>
                <input name="ayrilis_tarihi" type="date" defaultValue={k.ayrilis_tarihi ?? ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Ayrılış Nedeni</label>
                <select name="ayrilis_nedeni" defaultValue={k.ayrilis_nedeni ?? ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
                  <option value="">— Seçin —</option>
                  {['Emeklilik', 'İstifa', 'Nakil', 'Vefat', 'Diğer'].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
          </div>

          {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
          <div className="flex flex-row justify-end items-center gap-3 pt-2">
            <Link href={detayHref}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">İptal</Link>
            <button type="submit" disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50">
              {isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
