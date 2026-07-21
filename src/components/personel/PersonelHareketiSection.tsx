'use client'

import { useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'
import type { Tables } from '@/types/database'

type PH = Tables<'personel_hareketleri'>

const HAREKET_TURLERI = ['Atama', 'Görevlendirme', 'Nakil', 'Vekâlet', 'Görevden Alma', 'İstifa', 'Emeklilik', 'Diğer']
const SINIFLAR        = ['GİH', 'TH', 'SHS', 'AH', 'EH', 'DH', 'YH', 'ZB']

interface Props {
  sicil_no: string
  hareketler: PH[]
  unvanlar: string[]
  mudurluler: string[]
  onEkle:    (sicil_no: string, fd: FormData) => Promise<{ hata?: string }>
  onGuncelle:(id: number, sicil_no: string, fd: FormData) => Promise<{ hata?: string }>
}

function tarih(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

export default function PersonelHareketiSection({
  sicil_no, hareketler, unvanlar, mudurluler, onEkle, onGuncelle,
}: Props) {
  const [modalAcik, setModalAcik]   = useState(false)
  const [secili, setSecili]         = useState<PH | null>(null)
  const [sunuciHata, setSunuciHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function yeniEkleAc()     { setSecili(null); setSunuciHata(null); setModalAcik(true) }
  function duzenleAc(h: PH) { setSecili(h);    setSunuciHata(null); setModalAcik(true) }
  function kapat()           { setModalAcik(false); setSecili(null); setSunuciHata(null) }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSunuciHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = secili
        ? await onGuncelle(secili.id, sicil_no, fd)
        : await onEkle(sicil_no, fd)
      if (res.hata) setSunuciHata(res.hata)
      else kapat()
    })
  }

  const d = secili

  function input(name: string, label: string, type = 'text', placeholder?: string) {
    const val = d ? (d[name as keyof PH] as string | null) ?? '' : ''
    return (
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
        <input name={name} type={type} defaultValue={val} placeholder={placeholder}
          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
      </div>
    )
  }

  function sel(name: string, label: string, options: string[]) {
    const val = d ? (d[name as keyof PH] as string | null) ?? '' : ''
    return (
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
        <select name={name} defaultValue={val}
          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
          <option value="">—</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Başlık */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-700">Görev Geçmişi</h2>
        <button onClick={yeniEkleAc}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-300
                     px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Yeni Hareket Ekle
        </button>
      </div>

      {/* Tablo */}
      {hareketler.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Henüz hareket kaydı yok.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Yürürlük</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Tip</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Yeni Görev Yeri / Ünvan</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Dayanak</th>
                <th className="text-center px-4 py-2.5 font-semibold text-slate-500">Ayrılış</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hareketler.map(h => (
                <tr key={h.id} className={`hover:bg-slate-50 transition-colors ${!h.ayrilis_tarihi ? '' : 'opacity-60'}`}>
                  <td className="px-4 py-2.5 tabular-nums text-slate-600">{tarih(h.yururluk_tarihi)}</td>
                  <td className="px-4 py-2.5">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                      {h.hareket_tipi ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">
                    <span className="font-medium">{h.yeni_gorev_yeri ?? '—'}</span>
                    {h.yeni_unvan && <span className="text-slate-400 ml-1">/ {h.yeni_unvan}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-slate-400 max-w-32 truncate">{h.dayanak ?? '—'}</td>
                  <td className="px-4 py-2.5 text-center tabular-nums text-slate-500">
                    {h.ayrilis_tarihi ? tarih(h.ayrilis_tarihi) : (
                      <span className="text-green-600 font-medium">Aktif</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => duzenleAc(h)}
                      className="text-slate-400 hover:text-slate-700 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Modal open={modalAcik} onClose={kapat} title={secili ? 'Hareket Kaydı Düzenle' : 'Yeni Hareket Kaydı Ekle'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Temel */}
          <div className="grid grid-cols-3 gap-3">
            {sel('hareket_tipi', 'Hareket Tipi *', HAREKET_TURLERI)}
            {input('yururluk_tarihi', 'Yürürlük Tarihi *', 'date')}
            {input('kadro_sira_no', 'Kadro Sıra No')}
          </div>

          <hr className="border-slate-100" />

          {/* Yeni Görev */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Yeni Görev Bilgileri</p>
            <div className="grid grid-cols-2 gap-3">
              {input('yeni_gorev_yeri', 'Yeni Görev Yeri')}
              {sel('yeni_unvan', 'Yeni Ünvan', unvanlar)}
              {sel('yeni_sinif', 'Sınıf', SINIFLAR)}
              {input('yeni_kadro_derecesi', 'Kadro Derecesi')}
              {input('yeni_kha_derece', 'KHA Derece')}
              {input('yeni_kha_kademe', 'KHA Kademe')}
              {input('yeni_ekea_derece', 'EKEA Derece')}
              {input('yeni_ekea_kademe', 'EKEA Kademe')}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Tarihler + Dayanak */}
          <div className="grid grid-cols-3 gap-3">
            {input('ise_baslama_tarihi', 'İşe Başlama', 'date')}
            {input('ayrilis_tarihi', 'Ayrılış Tarihi', 'date')}
            {input('dayanak', 'Dayanak', 'text', 'Karar no veya belge')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {input('dagitim_mudurlukleri', 'Dağıtım Müdürlükleri')}
            {input('aciklama', 'Açıklama')}
          </div>

          {sunuciHata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{sunuciHata}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={kapat}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
            <button type="submit" disabled={isPending}
              className="intrada-btn intrada-btn-kaydet">
              {isPending ? 'Kaydediliyor…' : secili ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
