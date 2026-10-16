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
  const [hata, setHata] = useState<string | null>(null)
  const [bilgi, setBilgi] = useState<string | null>(null)
  const [mesgul, setMesgul] = useState(false)
  const bugun = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date())
  const islemVar = donemler.some(d => d.kapatabilir)

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
              <th className={ICK_TH}>İndir</th>
              {islemVar ? <th className={ICK_TH}>İşlem</th> : null}
            </tr>
          </thead>
          <tbody>
            {donemler.length === 0 ? (
              <tr>
                <td className={ICK_TD} colSpan={6}>
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
                  <td className={`${ICK_TD} whitespace-nowrap`}>
                    {basladi || d.durum === 'kilitli' ? (
                      <>
                        <div className="flex gap-3">
                          {(['docx', 'pdf', 'xlsx'] as const).map(b => (
                            <a key={b} href={`/api/ic-kontrol/rapor/${d.id}?bicim=${b}`} className="text-blue-700 hover:underline">
                              {b === 'docx' ? 'Word' : b === 'pdf' ? 'PDF' : 'Excel'}
                            </a>
                          ))}
                        </div>
                        {d.durum === 'acik' ? <span className="block text-xs text-amber-700">Taslak rapor</span> : null}
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  {islemVar ? (
                    <td className={ICK_TD}>
                      {d.kapatabilir ? (
                        <button
                          type="button"
                          className="text-sm text-blue-700 hover:underline"
                          onClick={() => {
                            setHata(null)
                            setKapat(d)
                          }}
                        >
                          Dönemi kapat
                        </button>
                      ) : null}
                    </td>
                  ) : null}
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
