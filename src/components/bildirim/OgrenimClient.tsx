'use client'

import { useState, useTransition, useMemo } from 'react'
import Modal from '@/components/ui/Modal'
import type { Tables } from '@/types/database'

type Ogrenim = Tables<'calisan_ogrenim'> & { ad_soyad?: string | null }

/** ISO (yyyy-mm-dd) veya gg.aa.yyyy stringini gg.aa.yyyy olarak döndürür */
function formatGGAAYYYY(val: string | null | undefined): string {
  if (!val) return '—'
  const d = val.includes('-') ? val : val.split('.').reverse().join('-') // gg.aa.yyyy -> yyyy-mm-dd
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(d)
  if (!m) return val
  const [, y, a, g] = m
  return `${g.padStart(2, '0')}.${a.padStart(2, '0')}.${y}`
}


const TURLER = ['İlköğretim', 'Lise', 'Ön Lisans', 'Lisans', 'Yüksek Lisans', 'Doktora', 'Diğer']

interface Props {
  kayitlar:   Ogrenim[]
  onEkle:     (fd: FormData) => Promise<{ hata?: string }>
  onGuncelle: (id: number, fd: FormData) => Promise<{ hata?: string }>
  onSil:      (id: number) => Promise<{ hata?: string }>
}

export default function OgrenimClient({ kayitlar, onEkle, onGuncelle, onSil }: Props) {
  const [arama, setArama]             = useState('')
  const [formAcik, setFormAcik]       = useState(false)
  const [secili, setSecili]           = useState<Ogrenim | null>(null)
  const [hata, setHata]               = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()

  const filtreli = useMemo(() => {
    const q = arama.toLowerCase()
    return kayitlar.filter(k =>
      !q ||
      (k.ad_soyad ?? '').toLowerCase().includes(q) ||
      k.sicil_no.toLowerCase().includes(q) ||
      (k.ogrenim_turu ?? '').toLowerCase().includes(q) ||
      (k.okul_adi ?? '').toLowerCase().includes(q)
    )
  }, [kayitlar, arama])

  function yeniEkleAc()         { setSecili(null); setHata(null); setFormAcik(true) }
  function duzenleAc(k: Ogrenim){ setSecili(k);    setHata(null); setFormAcik(true) }
  function kapat()               { setFormAcik(false); setSecili(null); setHata(null) }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = secili ? await onGuncelle(secili.id, fd) : await onEkle(fd)
      if (res.hata) setHata(res.hata)
      else kapat()
    })
  }

  function handleSil(id: number) {
    if (!confirm('Bu kayıt silinecek. Onaylıyor musunuz?')) return
    startTransition(async () => {
      const res = await onSil(id)
      if (res.hata) alert(res.hata)
    })
  }

  const k = secili

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Öğrenim Bildirimi</h1>
          <p className="text-sm text-slate-500 mt-0.5">Personel öğrenim ve diploma kayıtları</p>
        </div>
        <button onClick={yeniEkleAc}
          className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Yeni Kayıt
        </button>
      </div>

      {/* Arama */}
      <div className="mb-4">
        <input value={arama} onChange={e => setArama(e.target.value)}
          placeholder="Ad, sicil, öğrenim türü veya okul ara…"
          className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-20">Sıra No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-32">Sicil No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Ad Soyad</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-36">Öğrenim Türü</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Okul / Bölüm</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Mezuniyet Tarihi</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-20">Durum</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtreli.length === 0 && (
              <tr><td colSpan={8} className="text-center py-14 text-slate-400">Kayıt bulunamadı.</td></tr>
            )}
            {filtreli.map((k, idx) => (
              <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-500 tabular-nums">{idx + 1}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{k.sicil_no}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{k.ad_soyad ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                    {k.ogrenim_turu ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <span>{k.okul_adi ?? '—'}</span>
                  {k.bolum && <span className="text-slate-400 text-xs ml-1">/ {k.bolum}</span>}
                </td>
                <td className="px-4 py-3 text-center text-slate-500 tabular-nums">
                  {k.mezuniyet_tarihi ? formatGGAAYYYY(k.mezuniyet_tarihi) : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    k.aktif ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>{k.aktif ? 'Aktif' : 'Pasif'}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => duzenleAc(k)}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">Düzenle</button>
                    <button onClick={() => handleSil(k.id)} disabled={isPending}
                      className="text-xs font-medium text-red-500 hover:text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40">Sil</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      <Modal open={formAcik} onClose={kapat} title={k ? 'Kayıt Düzenle' : 'Yeni Öğrenim Kaydı'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {!k && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sicil No *</label>
              <input name="sicil_no" required placeholder="Personel sicil numarası"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Öğrenim Türü</label>
            <select name="ogrenim_turu" defaultValue={k?.ogrenim_turu ?? ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
              <option value="">— Seçiniz —</option>
              {TURLER.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Okul Adı</label>
            <input name="okul_adi" defaultValue={k?.okul_adi ?? ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Bölüm</label>
              <input name="bolum" defaultValue={k?.bolum ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mezuniyet Tarihi (gg.aa.yyyy)</label>
              <input name="mezuniyet_tarihi" type="text" placeholder="gg.aa.yyyy"
                defaultValue={k?.mezuniyet_tarihi ? formatGGAAYYYY(k.mezuniyet_tarihi) : ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input name="aktif" type="checkbox" id="aktif_cb" defaultChecked={k?.aktif !== false} value="true"
              className="w-4 h-4 rounded border-slate-300" />
            <label htmlFor="aktif_cb" className="text-sm text-slate-700">Aktif</label>
          </div>
          {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={kapat}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
            <button type="submit" disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50">
              {isPending ? 'Kaydediliyor…' : k ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
