'use client'

import Modal from '@/components/ui/Modal'
import {
  PERF_PUAN_BANDA,
  performansEk5BolumBasligi,
  performansPuanBandi,
} from '@/lib/performans'
import { performansEk5Yazdir } from '@/lib/performans-ek5-print'
import type { PerformansEk5OnizleVeri } from '@/app/(dashboard)/performans/actions'

function puanGoster(v: number | null) {
  return v != null ? String(v) : ''
}

export default function PerformansEk5OnizleModal({
  acik,
  onKapat,
  veri,
  yukleniyor,
  hata,
}: {
  acik: boolean
  onKapat: () => void
  veri: PerformansEk5OnizleVeri | null
  yukleniyor: boolean
  hata: string | null
}) {
  const band = performansPuanBandi(veri?.ortalama)

  function yazdir() {
    const root = document.getElementById('performans-ek5-onizle')
    if (root) performansEk5Yazdir(root)
  }

  return (
    <Modal open={acik} onClose={onKapat} title="Ek-5 Performans Değerlendirme Formu" size="xl">
      {yukleniyor && <p className="text-sm text-slate-500 py-8 text-center">Form yükleniyor…</p>}
      {hata && !yukleniyor && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>
      )}
      {veri && !yukleniyor && (
        <div className="space-y-4" id="performans-ek5-onizle">
          <div className="ek5-baslik text-center border-b border-slate-200 pb-3">
            <p className="ana text-sm font-bold text-slate-900">
              YETKİNLİK BAZLI PERFORMANS DEĞERLENDİRME FORMU
            </p>
          </div>

          <div className="ek5-bilgi grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-slate-500">Yöneticinin/Çalışanın Adı ve Soyadı:</span>{' '}
              <span className="font-medium">{veri.ad_soyad}</span>
            </div>
            <div>
              <span className="text-slate-500">Tarih:</span>{' '}
              <span>……/……/{veri.donem_yil}</span>
            </div>
            <div>
              <span className="text-slate-500">T.C. Kimlik No:</span>{' '}
              <span>{veri.tckn ?? '…………………'}</span>
            </div>
            <div>
              <span className="text-slate-500">Sicil No:</span>{' '}
              <span className="font-mono text-xs">{veri.sicil_no}</span>
            </div>
            <div>
              <span className="text-slate-500">Kadro Ünvanı:</span>{' '}
              <span>{veri.kadro_unvani ?? '…………………'}</span>
            </div>
            <div>
              <span className="text-slate-500">Görev Ünvanı:</span>{' '}
              <span>{veri.gorev_unvani ?? '…………………'}</span>
            </div>
            <div className="tam sm:col-span-2">
              <span className="text-slate-500">Görev Yeri:</span>{' '}
              <span>{veri.gorev_yeri ?? '…………………'}</span>
            </div>
          </div>

          <p className="ek5-not text-xs text-slate-500 italic">
            Her soru için 1–5 arası puanlama yapılacaktır.
          </p>

          <div className="overflow-x-auto rounded-lg border border-slate-300">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="no px-2 py-2 text-left w-10">No</th>
                  <th className="px-2 py-2 text-left">Değerlendirme Kriterleri</th>
                  <th className="puan px-2 py-2 text-center w-16">I. Amir</th>
                  {!veri.tek_amir && <th className="puan px-2 py-2 text-center w-16">II. Amir</th>}
                </tr>
              </thead>
              <tbody>
                {veri.kriterler.flatMap(k => {
                  const bolum = performansEk5BolumBasligi(k.kod)
                  const satirlar = []
                  if (bolum) {
                    satirlar.push(
                      <tr key={`bolum-${k.kod}`} className="bolum bg-slate-50">
                        <td
                          colSpan={veri.tek_amir ? 3 : 4}
                          className="px-2 py-1.5 font-semibold text-center text-slate-700"
                        >
                          {bolum}
                        </td>
                      </tr>,
                    )
                  }
                  satirlar.push(
                    <tr key={k.kod} className="border-t border-slate-200 align-top">
                      <td className="no px-2 py-1.5 text-center tabular-nums">{k.kod}</td>
                      <td className="px-2 py-1.5">
                        <div className="kriter-baslik font-semibold text-slate-800">{k.baslik}</div>
                        {k.aciklama ? (
                          <div className="kriter-aciklama text-[11px] leading-snug text-slate-600 mt-0.5">
                            {k.aciklama}
                          </div>
                        ) : null}
                      </td>
                      <td className="puan px-2 py-1.5 text-center tabular-nums font-semibold">
                        {puanGoster(k.puan_amir1)}
                      </td>
                      {!veri.tek_amir && (
                        <td className="puan px-2 py-1.5 text-center tabular-nums font-semibold">
                          {puanGoster(k.puan_amir2)}
                        </td>
                      )}
                    </tr>,
                  )
                  return satirlar
                })}
              </tbody>
              <tfoot className="bg-slate-50 font-semibold">
                <tr className="border-t border-slate-300">
                  <td colSpan={2} className="px-2 py-2 text-right">GENEL TOPLAM</td>
                  <td className="puan px-2 py-2 text-center tabular-nums">{puanGoster(veri.puan_amir1)}</td>
                  {!veri.tek_amir && (
                    <td className="puan px-2 py-2 text-center tabular-nums">{puanGoster(veri.puan_amir2)}</td>
                  )}
                </tr>
                <tr className="border-t border-slate-200">
                  <td colSpan={veri.tek_amir ? 3 : 4} className="px-2 py-2 text-center">
                    NOT ORTALAMASI (1. ve 2. Amirin Notlarının Ortalaması):{' '}
                    <span className="font-bold tabular-nums">{veri.ortalama ?? '—'}</span>
                    {veri.ortalama != null && (
                      <span className="text-slate-500 ml-2">({band})</span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="puan-bant text-xs text-slate-600">
            Puanlama:{' '}
            {PERF_PUAN_BANDA.map((b, i) => (
              <span key={b.etiket}>
                {i > 0 && ' · '}
                ({veri.ortalama != null && band === b.etiket ? '✓' : ' '}) {b.min}–{b.max} {b.etiket}
              </span>
            ))}
          </div>

          <div className="imza-grid grid gap-4 sm:grid-cols-2 text-sm border-t border-slate-200 pt-4">
            <div>
              <p className="imza-baslik font-semibold mb-2">1. Amir</p>
              <p>Ünvanı: …………………</p>
              <p className="mt-2">Adı ve Soyadı: {veri.amir1_ad ?? '…………………'}</p>
              <p className="mt-4">İmza: …………………</p>
              <p className="mt-2">Tarih: {veri.amir1_tarih ?? '—'}</p>
            </div>
            {!veri.tek_amir && (
              <div>
                <p className="imza-baslik font-semibold mb-2">2. Amir</p>
                <p>Ünvanı: …………………</p>
                <p className="mt-2">Adı ve Soyadı: {veri.amir2_ad ?? '…………………'}</p>
                <p className="mt-4">İmza: …………………</p>
                <p className="mt-2">Tarih: {veri.amir2_tarih ?? '—'}</p>
              </div>
            )}
          </div>

          <div className="print-hide flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={yazdir}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Yazdır
            </button>
            <button
              type="button"
              onClick={onKapat}
              className="intrada-btn intrada-btn-kaydet"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
