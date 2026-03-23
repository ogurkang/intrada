'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { kadroDetayHref } from '@/lib/kadro-link'
import type { Tables } from '@/types/database'

type Kadro = Tables<'kadro_hareketleri'>
interface Personel { sicil_no: string; ad_soyad: string }

function PersonelSecici({
  name, label, personeller, defaultValue,
}: { name: string; label: string; personeller: Personel[]; defaultValue?: string | null }) {
  const [q, setQ] = useState(defaultValue ? (personeller.find(p => p.sicil_no === defaultValue)?.ad_soyad ?? defaultValue) : '')
  const [secili, setSecili] = useState(defaultValue ?? '')
  const [acik, setAcik] = useState(false)
  const filtreli = useMemo(() => {
    const lower = q.toLowerCase()
    if (!lower) return personeller.slice(0, 6)
    return personeller.filter(p =>
      p.sicil_no.toLowerCase().includes(lower) || p.ad_soyad.toLowerCase().includes(lower)
    ).slice(0, 6)
  }, [q, personeller])
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input type="hidden" name={name} value={secili} />
      {secili ? (
        <div className="flex items-center justify-between p-2.5 border border-green-200 bg-green-50 rounded-lg text-sm">
          <span className="font-medium text-slate-800">{personeller.find(p => p.sicil_no === secili)?.ad_soyad ?? secili}</span>
          <button type="button" onClick={() => { setSecili(''); setQ('') }} className="text-xs text-slate-500 hover:text-slate-700">Değiştir</button>
        </div>
      ) : (
        <div className="relative">
          <input type="text" placeholder="Ara…" value={q}
            onChange={e => { setQ(e.target.value); setAcik(true) }}
            onFocus={() => setAcik(true)}
            onBlur={() => setTimeout(() => setAcik(false), 150)}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
          {acik && filtreli.length > 0 && (
            <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {filtreli.map(p => (
                <li key={p.sicil_no}>
                  <button type="button" onMouseDown={() => { setSecili(p.sicil_no); setQ(p.ad_soyad); setAcik(false) }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm">
                    <span className="font-medium">{p.ad_soyad}</span>
                    <span className="text-slate-400 text-xs ml-2">{p.sicil_no}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

interface Props {
  row: Kadro
  personeller: Personel[]
  statuler: string[]
  mudurluler: string[]
  unvanlar: { id: number; unvan_adi: string }[]
  gelisNedenleri?: string[]
  ayrilisNedenleri?: string[]
  onGuncelle: (id: number, fd: FormData) => Promise<{ hata?: string }>
}

function input(d: Kadro | null, name: string, label: string, opts?: { type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input name={name} type={opts?.type ?? 'text'} defaultValue={d ? (d[name as keyof Kadro] as string | null) ?? '' : ''}
        placeholder={opts?.placeholder}
        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
    </div>
  )
}

function sel(d: Kadro | null, name: string, label: string, options: string[]) {
  const val = d ? (d[name as keyof Kadro] as string | null) ?? '' : ''
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

function selUnvan(d: Kadro | null, name: string, label: string, unvanlar: { id: number; unvan_adi: string }[]) {
  const val = d ? (d[name as keyof Kadro] as string | null) ?? '' : ''
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <select name={name} defaultValue={val}
        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
        <option value="">—</option>
        {unvanlar.map(u => <option key={u.id} value={u.unvan_adi}>{u.unvan_adi}</option>)}
      </select>
    </div>
  )
}

export default function KadroDuzenleClient({
  row, personeller, statuler, mudurluler, unvanlar, gelisNedenleri = [], ayrilisNedenleri = [], onGuncelle,
}: Props) {
  const router = useRouter()
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const d = row

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await onGuncelle(row.id, fd)
      if (res.hata) setHata(res.hata)
      else router.push(`/kadro/${row.id}`)
    })
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Kadro Düzenle — {row.kadro_unvani ?? row.kadro_sira_no ?? `#${row.id}`}</h1>
        <Link href={kadroDetayHref(row)}
          className="text-sm font-medium text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50">
          ← İptal
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Meclis Kararı</p>
            <div className="grid grid-cols-3 gap-3">
              {input(d, 'kadro_sira_no', 'Kadro Sıra No')}
              {input(d, 'meclis_karar_no', 'Karar No')}
              {input(d, 'meclis_karar_tarihi', 'Karar Tarihi', { type: 'date' })}
            </div>
          </div>
          <hr className="border-slate-100" />
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Kadro & Görev Bilgileri</p>
            <div className="grid grid-cols-2 gap-3">
              {sel(d, 'statu', 'Statü', statuler)}
              {input(d, 'kadro_derecesi', 'Kadro Derecesi', { placeholder: '1, 2 ...' })}
              {selUnvan(d, 'kadro_unvani', 'Kadro Ünvanı', unvanlar)}
              {sel(d, 'kadro_mudurlugu', 'Kadro Müdürlüğü', mudurluler)}
              {selUnvan(d, 'gorev_unvani', 'Görev Ünvanı', unvanlar)}
              {sel(d, 'gorev_mudurlugu', 'Görev Müdürlüğü', mudurluler)}
              {input(d, 'meslegi', 'Mesleği')}
            </div>
          </div>
          <hr className="border-slate-100" />
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Personel Bilgileri</p>
            <div className="grid grid-cols-2 gap-3">
              <PersonelSecici name="asil" label="Asil" personeller={personeller} defaultValue={d?.asil} />
              <PersonelSecici name="vekil" label="Vekil" personeller={personeller} defaultValue={d?.vekil} />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              {input(d, 'memuriyet_tarihi', 'Memuriyet Tarihi', { type: 'date' })}
              {input(d, 'kuruma_giris_tarihi', 'Kuruma Giriş', { type: 'date' })}
              {sel(d, 'gelis_nedeni', 'Geliş Nedeni', gelisNedenleri ?? [])}
            </div>
            {input(d, 'geldigi_yer', 'Geldiği Yer')}
          </div>
          <hr className="border-slate-100" />
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Durum & Ayrılış</p>
            <div className="grid grid-cols-3 gap-3">
              {sel(d, 'durumu', 'Kadro Durumu', ['Dolu', 'Vekil', 'Boş'])}
              {input(d, 'ayrilis_tarihi', 'Ayrılış Tarihi', { type: 'date' })}
              {sel(d, 'ayrilis_nedeni', 'Ayrılış Nedeni', ayrilisNedenleri ?? [])}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {input(d, 'gittigi_yer', 'Gittiği Yer')}
              {input(d, 'aciklama', 'Açıklama')}
            </div>
          </div>
          {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
          <div className="flex flex-row justify-end items-center gap-3 pt-2">
            <Link href={kadroDetayHref(row)}
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
