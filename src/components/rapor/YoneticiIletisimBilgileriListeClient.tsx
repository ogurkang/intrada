'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { yoneticiIletisimListeAyarKaydet } from '@/app/(dashboard)/rapor/yonetici-iletisim-bilgileri-liste/actions'

export interface YoneticiIletisimSatir {
  kayit_key: string
  sicil_no: string
  ad_soyad: string
  kadro_unvani: string
  telefon: string
  e_posta: string
}

interface Props {
  tumSatirlar: YoneticiIletisimSatir[]
  seciliKeyler: string[]
  excelHref?: string
}

export default function YoneticiIletisimBilgileriListeClient({
  tumSatirlar,
  seciliKeyler,
  excelHref,
}: Props) {
  const router = useRouter()
  const [sekme, setSekme] = useState<'liste' | 'toplu'>('liste')
  const [isPending, startTransition] = useTransition()
  const [filtre, setFiltre] = useState('')
  const [kayitArama, setKayitArama] = useState('')
  const [secilenArama, setSecilenArama] = useState('')
  const [seciliKayitKey, setSeciliKayitKey] = useState<string | null>(null)
  const [seciliListKeyler, setSeciliListKeyler] = useState<string[]>(seciliKeyler)
  const [mesaj, setMesaj] = useState<string | null>(null)

  const tumByKey = useMemo(() => new Map(tumSatirlar.map(s => [s.kayit_key, s] as const)), [tumSatirlar])
  const seciliSet = useMemo(() => new Set(seciliListKeyler), [seciliListKeyler])
  const kayitListesi = useMemo(
    () => seciliListKeyler.map(k => tumByKey.get(k)).filter((x): x is YoneticiIletisimSatir => !!x),
    [seciliListKeyler, tumByKey],
  )

  const numarali = useMemo(() => {
    const q = filtre.trim().toLocaleLowerCase('tr-TR')
    const list = q
      ? kayitListesi.filter(
          r =>
            r.ad_soyad.toLocaleLowerCase('tr-TR').includes(q) ||
            r.sicil_no.toLocaleLowerCase('tr-TR').includes(q) ||
            r.kadro_unvani.toLocaleLowerCase('tr-TR').includes(q),
        )
      : kayitListesi
    return list.map((r, i) => ({ ...r, siraNo: i + 1 }))
  }, [kayitListesi, filtre])

  const solAdaylar = useMemo(() => {
    const q = kayitArama.trim().toLocaleLowerCase('tr-TR')
    return tumSatirlar.filter(r => {
      if (seciliSet.has(r.kayit_key)) return false
      if (!q) return true
      return (
        r.ad_soyad.toLocaleLowerCase('tr-TR').includes(q) ||
        r.sicil_no.toLocaleLowerCase('tr-TR').includes(q) ||
        r.kadro_unvani.toLocaleLowerCase('tr-TR').includes(q)
      )
    })
  }, [tumSatirlar, seciliSet, kayitArama])

  const sagSecili = useMemo(
    () => seciliListKeyler.map(k => tumByKey.get(k)).filter((x): x is YoneticiIletisimSatir => !!x),
    [seciliListKeyler, tumByKey],
  )
  const secilenFiltreli = useMemo(() => {
    const q = secilenArama.trim().toLocaleLowerCase('tr-TR')
    if (!q) return sagSecili
    return sagSecili.filter(
      r =>
        r.ad_soyad.toLocaleLowerCase('tr-TR').includes(q) ||
        r.sicil_no.toLocaleLowerCase('tr-TR').includes(q) ||
        r.kadro_unvani.toLocaleLowerCase('tr-TR').includes(q),
    )
  }, [sagSecili, secilenArama])

  function sagaEkle(k: string) {
    setSeciliListKeyler(prev => (prev.includes(k) ? prev : [...prev, k]))
  }
  function soldanCikar(k: string) {
    setSeciliListKeyler(prev => prev.filter(x => x !== k))
  }
  function siradaTasi(k: string, yon: 'yukari' | 'asagi') {
    setSeciliListKeyler(prev => {
      const idx = prev.indexOf(k)
      if (idx < 0) return prev
      const hedef = yon === 'yukari' ? idx - 1 : idx + 1
      if (hedef < 0 || hedef >= prev.length) return prev
      const next = [...prev]
      const tmp = next[idx]
      next[idx] = next[hedef]
      next[hedef] = tmp
      return next
    })
  }
  function kaydet() {
    setMesaj(null)
    startTransition(async () => {
      const res = await yoneticiIletisimListeAyarKaydet(seciliListKeyler)
      if (res.hata) setMesaj(res.hata)
      else {
        setMesaj('Liste ayarı kaydedildi.')
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/rapor" className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2">
            ← Rapor Yönetimi
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Yönetici İletişim Bilgileri Listesi</h1>
          <p className="text-sm text-slate-600 mt-1">Belediye Başkanı, Başkan Yardımcıları ve unvanında Müdür geçen kayıtların iletişim listesi.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
            <button className={`px-4 py-1.5 text-sm rounded-md ${sekme === 'liste' ? 'bg-white shadow' : ''}`} onClick={() => setSekme('liste')}>Kayıt Listesi</button>
            <button className={`px-4 py-1.5 text-sm rounded-md ${sekme === 'toplu' ? 'bg-white shadow' : ''}`} onClick={() => setSekme('toplu')}>Toplu Güncelle</button>
          </div>
          {excelHref && (
            <Link href={excelHref} className="inline-flex items-center rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 transition-colors">
              Excel İndir
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-600">Ara</label>
        <input value={filtre} onChange={e => setFiltre(e.target.value)} placeholder="Ad, sicil, unvan..." className="min-w-[220px] max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        <span className="text-xs text-slate-500">{numarali.length} / {kayitListesi.length} kayıt</span>
      </div>

      {sekme === 'toplu' ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          {mesaj && <p className="text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg">{mesaj}</p>}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-lg">
              <div className="px-3 py-2 border-b bg-slate-50 text-sm font-medium text-slate-700">Personel Listesi ({solAdaylar.length})</div>
              <div className="p-2 border-b"><input value={kayitArama} onChange={e => setKayitArama(e.target.value)} placeholder="Ara..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
              <div className="max-h-[420px] overflow-auto p-2 space-y-1">
                {solAdaylar.map(r => (
                  <button key={r.kayit_key} type="button" onClick={() => sagaEkle(r.kayit_key)} className="w-full text-left text-sm p-2 hover:bg-slate-50 rounded">
                    {r.ad_soyad} <span className="text-slate-500">({r.kadro_unvani})</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg">
              <div className="px-3 py-2 border-b bg-slate-50 text-sm font-medium text-slate-700">Kayıt Listesi ({sagSecili.length})</div>
              <div className="p-2 border-b"><input value={secilenArama} onChange={e => setSecilenArama(e.target.value)} placeholder="Ara..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
              <div className="max-h-[420px] overflow-auto p-2 space-y-1">
                {secilenFiltreli.map(r => {
                  const idx = seciliListKeyler.indexOf(r.kayit_key)
                  const secili = seciliKayitKey === r.kayit_key
                  return (
                    <div key={r.kayit_key} onClick={() => setSeciliKayitKey(r.kayit_key)} onDoubleClick={() => soldanCikar(r.kayit_key)} className={`w-full text-sm p-2 rounded border cursor-pointer ${secili ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-slate-800">{r.ad_soyad} <span className="text-slate-500 font-normal">({r.kadro_unvani})</span></div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => siradaTasi(r.kayit_key, 'yukari')} disabled={!secili || idx === 0} className="px-2 py-1 text-xs rounded border border-slate-300 disabled:opacity-40">↑</button>
                          <button type="button" onClick={() => siradaTasi(r.kayit_key, 'asagi')} disabled={!secili || idx === seciliListKeyler.length - 1} className="px-2 py-1 text-xs rounded border border-slate-300 disabled:opacity-40">↓</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-200 flex justify-end">
            <button onClick={kaydet} disabled={isPending} className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm">{isPending ? 'Kaydediliyor…' : 'Kaydet'}</button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="px-3 py-3 font-semibold text-slate-700">Sıra No</th>
                <th className="px-3 py-3 font-semibold text-slate-700">Sicil No</th>
                <th className="px-3 py-3 font-semibold text-slate-700">Adı Soyadı</th>
                <th className="px-3 py-3 font-semibold text-slate-700">Kadro Unvanı</th>
                <th className="px-3 py-3 font-semibold text-slate-700">Telefon</th>
                <th className="px-3 py-3 font-semibold text-slate-700">E-Posta</th>
              </tr>
            </thead>
            <tbody>
              {numarali.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Kayıt bulunamadı.</td></tr>
              ) : (
                numarali.map(r => (
                  <tr key={`${r.kayit_key}-${r.siraNo}`} className="border-b border-slate-100">
                    <td className="px-3 py-2.5">{r.siraNo}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{r.sicil_no}</td>
                    <td className="px-3 py-2.5">{r.ad_soyad}</td>
                    <td className="px-3 py-2.5">{r.kadro_unvani}</td>
                    <td className="px-3 py-2.5">{r.telefon}</td>
                    <td className="px-3 py-2.5">{r.e_posta}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
