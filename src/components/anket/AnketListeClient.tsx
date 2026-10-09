'use client'

import { useState } from 'react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import { anketDurumEtiket, anketLogEtiket, anketZaman } from '@/lib/anket'
import { anketLogGetir, type AnketLogSatir } from '@/app/(dashboard)/anket-yonetimi/actions'

export type AnketListeSatir = {
  id: string
  baslik: string
  kod: string
  durum: string
  soruSayisi: number
  cevapSayisi: number
}

function Ikon({ ad }: { ad: 'saat' | 'kalem' | 'goz' }) {
  const ortak = 'w-4 h-4'
  if (ad === 'saat') {
    return (
      <svg className={ortak} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="12" cy="12" r="8" />
        <path strokeLinecap="round" d="M12 8v4l2.5 2" />
      </svg>
    )
  }
  if (ad === 'kalem') {
    return (
      <svg className={ortak} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h4l10-10-4-4L4 16v4z" />
        <path strokeLinecap="round" d="M13 7l4 4" />
      </svg>
    )
  }
  return (
    <svg className={ortak} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}

export default function AnketListeClient({
  satirlar,
  tur,
}: {
  satirlar: AnketListeSatir[]
  tur: 'anket' | 'rapor'
}) {
  const [logAcik, setLogAcik] = useState(false)
  const [logBaslik, setLogBaslik] = useState('')
  const [loglar, setLoglar] = useState<AnketLogSatir[]>([])
  const [logHata, setLogHata] = useState<string | null>(null)
  const [logYukleniyor, setLogYukleniyor] = useState(false)

  async function logAc(satir: AnketListeSatir) {
    setLogBaslik(satir.baslik)
    setLogAcik(true)
    setLogYukleniyor(true)
    setLogHata(null)
    setLoglar([])
    const sonuc = await anketLogGetir(satir.id)
    setLogYukleniyor(false)
    if (sonuc.hata) setLogHata(sonuc.hata)
    else setLoglar(sonuc.satirlar)
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Başlık</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">Kod</th>
              <th className="px-4 py-3 font-medium">Soru</th>
              {tur === 'rapor' ? <th className="px-4 py-3 font-medium">Cevap</th> : null}
              <th className="px-4 py-3 font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {satirlar.length === 0 ? (
              <tr>
                <td colSpan={tur === 'rapor' ? 6 : 5} className="px-4 py-8 text-center text-slate-500">
                  Henüz anket yok.
                </td>
              </tr>
            ) : satirlar.map(satir => {
              const detay = tur === 'rapor'
                ? `/anket-yonetimi/raporlar/${satir.id}`
                : `/anket-yonetimi/anketler/${satir.id}`
              const duzenle = `/anket-yonetimi/anketler/${satir.id}?duzenle=1`
              return (
                <tr key={satir.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{satir.baslik}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${satir.durum === 'yayinda' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                      {anketDurumEtiket(satir.durum)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-700">{satir.kod}</td>
                  <td className="px-4 py-3 text-slate-700">{satir.soruSayisi}</td>
                  {tur === 'rapor' ? <td className="px-4 py-3 text-slate-700">{satir.cevapSayisi}</td> : null}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button type="button" title="Log kaydı" onClick={() => logAc(satir)} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100">
                        <Ikon ad="saat" />
                      </button>
                      <Link href={duzenle} title="Düzenle" className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100">
                        <Ikon ad="kalem" />
                      </Link>
                      <Link href={detay} title="Detay" className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100">
                        <Ikon ad="goz" />
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Modal open={logAcik} onClose={() => setLogAcik(false)} title={`Log · ${logBaslik}`} size="lg">
        {logYukleniyor ? <p className="text-sm text-slate-500">Kayıtlar yükleniyor…</p> : null}
        {logHata ? <p className="text-sm text-red-700">{logHata}</p> : null}
        {!logYukleniyor && !logHata && loglar.length === 0 ? (
          <p className="text-sm text-slate-500">Kayıt yok.</p>
        ) : null}
        <ul className="space-y-3">
          {loglar.map(log => (
            <li key={log.id} className="border-b border-slate-100 pb-3 last:border-0">
              <p className="text-sm font-medium text-slate-800">{anketLogEtiket(log.islem)}</p>
              <p className="text-sm text-slate-600">{log.ozet}</p>
              <p className="mt-1 text-xs text-slate-500">{anketZaman(log.created_at)} · {log.yapan_ad || '—'}</p>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  )
}
