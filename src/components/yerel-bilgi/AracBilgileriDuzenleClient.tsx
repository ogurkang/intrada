'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { aracBilgisiGuncelle, type AracBilgisiKayitSatir } from '@/app/(dashboard)/yerel-bilgi/islemler/arac-bilgileri/actions'
import type { AltTurSecenek, MudurlukSecenek, TanimSecenek } from '@/components/yerel-bilgi/AracBilgileriGirisClient'

type Satir = {
  sahiplik_durum_id: string
  arac_durum_id: string
  arac_turu_id: string
  arac_alt_tur_id: string
  plaka_no: string
  sasi_no: string
  mudurluk_id: string
}

type Props = {
  kayitId: number
  isAdmin: boolean
  kullaniciMudurlukId: number | null
  kullaniciMudurlukAdi: string | null
  baslangic: Satir
  sahiplikler: TanimSecenek[]
  durumlar: TanimSecenek[]
  turler: TanimSecenek[]
  altTurler: AltTurSecenek[]
  mudurlukler: MudurlukSecenek[]
}

export default function AracBilgileriDuzenleClient({
  kayitId,
  isAdmin,
  kullaniciMudurlukId,
  kullaniciMudurlukAdi,
  baslangic,
  sahiplikler,
  durumlar,
  turler,
  altTurler,
  mudurlukler,
}: Props) {
  const [s, setS] = useState<Satir>(baslangic)
  const [sunucuHata, setSunucuHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function turDegisti(yeniTur: string) {
    setS(prev => ({ ...prev, arac_turu_id: yeniTur, arac_alt_tur_id: '' }))
  }

  function altSecenekler(turIdStr: string) {
    const tid = Number(turIdStr)
    if (!Number.isFinite(tid)) return []
    return altTurler.filter(a => a.arac_turu_id === tid)
  }

  function vazgec() {
    window.close()
  }

  function kaydet() {
    setSunucuHata(null)
    if (!s.sahiplik_durum_id || !s.arac_durum_id || !s.arac_turu_id || !s.arac_alt_tur_id) {
      setSunucuHata('Sahiplik, araç durumu, tür ve alt tür seçilmelidir.')
      return
    }
    if (isAdmin && (!s.mudurluk_id || !Number.isFinite(Number(s.mudurluk_id)))) {
      setSunucuHata('Müdürlük seçilmelidir.')
      return
    }
    const row: AracBilgisiKayitSatir = {
      sahiplik_durum_id: Number(s.sahiplik_durum_id),
      arac_durum_id: Number(s.arac_durum_id),
      arac_turu_id: Number(s.arac_turu_id),
      arac_alt_tur_id: Number(s.arac_alt_tur_id),
      plaka_no: s.plaka_no,
      sasi_no: s.sasi_no,
    }
    if (isAdmin) row.mudurluk_id = Number(s.mudurluk_id)
    startTransition(async () => {
      const res = await aracBilgisiGuncelle(kayitId, row)
      if (res.hata) {
        setSunucuHata(res.hata)
        return
      }
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.location.reload()
        }
      } catch {
        /* ignore */
      }
      window.close()
    })
  }

  const eklemeEngelli = !isAdmin && kullaniciMudurlukId == null

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-5">
        <Link
          href="/yerel-bilgi/islemler/arac-bilgileri"
          className="intrada-btn intrada-btn-ust-menu mb-2"
        >
          ← Araç bilgileri listesi
        </Link>
        <h1 className="text-xl font-bold text-slate-800">Araç düzenle</h1>
        <p className="text-sm text-slate-500 mt-0.5">Kaydı güncelleyin; kaydettikten sonra bu sekme kapanır.</p>
      </div>

      {eklemeEngelli && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4 text-sm">
          Bu kaydı düzenleyemezsiniz. Pencereyi kapatabilirsiniz.
        </div>
      )}
      {!isAdmin && kullaniciMudurlukId != null && kullaniciMudurlukAdi && (
        <div className="mb-4 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-3 text-sm">
          Müdürlük <strong>{kullaniciMudurlukAdi}</strong> olarak kalır.
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="px-2 py-2 font-semibold text-slate-600 w-[12%]">Sahiplik</th>
                <th className="px-2 py-2 font-semibold text-slate-600 w-[12%]">Araç durumu</th>
                <th className="px-2 py-2 font-semibold text-slate-600 w-[10%]">Tür</th>
                <th className="px-2 py-2 font-semibold text-slate-600 w-[12%]">Alt tür</th>
                <th className="px-2 py-2 font-semibold text-slate-600 w-[10%]">Plaka</th>
                <th className="px-2 py-2 font-semibold text-slate-600 w-[11%]">Şasi</th>
                <th className="px-2 py-2 font-semibold text-slate-600 w-[14%]">Müdürlük</th>
              </tr>
            </thead>
            <tbody>
              <tr className="align-middle">
                <td className="px-2 py-1">
                  <select
                    value={s.sahiplik_durum_id}
                    disabled={eklemeEngelli}
                    onChange={e => setS(prev => ({ ...prev, sahiplik_durum_id: e.target.value }))}
                    className="w-full h-9 border border-slate-200 rounded-md px-1.5 text-xs bg-white"
                  >
                    <option value="">—</option>
                    {sahiplikler.map(x => (
                      <option key={x.id} value={String(x.id)}>
                        {x.tanim_adi}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <select
                    value={s.arac_durum_id}
                    disabled={eklemeEngelli}
                    onChange={e => setS(prev => ({ ...prev, arac_durum_id: e.target.value }))}
                    className="w-full h-9 border border-slate-200 rounded-md px-1.5 text-xs bg-white"
                  >
                    <option value="">—</option>
                    {durumlar.map(x => (
                      <option key={x.id} value={String(x.id)}>
                        {x.tanim_adi}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <select
                    value={s.arac_turu_id}
                    disabled={eklemeEngelli}
                    onChange={e => turDegisti(e.target.value)}
                    className="w-full h-9 border border-slate-200 rounded-md px-1.5 text-xs bg-white"
                  >
                    <option value="">—</option>
                    {turler.map(x => (
                      <option key={x.id} value={String(x.id)}>
                        {x.tanim_adi}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <select
                    value={s.arac_alt_tur_id}
                    disabled={eklemeEngelli}
                    onChange={e => setS(prev => ({ ...prev, arac_alt_tur_id: e.target.value }))}
                    className="w-full h-9 border border-slate-200 rounded-md px-1.5 text-xs bg-white"
                  >
                    <option value="">—</option>
                    {altSecenekler(s.arac_turu_id).map(x => (
                      <option key={x.id} value={String(x.id)}>
                        {x.tanim_adi}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <input
                    className="w-full h-9 border border-slate-200 rounded-md px-1.5 text-xs"
                    value={s.plaka_no}
                    disabled={eklemeEngelli}
                    onChange={e => setS(prev => ({ ...prev, plaka_no: e.target.value }))}
                    placeholder="Plaka"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    className="w-full h-9 border border-slate-200 rounded-md px-1.5 text-xs font-mono"
                    value={s.sasi_no}
                    disabled={eklemeEngelli}
                    onChange={e => setS(prev => ({ ...prev, sasi_no: e.target.value }))}
                    placeholder="Şasi"
                  />
                </td>
                <td className="px-2 py-1">
                  {isAdmin ? (
                    <select
                      value={s.mudurluk_id}
                      disabled={eklemeEngelli}
                      onChange={e => setS(prev => ({ ...prev, mudurluk_id: e.target.value }))}
                      className="w-full h-9 border border-slate-200 rounded-md px-1.5 text-xs bg-white"
                    >
                      <option value="">—</option>
                      {mudurlukler.map(m => (
                        <option key={m.id} value={String(m.id)}>
                          {m.mudurluk_adi}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="h-9 flex items-center px-1 text-xs text-slate-500 border border-transparent">
                      —
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {sunucuHata && <p className="mt-4 text-sm text-red-600">{sunucuHata}</p>}

      <div className="mt-8 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={vazgec}
          disabled={isPending}
          className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={kaydet}
          disabled={isPending || eklemeEngelli}
          className="intrada-btn intrada-btn-kaydet disabled:opacity-50"
        >
          {isPending ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </div>
  )
}
