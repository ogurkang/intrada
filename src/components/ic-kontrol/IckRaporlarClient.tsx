'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { ickDonemKilitle } from '@/app/(dashboard)/ic-kontrol/actions'
import { ICK_BUTON, ICK_BUTON_IKINCIL, ICK_TD, ICK_TH, IckRozet, IckUyari } from '@/components/ic-kontrol/IckUi'
import { ickDonemBaslik, ickTarihMetni } from '@/lib/ick/tanim'

export type IckDonemSatir = {
  id: number
  plan_id: number
  planAd: string
  yil: number
  yari: number
  siklik: number
  bas: string
  bit: string
  durum: 'acik' | 'kilitli'
  kilit_at: string | null
  kilitleyen: string
  kapatabilir: boolean
}

export default function IckRaporlarClient({ donemler, planGoster }: { donemler: IckDonemSatir[]; planGoster: boolean }) {
  const router = useRouter()
  const [kapat, setKapat] = useState<IckDonemSatir | null>(null)
  const [indirAcik, setIndirAcik] = useState<number | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [bilgi, setBilgi] = useState<string | null>(null)
  const [mesgul, setMesgul] = useState(false)
  const bugun = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date())
  async function kapatOnay() {
    if (!kapat || mesgul) return
    setMesgul(true)
    setHata(null)
    const s = await ickDonemKilitle(kapat.id)
    setMesgul(false)
    if (s.hata) {
      setHata(s.hata)
      return
    }
    setKapat(null)
    setBilgi(`Dönem kapatıldı; ${s.adet} satır dönem görüntüsüne yazıldı.`)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {hata && !kapat ? <IckUyari tur="hata" metin={hata} /> : null}
      {bilgi ? <IckUyari tur="bilgi" metin={bilgi} /> : null}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {planGoster ? <th className={ICK_TH}>Plan</th> : null}
              <th className={ICK_TH}>Rapor</th>
              <th className={ICK_TH}>Tarih aralığı</th>
              <th className={ICK_TH}>Durum</th>
              <th className={`${ICK_TH} text-center w-40`}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {donemler.length === 0 ? (
              <tr>
                <td className={ICK_TD} colSpan={planGoster ? 5 : 4}>
                  İzleme dönemi yok. Dönemler plan kaydedildiğinde oluşur.
                </td>
              </tr>
            ) : null}
            {donemler.map(d => {
              const basladi = d.bas <= bugun
              return (
                <tr key={d.id} className="border-b border-slate-100">
                  {planGoster ? <td className={ICK_TD}>{d.planAd}</td> : null}
                  <td className={ICK_TD}>{ickDonemBaslik(d.yil, d.yari, d.siklik)}</td>
                  <td className={`${ICK_TD} whitespace-nowrap`}>
                    {ickTarihMetni(d.bas)} – {ickTarihMetni(d.bit)}
                  </td>
                  <td className={ICK_TD}>
                    {d.durum === 'kilitli' ? (
                      <>
                        <IckRozet durum="tamamlandi" etiket="Tamamlandı" />
                        <span className="block text-xs text-slate-500">
                          {[d.kilitleyen, d.kilit_at ? new Date(d.kilit_at).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '']
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </>
                    ) : d.bit < bugun ? (
                      <IckRozet durum="iade" etiket="Bitti, kapatılmadı" />
                    ) : basladi ? (
                      <IckRozet durum="incelemede" etiket="Sürüyor" />
                    ) : (
                      <IckRozet durum="taslak" etiket="Başlamadı" />
                    )}
                  </td>
                  <td className={ICK_TD}>
                    <div className="flex items-center justify-center gap-1">
                      {basladi || d.durum === 'kilitli' ? (
                        <div className="relative">
                          <button
                            type="button"
                            title="İndir"
                            aria-label="İndir"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-emerald-600 hover:bg-emerald-50"
                            onClick={() => setIndirAcik(indirAcik === d.id ? null : d.id)}
                          >
                            <IndirSvg />
                          </button>
                          {indirAcik === d.id ? (
                            <div className="absolute right-0 z-20 mt-1 w-32 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                              {(
                                [
                                  ['docx', 'Word'],
                                  ['pdf', 'PDF'],
                                  ['xlsx', 'Excel'],
                                ] as const
                              ).map(([bicim, ad]) => (
                                <a
                                  key={bicim}
                                  href={`/api/ic-kontrol/rapor/${d.id}?bicim=${bicim}`}
                                  className="block px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                                  onClick={() => setIndirAcik(null)}
                                >
                                  {ad}
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      {d.kapatabilir ? (
                        <button
                          type="button"
                          title="Kapat"
                          aria-label="Dönemi kapat"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setHata(null)
                            setKapat(d)
                          }}
                        >
                          <KapatSvg />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal open={kapat != null} onClose={() => setKapat(null)} title="Dönemi kapat">
        <div className="space-y-3">
          {hata ? <IckUyari tur="hata" metin={hata} /> : null}
          <p className="text-sm text-slate-600">
            {kapat ? ickDonemBaslik(kapat.yil, kapat.yari, kapat.siklik) : ''}. Kapanışta her eylemin kesinleşmiş durumu, çalışma metni, değerlendirmesi ve belge sayısı dönem
            görüntüsüne yazılır; dönem &quot;Tamamlandı&quot; olur. Rapor bundan sonra bu görüntüden üretilir ve değişmez. Kapanış geri alınmaz.
          </p>
          <p className="text-sm text-slate-600">İncelemede bekleyen bildirimler görüntüye girmez. Kapatmadan önce İnceleme sekmesini boşaltın.</p>
          <div className="flex justify-end gap-2">
            <button type="button" className={ICK_BUTON_IKINCIL} onClick={() => setKapat(null)}>
              Vazgeç
            </button>
            <button type="button" className={ICK_BUTON} disabled={mesgul} onClick={kapatOnay}>
              Dönemi kapat
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function IndirSvg() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 10l5 5 5-5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V3" />
    </svg>
  )
}

function KapatSvg() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  )
}
