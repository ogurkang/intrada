'use client'

import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { AyyHesapSatir, AyyHesapSonucu, AyyPersonelOzet, AyyStatuBazliPersonel } from '@/lib/ayy-hesap'
import {
  AYY_OZET_BOLUM,
  AYY_OZET_BOLUM_SIRASI,
  ayyOzetPersonelGrupla,
  type AyyOzetBolumKey,
} from '@/lib/ayy-ozet-grupla'

interface Donem {
  id: number
  donem_adi: string | null
  sira_no?: string | null
  baslangic_tarihi: string
  bitis_tarihi: string
  durum?: 'Açık' | 'Kapalı'
  yil?: number
}

interface Props {
  donem:      Donem
  sonuc:      AyyHesapSonucu
  tatilSayisi: number
  statuBazliPersonel: AyyStatuBazliPersonel[]
}

type Sekme = 'ozet' | 'takipteki' | 'donemdeki' | 'askidaki'

function tarih(t: string | null | undefined) {
  if (!t) return '—'
  const gun = t.slice(0, 10)
  const [y, a, g] = gun.split('-')
  if (!y || !a || !g) return '—'
  return `${g}.${a}.${y}`
}

function kesilenIzinSatirlari(sicil: string, kaynaklar: AyyHesapSatir[], gosterilen: number) {
  const ilgili = kaynaklar.filter(s => s.sicil_no === sicil && s.IZ > 0)
  const liste = ilgili.map(s => ({
    baslik: s.tur,
    alt: `${tarih(s.kaynakBas)} başlangıç · dönüş ${tarih(s.kaynakDonus)} · bu döneme ${ayyGun(s.IZ)} gün`,
  }))
  const toplam = ilgili.reduce((t, s) => t + s.IZ, 0)
  const fark = Math.round((gosterilen - toplam) * 10) / 10
  if (fark > 0) {
    liste.push({
      baslik: 'Geçici görevlendirme',
      alt: `Yemek hakkı yok · bu döneme ${ayyGun(fark)} gün`,
    })
  }
  return liste
}

function KesilenIzinHucre({ sicil, gun, kaynaklar }: { sicil: string; gun: number; kaynaklar: AyyHesapSatir[] }) {
  const [konum, setKonum] = useState<{ x: number; y: number } | null>(null)
  const liste = kesilenIzinSatirlari(sicil, kaynaklar, gun)
  if (gun <= 0) return <span>—</span>
  const titleMetin = liste.map(s => `${s.baslik}: ${s.alt}`).join(' | ') || 'Kayıt yok'
  return (
    <>
      <span
        className="cursor-help underline decoration-dotted underline-offset-2"
        title={titleMetin}
        onMouseEnter={e => {
          const r = e.currentTarget.getBoundingClientRect()
          setKonum({ x: r.left + r.width / 2, y: r.top })
        }}
        onMouseLeave={() => setKonum(null)}
      >
        {ayyGun(gun)}
      </span>
      {konum && liste.length > 0 && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[200] pointer-events-none w-max max-w-[280px] px-3 py-2 rounded-lg bg-slate-800 text-[11px] leading-snug shadow-lg border border-slate-700"
          style={{ left: konum.x, top: konum.y, transform: 'translate(-50%, calc(-100% - 8px))' }}
        >
          {liste.map((satir, i) => (
            <div key={`${satir.baslik}-${i}`} className={i > 0 ? 'mt-2 border-t border-slate-700 pt-2' : ''}>
              <p className="font-medium text-white">{satir.baslik}</p>
              <p className="text-slate-200 mt-0.5">{satir.alt}</p>
            </div>
          ))}
          <span
            className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-slate-800"
            aria-hidden
          />
        </div>,
        document.body,
      )}
    </>
  )
}

/** Tam gün tam sayı; küsüratlı gün (yarı zamanlı 10,5) bir ondalık. */
function ayyGun(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return Number.isInteger(n)
    ? String(n)
    : n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function PersonelTablosu({ satirlar, etiket, kaynaklar }: { satirlar: AyyPersonelOzet[]; etiket: string; kaynaklar: AyyHesapSatir[] }) {
  const toplamK  = satirlar.reduce((s, p) => s + p.K,  0)
  const toplamSD = satirlar.reduce((s, p) => s + p.SD, 0)
  const toplamIZ = satirlar.reduce((s, p) => s + p.IZ, 0)
  const toplamOD = satirlar.reduce((s, p) => s + p.OD, 0)

  if (satirlar.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p className="text-sm">{etiket} bu dönemde kayıt yok.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-500">{satirlar.length} personel</p>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>Toplam Yemek Alacağı Gün: <span className="font-semibold text-slate-700">{ayyGun(toplamK)}</span></span>
          <span>Toplam Sonraki Döneme: <span className="font-semibold text-amber-600">{ayyGun(toplamSD)}</span></span>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-center px-3 py-3 font-semibold text-slate-500 w-10">#</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-24">Sicil</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Ad Soyad</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Unvan</th>
              <th className="text-center px-3 py-3 font-semibold text-slate-600 w-28 bg-blue-50 text-blue-700">Önceki Dönemden</th>
              <th className="text-center px-3 py-3 font-semibold text-slate-600 w-20">Ham İzin</th>
              <th className="text-center px-3 py-3 font-semibold text-slate-600 w-24 bg-orange-50 text-orange-700">Kesilen İzin</th>
              <th className="text-center px-3 py-3 font-semibold text-slate-600 w-24">Yemekli Gün</th>
              <th className="text-center px-3 py-3 font-semibold text-slate-600 w-28 bg-red-50 text-red-700">Yemek Alacağı Gün</th>
              <th className="text-center px-3 py-3 font-semibold text-slate-600 w-24 bg-amber-50 text-amber-700">Sonraki Döneme</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {satirlar.map(p => (
              <tr key={`${p.sicil_no}-${p.sira_no_seq}`} className={`transition-colors ${p.isZabita ? 'bg-violet-50/30 hover:bg-violet-50' : 'hover:bg-slate-50'}`}>
                <td className="px-3 py-2.5 text-center text-xs text-slate-400">{p.sira_no_seq}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{p.sicil_no}</td>
                <td className="px-4 py-2.5">
                  <span className="font-medium text-slate-800">{p.ad_soyad}</span>
                  {p.isZabita && <span className="ml-1.5 text-[10px] text-violet-600 font-medium bg-violet-100 px-1.5 py-0.5 rounded">Z</span>}
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-500 hidden md:table-cell">{p.unvan || '—'}</td>
                <td className="px-3 py-2.5 text-center tabular-nums text-sm font-medium text-blue-700">{p.OD > 0 ? ayyGun(p.OD) : '—'}</td>
                <td className="px-3 py-2.5 text-center tabular-nums text-sm text-slate-600">{ayyGun(p.hamIzin ?? 0)}</td>
                <td className="px-3 py-2.5 text-center tabular-nums text-sm font-medium text-orange-700">
                  <KesilenIzinHucre sicil={p.sicil_no} gun={p.IZ} kaynaklar={kaynaklar} />
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums text-sm text-slate-600">{ayyGun(p.YG)}</td>
                <td className="px-3 py-2.5 text-center tabular-nums text-sm font-semibold text-red-700">{ayyGun(p.K)}</td>
                <td className="px-3 py-2.5 text-center tabular-nums text-sm font-medium text-amber-700">{p.SD > 0 ? ayyGun(p.SD) : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t border-slate-200">
              <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Toplam</td>
              <td className="px-3 py-2.5 text-center tabular-nums text-sm font-bold text-blue-700">{toplamOD > 0 ? ayyGun(toplamOD) : '—'}</td>
              <td className="px-3 py-2.5 text-center tabular-nums text-sm font-bold text-slate-600">{ayyGun(satirlar.reduce((s, p) => s + (p.hamIzin ?? 0), 0))}</td>
              <td className="px-3 py-2.5 text-center tabular-nums text-sm font-bold text-orange-700">{toplamIZ > 0 ? ayyGun(toplamIZ) : '—'}</td>
              <td className="px-3 py-2.5 text-center">—</td>
              <td className="px-3 py-2.5 text-center tabular-nums text-sm font-bold text-red-700">{ayyGun(toplamK)}</td>
              <td className="px-3 py-2.5 text-center tabular-nums text-sm font-bold text-amber-700">{toplamSD > 0 ? ayyGun(toplamSD) : '—'}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export default function AyyOzetDisplay({ donem, sonuc, tatilSayisi, statuBazliPersonel }: Props) {
  const [sekme, setSekme] = useState<Sekme>('ozet')
  const [arama, setArama] = useState('')

  const toplamKesinti = useMemo(() => sonuc.personeller.reduce((s, p) => s + p.K, 0), [sonuc])

  function zabitalariAltaTasi<T extends { isZabita?: boolean }>(list: T[]): T[] {
    const diger = list.filter(p => !p.isZabita)
    const zabitalar = list.filter(p => p.isZabita)
    return [...diger, ...zabitalar]
  }

  const ozetGruplar = useMemo(
    () => ayyOzetPersonelGrupla(sonuc.personeller, statuBazliPersonel),
    [sonuc.personeller, statuBazliPersonel],
  )

  const toplamSD      = useMemo(() => sonuc.personeller.reduce((s, p) => s + p.SD, 0), [sonuc])
  const zabitaSayisi  = useMemo(() => sonuc.personeller.filter(p => p.isZabita).length, [sonuc])

  function filtreUygula(list: AyyPersonelOzet[]) {
    const q = arama.toLocaleLowerCase('tr-TR')
    if (!q) return list
    return list.filter(p =>
      p.ad_soyad.toLocaleLowerCase('tr-TR').includes(q) ||
      p.sicil_no.toLocaleLowerCase('tr-TR').includes(q)
    )
  }

  const filtreliOzetGruplar = useMemo(() => {
    const out = {} as Record<AyyOzetBolumKey, AyyPersonelOzet[]>
    for (const key of AYY_OZET_BOLUM_SIRASI) {
      out[key] = filtreUygula(ozetGruplar[key])
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ozetGruplar, arama])

  const ozetFiltreliToplam = useMemo(
    () => AYY_OZET_BOLUM_SIRASI.reduce((n, key) => n + filtreliOzetGruplar[key].length, 0),
    [filtreliOzetGruplar],
  )

  const sekmeler: { key: Sekme; label: string; sayisi: number }[] = [
    { key: 'ozet',      label: 'Genel Özet',      sayisi: sonuc.personeller.length  },
    { key: 'takipteki', label: 'Takipteki İzinler', sayisi: sonuc.takipteki.length    },
    { key: 'donemdeki', label: 'Dönemdeki İzinler', sayisi: sonuc.donemdeki.length    },
    { key: 'askidaki',  label: 'Askıdaki İzinler',  sayisi: sonuc.askidaki.length     },
  ]

  const sekmeData: Record<Sekme, AyyPersonelOzet[]> = {
    ozet:      zabitalariAltaTasi(filtreUygula(sonuc.personeller)),
    takipteki: zabitalariAltaTasi(filtreUygula(sonuc.takipteki)),
    donemdeki: zabitalariAltaTasi(filtreUygula(sonuc.donemdeki)),
    askidaki:  zabitalariAltaTasi(filtreUygula(sonuc.askidaki)),
  }

  const sekmeAciklamalar: Record<Sekme, string> = {
    ozet:      'Tüm kategorileri kapsayan personel bazında özet.',
    takipteki: 'İzin başlangıç tarihi dönemden önce; izin bu dönem içinde ve/veya sonrasında bitiyor.',
    donemdeki: 'İzin başlangıç ve bitiş tarihleri dönem içinde yer alıyor.',
    askidaki:  'İzin başlangıç tarihi dönem bitişinden sonra — ileride düşülecek.',
  }

  return (
    <div>
      {/* KPI Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Dönem Çalışma Günü',  deger: sonuc.donemAktifGun, renk: 'slate',  aciklama: `${tatilSayisi} tatil hariç` },
          { label: 'Toplam Personel',      deger: sonuc.personeller.length, renk: 'indigo', aciklama: `${zabitaSayisi} zabıta` },
          { label: 'Toplam Yemek Alacağı Gün', deger: toplamKesinti, renk: 'red', aciklama: 'kesinti' },
          { label: 'Sonraki Döneme (SD)',  deger: toplamSD,      renk: 'amber',  aciklama: 'devreden' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">{k.label}</p>
            <p className={`text-3xl font-bold text-${k.renk}-700`}>{typeof k.deger === 'number' ? ayyGun(k.deger) : k.deger}</p>
            <p className="text-xs text-slate-400 mt-1">{k.aciklama}</p>
          </div>
        ))}
      </div>

      {/* Sütun Açıklaması */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        {[
          { ad: 'Önceki Dönemden (OD)', renk: 'bg-blue-100 text-blue-700' },
          { ad: 'Ham İzin', renk: 'bg-slate-100 text-slate-600' },
          { ad: 'Kesilen İzin (İZ)', renk: 'bg-orange-100 text-orange-700' },
          { ad: 'Yemekli Gün (YG)', renk: 'bg-slate-100 text-slate-600' },
          { ad: 'Yemek Alacağı Gün', renk: 'bg-red-100 text-red-700' },
          { ad: 'Sonraki Döneme (SD)', renk: 'bg-amber-100 text-amber-700' },
          { ad: 'Zabıta (30 gün baz)', renk: 'bg-violet-100 text-violet-700' },
        ].map(s => (
          <span key={s.ad} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${s.renk}`}>
            {s.ad}
          </span>
        ))}
      </div>

      {/* Arama */}
      <div className="mb-4">
        <input value={arama} onChange={e => setArama(e.target.value)}
          placeholder="Ad veya sicil ara…"
          className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
      </div>

      {/* Sekmeler */}
      <div className="flex gap-1 mb-4 border-b border-slate-200 overflow-x-auto">
        {sekmeler.map(s => (
          <button key={s.key} onClick={() => setSekme(s.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
              sekme === s.key
                ? 'border-slate-800 text-slate-800'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
            }`}>
            {s.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              sekme === s.key ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
            }`}>{s.sayisi}</span>
          </button>
        ))}
      </div>

      {/* Sekme açıklaması */}
      <p className="text-xs text-slate-400 mb-3">{sekmeAciklamalar[sekme]}</p>

      {/* İçerik */}
      {sekme === 'ozet' ? (
        ozetFiltreliToplam === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-sm">
              {arama ? 'Arama kriterine uygun personel bulunamadı.' : 'Genel Özet bu dönemde kayıt yok.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {AYY_OZET_BOLUM_SIRASI.map(key => {
              const satirlar = filtreliOzetGruplar[key]
              if (satirlar.length === 0) return null
              return (
                <section key={key}>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 px-3 py-2 bg-slate-100 rounded-lg border border-slate-200">
                    {AYY_OZET_BOLUM[key]}
                  </h3>
                  <PersonelTablosu satirlar={satirlar} etiket={AYY_OZET_BOLUM[key]} kaynaklar={sonuc.satirlar} />
                </section>
              )
            })}
          </div>
        )
      ) : (
        <PersonelTablosu
          satirlar={sekmeData[sekme]}
          etiket={sekmeler.find(s => s.key === sekme)?.label ?? ''}
          kaynaklar={sonuc.satirlar.filter(s => s.kategori === (
            sekme === 'takipteki' ? 'Takipteki İzinler' : sekme === 'donemdeki' ? 'Dönemdeki İzinler' : 'Askıdaki İzinler'
          ))}
        />
      )}
    </div>
  )
}
