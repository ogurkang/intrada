'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useMaliyetBelge } from '@/components/hesaplama/useMaliyetBelge'
import {
  MALIYET_BIRIMLERI,
  type MaliyetBirim,
  type PersonelMaliyetBelge,
  type PersonelMaliyetKalem,
} from '@/lib/personel-maliyet-hesap'

function sayiOku(raw: string): number {
  const n = Number(String(raw).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function yeniId(on: string): string {
  return `${on}-${Date.now().toString(36)}`
}

function Cubuk({
  kaydet,
  pending,
  mesaj,
  baslik,
  aciklama,
  children,
}: {
  kaydet: () => void
  pending: boolean
  mesaj: string | null
  baslik: string
  aciklama: string
  children: ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/hesaplama/tanimlar" className="text-sm text-slate-500 hover:text-slate-800">← Tanımlar</Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-800">{baslik}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{aciklama}</p>
        </div>
        <button
          type="button"
          onClick={kaydet}
          disabled={pending}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
      {mesaj && <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{mesaj}</p>}
      {children}
    </div>
  )
}

export function YasalOranTanimClient({ sunucuBelge, tabloYok }: { sunucuBelge: PersonelMaliyetBelge | null; tabloYok: boolean }) {
  const { belge, hazir, mesaj, guncelle, kaydet, pending } = useMaliyetBelge(sunucuBelge, tabloYok)
  if (!hazir) return null
  return (
    <Cubuk kaydet={kaydet} pending={pending} mesaj={mesaj} baslik="Yasal oranlar" aciklama="Prime esas kalemlerin kurum maliyetine eklenen işveren payları. Oran değişince hesaplama ekranındaki toplam da değişir.">
      <div className="grid max-w-xl gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <label className="text-sm text-slate-700">
          İşveren SGK %
          <input value={belge.sgk_isveren} onChange={e => guncelle({ ...belge, sgk_isveren: sayiOku(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="text-sm text-slate-700">
          İşveren işsizlik %
          <input value={belge.issizlik_isveren} onChange={e => guncelle({ ...belge, issizlik_isveren: sayiOku(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
      </div>
    </Cubuk>
  )
}

export function GorevGrupTanimClient({ sunucuBelge, tabloYok }: { sunucuBelge: PersonelMaliyetBelge | null; tabloYok: boolean }) {
  const { belge, hazir, mesaj, guncelle, kaydet, pending } = useMaliyetBelge(sunucuBelge, tabloYok)
  if (!hazir) return null
  return (
    <Cubuk kaydet={kaydet} pending={pending} mesaj={mesaj} baslik="Görev grupları" aciklama="Pazarlık hesabının personel sayısı ve fiili günü. Sorumluluk tutarı kalem tanımında, gruba göre girilir.">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2">Grup</th>
              <th className="px-3 py-2">Personel</th>
              <th className="px-3 py-2">Fiili gün</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {belge.gruplar.map(grup => (
              <tr key={grup.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  <input value={grup.ad} onChange={e => guncelle({ ...belge, gruplar: belge.gruplar.map(g => g.id === grup.id ? { ...g, ad: e.target.value } : g) })} className="w-full min-w-48 rounded border border-slate-300 px-2 py-1" />
                </td>
                <td className="px-3 py-2">
                  <input value={grup.adet} onChange={e => guncelle({ ...belge, gruplar: belge.gruplar.map(g => g.id === grup.id ? { ...g, adet: sayiOku(e.target.value) } : g) })} className="w-24 rounded border border-slate-300 px-2 py-1 text-right" />
                </td>
                <td className="px-3 py-2">
                  <input value={grup.fiili_gun} onChange={e => guncelle({ ...belge, gruplar: belge.gruplar.map(g => g.id === grup.id ? { ...g, fiili_gun: sayiOku(e.target.value) } : g) })} className="w-24 rounded border border-slate-300 px-2 py-1 text-right" />
                </td>
                <td className="px-3 py-2 text-right">
                  <button type="button" className="text-xs text-red-700 hover:underline" onClick={() => guncelle({ ...belge, gruplar: belge.gruplar.filter(g => g.id !== grup.id) })}>Sil</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        onClick={() => guncelle({ ...belge, gruplar: [...belge.gruplar, { id: yeniId('g'), ad: 'Yeni görev grubu', adet: 0, fiili_gun: 22 }] })}
      >
        Grup ekle
      </button>
    </Cubuk>
  )
}

export function KalemTanimClient({ sunucuBelge, tabloYok }: { sunucuBelge: PersonelMaliyetBelge | null; tabloYok: boolean }) {
  const { belge, hazir, mesaj, guncelle, kaydet, pending } = useMaliyetBelge(sunucuBelge, tabloYok)
  if (!hazir) return null

  function kalemGuncelle(id: string, parca: Partial<PersonelMaliyetKalem>) {
    guncelle({ ...belge, kalemler: belge.kalemler.map(k => k.id === id ? { ...k, ...parca } : k) })
  }

  return (
    <Cubuk kaydet={kaydet} pending={pending} mesaj={mesaj} baslik="Kalemler" aciklama="Yevmiye ve sosyal hakların bugünkü taban tutarı. Artış oranı hesaplama ekranında artı ve eksi ile verilir.">
      <div className="space-y-3">
        {belge.kalemler.map(kalem => (
          <article key={kalem.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-48 flex-1 text-sm text-slate-700">
                Ad
                <input value={kalem.ad} onChange={e => kalemGuncelle(kalem.id, { ad: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <label className="text-sm text-slate-700">
                Birim
                <select value={kalem.birim} onChange={e => kalemGuncelle(kalem.id, { birim: e.target.value as MaliyetBirim })} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2">
                  {MALIYET_BIRIMLERI.map(b => <option key={b.id} value={b.id}>{b.etiket}</option>)}
                </select>
              </label>
              {!kalem.grup_ozel && (
                <label className="text-sm text-slate-700">
                  Taban
                  <input value={kalem.taban} onChange={e => kalemGuncelle(kalem.id, { taban: sayiOku(e.target.value) })} className="mt-1 block w-32 rounded-lg border border-slate-300 px-3 py-2 text-right" />
                </label>
              )}
              {kalem.birim === 'olay' && (
                <label className="text-sm text-slate-700">
                  Yıllık adet
                  <input value={kalem.olay_adet} onChange={e => kalemGuncelle(kalem.id, { olay_adet: sayiOku(e.target.value) })} className="mt-1 block w-28 rounded-lg border border-slate-300 px-3 py-2 text-right" />
                </label>
              )}
              <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
                <input type="checkbox" checked={kalem.prime_esas} onChange={e => kalemGuncelle(kalem.id, { prime_esas: e.target.checked })} />
                Prime esas
              </label>
              <button type="button" className="pb-2 text-sm text-red-700 hover:underline" onClick={() => {
                const oranlar = { ...belge.oranlar }
                delete oranlar[kalem.id]
                guncelle({ ...belge, oranlar, kalemler: belge.kalemler.filter(k => k.id !== kalem.id) })
              }}>Sil</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={kalem.grup_ozel} onChange={e => kalemGuncelle(kalem.id, { grup_ozel: e.target.checked })} />
                Tutar görev grubuna göre
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={kalem.grup_idler != null}
                  onChange={e => kalemGuncelle(kalem.id, { grup_idler: e.target.checked ? [] : null })}
                />
                Yalnız seçili gruplar
              </label>
            </div>
            {kalem.grup_idler != null && (
              <div className="mt-2 flex flex-wrap gap-2">
                {belge.gruplar.map(g => (
                  <label key={g.id} className="flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs">
                    <input
                      type="checkbox"
                      checked={kalem.grup_idler?.includes(g.id) ?? false}
                      onChange={e => {
                        const once = new Set(kalem.grup_idler ?? [])
                        if (e.target.checked) once.add(g.id)
                        else once.delete(g.id)
                        kalemGuncelle(kalem.id, { grup_idler: [...once] })
                      }}
                    />
                    {g.ad}
                  </label>
                ))}
              </div>
            )}
            {kalem.grup_ozel && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {belge.gruplar.map(g => (
                  <label key={g.id} className="text-xs text-slate-600">
                    {g.ad}
                    <input
                      value={kalem.grup_taban[g.id] ?? 0}
                      onChange={e => kalemGuncelle(kalem.id, { grup_taban: { ...kalem.grup_taban, [g.id]: sayiOku(e.target.value) } })}
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-right text-sm"
                    />
                  </label>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
      <button
        type="button"
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        onClick={() => {
          const id = yeniId('k')
          guncelle({
            ...belge,
            oranlar: { ...belge.oranlar, [id]: { yil1: 0, yil2: 0 } },
            kalemler: [...belge.kalemler, {
              id, ad: 'Yeni kalem', birim: 'ay', prime_esas: true, grup_idler: null, grup_ozel: false, taban: 0, olay_adet: 0, grup_taban: {},
            }],
          })
        }}
      >
        Kalem ekle
      </button>
    </Cubuk>
  )
}
