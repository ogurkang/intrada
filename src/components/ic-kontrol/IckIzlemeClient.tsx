'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { ickDonemKilitle, ickDonemOlustur } from '@/app/(dashboard)/ic-kontrol/actions'
import { ICK_BUTON, ICK_BUTON_IKINCIL, ICK_ETIKET, ICK_INPUT, ICK_TD, ICK_TH, IckRozet, IckUyari } from '@/components/ic-kontrol/IckUi'
import { ickTarihMetni } from '@/lib/ick/tanim'

export type IckDonemSatir = {
  id: number
  plan_id: number
  planAd: string
  yil: number
  yari: 1 | 2
  bas: string
  bit: string
  durum: 'acik' | 'kilitli'
  kilit_at: string | null
  kilitleyen: string
}

export default function IckIzlemeClient({
  donemler,
  planlar,
  koordinator,
}: {
  donemler: IckDonemSatir[]
  planlar: { id: number; ad: string; bas_yil: number; bit_yil: number }[]
  koordinator: boolean
}) {
  const router = useRouter()
  const yil = new Date().getFullYear()
  const [form, setForm] = useState<{ acik: boolean; planId: number; yil: number; yari: 1 | 2; bas: string; bit: string } | null>(null)
  const [kilit, setKilit] = useState<IckDonemSatir | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [bilgi, setBilgi] = useState<string | null>(null)
  const [mesgul, setMesgul] = useState(false)

  function varsayilan(y: number, yari: 1 | 2) {
    return yari === 1 ? { bas: `${y}-01-01`, bit: `${y}-06-30` } : { bas: `${y}-07-01`, bit: `${y}-12-31` }
  }

  async function olustur() {
    if (!form || mesgul) return
    setMesgul(true)
    setHata(null)
    const s = await ickDonemOlustur(form)
    setMesgul(false)
    if (s.hata) {
      setHata(s.hata)
      return
    }
    setForm(null)
    router.refresh()
  }

  async function kilitle() {
    if (!kilit || mesgul) return
    setMesgul(true)
    setHata(null)
    const s = await ickDonemKilitle(kilit.id)
    setMesgul(false)
    if (s.hata) {
      setHata(s.hata)
      return
    }
    setKilit(null)
    setBilgi(`${s.adet} eylemin durumu dönem görüntüsüne yazıldı.`)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {koordinator && planlar.length ? (
        <div>
          <button
            type="button"
            className={ICK_BUTON}
            onClick={() => {
              setHata(null)
              setForm({ acik: true, planId: planlar[0].id, yil, yari: 2, ...varsayilan(yil, 2) })
            }}
          >
            Dönem aç
          </button>
        </div>
      ) : null}
      {hata && !form && !kilit ? <IckUyari tur="hata" metin={hata} /> : null}
      {bilgi ? <IckUyari tur="bilgi" metin={bilgi} /> : null}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className={ICK_TH}>Plan</th>
              <th className={ICK_TH}>Dönem</th>
              <th className={ICK_TH}>Tarih aralığı</th>
              <th className={ICK_TH}>Durum</th>
              <th className={ICK_TH}>Rapor</th>
              {koordinator ? <th className={ICK_TH}>İşlem</th> : null}
            </tr>
          </thead>
          <tbody>
            {donemler.length === 0 ? (
              <tr>
                <td className={ICK_TD} colSpan={6}>
                  İzleme dönemi yok.
                </td>
              </tr>
            ) : null}
            {donemler.map(d => (
              <tr key={d.id} className="border-b border-slate-100">
                <td className={ICK_TD}>{d.planAd}</td>
                <td className={`${ICK_TD} whitespace-nowrap`}>
                  {d.yil} / {d.yari === 1 ? 'I. altı ay' : 'II. altı ay'}
                </td>
                <td className={`${ICK_TD} whitespace-nowrap`}>
                  {ickTarihMetni(d.bas)} – {ickTarihMetni(d.bit)}
                </td>
                <td className={ICK_TD}>
                  {d.durum === 'kilitli' ? (
                    <>
                      <IckRozet durum="kesinlesti" etiket="Kilitli" />
                      <span className="block text-xs text-slate-500">
                        {d.kilitleyen} · {d.kilit_at ? new Date(d.kilit_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short' }) : ''}
                      </span>
                    </>
                  ) : (
                    <IckRozet durum="incelemede" etiket="Açık" />
                  )}
                </td>
                <td className={`${ICK_TD} whitespace-nowrap`}>
                  <div className="flex gap-3">
                    {(['docx', 'pdf', 'xlsx'] as const).map(b => (
                      <a key={b} href={`/api/ic-kontrol/rapor/${d.id}?bicim=${b}`} className="text-blue-700 hover:underline">
                        {b === 'docx' ? 'Word' : b === 'pdf' ? 'PDF' : 'Excel'}
                      </a>
                    ))}
                  </div>
                  {d.durum === 'acik' ? <span className="block text-xs text-amber-700">Taslak rapor</span> : null}
                </td>
                {koordinator ? (
                  <td className={ICK_TD}>
                    {d.durum === 'acik' ? (
                      <button type="button" className="text-sm text-blue-700 hover:underline" onClick={() => setKilit(d)}>
                        Kilitle
                      </button>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={form != null} onClose={() => setForm(null)} title="İzleme dönemi aç" size="lg">
        {form ? (
          <div className="space-y-3">
            {hata ? <IckUyari tur="hata" metin={hata} /> : null}
            <div>
              <label className={ICK_ETIKET}>Plan</label>
              <select className={ICK_INPUT} value={form.planId} onChange={e => setForm({ ...form, planId: Number(e.target.value) })}>
                {planlar.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.ad}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={ICK_ETIKET}>Yıl</label>
                <input
                  type="number"
                  className={ICK_INPUT}
                  value={form.yil}
                  onChange={e => {
                    const y = Number(e.target.value)
                    setForm({ ...form, yil: y, ...varsayilan(y, form.yari) })
                  }}
                />
              </div>
              <div>
                <label className={ICK_ETIKET}>Altı aylık dönem</label>
                <select
                  className={ICK_INPUT}
                  value={form.yari}
                  onChange={e => {
                    const yari = Number(e.target.value) as 1 | 2
                    setForm({ ...form, yari, ...varsayilan(form.yil, yari) })
                  }}
                >
                  <option value={1}>I. altı ay (haziran sonu)</option>
                  <option value={2}>II. altı ay (aralık sonu)</option>
                </select>
              </div>
              <div>
                <label className={ICK_ETIKET}>Başlangıç</label>
                <input type="date" className={ICK_INPUT} value={form.bas} onChange={e => setForm({ ...form, bas: e.target.value })} />
              </div>
              <div>
                <label className={ICK_ETIKET}>Bitiş</label>
                <input type="date" className={ICK_INPUT} value={form.bit} onChange={e => setForm({ ...form, bit: e.target.value })} />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Önceki altı aylık rapor hazırlanmadıysa başlangıcı yılın başına çekin; dönem kapsamı bu aralığa göre hesaplanır.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className={ICK_BUTON_IKINCIL} onClick={() => setForm(null)}>
                Vazgeç
              </button>
              <button type="button" className={ICK_BUTON} disabled={mesgul} onClick={olustur}>
                Aç
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={kilit != null} onClose={() => setKilit(null)} title="Dönemi kilitle">
        <div className="space-y-3">
          {hata ? <IckUyari tur="hata" metin={hata} /> : null}
          <p className="text-sm text-slate-600">
            {kilit?.planAd} — {kilit?.yil} / {kilit?.yari === 1 ? 'I' : 'II'}. Kilit anında her eylemin kesinleşmiş durumu, çalışma metni, değerlendirmesi ve belge sayısı dönem görüntüsüne yazılır. Kilitten sonra rapor bu görüntüden üretilir ve değişmez. Kilit geri alınmaz.
          </p>
          <p className="text-sm text-slate-600">İncelemede bekleyen bildirimler görüntüye girmez. Kilitlemeden önce İnceleme ekranını boşaltın.</p>
          <div className="flex justify-end gap-2">
            <button type="button" className={ICK_BUTON_IKINCIL} onClick={() => setKilit(null)}>
              Vazgeç
            </button>
            <button type="button" className={ICK_BUTON} disabled={mesgul} onClick={kilitle}>
              Kilitle
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
