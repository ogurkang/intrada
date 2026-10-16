'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { GozDetayLink, SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import IckPlanFormClient, { type IckPlanFormDeger } from '@/components/ic-kontrol/IckPlanFormClient'
import { ICK_TD, ICK_TH, IckRozet, IckUyari } from '@/components/ic-kontrol/IckUi'
import { ickPlanGecmisi, type IckPlanGecmisSatir } from '@/app/(dashboard)/ic-kontrol/actions'
import { ICK_PLAN_DURUM_ETIKET, type IckPlanDurum } from '@/lib/ick/tanim'

export type IckPlanListeSatir = {
  id: number
  sira: number
  ad: string
  kapsamMetni: string
  basYil: number
  bitYil: number
  durum: string
  eylem: number
  tamam: number
  logSayisi: number
  koordinatorler: string
  duzenlenir: boolean
  form: IckPlanFormDeger
}

function zaman(iso: string): string {
  const t = new Date(iso)
  if (Number.isNaN(t.getTime())) return '—'
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(t)
}

export default function IckPlanListeClient({
  satirlar,
  mudurlukler,
  gecmisGorur,
}: {
  satirlar: IckPlanListeSatir[]
  mudurlukler: { id: number; ad: string }[]
  gecmisGorur: boolean
}) {
  const [gecmisPlan, setGecmisPlan] = useState<IckPlanListeSatir | null>(null)
  const [gecmis, setGecmis] = useState<IckPlanGecmisSatir[]>([])
  const [gecmisHata, setGecmisHata] = useState<string | null>(null)
  const [yukleniyor, setYukleniyor] = useState(false)

  async function gecmisAc(p: IckPlanListeSatir) {
    setGecmisPlan(p)
    setGecmis([])
    setGecmisHata(null)
    setYukleniyor(true)
    const s = await ickPlanGecmisi(p.id)
    setYukleniyor(false)
    if (s.hata) setGecmisHata(s.hata)
    else setGecmis(s.satirlar ?? [])
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[860px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className={`${ICK_TH} w-20`}>Sıra No</th>
              <th className={ICK_TH}>Plan</th>
              <th className={ICK_TH}>Kapsam</th>
              <th className={ICK_TH}>Koordinatörler</th>
              <th className={ICK_TH}>Dönem</th>
              <th className={ICK_TH}>Durum</th>
              <th className={ICK_TH}>Eylem</th>
              <th className={ICK_TH}>Tamamlanan</th>
              <th className={`${ICK_TH} text-center w-36`}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {satirlar.length === 0 ? (
              <tr>
                <td className={ICK_TD} colSpan={9}>
                  Plan yok.
                </td>
              </tr>
            ) : null}
            {satirlar.map(p => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className={ICK_TD}>{p.sira}</td>
                <td className={`${ICK_TD} font-medium text-slate-800`}>{p.ad}</td>
                <td className={ICK_TD}>{p.kapsamMetni}</td>
                <td className={ICK_TD}>{p.koordinatorler || <span className="text-red-700">Seçilmedi</span>}</td>
                <td className={ICK_TD}>
                  {p.basYil}–{p.bitYil}
                </td>
                <td className={ICK_TD}>
                  <IckRozet
                    durum={p.durum === 'yururlukte' ? 'devam' : p.durum === 'tamamlandi' ? 'tamamlandi' : 'taslak'}
                    etiket={ICK_PLAN_DURUM_ETIKET[p.durum as IckPlanDurum] ?? p.durum}
                  />
                </td>
                <td className={ICK_TD}>{p.eylem}</td>
                <td className={ICK_TD}>
                  {p.tamam} {p.eylem ? `(%${Math.round((p.tamam / p.eylem) * 100)})` : ''}
                </td>
                <td className={ICK_TD}>
                  <div className="flex items-center justify-center gap-1">
                    {p.duzenlenir ? <IckPlanFormClient kalem dugmeMetni="Planı düzenle" mudurlukler={mudurlukler} baslangic={p.form} /> : null}
                    {gecmisGorur ? <SaatGecmisDugmesi sayi={p.logSayisi} onClick={() => void gecmisAc(p)} title="Oluşturma ve düzenleme geçmişi" /> : null}
                    <GozDetayLink href={`/ic-kontrol/planlar/${p.id}`} title="Plan detayı" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={gecmisPlan != null} onClose={() => setGecmisPlan(null)} title={gecmisPlan ? `${gecmisPlan.ad} — geçmiş` : 'Geçmiş'} size="xl">
        {gecmisHata ? <IckUyari tur="hata" metin={gecmisHata} /> : null}
        {yukleniyor ? <p className="text-sm text-slate-500">Yükleniyor…</p> : null}
        {!yukleniyor && !gecmisHata && gecmis.length === 0 ? <p className="text-sm text-slate-500">Kayıt yok.</p> : null}
        {gecmis.length > 0 ? (
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0">
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className={ICK_TH}>Tarih/Saat</th>
                  <th className={ICK_TH}>İşlem</th>
                  <th className={ICK_TH}>Değişen</th>
                  <th className={ICK_TH}>İşlemi Yapan</th>
                </tr>
              </thead>
              <tbody>
                {gecmis.map(g => (
                  <tr key={g.id} className="border-b border-slate-100 align-top">
                    <td className={`${ICK_TD} whitespace-nowrap`}>{zaman(g.zaman)}</td>
                    <td className={ICK_TD}>{g.ne}</td>
                    <td className={ICK_TD}>
                      {g.degisen.length ? (
                        <ul className="space-y-0.5">
                          {g.degisen.map(d => (
                            <li key={d}>{d}</li>
                          ))}
                        </ul>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={ICK_TD}>{g.kim}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Modal>
    </>
  )
}
