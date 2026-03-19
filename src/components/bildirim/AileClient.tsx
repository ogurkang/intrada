'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'

export interface Cocuk {
  ad_soyad:      string
  dogum_tarihi?: string
  cinsiyet?:     string
}

export interface AileBilgisi {
  id:            number
  sicil_no:      string
  ad_soyad?:     string | null
  medeni_hal:    string | null
  esin_ad_soyad: string | null
  esin_tckn:     string | null
  is_durumu:     string | null
  gelir_durumu:  string | null
  cocuklar_json: Cocuk[]
  kayit_zamani:  string
}

interface Props {
  kayitlar:  AileBilgisi[]
  onKaydet:  (fd: FormData) => Promise<{ hata?: string }>
  onSil:     (id: number)   => Promise<{ hata?: string }>
}

const MEDENI_HAL = ['Evli', 'Bekar', 'Boşanmış', 'Dul']
const IS_DURUMU  = ['Çalışıyor', 'Çalışmıyor', 'Emekli', 'Serbest Meslek', 'Diğer']

export default function AileClient({ kayitlar, onKaydet, onSil }: Props) {
  const [arama, setArama]             = useState('')
  const [formAcik, setFormAcik]       = useState(false)
  const [secili, setSecili]           = useState<AileBilgisi | null>(null)
  const [cocuklar, setCocuklar]       = useState<Cocuk[]>([])
  const [hata, setHata]               = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()

  const filtreli = useMemo(() => {
    const q = arama.toLowerCase()
    return kayitlar.filter(k =>
      !q ||
      (k.ad_soyad ?? '').toLowerCase().includes(q) ||
      k.sicil_no.toLowerCase().includes(q)
    )
  }, [kayitlar, arama])

  function yeniEkleAc() {
    setSecili(null); setCocuklar([]); setHata(null); setFormAcik(true)
  }
  function duzenleAc(k: AileBilgisi) {
    setSecili(k); setCocuklar(k.cocuklar_json ?? []); setHata(null); setFormAcik(true)
  }
  function kapat() { setFormAcik(false); setSecili(null); setHata(null) }

  function cocukEkle() {
    setCocuklar(prev => [...prev, { ad_soyad: '', dogum_tarihi: '', cinsiyet: '' }])
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
    const fd = new FormData(e.currentTarget)
    fd.set('cocuklar_json', JSON.stringify(cocuklar.filter(c => c.ad_soyad.trim())))
    startTransition(async () => {
      const res = await onKaydet(fd)
      if (res.hata) setHata(res.hata)
      else kapat()
    })
  }

  function handleSil(id: number) {
    if (!confirm('Bu kayıt silinecek. Onaylıyor musunuz?')) return
    startTransition(async () => { const r = await onSil(id); if (r.hata) alert(r.hata) })
  }

  function excelIndir() {
    const baslik = ['Sıra No', 'Sicil No', 'Ad Soyad', 'Medeni Hal', 'Eş Adı', 'Eş TCKN', 'İş Durumu', 'Gelir Durumu', 'Çocuk Sayısı']
    const satirlar = filtreli.map((k, i) => [
      i + 1,
      k.sicil_no,
      k.ad_soyad ?? '',
      k.medeni_hal ?? '',
      k.esin_ad_soyad ?? '',
      k.esin_tckn ?? '',
      k.is_durumu ?? '',
      k.gelir_durumu ?? '',
      (k.cocuklar_json?.length ?? 0),
    ])
    const csvEscape = (v: string | number) => {
      const s = String(v)
      return s.includes(';') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = '\uFEFF' + baslik.map(csvEscape).join(';') + '\n' +
      satirlar.map(row => row.map(csvEscape).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aile-bildirimi-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const k = secili

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Aile Bildirimi</h1>
          <p className="text-sm text-slate-500 mt-0.5">Medeni hal, eş ve çocuk bilgileri</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={excelIndir}
            className="flex items-center gap-2 border border-green-600 text-green-700 text-sm px-4 py-2 rounded-lg hover:bg-green-50 transition-colors font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Excel İndir
          </button>
          <button onClick={yeniEkleAc}
            className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Kayıt
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input value={arama} onChange={e => setArama(e.target.value)}
          placeholder="Ad veya sicil no ara…"
          className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-20">Sıra No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-32">Sicil No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Ad Soyad</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-28">Medeni Hal</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Eş Adı</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-20">Çocuk</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtreli.length === 0 && (
              <tr><td colSpan={7} className="text-center py-14 text-slate-400">Kayıt bulunamadı.</td></tr>
            )}
            {filtreli.map((k, idx) => (
              <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-500 tabular-nums">{idx + 1}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{k.sicil_no}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{k.ad_soyad ?? '—'}</td>
                <td className="px-4 py-3">
                  {k.medeni_hal ? (
                    <span className="inline-flex px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-medium">
                      {k.medeni_hal}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-slate-600">{k.esin_ad_soyad ?? '—'}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                    (k.cocuklar_json?.length ?? 0) > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {k.cocuklar_json?.length ?? 0}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/bildirim/aile/${k.id}`}
                      className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">Görüntüle</Link>
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
      <Modal open={formAcik} onClose={kapat} title={k ? 'Aile Bildirimi Düzenle' : 'Yeni Aile Bildirimi'} size="md">
        <form onSubmit={handleSubmit} className="space-y-5">
          {!k && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sicil No *</label>
              <input name="sicil_no" required placeholder="Personel sicil numarası"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
          )}
          {k && (
            <>
              <input type="hidden" name="sicil_no" value={k.sicil_no} />
              <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm">
                <span className="text-slate-500">Personel: </span>
                <span className="font-medium">{k.ad_soyad ?? k.sicil_no}</span>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Medeni Hal</label>
            <select name="medeni_hal" defaultValue={k?.medeni_hal ?? ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
              <option value="">— Seçiniz —</option>
              {MEDENI_HAL.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Eş Bilgileri */}
          <div className="border border-slate-200 rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700">Eş Bilgileri</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Ad Soyad</label>
                <input name="esin_ad_soyad" defaultValue={k?.esin_ad_soyad ?? ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">TCKN</label>
                <input name="esin_tckn" defaultValue={k?.esin_tckn ?? ''} maxLength={11}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 font-mono" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">İş Durumu</label>
                <select name="is_durumu" defaultValue={k?.is_durumu ?? ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
                  <option value="">— Seçiniz —</option>
                  {IS_DURUMU.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Gelir Durumu</label>
                <select name="gelir_durumu" defaultValue={k?.gelir_durumu ?? ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
                  <option value="">— Seçiniz —</option>
                  <option value="Geliri Var">Geliri Var</option>
                  <option value="Geliri Yok">Geliri Yok</option>
                </select>
              </div>
            </div>
          </div>

          {/* Çocuklar */}
          <div className="border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Çocuklar ({cocuklar.length})</p>
              <button type="button" onClick={cocukEkle}
                className="text-xs font-medium text-slate-600 border border-slate-300 px-2.5 py-1 rounded-lg hover:bg-slate-50 transition-colors">
                + Çocuk Ekle
              </button>
            </div>
            {cocuklar.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-2">Çocuk kaydı yok</p>
            )}
            {cocuklar.map((c, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 items-end">
                <div className="col-span-1">
                  <label className="block text-xs text-slate-500 mb-1">Ad Soyad</label>
                  <input value={c.ad_soyad} onChange={e => cocukGuncelle(i, 'ad_soyad', e.target.value)}
                    placeholder="Ad soyad" required
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-400" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Doğum Tarihi</label>
                  <input type="date" value={c.dogum_tarihi ?? ''} onChange={e => cocukGuncelle(i, 'dogum_tarihi', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-400" />
                </div>
                <div className="flex items-end gap-1">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">Cinsiyet</label>
                    <select value={c.cinsiyet ?? ''} onChange={e => cocukGuncelle(i, 'cinsiyet', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white">
                      <option value="">—</option>
                      <option value="Erkek">Erkek</option>
                      <option value="Kız">Kız</option>
                    </select>
                  </div>
                  <button type="button" onClick={() => cocukSil(i)}
                    className="mb-0.5 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={kapat}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
            <button type="submit" disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50">
              {isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
