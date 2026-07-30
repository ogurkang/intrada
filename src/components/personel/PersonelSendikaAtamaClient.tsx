'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { personelSendikaAtamaKaydet } from '@/app/(dashboard)/bildirim/sendika/actions'
import { broadcastIntradaRefresh } from '@/lib/intrada-tab-sync'
import { kadroStatuSendikaGrubu } from '@/lib/sendika-statu'

export type PersonelSendikaAtamaSatir = {
  sicil_no: string
  ad_soyad: string
  statu: string | null
  mevcut_sendika_id: number | null
  mevcut_kisa_ad: string | null
}

interface Props {
  personeller: PersonelSendikaAtamaSatir[]
  sendikalar: { id: number; statu: string; kisa_ad: string }[]
}

export default function PersonelSendikaAtamaClient({ personeller, sendikalar }: Props) {
  const router = useRouter()
  const [arama, setArama] = useState('')
  const [secimler, setSecimler] = useState<Record<string, number | ''>>({})
  const [topluSendika, setTopluSendika] = useState<number | ''>('')
  const [seciliSiciller, setSeciliSiciller] = useState<Set<string>>(new Set())
  const [hata, setHata] = useState<string | null>(null)
  const [basari, setBasari] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtreli = useMemo(() => {
    const q = arama.toLocaleLowerCase('tr-TR')
    return personeller.filter(
      p =>
        !q ||
        p.ad_soyad.toLocaleLowerCase('tr-TR').includes(q) ||
        p.sicil_no.includes(q) ||
        (p.mevcut_kisa_ad ?? '').toLocaleLowerCase('tr-TR').includes(q),
    )
  }, [personeller, arama])

  const seciliStatuGruplari = useMemo(() => {
    const gruplar = new Set<string>()
    for (const sicil of seciliSiciller) {
      const p = personeller.find(x => x.sicil_no === sicil)
      const g = kadroStatuSendikaGrubu(p?.statu ?? null)
      if (g) gruplar.add(g)
    }
    return gruplar
  }, [seciliSiciller, personeller])

  const topluSendikaSecenekleri = useMemo(() => {
    if (!seciliStatuGruplari.size) return sendikalar
    return sendikalar.filter(s => seciliStatuGruplari.has(s.statu))
  }, [sendikalar, seciliStatuGruplari])

  useEffect(() => {
    if (topluSendika === '') return
    if (!topluSendikaSecenekleri.some(s => s.id === topluSendika)) {
      setTopluSendika('')
    }
  }, [topluSendika, topluSendikaSecenekleri])

  function sendikalarForStatu(statu: string | null) {
    const g = kadroStatuSendikaGrubu(statu)
    if (!g) return []
    return sendikalar.filter(s => s.statu === g)
  }

  function satirDeger(sicil: string, mevcut: number | null): number | '' {
    if (secimler[sicil] !== undefined) return secimler[sicil]
    return mevcut ?? ''
  }

  function kaydet() {
    setHata(null)
    setBasari(null)
    const satirlar = personeller
      .map(p => {
        if (!(p.sicil_no in secimler)) return null
        const v = secimler[p.sicil_no]
        if (v === '' || v === p.mevcut_sendika_id) return null
        return { sicil_no: p.sicil_no, sendika_id: Number(v) }
      })
      .filter(Boolean) as { sicil_no: string; sendika_id: number }[]

    if (!satirlar.length) {
      setHata('Kaydedilecek değişiklik yok.')
      return
    }

    startTransition(async () => {
      const res = await personelSendikaAtamaKaydet(satirlar)
      if (res.hata) setHata(res.hata)
      else {
        setSecimler({})
        setSeciliSiciller(new Set())
        setBasari(`${satirlar.length} personelin sendika bilgisi güncellendi.`)
        broadcastIntradaRefresh('sendika')
        router.refresh()
      }
    })
  }

  function topluUygula() {
    setHata(null)
    setBasari(null)
    if (topluSendika === '') {
      setHata('Toplu uygulamak için sendika seçin.')
      return
    }
    if (!seciliSiciller.size) {
      setHata('Toplu uygulamak için en az bir personel işaretleyin.')
      return
    }

    const sendika = sendikalar.find(s => s.id === topluSendika)
    if (!sendika) return

    const yeni: Record<string, number | ''> = { ...secimler }
    let uygulanan = 0
    for (const sicil of seciliSiciller) {
      const p = personeller.find(x => x.sicil_no === sicil)
      if (!p) continue
      const g = kadroStatuSendikaGrubu(p.statu)
      if (g !== sendika.statu) continue
      yeni[sicil] = topluSendika
      uygulanan++
    }

    if (!uygulanan) {
      setHata('Seçilen sendika, işaretli personelin statüsüne uygun değil.')
      return
    }

    setSecimler(yeni)
    setBasari(`${uygulanan} personele "${sendika.kisa_ad}" uygulandı. Kaydetmeyi unutmayın.`)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Sendika Bilgileri</h1>
        <p className="text-sm text-slate-600 mt-1">
          Henüz sendika atanmamış aktif personel listelenir. Statüsüne uygun sendikadan atama yapın; kayıt sonrası personel listeden düşer.
        </p>
      </div>

      {hata && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{hata}</div>}
      {basari && <div className="mb-4 bg-green-50 border border-green-200 text-green-800 rounded-lg p-3 text-sm">{basari}</div>}

      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <input
          value={arama}
          onChange={e => setArama(e.target.value)}
          placeholder="Ad veya sicil ara…"
          className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
        <select
          value={topluSendika}
          onChange={e => setTopluSendika(e.target.value ? Number(e.target.value) : '')}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white min-w-[180px]"
        >
          <option value="">
            {seciliSiciller.size
              ? 'Toplu sendika seç…'
              : 'Önce personel işaretleyin…'}
          </option>
          {topluSendikaSecenekleri.map(s => (
            <option key={s.id} value={s.id}>
              [{s.statu}] {s.kisa_ad}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!seciliSiciller.size || topluSendika === ''}
          onClick={topluUygula}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-50 disabled:opacity-50"
        >
          Seçililere uygula ({seciliSiciller.size})
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={kaydet}
          className="text-sm bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 ml-auto"
        >
          {isPending ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  checked={filtreli.length > 0 && filtreli.every(p => seciliSiciller.has(p.sicil_no))}
                  onChange={e => {
                    if (e.target.checked) setSeciliSiciller(new Set(filtreli.map(p => p.sicil_no)))
                    else setSeciliSiciller(new Set())
                  }}
                />
              </th>
              <th className="text-left px-3 py-3 font-semibold text-slate-600 w-24">Sicil</th>
              <th className="text-left px-3 py-3 font-semibold text-slate-600">Ad Soyad</th>
              <th className="text-left px-3 py-3 font-semibold text-slate-600 w-32">Statü</th>
              <th className="text-left px-3 py-3 font-semibold text-slate-600 w-40">Mevcut Sendika</th>
              <th className="text-left px-3 py-3 font-semibold text-slate-600 min-w-[200px]">Sendika Seçimi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtreli.map(p => {
              const opts = sendikalarForStatu(p.statu)
              const val = satirDeger(p.sicil_no, p.mevcut_sendika_id)
              const degisti = p.sicil_no in secimler && secimler[p.sicil_no] !== '' && secimler[p.sicil_no] !== p.mevcut_sendika_id
              return (
                <tr key={p.sicil_no} className={degisti ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-slate-50'}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={seciliSiciller.has(p.sicil_no)}
                      onChange={e => {
                        setSeciliSiciller(prev => {
                          const next = new Set(prev)
                          if (e.target.checked) next.add(p.sicil_no)
                          else next.delete(p.sicil_no)
                          return next
                        })
                      }}
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{p.sicil_no}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{p.ad_soyad}</td>
                  <td className="px-3 py-2 text-slate-600">{p.statu ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{p.mevcut_kisa_ad ?? '—'}</td>
                  <td className="px-3 py-2">
                    {opts.length ? (
                      <select
                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white"
                        value={val === '' ? '' : String(val)}
                        onChange={e => {
                          setHata(null)
                          setBasari(null)
                          setSecimler(prev => ({
                            ...prev,
                            [p.sicil_no]: e.target.value ? Number(e.target.value) : '',
                          }))
                        }}
                      >
                        <option value="">— Seçin —</option>
                        {opts.map(s => (
                          <option key={s.id} value={String(s.id)}>
                            {s.kisa_ad}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-slate-400">Sendika tanımı yok</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
