'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { ickGenelSartDegerlendirmeKaydet } from '@/app/(dashboard)/ic-kontrol/actions'
import { ICK_BUTON, ICK_BUTON_IKINCIL, ICK_ETIKET, ICK_INPUT, ICK_TD, ICK_TH, IckRozet, IckUyari } from '@/components/ic-kontrol/IckUi'
import { trNormalize } from '@/lib/turkce-search'
import {
  ICK_AKIS_ETIKET,
  ICK_BILESEN_SIRA,
  ICK_EYLEM_DURUM_ETIKET,
  ickKodBilesen,
  type IckAkis,
  type IckEylemDurum,
} from '@/lib/ick/tanim'

export type IckPlanEylemSatir = {
  id: number
  kodNorm: string
  genelSartKod: string
  ongorulenEylem: string
  sorumlu: string
  sorumluMudurlukId: number | null
  termin: string
  durum: IckEylemDurum
  ilerleme: number
  gecikti: boolean
  sonAkis: IckAkis | null
}

export type IckGsSatir = {
  genelSartId: number
  kod: string
  metin: string
  standart: string
  guvence: 'makul_guvence' | 'eylem_gerekli' | null
  mevcutDurum: string
  aciklama: string
  eylemKodlari: string[]
}

export default function IckPlanDetayClient({
  planId,
  eylemler,
  genelSartlar,
  koordinator,
}: {
  planId: number
  eylemler: IckPlanEylemSatir[]
  genelSartlar: IckGsSatir[]
  koordinator: boolean
}) {
  const router = useRouter()
  const [sekme, setSekme] = useState<'eylem' | 'gs'>('eylem')
  const [bilesen, setBilesen] = useState('')
  const [sorumlu, setSorumlu] = useState('')
  const [durum, setDurum] = useState('')
  const [sadeceGeciken, setSadeceGeciken] = useState(false)
  const [ara, setAra] = useState('')
  const [duzenlenen, setDuzenlenen] = useState<IckGsSatir | null>(null)
  const [gsForm, setGsForm] = useState({ guvence: 'eylem_gerekli' as 'makul_guvence' | 'eylem_gerekli', mevcutDurum: '', aciklama: '' })
  const [hata, setHata] = useState<string | null>(null)
  const [mesgul, setMesgul] = useState(false)

  const sorumlular = useMemo(() => [...new Set(eylemler.map(e => e.sorumlu))].sort((a, b) => a.localeCompare(b, 'tr')), [eylemler])
  const filtreli = useMemo(() => {
    const q = trNormalize(ara)
    return eylemler.filter(
      e =>
        (!bilesen || ickKodBilesen(e.kodNorm) === bilesen) &&
        (!sorumlu || e.sorumlu === sorumlu) &&
        (!durum || e.durum === durum) &&
        (!sadeceGeciken || e.gecikti) &&
        (!q || trNormalize(`${e.kodNorm} ${e.ongorulenEylem} ${e.genelSartKod}`).includes(q)),
    )
  }, [eylemler, bilesen, sorumlu, durum, sadeceGeciken, ara])

  async function gsKaydet() {
    if (!duzenlenen || mesgul) return
    setMesgul(true)
    setHata(null)
    const s = await ickGenelSartDegerlendirmeKaydet({ planId, genelSartId: duzenlenen.genelSartId, ...gsForm })
    setMesgul(false)
    if (s.hata) {
      setHata(s.hata)
      return
    }
    setDuzenlenen(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {[
          { id: 'eylem' as const, ad: `Eylemler (${eylemler.length})` },
          { id: 'gs' as const, ad: `Genel şart değerlendirmesi (${genelSartlar.length})` },
        ].map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSekme(s.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${sekme === s.id ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-800'}`}
          >
            {s.ad}
          </button>
        ))}
      </div>

      {sekme === 'eylem' ? (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className={ICK_ETIKET}>Bileşen</label>
              <select className={ICK_INPUT} value={bilesen} onChange={e => setBilesen(e.target.value)}>
                <option value="">Tümü</option>
                {ICK_BILESEN_SIRA.map(b => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={ICK_ETIKET}>Sorumlu</label>
              <select className={ICK_INPUT} value={sorumlu} onChange={e => setSorumlu(e.target.value)}>
                <option value="">Tümü</option>
                {sorumlular.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={ICK_ETIKET}>Durum</label>
              <select className={ICK_INPUT} value={durum} onChange={e => setDurum(e.target.value)}>
                <option value="">Tümü</option>
                {(Object.keys(ICK_EYLEM_DURUM_ETIKET) as IckEylemDurum[]).map(d => (
                  <option key={d} value={d}>
                    {ICK_EYLEM_DURUM_ETIKET[d]}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[220px] flex-1">
              <label className={ICK_ETIKET}>Ara</label>
              <input className={ICK_INPUT} value={ara} onChange={e => setAra(e.target.value)} placeholder="Kod veya eylem metni" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 pb-2">
              <input type="checkbox" checked={sadeceGeciken} onChange={e => setSadeceGeciken(e.target.checked)} />
              Yalnızca gecikenler
            </label>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[980px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className={ICK_TH}>Kod</th>
                  <th className={ICK_TH}>Genel şart</th>
                  <th className={ICK_TH}>Öngörülen eylem</th>
                  <th className={ICK_TH}>Sorumlu</th>
                  <th className={ICK_TH}>Termin</th>
                  <th className={ICK_TH}>Durum</th>
                  <th className={ICK_TH}>Son bildirim</th>
                </tr>
              </thead>
              <tbody>
                {filtreli.length === 0 ? (
                  <tr>
                    <td className={ICK_TD} colSpan={7}>
                      Kayıt yok.
                    </td>
                  </tr>
                ) : null}
                {filtreli.map(e => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className={`${ICK_TD} whitespace-nowrap`}>
                      <Link href={`/ic-kontrol/eylemler/${e.id}`} className="font-medium text-blue-700 hover:underline">
                        {e.kodNorm}
                      </Link>
                    </td>
                    <td className={ICK_TD}>{e.genelSartKod}</td>
                    <td className={ICK_TD}>{e.ongorulenEylem}</td>
                    <td className={ICK_TD}>{e.sorumlu}</td>
                    <td className={`${ICK_TD} whitespace-nowrap`}>
                      {e.termin}
                      {e.gecikti ? <span className="ml-2 text-xs font-medium text-red-700">Gecikti</span> : null}
                    </td>
                    <td className={ICK_TD}>
                      <IckRozet durum={e.durum} etiket={e.durum === 'devam' ? `Devam %${Math.round(e.ilerleme)}` : ICK_EYLEM_DURUM_ETIKET[e.durum]} />
                    </td>
                    <td className={ICK_TD}>{e.sonAkis ? <IckRozet durum={e.sonAkis} etiket={ICK_AKIS_ETIKET[e.sonAkis]} /> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {sekme === 'gs' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[980px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className={ICK_TH}>Kod</th>
                <th className={ICK_TH}>Genel şart</th>
                <th className={ICK_TH}>Mevcut durum</th>
                <th className={ICK_TH}>Güvence</th>
                <th className={ICK_TH}>Eylemler</th>
                {koordinator ? <th className={ICK_TH}>İşlem</th> : null}
              </tr>
            </thead>
            <tbody>
              {genelSartlar.map(g => (
                <tr key={g.genelSartId} className="border-b border-slate-100">
                  <td className={`${ICK_TD} font-mono`}>{g.kod}</td>
                  <td className={ICK_TD}>{g.metin}</td>
                  <td className={ICK_TD}>{g.mevcutDurum || '—'}</td>
                  <td className={ICK_TD}>
                    {g.guvence === 'makul_guvence' ? (
                      <IckRozet durum="tamamlandi" etiket="Makul güvence" />
                    ) : g.guvence === 'eylem_gerekli' ? (
                      <IckRozet durum="devam" etiket="Eylem gerekli" />
                    ) : (
                      <IckRozet durum="iade" etiket="Değerlendirilmedi" />
                    )}
                    {g.guvence === 'eylem_gerekli' && g.eylemKodlari.length === 0 ? (
                      <p className="mt-1 text-xs text-red-700">Eylem bağlanmamış.</p>
                    ) : null}
                  </td>
                  <td className={`${ICK_TD} whitespace-nowrap`}>{g.eylemKodlari.join(', ') || '—'}</td>
                  {koordinator ? (
                    <td className={ICK_TD}>
                      <button
                        type="button"
                        className="text-sm text-blue-700 hover:underline"
                        onClick={() => {
                          setGsForm({ guvence: g.guvence ?? 'eylem_gerekli', mevcutDurum: g.mevcutDurum, aciklama: g.aciklama })
                          setHata(null)
                          setDuzenlenen(g)
                        }}
                      >
                        Düzenle
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Modal open={duzenlenen != null} onClose={() => setDuzenlenen(null)} title={`Genel şart ${duzenlenen?.kod ?? ''}`} size="xl">
        <div className="space-y-3">
          {hata ? <IckUyari tur="hata" metin={hata} /> : null}
          <p className="text-sm text-slate-600">{duzenlenen?.metin}</p>
          <div>
            <label className={ICK_ETIKET}>Mevcut durum</label>
            <textarea rows={4} className={ICK_INPUT} value={gsForm.mevcutDurum} onChange={e => setGsForm({ ...gsForm, mevcutDurum: e.target.value })} />
          </div>
          <div>
            <label className={ICK_ETIKET}>Güvence</label>
            <select
              className={ICK_INPUT}
              value={gsForm.guvence}
              onChange={e => setGsForm({ ...gsForm, guvence: e.target.value as 'makul_guvence' | 'eylem_gerekli' })}
            >
              <option value="eylem_gerekli">Eylem gerekli</option>
              <option value="makul_guvence">Makul güvence (eylem öngörülmedi)</option>
            </select>
          </div>
          <div>
            <label className={ICK_ETIKET}>Açıklama</label>
            <input className={ICK_INPUT} value={gsForm.aciklama} onChange={e => setGsForm({ ...gsForm, aciklama: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className={ICK_BUTON_IKINCIL} onClick={() => setDuzenlenen(null)}>
              Vazgeç
            </button>
            <button type="button" className={ICK_BUTON} disabled={mesgul} onClick={gsKaydet}>
              Kaydet
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
