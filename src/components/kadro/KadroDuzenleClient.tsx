'use client'

import { useState, useMemo, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { kadroDetayHref } from '@/lib/kadro-link'
import type { Tables } from '@/types/database'
import { kadroDurumuHesapla } from '@/lib/kadro-durum'

const KADRO_DURUM_BADGE: Record<string, string> = {
  Dolu:  'bg-green-100 text-green-700',
  Vekil: 'bg-amber-100 text-amber-700',
  Boş:   'bg-slate-100 text-slate-500',
}

type Kadro = Tables<'kadro_hareketleri'>
interface Personel { sicil_no: string; ad_soyad: string }

type UnvanSecenek = { id: number; unvan_adi: string; sinif_adi: string | null }

function defaultUnvanSelectId(d: Kadro | null, unvanlar: UnvanSecenek[], alan: 'kadro' | 'gorev'): string {
  if (!d) return ''
  const idVal = alan === 'kadro' ? d.kadro_unvan_id : d.gorev_unvan_id
  if (idVal != null) return String(idVal)
  const textVal = alan === 'kadro' ? d.kadro_unvani : d.gorev_unvani
  const ad = textVal?.trim()
  if (!ad) return ''
  const matches = unvanlar.filter((u) => u.unvan_adi.trim() === ad)
  if (matches.length === 1) return String(matches[0].id)
  return ''
}

function unvanSecenekLabel(u: UnvanSecenek): string {
  const s = u.sinif_adi?.trim()
  return s ? `${u.unvan_adi} (${s})` : u.unvan_adi
}

function PersonelSecici({
  name, label, personeller, defaultValue, onSeciliChange, disabled,
}: {
  name: string
  label: string
  personeller: Personel[]
  defaultValue?: string | null
  onSeciliChange?: (sicil: string) => void
  disabled?: boolean
}) {
  const [q, setQ] = useState(defaultValue ? (personeller.find(p => p.sicil_no === defaultValue)?.ad_soyad ?? defaultValue) : '')
  const [secili, setSecili] = useState(defaultValue ?? '')
  const [acik, setAcik] = useState(false)

  useEffect(() => {
    onSeciliChange?.(secili)
  }, [secili, onSeciliChange])
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
          {!disabled && (
            <button type="button" onClick={() => { setSecili(''); setQ('') }} className="text-xs text-slate-500 hover:text-slate-700">Değiştir</button>
          )}
        </div>
      ) : (
        <div className="relative">
          <input type="text" placeholder="Ara…" value={q}
            onChange={e => { setQ(e.target.value); setAcik(true) }}
            onFocus={() => setAcik(true)}
            onBlur={() => setTimeout(() => setAcik(false), 150)}
            disabled={disabled}
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
  unvanlar: UnvanSecenek[]
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

function selUnvanId(d: Kadro | null, label: string, liste: UnvanSecenek[], alan: 'kadro' | 'gorev') {
  const nameId = alan === 'kadro' ? 'kadro_unvan_id' : 'gorev_unvan_id'
  const val = defaultUnvanSelectId(d, liste, alan)
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <select name={nameId} defaultValue={val}
        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
        <option value="">—</option>
        {liste.map(u => (
          <option key={u.id} value={String(u.id)}>{unvanSecenekLabel(u)}</option>
        ))}
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
  const [asilSicil, setAsilSicil] = useState(d.asil ?? '')
  const [vekilSicil, setVekilSicil] = useState(d.vekil ?? '')
  const [iptalKararTarihi, setIptalKararTarihi] = useState(d.iptal_karar_tarihi ?? '')
  const [iptalKararNo, setIptalKararNo] = useState(d.iptal_karar_no ?? '')

  useEffect(() => {
    setAsilSicil(d.asil ?? '')
    setVekilSicil(d.vekil ?? '')
    setIptalKararTarihi(d.iptal_karar_tarihi ?? '')
    setIptalKararNo(d.iptal_karar_no ?? '')
  }, [d.id, d.asil, d.vekil, d.iptal_karar_tarihi, d.iptal_karar_no])

  const hesaplananDurum = kadroDurumuHesapla(asilSicil, vekilSicil)
  const iptalMi = Boolean(iptalKararTarihi || iptalKararNo)

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
              {selUnvanId(d, 'Kadro Ünvanı', unvanlar, 'kadro')}
              {sel(d, 'kadro_mudurlugu', 'Kadro Müdürlüğü', mudurluler)}
              {selUnvanId(d, 'Görev Ünvanı', unvanlar, 'gorev')}
              {sel(d, 'gorev_mudurlugu', 'Görev Müdürlüğü', mudurluler)}
            </div>
          </div>
          <hr className="border-slate-100" />
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Personel Bilgileri</p>
            <div className="grid grid-cols-2 gap-3">
              <PersonelSecici
                key={`asil-${d.id}`}
                name="asil"
                label="Asil"
                personeller={personeller}
                defaultValue={d.asil}
                onSeciliChange={setAsilSicil}
              disabled={iptalMi}
              />
              <PersonelSecici
                key={`vekil-${d.id}`}
                name="vekil"
                label="Vekil"
                personeller={personeller}
                defaultValue={d.vekil}
                onSeciliChange={setVekilSicil}
              disabled={iptalMi}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {sel(d, 'gelis_nedeni', 'Geliş Nedeni', gelisNedenleri ?? [])}
            </div>
            {input(d, 'geldigi_yer', 'Geldiği Yer')}
          </div>
          <hr className="border-slate-100" />
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Durum & Ayrılış & İptal</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Kadro durumu</label>
                <p className="text-[11px] text-slate-500 mb-1.5 leading-snug">
                  Asil seçiliyse <strong>Dolu</strong>, yalnız vekil seçiliyse <strong>Vekil</strong>, ikisi boşsa <strong>Boş</strong> — kayıtta otomatik atanır.
                </p>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${KADRO_DURUM_BADGE[hesaplananDurum] ?? ''}`}>
                  {hesaplananDurum}
                </span>
              </div>
              {input(d, 'ayrilis_tarihi', 'Ayrılış Tarihi', { type: 'date' })}
              {sel(d, 'ayrilis_nedeni', 'Ayrılış Nedeni', ayrilisNedenleri ?? [])}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">İptal Karar Tarihi</label>
                <input
                  name="iptal_karar_tarihi"
                  type="date"
                  defaultValue={d.iptal_karar_tarihi ?? ''}
                  onChange={e => setIptalKararTarihi(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">İptal Karar No</label>
                <input
                  name="iptal_karar_no"
                  type="text"
                  defaultValue={d.iptal_karar_no ?? ''}
                  onChange={e => setIptalKararNo(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
            </div>
            {iptalMi && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 mt-3">
                İptal alanları dolu olduğu için bu kayda Asil/Vekil personel atanamaz.
              </p>
            )}
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
