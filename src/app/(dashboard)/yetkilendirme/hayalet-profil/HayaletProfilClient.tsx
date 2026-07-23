'use client'

import { useMemo, useState, useTransition } from 'react'
import { hayaletProfilBaslat } from './actions'

import type { HayaletProfilPersonelSatir } from '@/lib/hayalet-profil-personel'

export type HayaletPersonelSatir = HayaletProfilPersonelSatir

export default function HayaletProfilClient({
  personeller,
  aktifHayaletSicil,
  aktifHayaletAd,
}: {
  personeller: HayaletPersonelSatir[]
  aktifHayaletSicil: string | null
  aktifHayaletAd: string | null
}) {
  const [arama, setArama] = useState('')
  const [secili, setSecili] = useState(aktifHayaletSicil ?? '')
  const [hata, setHata] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const filtreli = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr-TR')
    if (!q) return personeller
    return personeller.filter(p => {
      const blob = `${p.sicil_no} ${p.ad_soyad} ${p.gorev_unvani ?? ''} ${p.gorev_mudurlugu ?? ''}`.toLocaleLowerCase('tr-TR')
      return blob.includes(q)
    })
  }, [personeller, arama])

  function git() {
    if (!secili) {
      setHata('Lütfen bir personel seçin.')
      return
    }
    setHata(null)
    const fd = new FormData()
    fd.set('sicil_no', secili)
    startTransition(async () => {
      const sonuc = await hayaletProfilBaslat(fd)
      if (sonuc?.hata) setHata(sonuc.hata)
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Hayalet Profil</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Performans yönetimi testleri için seçtiğiniz personelin rolüyle sisteme girersiniz. Hayalet modda yalnızca
          performans ekranları açılır; diğer modüllere erişim kapalıdır. Test sonrası yönetici olarak değerlendirmeleri
          sıfırlayabilirsiniz.
        </p>
      </div>

      {aktifHayaletSicil ? (
        <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
          Aktif hayalet oturum: <span className="font-semibold">{aktifHayaletAd ?? aktifHayaletSicil}</span> (sicil{' '}
          {aktifHayaletSicil}). Devam etmek için <strong>Git</strong> ile yeniden yönlendirilebilir veya performans
          menüsünden çıkış yapabilirsiniz.
        </div>
      ) : null}

      {hata ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{hata}</div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <input
          type="search"
          value={arama}
          onChange={e => setArama(e.target.value)}
          placeholder="Sicil, ad-soyad veya müdürlük ara…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium w-10" />
                <th className="px-3 py-2 font-medium">Sicil</th>
                <th className="px-3 py-2 font-medium">Ad Soyad</th>
                <th className="px-3 py-2 font-medium">Görev</th>
                <th className="px-3 py-2 font-medium">Müdürlük</th>
              </tr>
            </thead>
            <tbody>
              {filtreli.map(p => (
                <tr
                  key={p.sicil_no}
                  className={`border-t border-slate-100 cursor-pointer hover:bg-slate-50 ${secili === p.sicil_no ? 'bg-indigo-50' : ''}`}
                  onClick={() => setSecili(p.sicil_no)}
                >
                  <td className="px-3 py-2">
                    <input
                      type="radio"
                      name="hayalet_sicil"
                      checked={secili === p.sicil_no}
                      onChange={() => setSecili(p.sicil_no)}
                    />
                  </td>
                  <td className="px-3 py-2 tabular-nums">{p.sicil_no}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">{p.ad_soyad}</td>
                  <td className="px-3 py-2 text-slate-700">{p.gorev_unvani ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-700">{p.gorev_mudurlugu ?? '—'}</td>
                </tr>
              ))}
              {filtreli.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    Sonuç bulunamadı.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={git}
            disabled={pending || !secili}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {pending ? 'Yönlendiriliyor…' : 'Git'}
          </button>
        </div>
      </div>
    </div>
  )
}
