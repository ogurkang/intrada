'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { aracBilgileriTopluKaydet, type AracBilgisiKayitSatir } from '@/app/(dashboard)/yerel-bilgi/islemler/arac-bilgileri/actions'
import type { AltTurSecenek, MudurlukSecenek, TanimSecenek } from '@/components/yerel-bilgi/AracBilgileriGirisClient'

type TaslakSatir = {
  sahiplik_durum_id: string
  arac_durum_id: string
  arac_turu_id: string
  arac_alt_tur_id: string
  plaka_no: string
  sasi_no: string
  mudurluk_id: string
}

const bosSatir = (): TaslakSatir => ({
  sahiplik_durum_id: '',
  arac_durum_id: '',
  arac_turu_id: '',
  arac_alt_tur_id: '',
  plaka_no: '',
  sasi_no: '',
  mudurluk_id: '',
})

type Props = {
  isAdmin: boolean
  kullaniciMudurlukId: number | null
  kullaniciMudurlukAdi: string | null
  sahiplikler: TanimSecenek[]
  durumlar: TanimSecenek[]
  turler: TanimSecenek[]
  altTurler: AltTurSecenek[]
  mudurlukler: MudurlukSecenek[]
}

export default function AracBilgileriEkleClient({
  isAdmin,
  kullaniciMudurlukId,
  kullaniciMudurlukAdi,
  sahiplikler,
  durumlar,
  turler,
  altTurler,
  mudurlukler,
}: Props) {
  const [satirlar, setSatirlar] = useState<TaslakSatir[]>([bosSatir()])
  const [sunucuHata, setSunucuHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function turDegisti(i: number, yeniTur: string) {
    setSatirlar(prev =>
      prev.map((r, j) =>
        j === i ? { ...r, arac_turu_id: yeniTur, arac_alt_tur_id: '' } : r,
      ),
    )
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
    const parsed: AracBilgisiKayitSatir[] = []
    for (const s of satirlar) {
      if (!s.sahiplik_durum_id || !s.arac_durum_id || !s.arac_turu_id || !s.arac_alt_tur_id) {
        setSunucuHata('Her satırda sahiplik, araç durumu, tür ve alt tür seçilmelidir.')
        return
      }
      if (isAdmin) {
        if (!s.mudurluk_id || !Number.isFinite(Number(s.mudurluk_id))) {
          setSunucuHata('Her satırda müdürlük seçilmelidir.')
          return
        }
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
      parsed.push(row)
    }
    if (parsed.length === 0) {
      setSunucuHata('En az bir satır ekleyin.')
      return
    }
    startTransition(async () => {
      const res = await aracBilgileriTopluKaydet(parsed)
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
        <h1 className="text-xl font-bold text-slate-800">Araç ekle</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Tüm alanlar tek satırda. Kaydettikten sonra bu sekme kapanır.
        </p>
      </div>

      {eklemeEngelli && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4 text-sm">
          Kadro kayıtlarınızda dolu görev veya müdürlük eşlemesi bulunamadı. Bu pencereyi kapatabilirsiniz.
        </div>
      )}
      {!isAdmin && kullaniciMudurlukId != null && kullaniciMudurlukAdi && (
        <div className="mb-4 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-3 text-sm">
          Kayıtlar <strong>{kullaniciMudurlukAdi}</strong> müdürlüğüne yazılacaktır.
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
                <th className="px-1 py-2 w-14 font-semibold text-slate-600 text-center"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {satirlar.map((s, i) => (
                <tr key={i} className="align-middle">
                  <td className="px-2 py-1">
                    <select
                      value={s.sahiplik_durum_id}
                      disabled={eklemeEngelli}
                      onChange={e =>
                        setSatirlar(prev =>
                          prev.map((r, j) => (j === i ? { ...r, sahiplik_durum_id: e.target.value } : r)),
                        )
                      }
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
                      onChange={e =>
                        setSatirlar(prev =>
                          prev.map((r, j) => (j === i ? { ...r, arac_durum_id: e.target.value } : r)),
                        )
                      }
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
                      onChange={e => turDegisti(i, e.target.value)}
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
                      onChange={e =>
                        setSatirlar(prev =>
                          prev.map((r, j) => (j === i ? { ...r, arac_alt_tur_id: e.target.value } : r)),
                        )
                      }
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
                      onChange={e =>
                        setSatirlar(prev =>
                          prev.map((r, j) => (j === i ? { ...r, plaka_no: e.target.value } : r)),
                        )
                      }
                      placeholder="Plaka"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      className="w-full h-9 border border-slate-200 rounded-md px-1.5 text-xs font-mono"
                      value={s.sasi_no}
                      disabled={eklemeEngelli}
                      onChange={e =>
                        setSatirlar(prev =>
                          prev.map((r, j) => (j === i ? { ...r, sasi_no: e.target.value } : r)),
                        )
                      }
                      placeholder="Şasi"
                    />
                  </td>
                  <td className="px-2 py-1">
                    {isAdmin ? (
                      <select
                        value={s.mudurluk_id}
                        disabled={eklemeEngelli}
                        onChange={e =>
                          setSatirlar(prev =>
                            prev.map((r, j) => (j === i ? { ...r, mudurluk_id: e.target.value } : r)),
                          )
                        }
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
                  <td className="px-1 py-1 text-center">
                    {satirlar.length > 1 && !eklemeEngelli && (
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => setSatirlar(prev => prev.filter((_, j) => j !== i))}
                      >
                        Sil
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button
        type="button"
        disabled={eklemeEngelli}
        onClick={() => setSatirlar(prev => [...prev, bosSatir()])}
        className="mt-3 text-sm text-sky-700 hover:underline disabled:opacity-50"
      >
        + Satır ekle
      </button>

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
