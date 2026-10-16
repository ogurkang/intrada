'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { GozDetayLink, KalemDuzenleDugmesi, SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import IckEylemFormClient, { type IckGenelSartSecenek } from '@/components/ic-kontrol/IckEylemFormClient'
import {
  ickEylemGecmisi,
  ickGenelSartDegerlendirmeKaydet,
  type IckEylemGecmisSatir,
  type IckEylemGirdi,
} from '@/app/(dashboard)/ic-kontrol/actions'
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
  devirNotu: string
  koordinatorler: string
  islemciler: string
  logSayisi: number
  /** Düzenlenebilirse form başlangıç değeri */
  form: IckEylemGirdi | null
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

export type IckEkSekme = { id: string; ad: string; icerik: ReactNode }

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
  ekSekmeler,
  ilkSekme,
  planBasYil,
  genelSartSecenek,
  mudurlukler,
  gecmisGorur,
}: {
  planId: number
  eylemler: IckPlanEylemSatir[]
  genelSartlar: IckGsSatir[]
  koordinator: boolean
  ekSekmeler: IckEkSekme[]
  ilkSekme?: string
  planBasYil: number
  genelSartSecenek: IckGenelSartSecenek[]
  mudurlukler: { id: number; ad: string }[]
  gecmisGorur: boolean
}) {
  const router = useRouter()
  const sekmeler = [
    { id: 'eylem', ad: `Eylemler (${eylemler.length})` },
    { id: 'gs', ad: `Genel şart değerlendirmesi (${genelSartlar.length})` },
    ...ekSekmeler.map(s => ({ id: s.id, ad: s.ad })),
  ]
  const [sekme, setSekme] = useState<string>(sekmeler.some(s => s.id === ilkSekme) ? (ilkSekme as string) : 'eylem')
  const [bilesen, setBilesen] = useState('')
  const [sorumlu, setSorumlu] = useState('')
  const [durum, setDurum] = useState('')
  const [sadeceGeciken, setSadeceGeciken] = useState(false)
  const [ara, setAra] = useState('')
  const [duzenlenen, setDuzenlenen] = useState<IckGsSatir | null>(null)
  const [gsForm, setGsForm] = useState({ guvence: 'eylem_gerekli' as 'makul_guvence' | 'eylem_gerekli', mevcutDurum: '', aciklama: '' })
  const [hata, setHata] = useState<string | null>(null)
  const [mesgul, setMesgul] = useState(false)
  const [gecmisEylem, setGecmisEylem] = useState<IckPlanEylemSatir | null>(null)
  const [gecmis, setGecmis] = useState<IckEylemGecmisSatir[]>([])
  const [gecmisHata, setGecmisHata] = useState<string | null>(null)
  const [gecmisYukleniyor, setGecmisYukleniyor] = useState(false)

  async function gecmisAc(e: IckPlanEylemSatir) {
    setGecmisEylem(e)
    setGecmis([])
    setGecmisHata(null)
    setGecmisYukleniyor(true)
    const s = await ickEylemGecmisi(e.id)
    setGecmisYukleniyor(false)
    if (s.hata) setGecmisHata(s.hata)
    else setGecmis(s.satirlar ?? [])
  }

  const sorumlular = useMemo(() => [...new Set(eylemler.map(e => e.sorumlu))].sort((a, b) => a.localeCompare(b, 'tr')), [eylemler])
  const filtreli = useMemo(() => {
    const q = trNormalize(ara)
    return eylemler.filter(
      e =>
        (!bilesen || ickKodBilesen(e.kodNorm) === bilesen) &&
        (!sorumlu || e.sorumlu === sorumlu) &&
        (!durum || e.durum === durum) &&
        (!sadeceGeciken || e.gecikti) &&
        (!q || trNormalize(`${e.kodNorm} ${e.ongorulenEylem} ${e.genelSartKod} ${e.koordinatorler} ${e.islemciler}`).includes(q)),
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
        {sekmeler.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setSekme(s.id)
              window.history.replaceState(null, '', s.id === 'eylem' ? window.location.pathname : `${window.location.pathname}?sekme=${s.id}`)
            }}
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
              <input className={ICK_INPUT} value={ara} onChange={e => setAra(e.target.value)} placeholder="Kod, eylem metni veya kişi" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 pb-2">
              <input type="checkbox" checked={sadeceGeciken} onChange={e => setSadeceGeciken(e.target.checked)} />
              Yalnızca gecikenler
            </label>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className={`${ICK_TH} w-20`}>Sıra No</th>
                  <th className={ICK_TH}>Kod</th>
                  <th className={ICK_TH}>Genel şart</th>
                  <th className={ICK_TH}>Öngörülen eylem</th>
                  <th className={ICK_TH}>Sorumlu</th>
                  <th className={ICK_TH}>Tamamlanma Tarihi</th>
                  <th className={ICK_TH}>Durum</th>
                  <th className={ICK_TH}>Son bildirim</th>
                  <th className={`${ICK_TH} text-center w-36`}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filtreli.length === 0 ? (
                  <tr>
                    <td className={ICK_TD} colSpan={9}>
                      Kayıt yok.
                    </td>
                  </tr>
                ) : null}
                {filtreli.map((e, i) => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className={ICK_TD}>{i + 1}</td>
                    <td className={`${ICK_TD} whitespace-nowrap font-medium text-slate-800`}>{e.kodNorm}</td>
                    <td className={ICK_TD}>{e.genelSartKod}</td>
                    <td className={ICK_TD}>
                      {e.ongorulenEylem}
                      {e.devirNotu ? <span className="block text-xs text-violet-700">{e.devirNotu}</span> : null}
                    </td>
                    <td className={ICK_TD}>
                      {e.sorumlu}
                      {e.sorumluMudurlukId != null ? (
                        e.koordinatorler ? (
                          <span className="block text-xs text-slate-500">Koordinatör: {e.koordinatorler}</span>
                        ) : e.durum !== 'iptal' && e.durum !== 'devredildi' ? (
                          <span className="block text-xs text-red-700">Müdürlük koordinatörü seçilmedi</span>
                        ) : null
                      ) : null}
                      {e.islemciler ? <span className="block text-xs text-slate-500">İşlemci: {e.islemciler}</span> : null}
                    </td>
                    <td className={`${ICK_TD} whitespace-nowrap`}>
                      {e.termin}
                      {e.gecikti ? <span className="ml-2 text-xs font-medium text-red-700">Gecikti</span> : null}
                    </td>
                    <td className={ICK_TD}>
                      <IckRozet durum={e.durum} etiket={e.durum === 'devam' ? `Devam %${Math.round(e.ilerleme)}` : ICK_EYLEM_DURUM_ETIKET[e.durum]} />
                    </td>
                    <td className={ICK_TD}>{e.sonAkis ? <IckRozet durum={e.sonAkis} etiket={ICK_AKIS_ETIKET[e.sonAkis]} /> : '—'}</td>
                    <td className={ICK_TD}>
                      <div className="flex items-center justify-center gap-1">
                        {gecmisGorur ? <SaatGecmisDugmesi sayi={e.logSayisi} onClick={() => void gecmisAc(e)} title="Eylem değişiklik geçmişi" /> : null}
                        {e.form ? (
                          <IckEylemFormClient
                            kalem
                            dugmeMetni="Eylemi düzenle"
                            planBasYil={planBasYil}
                            genelSartlar={genelSartSecenek}
                            mudurlukler={mudurlukler}
                            baslangic={e.form}
                          />
                        ) : null}
                        <GozDetayLink href={`/ic-kontrol/eylemler/${e.id}`} title="Eylem detayı ve bildirimler" />
                      </div>
                    </td>
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
                <th className={`${ICK_TH} w-20`}>Sıra No</th>
                <th className={ICK_TH}>Kod</th>
                <th className={ICK_TH}>Genel şart</th>
                <th className={ICK_TH}>Mevcut durum</th>
                <th className={ICK_TH}>Güvence</th>
                <th className={ICK_TH}>Eylemler</th>
                {koordinator ? <th className={`${ICK_TH} text-center w-24`}>İşlemler</th> : null}
              </tr>
            </thead>
            <tbody>
              {genelSartlar.map((g, i) => (
                <tr key={g.genelSartId} className="border-b border-slate-100">
                  <td className={ICK_TD}>{i + 1}</td>
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
                      <div className="flex items-center justify-center gap-1">
                        <KalemDuzenleDugmesi
                          title="Değerlendirmeyi düzenle"
                          onClick={() => {
                            setGsForm({ guvence: g.guvence ?? 'eylem_gerekli', mevcutDurum: g.mevcutDurum, aciklama: g.aciklama })
                            setHata(null)
                            setDuzenlenen(g)
                          }}
                        />
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {ekSekmeler.map(s => (sekme === s.id ? <div key={s.id}>{s.icerik}</div> : null))}

      <Modal
        open={gecmisEylem != null}
        onClose={() => setGecmisEylem(null)}
        title={gecmisEylem ? `${gecmisEylem.kodNorm} — değişiklik geçmişi` : 'Değişiklik geçmişi'}
        size="xl"
      >
        {gecmisHata ? <IckUyari tur="hata" metin={gecmisHata} /> : null}
        {gecmisYukleniyor ? <p className="text-sm text-slate-500">Yükleniyor…</p> : null}
        {!gecmisYukleniyor && !gecmisHata && gecmis.length === 0 ? <p className="text-sm text-slate-500">Kayıt yok.</p> : null}
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
        <p className="mt-3 text-xs text-slate-500">Bildirim ve belge geçmişi eylem detayındadır (göz işareti).</p>
      </Modal>

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
