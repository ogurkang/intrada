'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import OranAdimi, { MiktarAlani } from '@/components/hesaplama/OranAdimi'
import OrnekKisiAyAy from '@/components/hesaplama/OrnekKisiAyAy'
import { useMaliyetBelge } from '@/components/hesaplama/useMaliyetBelge'
import {
  etkinTutar,
  farkPayi,
  kalemPersonelSayisi,
  oranAl,
  personelMaliyetKiyas,
  yuzdeFromMiktar,
  type MaliyetBirim,
  type PersonelMaliyetBelge,
  type PersonelMaliyetKalem,
} from '@/lib/personel-maliyet-hesap'

function tl(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function yuzde(n: number): string {
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

function birimNot(birim: MaliyetBirim): string {
  if (birim === 'ucret_30') return 'günlük'
  if (birim === 'fiili_gun') return 'günlük'
  if (birim === 'ay') return 'aylık'
  if (birim === 'ikramiye') return 'gün'
  return 'olay tutarı'
}

function miktarSonEk(birim: MaliyetBirim): string {
  return birim === 'ikramiye' ? 'gün' : 'TL'
}

function bandYazi(degerler: number[]): string {
  if (!degerler.length) return '—'
  const min = Math.min(...degerler)
  const max = Math.max(...degerler)
  if (Math.abs(max - min) < 0.005) return tl(min)
  return `${tl(min)} – ${tl(max)}`
}

export default function PersonelMaliyetClient({
  sunucuBelge,
  tabloYok,
}: {
  sunucuBelge: PersonelMaliyetBelge | null
  tabloYok: boolean
}) {
  const { belge, hazir, mesaj, setMesaj, guncelle, kaydet, pending } = useMaliyetBelge(sunucuBelge, tabloYok)
  const kiyas = useMemo(() => personelMaliyetKiyas(belge), [belge])
  const fark1 = kiyas.yil1.toplam_aylik - kiyas.mevcut.toplam_aylik
  const fark2 = kiyas.yil2.toplam_aylik - kiyas.mevcut.toplam_aylik
  const personel = belge.gruplar.reduce((t, g) => t + g.adet, 0)

  function oranYaz(kalemId: string, alan: 'yil1' | 'yil2', deger: number) {
    const once = oranAl(belge, kalemId)
    guncelle({ ...belge, oranlar: { ...belge.oranlar, [kalemId]: { ...once, [alan]: deger } } })
  }

  function miktarYaz(kalem: PersonelMaliyetKalem, donem: 'yil1' | 'yil2', miktar: number) {
    const oran = oranAl(belge, kalem.id)
    const baz = donem === 'yil1' ? kalem.taban : etkinTutar(kalem.taban, oran, 'yil1')
    const yuzdeDeger = yuzdeFromMiktar(baz, miktar)
    if (yuzdeDeger == null) {
      setMesaj(`${kalem.ad} tabanı sıfır olduğu için tutardan yüzde çıkmaz. Önce Tanımlar’da tabanı girin.`)
      return
    }
    setMesaj(null)
    oranYaz(kalem.id, donem, yuzdeDeger)
  }

  function ornekZam() {
    const oranlar = { ...belge.oranlar }
    for (const k of belge.kalemler) {
      if (k.birim === 'ucret_30') oranlar[k.id] = { yil1: 45, yil2: 45 }
      else if (k.birim === 'fiili_gun' || k.birim === 'ay') oranlar[k.id] = { yil1: 35, yil2: 35 }
    }
    guncelle({ ...belge, oranlar })
    setMesaj('Yevmiyeye %45, yol yemek yakacak sorumluluk ve koku primine %35 yazıldı. 2. yıl oranı 1. yılın üzerine biner.')
  }

  function sifirla() {
    const oranlar = Object.fromEntries(belge.kalemler.map(k => [k.id, { yil1: 0, yil2: 0 }]))
    guncelle({ ...belge, oranlar })
    setMesaj('Artış oranları sıfırlandı. Maliyet mevcut tabanla aynı.')
  }

  if (!hazir) return <p className="text-sm text-slate-500">Yükleniyor…</p>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold text-slate-800">Personel Maliyeti Hesaplama</h1>
          <p className="mt-1 text-sm text-slate-600">
            Taban tutarlar Tanımlar’da durur. Yüzdeyi veya tutarı değiştirin; diğeri ona göre güncellenir.
            Toplam kurum maliyetinin ne kadar kaydığı anında görünür. Personel sayısı {personel.toLocaleString('tr-TR')}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={ornekZam} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
            Örnek zam
          </button>
          <button type="button" onClick={sifirla} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
            Oranları sıfırla
          </button>
          <button
            type="button"
            onClick={kaydet}
            disabled={pending}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {pending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
      {mesaj && <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{mesaj}</p>}

      <section className="grid gap-3 sm:grid-cols-3">
        <OzetKart baslik="Mevcut aylık maliyet" tutar={tl(kiyas.mevcut.toplam_aylik)} alt={`Yıllık ${tl(kiyas.mevcut.toplam_yillik)}`} />
        <OzetKart
          baslik="1. yıl aylık maliyet"
          tutar={tl(kiyas.yil1.toplam_aylik)}
          alt={`${fark1 >= 0 ? '+' : ''}${tl(fark1)} · ${yuzde(farkPayi(fark1, kiyas.mevcut.toplam_aylik))}`}
          vurgu
        />
        <OzetKart
          baslik="2. yıl aylık maliyet"
          tutar={tl(kiyas.yil2.toplam_aylik)}
          alt={`${fark2 >= 0 ? '+' : ''}${tl(fark2)} · ${yuzde(farkPayi(fark2, kiyas.mevcut.toplam_aylik))}`}
        />
      </section>

      <section className="space-y-2">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-800">Artış oranları</h2>
          <Link href="/hesaplama/tanimlar" className="text-sm text-slate-600 underline-offset-2 hover:underline">
            Taban tutarlar ve görev grupları
          </Link>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Kalem</th>
                <th className="px-3 py-2 text-right">Personel</th>
                <th className="px-3 py-2 text-right">Taban</th>
                <th className="px-3 py-2">1. yıl</th>
                <th className="px-3 py-2">2. yıl</th>
                <th className="px-3 py-2 text-right">1. yıl fark</th>
                <th className="px-3 py-2">Pay</th>
              </tr>
            </thead>
            <tbody>
              {belge.kalemler.map(kalem => {
                const oran = oranAl(belge, kalem.id)
                const simdi = kiyas.mevcut.kalemler.find(k => k.id === kalem.id)?.aylik ?? 0
                const sonra = kiyas.yil1.kalemler.find(k => k.id === kalem.id)?.aylik ?? 0
                const fark = sonra - simdi
                const pay = farkPayi(fark, fark1)
                return (
                  <tr key={kalem.id} className="border-t border-slate-100">
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-800">{kalem.ad}</div>
                      <div className="text-xs text-slate-500">{birimNot(kalem.birim)}</div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-800">
                      <div>{kalemPersonelSayisi(belge, kalem).toLocaleString('tr-TR')}</div>
                      {kalem.birim === 'olay' ? <div className="text-xs text-slate-500">yıllık olay</div> : null}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-700">
                      {kalem.grup_ozel ? (
                        <>
                          <div>{bandYazi(belge.gruplar.map(g => kalem.grup_taban[g.id] ?? kalem.taban))}</div>
                          <div className="text-xs text-slate-500">her grubun kendi tutarı</div>
                        </>
                      ) : (
                        tl(kalem.taban)
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-start gap-1.5">
                        <OranAdimi deger={oran.yil1} onChange={n => oranYaz(kalem.id, 'yil1', n)} />
                        {kalem.grup_ozel ? (
                          <p className="text-xs tabular-nums text-slate-500">
                            {bandYazi(belge.gruplar.map(g => etkinTutar(kalem.grup_taban[g.id] ?? kalem.taban, oran, 'yil1')))} TL
                          </p>
                        ) : (
                          <MiktarAlani
                            deger={etkinTutar(kalem.taban, oran, 'yil1')}
                            onCommit={n => miktarYaz(kalem, 'yil1', n)}
                            sonEk={miktarSonEk(kalem.birim)}
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-start gap-1.5">
                        <OranAdimi deger={oran.yil2} onChange={n => oranYaz(kalem.id, 'yil2', n)} />
                        {kalem.grup_ozel ? (
                          <p className="text-xs tabular-nums text-slate-500">
                            {bandYazi(belge.gruplar.map(g => etkinTutar(kalem.grup_taban[g.id] ?? kalem.taban, oran, 'yil2')))} TL
                          </p>
                        ) : (
                          <MiktarAlani
                            deger={etkinTutar(kalem.taban, oran, 'yil2')}
                            onCommit={n => miktarYaz(kalem, 'yil2', n)}
                            sonEk={miktarSonEk(kalem.birim)}
                          />
                        )}
                      </div>
                    </td>
                    <td className={`px-3 py-3 text-right tabular-nums ${fark < 0 ? 'text-red-700' : 'text-slate-800'}`}>
                      {fark > 0 ? '+' : ''}{tl(fark)}
                    </td>
                    <td className="px-3 py-3 min-w-36">
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full ${fark < 0 ? 'bg-red-400' : 'bg-slate-700'}`}
                          style={{ width: `${Math.min(100, Math.abs(pay))}%` }}
                        />
                      </div>
                      <div className="mt-1 text-xs tabular-nums text-slate-500">{yuzde(pay)}</div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">
          Yüzde değişince alttaki tutar, tutar değişince yüzde güncellenir. 2. yıl, 1. yıl tutarının üzerine biner. Pay sütunu, 1. yıl toplam farkının kalemlere dağılımıdır ve 100’e tamamlanır.
          Sorumluluk satırındaki aralık, en düşük ve en yüksek görev grubunun günlük tutarıdır; yüzde hepsini aynı oranda oynatır. Koku primi, Tanımlar’da grup seçilmeden toplama girmez.
          İşveren SGK %{belge.sgk_isveren.toLocaleString('tr-TR')}, işsizlik %{belge.issizlik_isveren.toLocaleString('tr-TR')}.
        </p>
      </section>

      <OrnekKisiAyAy belge={belge} />
    </div>
  )
}

function OzetKart({ baslik, tutar, alt, vurgu }: { baslik: string; tutar: string; alt: string; vurgu?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${vurgu ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white'}`}>
      <p className={`text-xs uppercase tracking-wide ${vurgu ? 'text-slate-300' : 'text-slate-500'}`}>{baslik}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{tutar}</p>
      <p className={`mt-1 text-sm tabular-nums ${vurgu ? 'text-slate-200' : 'text-slate-600'}`}>{alt}</p>
    </div>
  )
}
