'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { firmaCalisanDetayHref } from '@/lib/firma-calisan-link'

interface Props {
  mudurluler: string[]
  ogrenimler: string[]
  ayrilisNedenleri: string[]
  onEkle: (fd: FormData) => Promise<{ hata?: string; id?: number; public_id?: string }>
}

export default function FirmaPersonelYeniClient({ mudurluler, ogrenimler, ayrilisNedenleri, onEkle }: Props) {
  const router = useRouter()
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHata(null)
    const fd = new FormData(e.currentTarget)
    setIsPending(true)
    const res = await onEkle(fd)
    if (res.hata) {
      setHata(res.hata)
      setIsPending(false)
    } else {
      if (typeof window !== 'undefined' && window.opener) {
        window.opener.postMessage('refresh', '*')
        window.close()
      } else {
        router.push(
          res.public_id
            ? `/link/${res.public_id}`
            : res.id
              ? firmaCalisanDetayHref({ id: res.id })
              : '/firma-calisanlar',
        )
      }
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/firma-calisanlar"
          className="text-sm font-medium text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50">
          ← Listeye Dön
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Yeni Firma Personel</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Ad Soyad *</label>
              <input name="ad_soyad" required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sicil No</label>
              <input name="sicil_no" placeholder="Firma içi sicil"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">TCKN</label>
              <input name="tckn" maxLength={11}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Cinsiyet</label>
              <select name="cinsiyet"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
                <option value="">—</option>
                <option value="Erkek">Erkek</option>
                <option value="Kadın">Kadın</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Doğum Tarihi</label>
              <input name="dogum_tarihi" type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Öğrenim</label>
              {ogrenimler.length ? (
                <select name="ogrenim"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
                  <option value="">— Seçin —</option>
                  {ogrenimler.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input name="ogrenim"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefon</label>
              <input name="telefon"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">E-posta</label>
              <input name="e_posta" type="email" placeholder="ornek@adapazari.bel.tr"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kuruma Giriş Tarihi</label>
              <input name="kuruma_giris_tarihi" type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Görev Müdürlüğü</label>
              {mudurluler.length ? (
                <select name="gorev_mudurlugu"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
                  <option value="">— Seçin —</option>
                  {mudurluler.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <input name="gorev_mudurlugu"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Görevi</label>
              <input name="gorevi"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mesleği</label>
              <input name="meslegi"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Ayrılış (doldurun = ayrıldı)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Ayrılış Tarihi</label>
                <input name="ayrilis_tarihi" type="date"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Ayrılış Nedeni</label>
                {ayrilisNedenleri.length ? (
                  <select name="ayrilis_nedeni"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
                    <option value="">— Seçin —</option>
                    {ayrilisNedenleri.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                ) : (
                  <input name="ayrilis_nedeni"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
                )}
              </div>
            </div>
          </div>

          {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Link href="/firma-calisanlar"
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
