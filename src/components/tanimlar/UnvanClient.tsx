'use client'

import { useMemo, useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'
import { useTanimlarSaltOkunur } from '@/components/tanimlar/TanimlarSaltOkunurContext'
import { trNormalize } from '@/lib/turkce-search'
import type { UnvanTopluSatir } from '@/app/(dashboard)/tanimlar/unvan/actions'
import type { Tables } from '@/types/database'

type Unvan = Tables<'tanim_unvan'>

type TopluDraft = {
  sira_no: string
  unvan_kodu: string
  unvan_adi: string
  sinif_adi: string
  arazi: boolean
  destek_yardimci_birim: boolean
  kat_sayi: string
}

interface Props {
  data: Unvan[]
  onAdd:    (fd: FormData) => Promise<{ hata?: string }>
  onUpdate: (id: number, fd: FormData) => Promise<{ hata?: string }>
  onToggle: (id: number, aktif: boolean) => Promise<{ hata?: string }>
  onTopluKaydet: (satirlar: UnvanTopluSatir[]) => Promise<{ hata?: string; adet?: number }>
}

const SINIFLAR = ['GİH', 'TH', 'SHS', 'AH', 'EH', 'DH', 'YH', 'ZB']

function draftFrom(u: Unvan): TopluDraft {
  return {
    sira_no: u.sira_no != null ? String(u.sira_no) : '',
    unvan_kodu: u.unvan_kodu ?? '',
    unvan_adi: u.unvan_adi,
    sinif_adi: u.sinif_adi ?? '',
    arazi: u.arazi === true,
    destek_yardimci_birim: u.destek_yardimci_birim === true,
    kat_sayi: u.kat_sayi != null ? String(u.kat_sayi) : '',
  }
}

function draftDegisti(u: Unvan, d: TopluDraft): boolean {
  const o = draftFrom(u)
  return (
    o.sira_no !== d.sira_no ||
    o.unvan_kodu !== d.unvan_kodu ||
    o.unvan_adi !== d.unvan_adi ||
    o.sinif_adi !== d.sinif_adi ||
    o.arazi !== d.arazi ||
    o.destek_yardimci_birim !== d.destek_yardimci_birim ||
    o.kat_sayi !== d.kat_sayi
  )
}

export default function UnvanClient({ data, onAdd, onUpdate, onToggle, onTopluKaydet }: Props) {
  const saltOkunur = useTanimlarSaltOkunur()
  const [modalAcik, setModalAcik]    = useState(false)
  const [secili, setSecili]          = useState<Unvan | null>(null)
  const [sunuciHata, setSunuciHata]  = useState<string | null>(null)
  const [topluMesaj, setTopluMesaj]  = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [arama, setArama]            = useState('')
  const [sekme, setSekme]            = useState<'liste' | 'toplu'>('liste')
  const [toplu, setToplu]            = useState<Record<number, TopluDraft>>({})

  const filtreli = useMemo(() => {
    const q = trNormalize(arama)
    if (!q) return data
    return data.filter(u =>
      trNormalize(`${u.unvan_adi} ${u.unvan_kodu ?? ''} ${u.sinif_adi ?? ''}`).includes(q),
    )
  }, [data, arama])

  function yeniEkle()       { setSecili(null);  setSunuciHata(null); setModalAcik(true) }
  function duzenle(u: Unvan){ setSecili(u);     setSunuciHata(null); setModalAcik(true) }
  function kapat()           { setModalAcik(false); setSecili(null); setSunuciHata(null) }

  function handleToggle(u: Unvan) {
    startTransition(async () => {
      const res = await onToggle(u.id, u.aktif)
      if (res?.hata) setSunuciHata(res.hata)
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSunuciHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = secili ? await onUpdate(secili.id, fd) : await onAdd(fd)
      if (res?.hata) setSunuciHata(res.hata)
      else kapat()
    })
  }

  function topluDeger(u: Unvan): TopluDraft {
    return toplu[u.id] ?? draftFrom(u)
  }

  function topluAlan(id: number, patch: Partial<TopluDraft>) {
    setToplu(prev => {
      const mevcut = prev[id] ?? draftFrom(data.find(x => x.id === id)!)
      return { ...prev, [id]: { ...mevcut, ...patch } }
    })
  }

  function topluKaydet() {
    setSunuciHata(null)
    setTopluMesaj(null)
    const satirlar: UnvanTopluSatir[] = []
    for (const u of data) {
      const d = toplu[u.id]
      if (!d || !draftDegisti(u, d)) continue
      const sira = d.sira_no.trim()
      const kat = d.kat_sayi.trim()
      satirlar.push({
        id: u.id,
        sira_no: sira ? Number(sira) : null,
        unvan_kodu: d.unvan_kodu.trim() || null,
        unvan_adi: d.unvan_adi.trim(),
        sinif_adi: d.sinif_adi.trim() || null,
        arazi: d.arazi,
        destek_yardimci_birim: d.destek_yardimci_birim,
        kat_sayi: kat ? Number(kat) : null,
      })
    }
    if (!satirlar.length) {
      setSunuciHata('Değişen satır yok.')
      return
    }
    startTransition(async () => {
      const res = await onTopluKaydet(satirlar)
      if (res?.hata) setSunuciHata(res.hata)
      else {
        setToplu({})
        setTopluMesaj(`${res.adet ?? satirlar.length} unvan güncellendi.`)
      }
    })
  }

  const inputSinif = 'w-full px-2 py-1.5 border border-slate-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500'
  const inputText = 'w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-500'

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Unvan Tanımları</h1>
        <div className="flex flex-wrap items-center gap-2">
          {!saltOkunur && sekme === 'toplu' && (
            <button
              type="button"
              onClick={topluKaydet}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 rounded-lg hover:bg-emerald-600 disabled:opacity-50"
            >
              {isPending ? 'Kaydediliyor…' : 'Toplu Kaydet'}
            </button>
          )}
          {!saltOkunur && (
          <button
            onClick={yeniEkle}
            className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2
                       rounded-lg hover:bg-slate-700 transition-colors font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Ekle
          </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="inline-flex bg-slate-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setSekme('liste')}
            className={`px-4 py-1.5 text-sm rounded-md ${sekme === 'liste' ? 'bg-white shadow text-slate-800 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Liste
          </button>
          {!saltOkunur && (
            <button
              type="button"
              onClick={() => { setSekme('toplu'); setSunuciHata(null); setTopluMesaj(null) }}
              className={`px-4 py-1.5 text-sm rounded-md ${sekme === 'toplu' ? 'bg-white shadow text-slate-800 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Toplu Güncelle
            </button>
          )}
        </div>
        <input
          type="search"
          value={arama}
          onChange={e => setArama(e.target.value)}
          placeholder="Unvan, kod veya sınıf ara…"
          className="flex-1 min-w-[12rem] px-3 py-2 border border-slate-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
      </div>

      {sekme === 'toplu' && (
        <p className="mb-3 text-sm text-slate-500">
          Tabloda değiştirdiğiniz satırlar Toplu Kaydet ile yazılır. Destek/Yardımcı Birim tiki müdür yan ödeme kuralını etkiler.
        </p>
      )}

      {sunuciHata && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {sunuciHata}
        </div>
      )}
      {topluMesaj && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-sm">
          {topluMesaj}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-12">#</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-20">Kod</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Unvan Adı</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-20">Sınıf</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-20">Arazi</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Destek/Yrd.</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 w-24">Katsayı</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-24">Durum</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 w-28">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtreli.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    {data.length === 0 ? 'Henüz unvan kaydı yok.' : 'Aramaya uyan unvan yok.'}
                  </td>
                </tr>
              )}
              {filtreli.map((u, i) => {
                const d = topluDeger(u)
                const degisti = sekme === 'toplu' && draftDegisti(u, d)
                return (
                <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${degisti ? 'bg-amber-50/70' : ''}`}>
                  <td className="px-4 py-3 text-slate-400 tabular-nums">
                    {sekme === 'toplu' ? (
                      <input
                        type="number"
                        min={0}
                        value={d.sira_no}
                        onChange={e => topluAlan(u.id, { sira_no: e.target.value })}
                        className={`${inputText} w-16`}
                      />
                    ) : i + 1}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500 text-xs">
                    {sekme === 'toplu' ? (
                      <input
                        type="text"
                        value={d.unvan_kodu}
                        onChange={e => topluAlan(u.id, { unvan_kodu: e.target.value })}
                        className={inputText}
                      />
                    ) : (u.unvan_kodu ?? '—')}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {sekme === 'toplu' ? (
                      <input
                        type="text"
                        value={d.unvan_adi}
                        onChange={e => topluAlan(u.id, { unvan_adi: e.target.value })}
                        className={inputText}
                      />
                    ) : u.unvan_adi}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {sekme === 'toplu' ? (
                      <select
                        value={d.sinif_adi}
                        onChange={e => topluAlan(u.id, { sinif_adi: e.target.value })}
                        className={inputSinif}
                      >
                        <option value="">—</option>
                        {SINIFLAR.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (u.sinif_adi ?? '—')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {sekme === 'toplu' ? (
                      <select
                        value={d.arazi ? 'true' : 'false'}
                        onChange={e => topluAlan(u.id, { arazi: e.target.value === 'true' })}
                        className={inputSinif}
                      >
                        <option value="false">Yok</option>
                        <option value="true">Var</option>
                      </select>
                    ) : u.arazi ? (
                      <span className="text-green-600 text-xs font-medium">✓ Var</span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {sekme === 'toplu' ? (
                      <select
                        value={d.destek_yardimci_birim ? 'true' : 'false'}
                        onChange={e => topluAlan(u.id, { destek_yardimci_birim: e.target.value === 'true' })}
                        className={inputSinif}
                      >
                        <option value="false">Hayır</option>
                        <option value="true">Evet</option>
                      </select>
                    ) : u.destek_yardimci_birim ? (
                      <span className="text-amber-700 text-xs font-medium">✓ Evet</span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-600">
                    {sekme === 'toplu' ? (
                      <input
                        type="number"
                        step="0.0001"
                        min={0}
                        value={d.kat_sayi}
                        onChange={e => topluAlan(u.id, { kat_sayi: e.target.value })}
                        className={`${inputText} text-right`}
                      />
                    ) : (u.kat_sayi != null ? Number(u.kat_sayi).toFixed(4) : '—')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggle(u)}
                      disabled={isPending || saltOkunur}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                                  transition-colors disabled:opacity-50 ${
                        u.aktif
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${u.aktif ? 'bg-green-500' : 'bg-slate-400'}`} />
                      {u.aktif ? 'Aktif' : 'Pasif'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!saltOkunur && sekme === 'liste' ? (
                    <button
                      onClick={() => duzenle(u)}
                      className="text-sm text-slate-600 hover:text-slate-900 font-medium
                                 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      Düzenle
                    </button>
                    ) : <span className="text-xs text-slate-400">—</span>}
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {data.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
            {arama.trim() ? `${filtreli.length} / ${data.length} kayıt` : `Toplam ${data.length} kayıt`}
          </div>
        )}
      </div>

      <Modal
        open={modalAcik}
        onClose={kapat}
        title={secili ? 'Unvan Düzenle' : 'Yeni Unvan Ekle'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sıra No</label>
              <input
                name="sira_no" type="number" min={0}
                defaultValue={secili?.sira_no ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Unvan Kodu</label>
              <input
                name="unvan_kodu" type="text"
                defaultValue={secili?.unvan_kodu ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="MÜH"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Unvan Adı <span className="text-red-500">*</span>
            </label>
            <input
              name="unvan_adi" type="text" required
              defaultValue={secili?.unvan_adi ?? ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="Mühendis"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Sınıf</label>
            <select
              name="sinif_adi"
              defaultValue={secili?.sinif_adi ?? ''}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
            >
              <option value="">— Seçin —</option>
              {SINIFLAR.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Katsayı</label>
              <input
                name="kat_sayi" type="number" step="0.0001" min={0}
                defaultValue={secili?.kat_sayi ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="1.0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Arazi Tazminatı</label>
              <select
                name="arazi"
                defaultValue={secili?.arazi ? 'true' : 'false'}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
              >
                <option value="false">Yok</option>
                <option value="true">Var</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Destek/Yardımcı Birim</label>
            <select
              name="destek_yardimci_birim"
              defaultValue={secili?.destek_yardimci_birim ? 'true' : 'false'}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
            >
              <option value="false">Hayır</option>
              <option value="true">Evet</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Evet ise TH kariyerli müdüre +1300 yan ödeme uygulanmaz.
            </p>
          </div>

          {sunuciHata && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{sunuciHata}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button" onClick={kapat}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300
                         rounded-lg hover:bg-slate-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit" disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800
                         rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Kaydediliyor…' : secili ? 'Güncelle' : 'Ekle'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
