'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import PersonelAramaSecim, { type PersonelAramaOge } from '@/components/bildirim/PersonelAramaSecim'
import type { Cocuk } from '@/components/bildirim/AileClient'

interface Props {
  personeller: { sicil_no: string; ad_soyad: string }[]
  onKaydet: (fd: FormData) => Promise<{ hata?: string }>
  /** Kullanıcı: yalnızca kendi sicili, salt okunur */
  sicilSaltOkunur?: string
}

const MEDENI_HAL = ['Evli', 'Bekar']
const IS_DURUMU = ['Çalışıyor', 'Çalışmıyor', 'Emekli', 'Serbest Meslek', 'Diğer']

export default function AileYeniClient({ personeller, onKaydet, sicilSaltOkunur }: Props) {
  const [sicil, setSicil] = useState(() => (sicilSaltOkunur?.trim() ? sicilSaltOkunur.trim() : ''))
  const [medeniHal, setMedeniHal] = useState('')
  const [cocuklar, setCocuklar] = useState<Cocuk[]>([])
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const ogeler: PersonelAramaOge[] = useMemo(
    () => personeller.map(p => ({ sicil_no: p.sicil_no, ad_soyad: p.ad_soyad })),
    [personeller],
  )

  const evli = medeniHal === 'Evli'

  function normalizeCinsiyet(c: Cocuk): Cocuk {
    const cinsiyet = c.cinsiyet === 'Erkek' ? 'E' : (c.cinsiyet === 'Kız' || c.cinsiyet === 'Kadın') ? 'K' : c.cinsiyet
    return { ...c, cinsiyet: cinsiyet ?? '', tckn: c.tckn ?? '', baba_adi: c.baba_adi ?? '', ana_adi: c.ana_adi ?? '' }
  }

  function cocukEkle() {
    setCocuklar(prev => [...prev, { ad_soyad: '', tckn: '', dogum_tarihi: '', cinsiyet: '', baba_adi: '', ana_adi: '' }])
  }
  function cocukGuncelle(idx: number, alan: keyof Cocuk, deger: string) {
    setCocuklar(prev => prev.map((c, i) => i === idx ? { ...c, [alan]: deger } : c))
  }
  function cocukSil(idx: number) {
    setCocuklar(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHata(null)
    if (!sicil) {
      setHata('Personel seçiniz.')
      return
    }
    const fd = new FormData(e.currentTarget)
    fd.set('sicil_no', sicil)
    fd.set('cocuklar_json', JSON.stringify(cocuklar.filter(c => (c.ad_soyad ?? '').trim()).map(normalizeCinsiyet)))
    startTransition(async () => {
      const res = await onKaydet(fd)
      if (res.hata) setHata(res.hata)
      else {
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.location.href = '/bildirim/aile'
          }
        } catch { /* ignore */ }
        window.close()
        setTimeout(() => {
          if (document.visibilityState === 'visible') window.location.href = '/bildirim/aile'
        }, 200)
      }
    })
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Yeni Aile Bildirimi</h1>
        <Link href="/bildirim/aile" className="text-sm text-slate-600 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50">
          Listeye dön
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-6 lg:items-end">
          <div className="flex-1 min-w-0 space-y-2">
            <label className="block text-sm font-medium text-slate-700">Personel *</label>
            <PersonelAramaSecim
              personeller={ogeler}
              value={sicil}
              onChange={setSicil}
              required
              readOnly={!!sicilSaltOkunur?.trim()}
            />
            <input type="hidden" name="sicil_no" value={sicil} />
          </div>
          <div className="flex-1 min-w-[200px] max-w-xs space-y-2">
            <label className="block text-sm font-medium text-slate-700">Medeni Hal</label>
            <select
              name="medeni_hal"
              value={medeniHal}
              onChange={e => setMedeniHal(e.target.value)}
              className="w-full h-[42px] px-3 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="">— Seçiniz —</option>
              {MEDENI_HAL.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {evli && (
          <div className="border border-slate-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">Eş Bilgileri</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Ad Soyad</label>
                <input name="esin_ad_soyad"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">TCKN</label>
                <input name="esin_tckn" maxLength={11}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">İş Durumu</label>
                <select name="is_durumu"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
                  <option value="">—</option>
                  {IS_DURUMU.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Gelir Durumu</label>
                <select name="gelir_durumu"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
                  <option value="">—</option>
                  <option value="Geliri Var">Geliri Var</option>
                  <option value="Geliri Yok">Geliri Yok</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Çocuklar ({cocuklar.length})</p>
            <button type="button" onClick={cocukEkle}
              className="text-xs font-medium text-slate-600 border border-slate-300 px-2.5 py-1 rounded-lg hover:bg-slate-50 transition-colors">
              + Çocuk Ekle
            </button>
          </div>
          {cocuklar.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">Çocuk yoksa boş bırakıp kaydedebilirsiniz.</p>
          )}
          {cocuklar.map((c, i) => (
            <div key={i} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 items-end border-t border-slate-100 pt-3 first:border-0 first:pt-0">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Ad Soyad</label>
                <input value={c.ad_soyad} onChange={e => cocukGuncelle(i, 'ad_soyad', e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-400" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">TCKN</label>
                <input value={c.tckn ?? ''} onChange={e => cocukGuncelle(i, 'tckn', e.target.value.replace(/\D/g, '').slice(0, 11))}
                  maxLength={11} className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-slate-400" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Doğum Tarihi</label>
                <input type="date" value={c.dogum_tarihi ?? ''} onChange={e => cocukGuncelle(i, 'dogum_tarihi', e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-400" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Cinsiyet</label>
                <select value={c.cinsiyet ?? ''} onChange={e => cocukGuncelle(i, 'cinsiyet', e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-400">
                  <option value="">—</option>
                  <option value="E">E</option>
                  <option value="K">K</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Baba Adı</label>
                <input value={c.baba_adi ?? ''} onChange={e => cocukGuncelle(i, 'baba_adi', e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-400" />
              </div>
              <div className="flex gap-1 items-end">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs text-slate-500 mb-1">Ana Adı</label>
                  <input value={c.ana_adi ?? ''} onChange={e => cocukGuncelle(i, 'ana_adi', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-400" />
                </div>
                <button type="button" onClick={() => cocukSil(i)} className="mb-0.5 p-1.5 text-red-400 hover:text-red-600 rounded-lg">✕</button>
              </div>
            </div>
          ))}
        </div>

        {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}

        <div className="flex justify-end gap-3">
          <button type="submit" disabled={isPending}
            className="px-5 py-2.5 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50">
            {isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  )
}
