'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'

// ─── Tipler ──────────────────────────────────────────────────────────────────

type JsonSatir = Record<string, string>

export interface MalBildirimi {
  id:                    number
  sicil_no:              string
  ad_soyad?:             string | null
  beyan_turu:            string | null
  onay_tarihi:           string | null
  son_net_maas:          number | null
  aciklama:              string | null
  kimlik_json:           JsonSatir[]
  tasinmaz_json:         JsonSatir[]
  kooperatif_json:       JsonSatir[]
  tasitlar_json:         JsonSatir[]
  diger_tasinirlar_json: JsonSatir[]
  banka_menkul_json:     JsonSatir[]
  altin_mucevher_json:   JsonSatir[]
  borc_alacak_json:      JsonSatir[]
  haklar_json:           JsonSatir[]
  kayit_zamani:          string
}

interface Props {
  kayitlar:   MalBildirimi[]
  onEkle:     (fd: FormData) => Promise<{ hata?: string }>
  onGuncelle: (id: number, fd: FormData) => Promise<{ hata?: string }>
  onSil:      (id: number)   => Promise<{ hata?: string }>
}

// ─── JSON Bölüm Tanımları ────────────────────────────────────────────────────

interface BolumTanim {
  key:    keyof MalBildirimi
  baslik: string
  alanlar: { key: string; label: string; tip?: 'text' | 'number' | 'select'; secenekler?: string[] }[]
}

const BOLUMLER: BolumTanim[] = [
  {
    key: 'kimlik_json', baslik: 'Bildirim Sahipleri',
    alanlar: [
      { key: 'ad_soyad',   label: 'Ad Soyad' },
      { key: 'tckn',       label: 'TCKN' },
      { key: 'yakinlik',   label: 'Yakınlık', tip: 'select', secenekler: ['Kendisi', 'Eş', 'Çocuk', 'Diğer'] },
      { key: 'dogum_yeri', label: 'Doğum Yeri' },
    ],
  },
  {
    key: 'tasinmaz_json', baslik: 'Taşınmazlar',
    alanlar: [
      { key: 'nitelik',    label: 'Nitelik', tip: 'select', secenekler: ['Arsa', 'Tarla', 'Bağ/Bahçe', 'Bina', 'Daire', 'Dükkan', 'Depo', 'Diğer'] },
      { key: 'il',         label: 'İl' },
      { key: 'ilce',       label: 'İlçe' },
      { key: 'metrekare',  label: 'Metrekare', tip: 'number' },
      { key: 'edinme',     label: 'Edinme Şekli', tip: 'select', secenekler: ['Alım', 'Miras', 'Bağış', 'Diğer'] },
      { key: 'deger',      label: 'Tahmini Değer (₺)' },
    ],
  },
  {
    key: 'kooperatif_json', baslik: 'Kooperatifler',
    alanlar: [
      { key: 'tur',     label: 'Tür', tip: 'select', secenekler: ['Yapı', 'Tarım', 'Taşıt', 'Diğer'] },
      { key: 'adi',     label: 'Kooperatif Adı' },
      { key: 'il',      label: 'İl' },
      { key: 'edinme',  label: 'Edinme Şekli' },
    ],
  },
  {
    key: 'tasitlar_json', baslik: 'Taşıtlar',
    alanlar: [
      { key: 'tur',    label: 'Tür', tip: 'select', secenekler: ['Otomobil', 'Kamyonet', 'Motosiklet', 'Traktör', 'Diğer'] },
      { key: 'marka',  label: 'Marka/Model' },
      { key: 'yil',    label: 'Yılı', tip: 'number' },
      { key: 'plaka',  label: 'Plaka' },
      { key: 'deger',  label: 'Tahmini Değer (₺)' },
    ],
  },
  {
    key: 'diger_tasinirlar_json', baslik: 'Diğer Taşınırlar',
    alanlar: [
      { key: 'tur',   label: 'Tür' },
      { key: 'tanim', label: 'Tanım' },
      { key: 'deger', label: 'Tahmini Değer (₺)' },
    ],
  },
  {
    key: 'banka_menkul_json', baslik: 'Banka ve Menkul Değerler',
    alanlar: [
      { key: 'kurum', label: 'Kurum Adı' },
      { key: 'tur',   label: 'Tür', tip: 'select', secenekler: ['Mevduat', 'Repo', 'Hisse', 'Tahvil', 'Döviz', 'Diğer'] },
      { key: 'tutar', label: 'Tutar' },
      { key: 'doviz', label: 'Döviz', tip: 'select', secenekler: ['TRY', 'USD', 'EUR', 'GBP', 'Diğer'] },
    ],
  },
  {
    key: 'altin_mucevher_json', baslik: 'Altın ve Mücevher',
    alanlar: [
      { key: 'tur',    label: 'Tür', tip: 'select', secenekler: ['Altın', 'Gümüş', 'Mücevher', 'Diğer'] },
      { key: 'miktar', label: 'Miktar', tip: 'number' },
      { key: 'birim',  label: 'Birim', tip: 'select', secenekler: ['Gram', 'Adet', 'Çeyrek', 'Yarım', 'Tam'] },
      { key: 'deger',  label: 'Tahmini Değer (₺)' },
    ],
  },
  {
    key: 'borc_alacak_json', baslik: 'Borç ve Alacaklar',
    alanlar: [
      { key: 'tur',      label: 'Tür', tip: 'select', secenekler: ['Borç', 'Alacak'] },
      { key: 'taraf',    label: 'Karşı Taraf' },
      { key: 'tutar',    label: 'Tutar (₺)' },
      { key: 'aciklama', label: 'Açıklama' },
    ],
  },
  {
    key: 'haklar_json', baslik: 'Haklar ve Diğer Servet',
    alanlar: [
      { key: 'tur',   label: 'Tür' },
      { key: 'tanim', label: 'Tanım' },
      { key: 'deger', label: 'Tahmini Değer (₺)' },
    ],
  },
]

// ─── JSON Bölüm Bileşeni ─────────────────────────────────────────────────────

function JsonBolum({
  bolum, satirlar, onDegistir,
}: {
  bolum:      BolumTanim
  satirlar:   JsonSatir[]
  onDegistir: (satirlar: JsonSatir[]) => void
}) {
  const [acik, setAcik] = useState(satirlar.length > 0)

  function ekle() {
    const yeni: JsonSatir = {}
    bolum.alanlar.forEach(a => { yeni[a.key] = '' })
    onDegistir([...satirlar, yeni])
    setAcik(true)
  }

  function guncelle(idx: number, key: string, val: string) {
    onDegistir(satirlar.map((s, i) => i === idx ? { ...s, [key]: val } : s))
  }

  function sil(idx: number) {
    onDegistir(satirlar.filter((_, i) => i !== idx))
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button type="button" onClick={() => setAcik(!acik)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left">
        <span className="text-sm font-semibold text-slate-700">
          {bolum.baslik}
          {satirlar.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-xs font-medium">
              {satirlar.length}
            </span>
          )}
        </span>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${acik ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {acik && (
        <div className="p-4 space-y-3">
          {satirlar.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-1">Kayıt yok</p>
          )}
          {satirlar.map((satir, idx) => (
            <div key={idx} className="border border-slate-100 rounded-lg p-3 bg-white">
              <div className="grid grid-cols-2 gap-2 mb-2">
                {bolum.alanlar.map(alan => (
                  <div key={alan.key}>
                    <label className="block text-[10px] text-slate-500 mb-0.5">{alan.label}</label>
                    {alan.tip === 'select' ? (
                      <select value={satir[alan.key] ?? ''} onChange={e => guncelle(idx, alan.key, e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white">
                        <option value="">—</option>
                        {alan.secenekler?.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <input type={alan.tip === 'number' ? 'number' : 'text'}
                        value={satir[alan.key] ?? ''} onChange={e => guncelle(idx, alan.key, e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-slate-400" />
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => sil(idx)}
                className="text-[10px] text-red-400 hover:text-red-600 font-medium">
                Satırı Kaldır
              </button>
            </div>
          ))}
          <button type="button" onClick={ekle}
            className="w-full py-2 text-xs font-medium text-slate-600 border border-dashed border-slate-300 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-colors">
            + {bolum.baslik} Ekle
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────

const BEYAN_TURLERI = ['Göreve Başlama', 'Görevden Ayrılma', 'İstek Üzerine']

export default function MalClient({ kayitlar, onEkle, onGuncelle, onSil }: Props) {
  const [arama, setArama]             = useState('')
  const [formAcik, setFormAcik]       = useState(false)
  const [secili, setSecili]           = useState<MalBildirimi | null>(null)
  const [bolumVerileri, setBolumVerileri] = useState<Record<string, JsonSatir[]>>({})
  const [hata, setHata]               = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()

  const filtreli = useMemo(() => {
    const q = arama.toLowerCase()
    return kayitlar.filter(k =>
      !q ||
      (k.ad_soyad ?? '').toLowerCase().includes(q) ||
      k.sicil_no.toLowerCase().includes(q) ||
      (k.beyan_turu ?? '').toLowerCase().includes(q)
    )
  }, [kayitlar, arama])

  function initBolumler(kayit: MalBildirimi | null) {
    const veriler: Record<string, JsonSatir[]> = {}
    BOLUMLER.forEach(b => {
      veriler[b.key] = kayit ? ([...((kayit[b.key] as JsonSatir[]) ?? [])]) : []
    })
    return veriler
  }

  function yeniEkleAc()              { setSecili(null); setBolumVerileri(initBolumler(null)); setHata(null); setFormAcik(true) }
  function duzenleAc(k: MalBildirimi){ setSecili(k);   setBolumVerileri(initBolumler(k));    setHata(null); setFormAcik(true) }
  function kapat()                   { setFormAcik(false); setSecili(null); setHata(null) }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHata(null)
    const fd = new FormData(e.currentTarget)
    BOLUMLER.forEach(b => {
      fd.set(b.key as string, JSON.stringify(bolumVerileri[b.key] ?? []))
    })
    startTransition(async () => {
      const res = secili ? await onGuncelle(secili.id, fd) : await onEkle(fd)
      if (res.hata) setHata(res.hata)
      else kapat()
    })
  }

  function handleSil(id: number) {
    if (!confirm('Bu mal beyanı kaydı silinecek. Onaylıyor musunuz?')) return
    startTransition(async () => { const r = await onSil(id); if (r.hata) alert(r.hata) })
  }

  function toplamKayit(k: MalBildirimi) {
    return BOLUMLER.reduce((t, b) => t + ((k[b.key] as JsonSatir[])?.length ?? 0), 0)
  }

  function excelIndir() {
    const baslik = ['Sıra No', 'Sicil No', 'Ad Soyad', 'Beyan Türü', 'Onay Tarihi', 'Kalem Sayısı']
    const satirlar = filtreli.map((k, i) => [
      i + 1,
      k.sicil_no,
      k.ad_soyad ?? '',
      k.beyan_turu ?? '',
      k.onay_tarihi ? new Date(k.onay_tarihi).toLocaleDateString('tr-TR') : '',
      toplamKayit(k),
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
    a.download = `mal-bildirimi-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const k = secili

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mal Bildirimi</h1>
          <p className="text-sm text-slate-500 mt-0.5">Taşınmaz, taşıt, banka ve diğer servet beyanları</p>
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
            Yeni Beyan
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input value={arama} onChange={e => setArama(e.target.value)}
          placeholder="Ad, sicil veya beyan türü ara…"
          className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-20">Sıra No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-32">Sicil No</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Ad Soyad</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-40">Beyan Türü</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-24">Onay Tarihi</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 w-20">Kalem</th>
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
                  {k.beyan_turu ? (
                    <span className="inline-flex px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-medium">
                      {k.beyan_turu}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-center text-xs text-slate-500 tabular-nums">
                  {k.onay_tarihi ? new Date(k.onay_tarihi).toLocaleDateString('tr-TR') : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                    toplamKayit(k) > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
                  }`}>{toplamKayit(k)}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/bildirim/mal/${k.id}`}
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
      <Modal open={formAcik} onClose={kapat} title={k ? 'Mal Beyanı Düzenle' : 'Yeni Mal Beyanı'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Temel Bilgiler */}
          <div className="grid grid-cols-2 gap-4">
            {!k ? (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Sicil No *</label>
                <input name="sicil_no" required placeholder="Personel sicil numarası"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
            ) : (
              <>
                <input type="hidden" name="sicil_no" value={k.sicil_no} />
                <div className="col-span-2 px-3 py-2 bg-slate-50 rounded-lg text-sm">
                  <span className="text-slate-500">Personel: </span>
                  <span className="font-medium">{k.ad_soyad ?? k.sicil_no}</span>
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Beyan Türü</label>
              <select name="beyan_turu" defaultValue={k?.beyan_turu ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
                <option value="">— Seçiniz —</option>
                {BEYAN_TURLERI.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Onay Tarihi</label>
              <input name="onay_tarihi" type="date" defaultValue={k?.onay_tarihi ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Son Net Maaş (₺)</label>
              <input name="son_net_maas" type="number" step="0.01" defaultValue={k?.son_net_maas ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Açıklama</label>
              <input name="aciklama" defaultValue={k?.aciklama ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
          </div>

          {/* JSON Bölümleri */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">Beyan Kalemleri</p>
            {BOLUMLER.map(b => (
              <JsonBolum
                key={b.key as string}
                bolum={b}
                satirlar={bolumVerileri[b.key as string] ?? []}
                onDegistir={satirlar => setBolumVerileri(prev => ({ ...prev, [b.key]: satirlar }))}
              />
            ))}
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
