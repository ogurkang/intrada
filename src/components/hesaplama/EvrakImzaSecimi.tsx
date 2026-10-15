'use client'

import { useState } from 'react'
import type { IkImzaPersonel } from '@/lib/ik-imza-personel'

const selectSinif = 'px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white min-w-[220px]'

export function pdfImzaSorgu(duzenleyen: string, gorevli: string): string {
  const p = new URLSearchParams()
  if (duzenleyen) p.set('duzenleyen', duzenleyen)
  if (gorevli) p.set('gorevli', gorevli)
  const s = p.toString()
  return s ? `&${s}` : ''
}

export function EvrakImzaAlanlari({
  personel,
  duzenleyen,
  gorevli,
  onDuzenleyen,
  onGorevli,
}: {
  personel: IkImzaPersonel[]
  duzenleyen: string
  gorevli: string
  onDuzenleyen: (sicil: string) => void
  onGorevli: (sicil: string) => void
}) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <label className="block">
        <span className="block text-xs font-medium text-slate-500 mb-1">Düzenleyen</span>
        <select value={duzenleyen} onChange={e => onDuzenleyen(e.target.value)} className={selectSinif}>
          <option value="">Seçiniz</option>
          {personel.map(p => (
            <option key={`d-${p.sicil_no}`} value={p.sicil_no}>{p.ad_soyad} ({p.sicil_no})</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="block text-xs font-medium text-slate-500 mb-1">Gerçekleştirme görevlisi</span>
        <select value={gorevli} onChange={e => onGorevli(e.target.value)} className={selectSinif}>
          <option value="">Seçiniz</option>
          {personel.map(p => (
            <option key={`g-${p.sicil_no}`} value={p.sicil_no}>{p.ad_soyad} ({p.sicil_no})</option>
          ))}
        </select>
      </label>
    </div>
  )
}

export function EvrakPdfIndir({
  href,
  personel,
}: {
  href: string
  personel: IkImzaPersonel[]
}) {
  const [duzenleyen, setDuzenleyen] = useState('')
  const [gorevli, setGorevli] = useState('')
  const adres = `${href}${pdfImzaSorgu(duzenleyen, gorevli)}`
  return (
    <div className="flex flex-wrap items-end gap-3">
      <EvrakImzaAlanlari
        personel={personel}
        duzenleyen={duzenleyen}
        gorevli={gorevli}
        onDuzenleyen={setDuzenleyen}
        onGorevli={setGorevli}
      />
      <a href={adres} className="inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600">
        PDF İndir
      </a>
    </div>
  )
}
