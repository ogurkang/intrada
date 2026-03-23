'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { calisanEkle } from '@/app/(dashboard)/personel/actions'
import { personelDetayHref } from '@/lib/personel-link'

const CINSIYET = ['Erkek', 'Kadın']
const KAN_GRUBU = ['A Rh+', 'A Rh-', 'B Rh+', 'B Rh-', 'AB Rh+', 'AB Rh-', '0 Rh+', '0 Rh-']
const ASKERLIK = ['Yapıldı', 'Tecilli', 'Muaf', 'Yapılmadı', '—']

export default function PersonelYeniClient() {
  const router = useRouter()
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHata(null)
    const fd = new FormData(e.currentTarget)
    setIsPending(true)
    calisanEkle(fd).then((res) => {
      if (res.hata) {
        setHata(res.hata)
        setIsPending(false)
      } else {
        if (window.opener) {
          window.opener.postMessage('refresh', '*')
          window.close()
        } else {
          router.push(
            res.public_id
              ? `/link/${res.public_id}`
              : res.sicil_no
                ? personelDetayHref({ sicil_no: res.sicil_no })
                : '/personel',
          )
        }
      }
    })
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/personel"
          className="text-sm font-medium text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50">
          ← Listeye Dön
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Yeni Personel Ekle</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sicil No <span className="text-red-500">*</span></label>
              <input name="sicil_no" type="text" required autoFocus
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="örn: 12345" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Adı Soyadı <span className="text-red-500">*</span></label>
              <input name="ad_soyad" type="text" required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="Ali Veli" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">T.C. Kimlik No</label>
            <input name="tckn" type="text" maxLength={11} pattern="\d{11}"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="12345678901" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Doğum Tarihi</label>
              <input name="dogum_tarihi" type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Cinsiyet</label>
              <select name="cinsiyet"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
                <option value="">— Seçin —</option>
                {CINSIYET.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kan Grubu</label>
              <select name="kan_grubu"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
                <option value="">— Seçin —</option>
                {KAN_GRUBU.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Askerlik Durumu</label>
              <select name="askerlik_durumu"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
                <option value="">— Seçin —</option>
                {ASKERLIK.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefon</label>
              <input name="telefon" type="tel"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="05xx xxx xx xx" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">E-Posta</label>
              <input name="e_posta" type="email"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="ali@belediye.gov.tr" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Doğum Yeri</label>
            <input name="dogum_yeri" type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="İl / İlçe" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Anne Adı</label>
              <input name="anne_adi" type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Baba Adı</label>
              <input name="baba_adi" type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Adresi</label>
            <textarea name="adresi" rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="Açık adres" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Yakını</label>
              <input name="yakini" type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="Acil durumda aranacak kişi" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Yakını Telefonu</label>
              <input name="yakini_telefonu" type="tel"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="05xx xxx xx xx" />
            </div>
          </div>

          {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Link href="/personel"
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
