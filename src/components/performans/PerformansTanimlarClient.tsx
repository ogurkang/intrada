'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  performansKriterGuncelle,
  performansSmsAyarKaydet,
} from '@/app/(dashboard)/performans/actions'

type Kriter = {
  id: number
  kod: number
  baslik: string
  aciklama: string | null
  grup: string
  aktif: boolean
}

const GRUP_ETIKET: Record<string, string> = {
  ortak: 'Ortak (1–15)',
  memur: 'Memur ek (16–20)',
  sef: 'Şef ek (21–25)',
  yonetici: 'Yönetici ek (26–30)',
}

export default function PerformansTanimlarClient({
  kriterler,
  smsMetin,
  isAdmin,
}: {
  kriterler: Kriter[]
  smsMetin: string
  isAdmin: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [metin, setMetin] = useState(smsMetin)
  const [mesaj, setMesaj] = useState<string | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [grupFiltre, setGrupFiltre] = useState<string>('all')

  const filtreli =
    grupFiltre === 'all' ? kriterler : kriterler.filter(k => k.grup === grupFiltre)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Tanımlar</h1>
        <p className="text-sm text-slate-600 mt-1">
          Memur / şef / yönetici kriterleri (ortak + role özel) ve 2. amir SMS şablonu.
        </p>
      </div>

      {(hata || mesaj) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            hata
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {hata ?? mesaj}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <h2 className="font-semibold text-slate-800">SMS şablonu (2. amire)</h2>
        <p className="text-xs text-slate-500">
          Değişkenler: {'{ad_soyad}'}, {'{ad}'}, {'{yil}'}
        </p>
        <textarea
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[100px]"
          value={metin}
          disabled={!isAdmin}
          onChange={e => setMetin(e.target.value)}
        />
        {isAdmin && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setHata(null)
              setMesaj(null)
              start(async () => {
                const r = await performansSmsAyarKaydet(metin)
                if (r.hata) setHata(r.hata)
                else {
                  setMesaj('SMS şablonu kaydedildi.')
                  router.refresh()
                }
              })
            }}
            className="intrada-btn intrada-btn-kaydet"
          >
            Kaydet
          </button>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-slate-800 mr-2">Kriterler</h2>
          {['all', 'ortak', 'memur', 'sef', 'yonetici'].map(g => (
            <button
              key={g}
              type="button"
              onClick={() => setGrupFiltre(g)}
              className={`rounded-full px-3 py-1 text-xs border ${
                grupFiltre === g
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              {g === 'all' ? 'Tümü' : GRUP_ETIKET[g]}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2">Kod</th>
                <th className="px-3 py-2">Grup</th>
                <th className="px-3 py-2">Başlık</th>
                <th className="px-3 py-2">Aktif</th>
              </tr>
            </thead>
            <tbody>
              {filtreli.map(k => (
                <tr key={k.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 tabular-nums">{k.kod}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{GRUP_ETIKET[k.grup] ?? k.grup}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-800">{k.baslik}</div>
                    {k.aciklama && (
                      <div className="text-xs text-slate-500 mt-0.5">{k.aciklama}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isAdmin ? (
                      <input
                        type="checkbox"
                        checked={k.aktif}
                        disabled={pending}
                        onChange={e => {
                          start(async () => {
                            await performansKriterGuncelle(k.id, { aktif: e.target.checked })
                            router.refresh()
                          })
                        }}
                      />
                    ) : k.aktif ? (
                      'Evet'
                    ) : (
                      'Hayır'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
