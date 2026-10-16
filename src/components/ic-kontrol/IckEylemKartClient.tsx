'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import {
  ickBelgePasif,
  ickBelgeYuklemeBaslat,
  ickBelgeYuklemeTamamla,
  ickEylemIptal,
  ickGerceklesmeGonder,
  ickGerceklesmeKarar,
  ickGerceklesmeKaydet,
  ickGerceklesmeSil,
} from '@/app/(dashboard)/ic-kontrol/actions'
import { ickBelgeStorageYukle } from '@/lib/ick/belge-yukle'
import { ICK_BUTON, ICK_BUTON_IKINCIL, ICK_BUTON_TEHLIKE, ICK_ETIKET, ICK_INPUT, IckKart, IckRozet, IckUyari } from '@/components/ic-kontrol/IckUi'
import {
  ICK_AKIS_ETIKET,
  ICK_EYLEM_DURUM_ETIKET,
  ICK_KANIT_ETIKET,
  type IckAkis,
  type IckBeyanDurum,
  type IckEylemDurum,
  type IckKanitYeterlilik,
} from '@/lib/ick/tanim'

export type IckGerceklesmeSatir = {
  id: number
  eylem_id: number
  donem_yili: number | null
  beyan_durum: IckBeyanDurum
  beyan_ilerleme: number
  calisma: string
  kanit_aciklama: string
  akis: IckAkis
  olusturan_id: string | null
  olusturan_ad: string
  gonderen_id: string | null
  gonderen_ad: string
  gonderim_at: string | null
  karar_veren_ad: string
  karar_at: string | null
  iade_gerekcesi: string
  kanit_yeterlilik: IckKanitYeterlilik | null
  istisna_gerekcesi: string
  degerlendirme: string
  sonuc: string
  kaynak: 'sistem' | 'aktarim'
  created_at: string
}

export type IckBelgeVersiyon = {
  id: number
  belge_id: number
  versiyon: number
  dosya_adi: string
  boyut_byte: number | null
  sha256: string
  yukleyen_ad: string
  created_at: string
}

export type IckBelgeSatir = {
  id: number
  belge_turu_id: number
  tur: string
  eylem_id: number | null
  gerceklesme_id: number | null
  baslik: string
  aktif: boolean
  pasif_gerekce: string
  created_by: string | null
  created_by_ad: string
  created_at: string
  versiyonlar: IckBelgeVersiyon[]
}

export type IckGecmisSatir = { id: number; zaman: string; kim: string; ne: string; degisen: string[] }

function zaman(v: string | null): string {
  if (!v) return ''
  return new Date(v).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short' })
}

function boyut(b: number | null): string {
  if (!b) return ''
  return b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`
}

type Bildirim = { id?: number; donemYili: number | null; beyanDurum: IckBeyanDurum; beyanIlerleme: number; calisma: string; kanitAciklama: string }
type Karar = {
  id: number
  karar: 'kesinlesti' | 'iade'
  kanitYeterlilik: IckKanitYeterlilik | ''
  degerlendirme: string
  sonuc: string
  iadeGerekcesi: string
  istisnaGerekcesi: string
}

export default function IckEylemKartClient(p: {
  eylemId: number
  eylemDurum: IckEylemDurum
  tekrarlayan: boolean
  planYillari: [number, number]
  gerceklesmeler: IckGerceklesmeSatir[]
  belgeler: IckBelgeSatir[]
  belgeTurleri: { id: number; ad: string }[]
  gecmis: IckGecmisSatir[]
  gecmisGorur: boolean
  yetki: { userId: string; koordinator: boolean; birimYetkili: boolean }
}) {
  const router = useRouter()
  const [hata, setHata] = useState<string | null>(null)
  const [mesgul, setMesgul] = useState(false)
  const [bildirim, setBildirim] = useState<Bildirim | null>(null)
  const [karar, setKarar] = useState<Karar | null>(null)
  const [yukleme, setYukleme] = useState<{ gerceklesmeId?: number; belgeId?: number; baslik: string; turId: string; dosya: File | null } | null>(null)
  const [pasif, setPasif] = useState<{ id: number; gerekce: string } | null>(null)
  const [iptal, setIptal] = useState<string | null>(null)

  const acik = p.gerceklesmeler.find(g => g.akis !== 'kesinlesti')
  const yilSecenek: number[] = []
  for (let y = p.planYillari[0]; y <= p.planYillari[1]; y++) yilSecenek.push(y)
  const yeniBildirimOlur = p.yetki.birimYetkili && !acik && p.eylemDurum !== 'iptal'

  async function calistir(is: () => Promise<{ hata?: string }>, kapat?: () => void) {
    if (mesgul) return
    setMesgul(true)
    setHata(null)
    const s = await is()
    setMesgul(false)
    if (s.hata) {
      setHata(s.hata)
      return
    }
    kapat?.()
    router.refresh()
  }

  function belgelerOf(gid: number) {
    return p.belgeler.filter(b => b.gerceklesme_id === gid)
  }

  function belgeListe(liste: IckBelgeSatir[], yuklenebilir: boolean) {
    if (!liste.length) return <p className="text-sm text-slate-500">Belge yok.</p>
    return (
      <ul className="space-y-2">
        {liste.map(b => (
          <li key={b.id} className={`rounded-lg border px-3 py-2 text-sm ${b.aktif ? 'border-slate-200' : 'border-slate-200 bg-slate-50 opacity-70'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-medium text-slate-800">{b.baslik}</span>
                <span className="ml-2 text-xs text-slate-500">{b.tur}</span>
                {!b.aktif ? <span className="ml-2 text-xs text-red-700">Pasif: {b.pasif_gerekce}</span> : null}
              </div>
              <div className="flex gap-3">
                {b.aktif && yuklenebilir && (p.yetki.koordinator || b.created_by === p.yetki.userId) ? (
                  <>
                    <button type="button" className="text-blue-700 hover:underline" onClick={() => setYukleme({ belgeId: b.id, baslik: b.baslik, turId: String(b.belge_turu_id), dosya: null })}>
                      Yeni sürüm
                    </button>
                    <button type="button" className="text-red-700 hover:underline" onClick={() => setPasif({ id: b.id, gerekce: '' })}>
                      Pasife al
                    </button>
                  </>
                ) : null}
              </div>
            </div>
            <ul className="mt-1 space-y-0.5">
              {b.versiyonlar.map(v => (
                <li key={v.id} className="text-xs text-slate-600">
                  <a href={`/api/ic-kontrol/belge/${v.id}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
                    v{v.versiyon} — {v.dosya_adi}
                  </a>{' '}
                  {boyut(v.boyut_byte)} · {v.yukleyen_ad} · {zaman(v.created_at)} · SHA-256 {v.sha256.slice(0, 12)}…
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="space-y-6">
      {hata ? <IckUyari tur="hata" metin={hata} /> : null}

      <IckKart
        baslik="Gerçekleşme bildirimleri"
        sag={
          <div className="flex gap-2">
            {yeniBildirimOlur ? (
              <button
                type="button"
                className={ICK_BUTON}
                onClick={() =>
                  setBildirim({
                    donemYili: p.tekrarlayan ? new Date().getFullYear() : null,
                    beyanDurum: 'devam',
                    beyanIlerleme: 50,
                    calisma: '',
                    kanitAciklama: '',
                  })
                }
              >
                Bildirim gir
              </button>
            ) : null}
            {p.yetki.koordinator && p.eylemDurum !== 'iptal' ? (
              <button type="button" className={ICK_BUTON_IKINCIL} onClick={() => setIptal('')}>
                Eylemi iptal et
              </button>
            ) : null}
          </div>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          Birim bildirimi taslak olarak girer, kanıt yükler ve incelemeye gönderir. Koordinatör kanıtı değerlendirir; kesinleştirir veya gerekçeyle iade eder. Kendi girdiğiniz veya gönderdiğiniz bildirime karar veremezsiniz. Kesinleşen bildirim değişmez; durum değişikliği yeni bildirimle yapılır. Tamamlandı bildirimi için en az bir kanıt belgesi gerekir.
        </p>
        {!p.yetki.birimYetkili && !p.yetki.koordinator ? (
          <p className="mb-3 text-sm text-slate-500">Bu eylemin sorumlu müdürlüğünde rolünüz olmadığı için bildirim giremezsiniz.</p>
        ) : null}
        {p.gerceklesmeler.length === 0 ? <p className="text-sm text-slate-500">Bildirim yok.</p> : null}
        <div className="space-y-4">
          {p.gerceklesmeler.map(g => {
            const benim = g.olusturan_id === p.yetki.userId
            const duzenlenir = benim && (g.akis === 'taslak' || g.akis === 'iade')
            const kararVerir = p.yetki.koordinator && g.akis === 'incelemede' && !benim && g.gonderen_id !== p.yetki.userId
            const gb = belgelerOf(g.id)
            return (
              <div key={g.id} className="rounded-lg border border-slate-200 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <IckRozet durum={g.akis} etiket={ICK_AKIS_ETIKET[g.akis]} />
                  <IckRozet
                    durum={g.beyan_durum}
                    etiket={g.beyan_durum === 'devam' ? `Devam %${Math.round(Number(g.beyan_ilerleme))}` : ICK_EYLEM_DURUM_ETIKET[g.beyan_durum]}
                  />
                  {g.donem_yili ? <span className="text-xs text-slate-500">{g.donem_yili} yılı</span> : null}
                  {g.kaynak === 'aktarim' ? <span className="text-xs text-slate-500">Aktarım</span> : null}
                  <span className="text-xs text-slate-500">
                    {g.olusturan_ad} · {zaman(g.created_at)}
                  </span>
                </div>
                <div className="text-sm space-y-2">
                  <div>
                    <p className="text-slate-500">Gerçekleştirilen çalışma</p>
                    <p className="text-slate-800 whitespace-pre-wrap">{g.calisma}</p>
                  </div>
                  {g.kanit_aciklama ? (
                    <div>
                      <p className="text-slate-500">Kanıtlayıcı belge / çıktı</p>
                      <p className="text-slate-800 whitespace-pre-wrap">{g.kanit_aciklama}</p>
                    </div>
                  ) : null}
                  {g.akis === 'iade' ? <IckUyari tur="hata" metin={`İade gerekçesi: ${g.iade_gerekcesi}`} /> : null}
                  {g.gonderim_at ? (
                    <p className="text-xs text-slate-500">
                      Gönderen: {g.gonderen_ad} · {zaman(g.gonderim_at)}
                    </p>
                  ) : null}
                  {g.akis === 'kesinlesti' ? (
                    <div className="rounded-lg bg-slate-50 p-3 space-y-1">
                      <p className="text-xs text-slate-500">
                        Kesinleştiren: {g.karar_veren_ad} · {zaman(g.karar_at)}
                        {g.kanit_yeterlilik ? ` · Kanıt: ${ICK_KANIT_ETIKET[g.kanit_yeterlilik]}` : ''}
                      </p>
                      {g.degerlendirme ? (
                        <p>
                          <span className="text-slate-500">İzleme değerlendirmesi: </span>
                          {g.degerlendirme}
                        </p>
                      ) : null}
                      {g.sonuc ? (
                        <p>
                          <span className="text-slate-500">Sonuç: </span>
                          {g.sonuc}
                        </p>
                      ) : null}
                      {g.istisna_gerekcesi ? <p className="text-xs text-amber-800">İstisna: {g.istisna_gerekcesi}</p> : null}
                    </div>
                  ) : null}
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">Kanıt belgeleri</p>
                    {duzenlenir || (p.yetki.koordinator && g.akis !== 'kesinlesti') ? (
                      <button type="button" className="text-sm text-blue-700 hover:underline" onClick={() => setYukleme({ gerceklesmeId: g.id, baslik: '', turId: '', dosya: null })}>
                        Belge yükle
                      </button>
                    ) : null}
                  </div>
                  {belgeListe(gb, g.akis !== 'kesinlesti')}
                </div>
                <div className="flex flex-wrap gap-2">
                  {duzenlenir ? (
                    <>
                      <button
                        type="button"
                        className={ICK_BUTON_IKINCIL}
                        onClick={() =>
                          setBildirim({
                            id: g.id,
                            donemYili: g.donem_yili,
                            beyanDurum: g.beyan_durum,
                            beyanIlerleme: Number(g.beyan_ilerleme),
                            calisma: g.calisma,
                            kanitAciklama: g.kanit_aciklama,
                          })
                        }
                      >
                        Düzenle
                      </button>
                      <button type="button" className={ICK_BUTON} disabled={mesgul} onClick={() => calistir(() => ickGerceklesmeGonder(g.id))}>
                        İncelemeye gönder
                      </button>
                      {g.akis === 'taslak' ? (
                        <button type="button" className={ICK_BUTON_TEHLIKE} disabled={mesgul} onClick={() => calistir(() => ickGerceklesmeSil(g.id))}>
                          Taslağı sil
                        </button>
                      ) : null}
                    </>
                  ) : null}
                  {kararVerir ? (
                    <>
                      <button
                        type="button"
                        className={ICK_BUTON}
                        onClick={() =>
                          setKarar({
                            id: g.id,
                            karar: 'kesinlesti',
                            kanitYeterlilik: gb.some(b => b.aktif) ? 'yeterli' : '',
                            degerlendirme: '',
                            sonuc: '',
                            iadeGerekcesi: '',
                            istisnaGerekcesi: '',
                          })
                        }
                      >
                        Karar ver
                      </button>
                    </>
                  ) : null}
                  {p.yetki.koordinator && g.akis === 'incelemede' && !kararVerir ? (
                    <p className="text-xs text-slate-500">Bu bildirimi siz girdiniz veya gönderdiniz; kararı başka bir koordinatör verir.</p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </IckKart>

      <IckKart
        baslik="Eylem belgeleri"
        sag={
          p.yetki.birimYetkili ? (
            <button type="button" className="text-sm text-blue-700 hover:underline" onClick={() => setYukleme({ baslik: '', turId: '', dosya: null })}>
              Belge yükle
            </button>
          ) : null
        }
      >
        <p className="mb-3 text-sm text-slate-600">Belirli bir bildirime bağlı olmayan belgeler (prosedür, şablon, kurul kararı vb.).</p>
        {belgeListe(p.belgeler.filter(b => b.eylem_id === p.eylemId), p.yetki.birimYetkili)}
      </IckKart>

      {p.gecmisGorur ? (
        <IckKart baslik="Değişiklik geçmişi">
          {p.gecmis.length === 0 ? <p className="text-sm text-slate-500">Kayıt yok.</p> : null}
          <ul className="space-y-2">
            {p.gecmis.map(g => (
              <li key={g.id} className="text-sm">
                <span className="text-slate-500">{zaman(g.zaman)}</span> · <span className="text-slate-800">{g.kim}</span> · {g.ne}
                {g.degisen.length ? (
                  <ul className="ml-4 list-disc text-xs text-slate-600">
                    {g.degisen.map((d, i) => (
                      <li key={i}>{d.length > 240 ? `${d.slice(0, 240)}…` : d}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </IckKart>
      ) : null}

      <Modal open={bildirim != null} onClose={() => setBildirim(null)} title={bildirim?.id ? 'Bildirimi düzenle' : 'Gerçekleşme bildirimi'} size="xl">
        {bildirim ? (
          <div className="space-y-3">
            {hata ? <IckUyari tur="hata" metin={hata} /> : null}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {p.tekrarlayan ? (
                <div>
                  <label className={ICK_ETIKET}>Yıl</label>
                  <select className={ICK_INPUT} value={bildirim.donemYili ?? ''} onChange={e => setBildirim({ ...bildirim, donemYili: Number(e.target.value) })}>
                    {yilSecenek.map(y => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div>
                <label className={ICK_ETIKET}>Durum</label>
                <select
                  className={ICK_INPUT}
                  value={bildirim.beyanDurum}
                  onChange={e => setBildirim({ ...bildirim, beyanDurum: e.target.value as IckBeyanDurum })}
                >
                  <option value="baslanmadi">Başlanmadı</option>
                  <option value="devam">Devam ediyor</option>
                  <option value="tamamlandi">Tamamlandı</option>
                </select>
              </div>
              {bildirim.beyanDurum === 'devam' ? (
                <div>
                  <label className={ICK_ETIKET}>İlerleme (%)</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    className={ICK_INPUT}
                    value={bildirim.beyanIlerleme}
                    onChange={e => setBildirim({ ...bildirim, beyanIlerleme: Number(e.target.value) })}
                  />
                </div>
              ) : null}
            </div>
            <div>
              <label className={ICK_ETIKET}>Gerçekleştirilen çalışma</label>
              <textarea rows={5} className={ICK_INPUT} value={bildirim.calisma} onChange={e => setBildirim({ ...bildirim, calisma: e.target.value })} />
            </div>
            <div>
              <label className={ICK_ETIKET}>Kanıtlayıcı belge / çıktı açıklaması</label>
              <textarea rows={2} className={ICK_INPUT} value={bildirim.kanitAciklama} onChange={e => setBildirim({ ...bildirim, kanitAciklama: e.target.value })} />
            </div>
            <p className="text-xs text-slate-500">Kayıt taslak olarak açılır. Belgeleri yükledikten sonra incelemeye gönderin.</p>
            <div className="flex justify-end gap-2">
              <button type="button" className={ICK_BUTON_IKINCIL} onClick={() => setBildirim(null)}>
                Vazgeç
              </button>
              <button
                type="button"
                className={ICK_BUTON}
                disabled={mesgul}
                onClick={() => calistir(() => ickGerceklesmeKaydet({ ...bildirim, eylemId: p.eylemId }), () => setBildirim(null))}
              >
                Taslağı kaydet
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={karar != null} onClose={() => setKarar(null)} title="Koordinatör kararı" size="xl">
        {karar ? (
          <div className="space-y-3">
            {hata ? <IckUyari tur="hata" metin={hata} /> : null}
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" checked={karar.karar === 'kesinlesti'} onChange={() => setKarar({ ...karar, karar: 'kesinlesti' })} />
                Kesinleştir
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={karar.karar === 'iade'} onChange={() => setKarar({ ...karar, karar: 'iade' })} />
                İade et
              </label>
            </div>
            {karar.karar === 'iade' ? (
              <div>
                <label className={ICK_ETIKET}>İade gerekçesi</label>
                <textarea rows={3} className={ICK_INPUT} value={karar.iadeGerekcesi} onChange={e => setKarar({ ...karar, iadeGerekcesi: e.target.value })} />
              </div>
            ) : (
              <>
                <div>
                  <label className={ICK_ETIKET}>Kanıt yeterliliği</label>
                  <select
                    className={ICK_INPUT}
                    value={karar.kanitYeterlilik}
                    onChange={e => setKarar({ ...karar, kanitYeterlilik: e.target.value as IckKanitYeterlilik | '' })}
                  >
                    <option value="">Seçin</option>
                    {(Object.keys(ICK_KANIT_ETIKET) as IckKanitYeterlilik[]).map(k => (
                      <option key={k} value={k}>
                        {ICK_KANIT_ETIKET[k]}
                      </option>
                    ))}
                  </select>
                </div>
                {karar.kanitYeterlilik && karar.kanitYeterlilik !== 'yeterli' ? (
                  <div>
                    <label className={ICK_ETIKET}>İstisna gerekçesi (tamamlandı bildirimi kanıt yeterli değilken kesinleşecekse zorunlu)</label>
                    <textarea rows={2} className={ICK_INPUT} value={karar.istisnaGerekcesi} onChange={e => setKarar({ ...karar, istisnaGerekcesi: e.target.value })} />
                  </div>
                ) : null}
                <div>
                  <label className={ICK_ETIKET}>İzleme değerlendirmesi</label>
                  <textarea rows={3} className={ICK_INPUT} value={karar.degerlendirme} onChange={e => setKarar({ ...karar, degerlendirme: e.target.value })} />
                </div>
                <div>
                  <label className={ICK_ETIKET}>Sonuç</label>
                  <textarea rows={2} className={ICK_INPUT} value={karar.sonuc} onChange={e => setKarar({ ...karar, sonuc: e.target.value })} />
                </div>
              </>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className={ICK_BUTON_IKINCIL} onClick={() => setKarar(null)}>
                Vazgeç
              </button>
              <button
                type="button"
                className={karar.karar === 'iade' ? ICK_BUTON_TEHLIKE : ICK_BUTON}
                disabled={mesgul}
                onClick={() =>
                  calistir(
                    () =>
                      ickGerceklesmeKarar({
                        id: karar.id,
                        karar: karar.karar,
                        kanitYeterlilik: karar.kanitYeterlilik || null,
                        degerlendirme: karar.degerlendirme,
                        sonuc: karar.sonuc,
                        iadeGerekcesi: karar.iadeGerekcesi,
                        istisnaGerekcesi: karar.istisnaGerekcesi,
                      }),
                    () => setKarar(null),
                  )
                }
              >
                {karar.karar === 'iade' ? 'İade et' : 'Kesinleştir'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={yukleme != null} onClose={() => setYukleme(null)} title={yukleme?.belgeId ? 'Yeni sürüm yükle' : 'Belge yükle'} size="lg">
        {yukleme ? (
          <div className="space-y-3">
            {hata ? <IckUyari tur="hata" metin={hata} /> : null}
            {!yukleme.belgeId ? (
              <>
                <div>
                  <label className={ICK_ETIKET}>Belge türü</label>
                  <select className={ICK_INPUT} value={yukleme.turId} onChange={e => setYukleme({ ...yukleme, turId: e.target.value })}>
                    <option value="">Seçin</option>
                    {p.belgeTurleri.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.ad}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={ICK_ETIKET}>Başlık</label>
                  <input className={ICK_INPUT} value={yukleme.baslik} onChange={e => setYukleme({ ...yukleme, baslik: e.target.value })} />
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-600">{yukleme.baslik} için yeni sürüm. Eski sürümler saklanır.</p>
            )}
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              className="text-sm"
              onChange={e => setYukleme({ ...yukleme, dosya: e.target.files?.[0] ?? null })}
            />
            <p className="text-xs text-slate-500">PDF, Word, Excel, PNG veya JPEG; en fazla 20 MB. Belge silinmez, gerekçeyle pasife alınır.</p>
            <div className="flex justify-end gap-2">
              <button type="button" className={ICK_BUTON_IKINCIL} onClick={() => setYukleme(null)}>
                Vazgeç
              </button>
              <button
                type="button"
                className={ICK_BUTON}
                disabled={mesgul || !yukleme.dosya}
                onClick={() => {
                  const dosya = yukleme.dosya
                  if (!dosya) return
                  void calistir(async () => {
                    const bas = await ickBelgeYuklemeBaslat({
                      belgeId: yukleme.belgeId,
                      gerceklesmeId: yukleme.gerceklesmeId,
                      eylemId: yukleme.gerceklesmeId ? undefined : p.eylemId,
                      baslik: yukleme.baslik,
                      belgeTuruId: Number(yukleme.turId || 0),
                      dosyaAdi: dosya.name,
                      boyut: dosya.size,
                    })
                    if (bas.hata || !bas.path || !bas.token || !bas.belgeId) return { hata: bas.hata ?? 'Yükleme başlatılamadı.' }
                    const yHata = await ickBelgeStorageYukle(bas.path, bas.token, dosya)
                    if (yHata) return { hata: `Dosya yüklenemedi: ${yHata}` }
                    return ickBelgeYuklemeTamamla({ belgeId: bas.belgeId, path: bas.path, dosyaAdi: dosya.name, mime: dosya.type })
                  }, () => setYukleme(null))
                }}
              >
                {mesgul ? 'Yükleniyor…' : 'Yükle'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={pasif != null} onClose={() => setPasif(null)} title="Belgeyi pasife al">
        {pasif ? (
          <div className="space-y-3">
            <textarea rows={3} className={ICK_INPUT} placeholder="Gerekçe" value={pasif.gerekce} onChange={e => setPasif({ ...pasif, gerekce: e.target.value })} />
            <div className="flex justify-end gap-2">
              <button type="button" className={ICK_BUTON_IKINCIL} onClick={() => setPasif(null)}>
                Vazgeç
              </button>
              <button type="button" className={ICK_BUTON_TEHLIKE} disabled={mesgul} onClick={() => calistir(() => ickBelgePasif(pasif.id, pasif.gerekce), () => setPasif(null))}>
                Pasife al
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={iptal != null} onClose={() => setIptal(null)} title="Eylemi iptal et">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">İptal edilen eylem izleme raporunda iptal olarak görünür ve gerçekleşme oranına girmez. Gerekçe geçmişe yazılır.</p>
          <textarea rows={3} className={ICK_INPUT} placeholder="Gerekçe (kurul kararı, revizyon vb.)" value={iptal ?? ''} onChange={e => setIptal(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button type="button" className={ICK_BUTON_IKINCIL} onClick={() => setIptal(null)}>
              Vazgeç
            </button>
            <button type="button" className={ICK_BUTON_TEHLIKE} disabled={mesgul} onClick={() => calistir(() => ickEylemIptal(p.eylemId, iptal ?? ''), () => setIptal(null))}>
              İptal et
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
