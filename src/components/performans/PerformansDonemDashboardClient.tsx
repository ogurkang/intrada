'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'
import { performansDegerlendirmeSifirla } from '@/app/(dashboard)/performans/actions'
import { donemIlerlemeOzet } from '@/lib/performans-istatistik'
import type { MudurlukSatir } from '@/lib/performans-istatistik'
import { performansPuanBandi } from '@/lib/performans'

export type PersonelSatir = {
  siraNo: number
  id: number
  sicil_no: string
  ad_soyad: string
  kadro_unvani: string | null
  gorev_unvani: string | null
  puan_amir1: number | null
  puan_amir2: number | null
  tek_amir: boolean
  durum: string
}

export type DonemBilgi = {
  id: number
  sira_no: string | null
  donem_adi: string | null
  yil: number
  durum: string
  baslangic_tarihi: string
  bitis_tarihi: string
}

function IlerlemeKart({
  baslik,
  yuzde,
  alt,
}: {
  baslik: string
  yuzde: number
  alt: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-600">{baslik}</p>
      <p className="text-3xl font-bold text-slate-800 tabular-nums mt-1">%{yuzde}</p>
      <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full bg-indigo-600 rounded-full transition-all"
          style={{ width: `${Math.min(100, yuzde)}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-2">{alt}</p>
    </div>
  )
}

function tarih(t: string) {
  return new Date(t).toLocaleDateString('tr-TR')
}

export default function PerformansDonemDashboardClient({
  donem,
  ilerleme,
  mudurlukler,
  personeller,
  seciliMudurluk,
  isAdmin,
}: {
  donem: DonemBilgi
  ilerleme: ReturnType<typeof donemIlerlemeOzet>
  mudurlukler: MudurlukSatir[]
  personeller: PersonelSatir[]
  seciliMudurluk: string | null
  isAdmin: boolean
}) {
  const router = useRouter()
  const personelGorunumu = Boolean(seciliMudurluk)
  const [sifirlaHedef, setSifirlaHedef] = useState<PersonelSatir | null>(null)
  const [sifirlaHata, setSifirlaHata] = useState<string | null>(null)
  const [sifirlaPending, startSifirla] = useTransition()

  const sifirlaYapilabilir = isAdmin && donem.durum !== 'Yayınlandı'

  function sifirlaOnayla() {
    if (!sifirlaHedef) return
    setSifirlaHata(null)
    startSifirla(async () => {
      const res = await performansDegerlendirmeSifirla(sifirlaHedef.id)
      if (res.hata) {
        setSifirlaHata(res.hata)
        return
      }
      setSifirlaHedef(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/performans/degerlendirme"
          className="text-sm text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 mb-2"
        >
          ← Değerlendirme dönemleri
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">
          {donem.donem_adi ?? `${donem.yil} Dönemi`}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          {donem.sira_no ? `${donem.sira_no} · ` : ''}
          {tarih(donem.baslangic_tarihi)} – {tarih(donem.bitis_tarihi)} · {donem.durum}
        </p>
      </div>

      {!personelGorunumu && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <IlerlemeKart
              baslik="1. Amir Değerlendirme Gerçekleşme"
              yuzde={ilerleme.amir1Yuzde}
              alt={`${ilerleme.amir1Tamam} / ${ilerleme.amir1Toplam} personel`}
            />
            <IlerlemeKart
              baslik="2. Amir Değerlendirme Gerçekleşme"
              yuzde={ilerleme.amir2Yuzde}
              alt={`${ilerleme.amir2Tamam} / ${ilerleme.amir2Toplam} personel (tek amir hariç)`}
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold w-20">Sıra No</th>
                  <th className="px-4 py-3 font-semibold">Müdürlük Adı</th>
                  <th className="px-4 py-3 font-semibold text-center w-32">Personel Sayısı</th>
                  <th className="px-4 py-3 font-semibold text-center w-48">Değerlendirme Tamamlanma Oranı</th>
                </tr>
              </thead>
              <tbody>
                {mudurlukler.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                      Bu dönemde personel kaydı yok.
                    </td>
                  </tr>
                ) : (
                  mudurlukler.map(m => (
                    <tr
                      key={m.mudurlukAdi}
                      className="border-t border-slate-100 hover:bg-indigo-50/50 cursor-pointer transition-colors"
                      onClick={() =>
                        router.push(
                          `/performans/degerlendirme/${donem.id}?mudurluk=${encodeURIComponent(m.mudurlukAdi)}`,
                        )
                      }
                    >
                      <td className="px-4 py-3 text-slate-500 tabular-nums">{m.siraNo}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{m.mudurlukAdi}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{m.personelSayisi}</td>
                      <td className="px-4 py-3 text-center font-semibold tabular-nums">%{m.tamamlanmaYuzde}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {personelGorunumu && seciliMudurluk && (
        <>
          <div>
            <button
              type="button"
              onClick={() => router.push(`/performans/degerlendirme/${donem.id}`)}
              className="text-sm text-sky-700 hover:underline"
            >
              ← Müdürlük listesine dön
            </button>
            <h2 className="text-lg font-semibold text-slate-800 mt-1">{seciliMudurluk}</h2>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold w-16">Sıra No</th>
                  <th className="px-4 py-3 font-semibold w-24">Sicil No</th>
                  <th className="px-4 py-3 font-semibold">Adı Soyadı</th>
                  <th className="px-4 py-3 font-semibold">Kadro Unvanı</th>
                  <th className="px-4 py-3 font-semibold">Görev Unvanı</th>
                  <th className="px-4 py-3 font-semibold text-center w-28">1. Amir Puanı</th>
                  <th className="px-4 py-3 font-semibold text-center w-28">2. Amir Puanı</th>
                  {isAdmin && <th className="px-4 py-3 font-semibold text-right w-56">Değerlendirme</th>}
                </tr>
              </thead>
              <tbody>
                {personeller.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="px-4 py-10 text-center text-slate-400">
                      Bu müdürlükte personel kaydı yok.
                    </td>
                  </tr>
                ) : (
                  personeller.map(p => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-500 tabular-nums">{p.siraNo}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums">{p.sicil_no}</td>
                      <td className="px-4 py-3">{p.ad_soyad}</td>
                      <td className="px-4 py-3 text-slate-600">{p.kadro_unvani ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{p.gorev_unvani ?? '—'}</td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        {p.puan_amir1 != null ? (
                          <>
                            {p.puan_amir1}
                            <span className="text-xs text-slate-400 ml-1">({performansPuanBandi(p.puan_amir1)})</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        {p.tek_amir ? (
                          <span className="text-xs text-slate-400">Tek amir</span>
                        ) : p.puan_amir2 != null ? (
                          <>
                            {p.puan_amir2}
                            <span className="text-xs text-slate-400 ml-1">({performansPuanBandi(p.puan_amir2)})</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <Link
                              href={`/performans/degerlendirme/kayit/${p.id}?rol=amir1&donem=${donem.id}&mudurluk=${encodeURIComponent(seciliMudurluk)}&vekalet=1`}
                              className="rounded-lg bg-slate-800 text-white px-2.5 py-1 text-xs font-medium hover:bg-slate-700"
                            >
                              1. Amir
                            </Link>
                            {!p.tek_amir && (
                              <Link
                                href={`/performans/degerlendirme/kayit/${p.id}?rol=amir2&donem=${donem.id}&mudurluk=${encodeURIComponent(seciliMudurluk)}&vekalet=1`}
                                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-50"
                              >
                                2. Amir
                              </Link>
                            )}
                            {sifirlaYapilabilir && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSifirlaHata(null)
                                  setSifirlaHedef(p)
                                }}
                                className="rounded-lg border border-red-200 text-red-700 px-2.5 py-1 text-xs font-medium hover:bg-red-50"
                              >
                                Sıfırla
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        open={sifirlaHedef != null}
        onClose={() => {
          if (!sifirlaPending) {
            setSifirlaHedef(null)
            setSifirlaHata(null)
          }
        }}
        title="Değerlendirme Sıfırlama"
        size="sm"
      >
        {sifirlaHedef && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              {sifirlaHedef.sicil_no} sicil numaralı {sifirlaHedef.ad_soyad}&apos;in performans değerlendirmesini
              sıfırlayacaksınız. Onaylıyor musunuz?
            </p>
            {sifirlaHata && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{sifirlaHata}</p>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                disabled={sifirlaPending}
                onClick={() => {
                  setSifirlaHedef(null)
                  setSifirlaHata(null)
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Hayır
              </button>
              <button
                type="button"
                disabled={sifirlaPending}
                onClick={sifirlaOnayla}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {sifirlaPending ? 'Sıfırlanıyor…' : 'Evet'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
