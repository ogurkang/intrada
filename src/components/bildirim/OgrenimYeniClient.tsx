'use client'

import { useState, useTransition } from 'react'
import type { OgrenimSatirInput } from '@/app/(dashboard)/bildirim/ogrenim/actions'
import { ogrenimSatirlariEkle } from '@/app/(dashboard)/bildirim/ogrenim/actions'
import { broadcastIntradaRefresh } from '@/lib/intrada-tab-sync'

type Satir = OgrenimSatirInput

function bosSatir(ogrenimTurleri: { isim: string }[]): Satir {
  return {
    ogrenim_turu: ogrenimTurleri[0]?.isim ?? '',
    okul_adi: null,
    bolum: null,
    mezuniyet_tarihi: null,
    meslegi: null,
    varsayilan: false,
  }
}

interface Props {
  personeller: { sicil_no: string; ad_soyad: string }[]
  ogrenimTurleri: { id: number; isim: string }[]
}

export default function OgrenimYeniClient({ personeller, ogrenimTurleri }: Props) {
  const [sicilArama, setSicilArama] = useState('')
  const [secilenSicil, setSecilenSicil] = useState('')
  const [aramaAcik, setAramaAcik] = useState(false)
  const [satirlar, setSatirlar] = useState<Satir[]>(() =>
    ogrenimTurleri.length ? [bosSatir(ogrenimTurleri)] : []
  )
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtreliPersonel = personeller
    .filter(
      (p) =>
        !sicilArama.trim() ||
        p.sicil_no.includes(sicilArama) ||
        p.ad_soyad.toLowerCase().includes(sicilArama.toLowerCase())
    )
    .slice(0, 8)

  const secilen = personeller.find((p) => p.sicil_no === secilenSicil)

  function satirEkle() {
    setSatirlar((s) => [...s, bosSatir(ogrenimTurleri)])
  }

  function satirSil(idx: number) {
    setSatirlar((s) => (s.length <= 1 ? s : s.filter((_, i) => i !== idx)))
  }

  function satirDegistir(idx: number, patch: Partial<Satir>) {
    setSatirlar((s) => s.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  function kaydet() {
    setHata(null)
    if (!secilenSicil.trim()) {
      setHata('Personel seçin.')
      return
    }
    const dolu = satirlar.filter((s) => (s.ogrenim_turu ?? '').trim() || (s.okul_adi ?? '').trim())
    if (!dolu.length) {
      setHata('En az bir satırda öğrenim türü veya okul bilgisi girin.')
      return
    }
    startTransition(async () => {
      const res = await ogrenimSatirlariEkle(secilenSicil, dolu)
      if (res.hata) setHata(res.hata)
      else {
        broadcastIntradaRefresh('ogrenim')
        if (typeof window !== 'undefined' && window.opener) {
          try {
            window.opener.postMessage({ source: 'intrada-ogrenim-yeni', type: 'refresh' }, window.location.origin)
          } catch {
            window.opener.postMessage({ source: 'intrada-ogrenim-yeni', type: 'refresh' }, '*')
          }
        }
        if (typeof window !== 'undefined') window.close()
      }
    })
  }

  if (!ogrenimTurleri.length) {
    return (
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-4">
        Tanımlarda öğrenim türü yok. Önce Tanımlar → Öğrenim ekranından tür ekleyin.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {hata && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{hata}</div>}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Personel</label>
        {secilen ? (
          <div className="flex items-center justify-between p-3 border border-green-300 bg-green-50 rounded-lg">
            <div>
              <span className="font-medium text-slate-800">{secilen.ad_soyad}</span>
              <span className="text-xs text-slate-500 ml-2 font-mono">{secilen.sicil_no}</span>
            </div>
            <button type="button" onClick={() => setSecilenSicil('')} className="text-xs text-slate-600 hover:text-slate-900">
              Değiştir
            </button>
          </div>
        ) : (
          <div>
            <div className="relative max-w-md">
              <input
                placeholder="İsim veya sicil ara…"
                value={sicilArama}
                onChange={(e) => {
                  setSicilArama(e.target.value)
                  setAramaAcik(true)
                }}
                onFocus={() => setAramaAcik(true)}
                onBlur={() => setTimeout(() => setAramaAcik(false), 200)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              {aramaAcik && filtreliPersonel.length > 0 && (
                <ul className="absolute z-10 left-0 right-0 mt-1 border border-slate-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white shadow-lg">
                  {filtreliPersonel.map((p) => (
                    <li key={p.sicil_no}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                        onMouseDown={() => {
                          setSecilenSicil(p.sicil_no)
                          setSicilArama('')
                          setAramaAcik(false)
                        }}
                      >
                        {p.ad_soyad} <span className="text-slate-400 font-mono text-xs ml-1">{p.sicil_no}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">Tek satır veya birden çok satır ekleyin. Kayıtta sekme kapanır.</p>
        <button
          type="button"
          onClick={satirEkle}
          className="text-sm font-medium border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50"
        >
          + Satır ekle
        </button>
      </div>

      <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
        {satirlar.map((row, idx) => (
          <div
            key={idx}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/80"
          >
            <label className="text-xs text-slate-600 md:col-span-2 xl:col-span-3">
              Öğrenim türü
              <select
                className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm bg-white"
                value={row.ogrenim_turu}
                onChange={(e) => satirDegistir(idx, { ogrenim_turu: e.target.value })}
              >
                {ogrenimTurleri.map((t) => (
                  <option key={t.id} value={t.isim}>
                    {t.isim}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-600">
              Okul adı
              <input
                className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
                value={row.okul_adi ?? ''}
                onChange={(e) => satirDegistir(idx, { okul_adi: e.target.value || null })}
              />
            </label>
            <label className="text-xs text-slate-600">
              Bölüm
              <input
                className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
                value={row.bolum ?? ''}
                onChange={(e) => satirDegistir(idx, { bolum: e.target.value || null })}
              />
            </label>
            <label className="text-xs text-slate-600">
              Mesleği
              <input
                className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
                value={row.meslegi ?? ''}
                onChange={(e) => satirDegistir(idx, { meslegi: e.target.value || null })}
              />
            </label>
            <label className="text-xs text-slate-600">
              Mezuniyet (gg.aa.yyyy)
              <input
                className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm tabular-nums"
                placeholder="gg.aa.yyyy"
                value={row.mezuniyet_tarihi ?? ''}
                onChange={(e) => satirDegistir(idx, { mezuniyet_tarihi: e.target.value.trim() || null })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 mt-6 md:col-span-2 xl:col-span-1">
              <input
                type="checkbox"
                checked={row.varsayilan}
                onChange={(e) => satirDegistir(idx, { varsayilan: e.target.checked })}
              />
              Varsayılan öğrenim
            </label>
            <div className="flex items-end justify-end md:col-span-2 xl:col-span-3">
              <button type="button" onClick={() => satirSil(idx)} className="text-sm text-red-600" disabled={satirlar.length <= 1}>
                Satırı sil
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={isPending || !secilenSicil}
          onClick={kaydet}
          className="px-5 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
        >
          {isPending ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </div>
  )
}
