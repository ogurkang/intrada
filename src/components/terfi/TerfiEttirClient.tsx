'use client'

import { useMemo, useState, useTransition } from 'react'
import * as XLSX from 'xlsx'
import type { TerfiEttirOnizlemeSatir } from '@/lib/terfi-ettir-hesap'
import { terfiEttirKaydet, type TerfiEttirKayitSatir } from '@/app/(dashboard)/terfi/donem/actions'

interface Props {
  donemId: number
  donemAdi: string
  terfiBas: string
  terfiBit: string
  initialRows: TerfiEttirOnizlemeSatir[]
}

function fmt(iso: string) {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('tr-TR')
  } catch {
    return iso
  }
}

function puanGoster(v: string | null | undefined) {
  return v ?? '—'
}

export default function TerfiEttirClient({ donemId, donemAdi, terfiBas, terfiBit, initialRows }: Props) {
  const [satirlar, setSatirlar] = useState<TerfiEttirOnizlemeSatir[]>(initialRows)
  const [secili, setSecili] = useState<Record<string, boolean>>({})
  const [hata, setHata] = useState<string | null>(null)
  const [basari, setBasari] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const tumSecili = useMemo(() => {
    if (!satirlar.length) return false
    return satirlar.every((r) => secili[r.sicil_no])
  }, [satirlar, secili])

  function toggleHepsi() {
    const next = !tumSecili
    const m: Record<string, boolean> = {}
    for (const r of satirlar) m[r.sicil_no] = next
    setSecili(m)
  }

  function toggleOne(sicil: string) {
    setSecili((prev) => ({ ...prev, [sicil]: !prev[sicil] }))
  }

  function guncelle(sicil: string, alan: keyof TerfiEttirOnizlemeSatir['payload'], deger: string) {
    setSatirlar((prev) =>
      prev.map((row) => {
        if (row.sicil_no !== sicil) return row
        const p = { ...row.payload, [alan]: deger || null }
        return {
          ...row,
          dk_kha_yeni: `${p.kha_derece}/${p.kha_kademe}`,
          dk_ekea_yeni: `${p.ekea_derece}/${p.ekea_kademe}`,
          ek_gosterge_yeni: puanGoster(p.ek_gosterge),
          ek_odeme_yeni: puanGoster(p.ek_odeme),
          oht_yeni: puanGoster(p.oht),
          yan_odeme_yeni: puanGoster(p.yan_odeme),
          sds_yeni: puanGoster(p.sds_orani),
          payload: p,
        }
      }),
    )
  }

  function excelIndir() {
    const aoa: (string | number)[][] = [
      [
        'Sicil',
        'Ad Soyad',
        'Ünvan',
        'KHA D/K (eski→yeni)',
        'EKEA D/K (eski→yeni)',
        'Ek Gösterge (eski→yeni)',
        'Ek Ödeme (eski→yeni)',
        'ÖHT (eski→yeni)',
        'Yan Ödeme (eski→yeni)',
        'SDS (eski→yeni)',
        'Durum / Uyarı',
      ],
    ]
    for (const r of satirlar) {
      aoa.push([
        r.sicil_no,
        r.ad_soyad ?? '',
        r.unvan_adi ?? '',
        `${r.dk_kha_eski} → ${r.dk_kha_yeni}`,
        `${r.dk_ekea_eski} → ${r.dk_ekea_yeni}`,
        `${r.ek_gosterge_eski} → ${r.ek_gosterge_yeni}`,
        `${r.ek_odeme_eski} → ${r.ek_odeme_yeni}`,
        `${r.oht_eski} → ${r.oht_yeni}`,
        `${r.yan_odeme_eski} → ${r.yan_odeme_yeni}`,
        `${r.sds_eski} → ${r.sds_yeni}`,
        r.durum,
      ])
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Terfi Ettir')
    XLSX.writeFile(wb, `terfi-ettir-donem-${donemId}.xlsx`)
  }

  function terfiEttirUygula() {
    setHata(null)
    setBasari(null)
    const yazilacak = satirlar.filter((r) => secili[r.sicil_no] && r.terfi_id != null)
    if (!yazilacak.length) {
      setHata('Önce tabloda kaydedilecek satırları işaretleyin (terfi kaydı olan siciller).')
      return
    }
    const payload: TerfiEttirKayitSatir[] = yazilacak.map((r) => ({
      terfi_id: r.terfi_id!,
      sicil_no: r.sicil_no,
      ...r.payload,
    }))
    startTransition(async () => {
      const res = await terfiEttirKaydet(donemId, payload)
      if (res.hata) setHata(res.hata)
      else setBasari(`${payload.length} kayıt terfi ettirildi.`)
    })
  }

  return (
    <div className="mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Terfi Ettir — Önizleme</h2>
          <p className="text-sm text-slate-600 mt-0.5">
            {donemAdi} · Terfi tarih penceresi: {fmt(terfiBas)} — {fmt(terfiBit)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={excelIndir}
            className="text-sm font-medium border border-slate-300 bg-white px-4 py-2 rounded-lg hover:bg-slate-50 shadow-sm">
            Excel indir
          </button>
          <button
            type="button"
            onClick={terfiEttirUygula}
            disabled={isPending}
            className="text-sm font-medium text-white bg-slate-800 px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 shadow-sm">
            {isPending ? 'İşleniyor…' : 'Terfi Ettir'}
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-4">
        Kurallar: <code className="bg-slate-200/80 px-1 rounded">docs/TERFI_ETTIR.md</code>. Satırları seçin, gerekirse değerleri düzenleyin,{' '}
        <strong>Terfi Ettir</strong> ile kaydedin.
      </p>

      {hata && <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg mb-4">{hata}</p>}
      {basari && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 px-3 py-2 rounded-lg mb-4">{basari}</p>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
        <table className="w-full text-sm min-w-[1200px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              <th className="px-2 py-3 w-10" title="Seç">
                <input type="checkbox" checked={tumSecili} onChange={toggleHepsi} title="Tümünü seç" />
              </th>
              <th className="px-2 py-3 font-semibold text-slate-600">Sicil — Ad Soyad</th>
              <th className="px-2 py-3 font-semibold text-slate-600">Ünvan</th>
              <th className="px-2 py-3 font-semibold text-slate-600">KHA D/K</th>
              <th className="px-2 py-3 font-semibold text-slate-600">EKEA D/K</th>
              <th className="px-2 py-3 font-semibold text-slate-600">Ek Gösterge</th>
              <th className="px-2 py-3 font-semibold text-slate-600">Ek Ödeme</th>
              <th className="px-2 py-3 font-semibold text-slate-600">ÖHT</th>
              <th className="px-2 py-3 font-semibold text-slate-600">Yan Ödeme</th>
              <th className="px-2 py-3 font-semibold text-slate-600">SDS</th>
              <th className="px-2 py-3 font-semibold text-slate-600">Durum / Uyarı</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {satirlar.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                  Bu dönem penceresinde terfi tarihi (KHA/EKEA) bulunan memur yok.
                </td>
              </tr>
            )}
            {satirlar.map((r) => (
              <tr key={r.sicil_no} className="hover:bg-slate-50/80">
                <td className="px-2 py-2 align-top">
                  <input
                    type="checkbox"
                    checked={!!secili[r.sicil_no]}
                    onChange={() => toggleOne(r.sicil_no)}
                    disabled={r.terfi_id == null}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <span className="font-mono text-xs text-slate-500">{r.sicil_no}</span>
                  <br />
                  <span className="font-medium text-slate-800">{r.ad_soyad}</span>
                </td>
                <td className="px-2 py-2 align-top text-slate-700">{r.unvan_adi ?? '—'}</td>
                <td className="px-2 py-2 align-top">
                  <div className="text-[11px] text-slate-400 mb-1 whitespace-nowrap">
                    {r.dk_kha_eski} → {r.dk_kha_yeni}
                  </div>
                  <div className="flex gap-0.5 items-center flex-wrap">
                    <input
                      className="w-9 border border-slate-200 rounded px-1 py-0.5 text-xs"
                      value={r.payload.kha_derece ?? ''}
                      onChange={(e) => guncelle(r.sicil_no, 'kha_derece', e.target.value)}
                    />
                    <span className="text-slate-400">/</span>
                    <input
                      className="w-9 border border-slate-200 rounded px-1 py-0.5 text-xs"
                      value={r.payload.kha_kademe ?? ''}
                      onChange={(e) => guncelle(r.sicil_no, 'kha_kademe', e.target.value)}
                    />
                  </div>
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="text-[11px] text-slate-400 mb-1 whitespace-nowrap">
                    {r.dk_ekea_eski} → {r.dk_ekea_yeni}
                  </div>
                  <div className="flex gap-0.5 items-center flex-wrap">
                    <input
                      className="w-9 border border-slate-200 rounded px-1 py-0.5 text-xs"
                      value={r.payload.ekea_derece ?? ''}
                      onChange={(e) => guncelle(r.sicil_no, 'ekea_derece', e.target.value)}
                    />
                    <span className="text-slate-400">/</span>
                    <input
                      className="w-9 border border-slate-200 rounded px-1 py-0.5 text-xs"
                      value={r.payload.ekea_kademe ?? ''}
                      onChange={(e) => guncelle(r.sicil_no, 'ekea_kademe', e.target.value)}
                    />
                  </div>
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="text-[11px] text-slate-400">{r.ek_gosterge_eski}</div>
                  <input
                    className="w-[4.5rem] border border-slate-200 rounded px-1 py-0.5 text-xs mt-0.5"
                    value={r.payload.ek_gosterge ?? ''}
                    onChange={(e) => guncelle(r.sicil_no, 'ek_gosterge', e.target.value)}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="text-[11px] text-slate-400">{r.ek_odeme_eski}</div>
                  <input
                    className="w-[4.5rem] border border-slate-200 rounded px-1 py-0.5 text-xs mt-0.5"
                    value={r.payload.ek_odeme ?? ''}
                    onChange={(e) => guncelle(r.sicil_no, 'ek_odeme', e.target.value)}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="text-[11px] text-slate-400">{r.oht_eski}</div>
                  <input
                    className="w-[4.5rem] border border-slate-200 rounded px-1 py-0.5 text-xs mt-0.5"
                    value={r.payload.oht ?? ''}
                    onChange={(e) => guncelle(r.sicil_no, 'oht', e.target.value)}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="text-[11px] text-slate-400">{r.yan_odeme_eski}</div>
                  <input
                    className="w-[4.5rem] border border-slate-200 rounded px-1 py-0.5 text-xs mt-0.5"
                    value={r.payload.yan_odeme ?? ''}
                    onChange={(e) => guncelle(r.sicil_no, 'yan_odeme', e.target.value)}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="text-[11px] text-slate-400">{r.sds_eski}</div>
                  <input
                    className="w-[4.5rem] border border-slate-200 rounded px-1 py-0.5 text-xs mt-0.5"
                    value={r.payload.sds_orani ?? ''}
                    onChange={(e) => guncelle(r.sicil_no, 'sds_orani', e.target.value)}
                  />
                </td>
                <td className="px-2 py-2 align-top text-xs max-w-[10rem]">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${
                      r.durum === 'Derece İlerledi'
                        ? 'bg-green-100 text-green-800'
                        : r.durum === 'Sadece Kademe'
                          ? 'bg-slate-100 text-slate-700'
                          : r.durum.includes('Tavan')
                            ? 'bg-amber-100 text-amber-900'
                            : r.durum === 'Eğitim Sınırında'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-50 text-slate-600'
                    }`}>
                    <span className="inline-block w-2 h-2 rounded-full shrink-0 bg-current opacity-60" />
                    {r.durum}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
