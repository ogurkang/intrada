'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ickAktarimOnizleAction, ickAktarimUygula } from '@/app/(dashboard)/ic-kontrol/actions'
import { ICK_BUTON, ICK_BUTON_IKINCIL, ICK_INPUT, ICK_TD, ICK_TH, IckKart, IckUyari } from '@/components/ic-kontrol/IckUi'
import type { IckAktarimOnizleme } from '@/lib/ick/aktarim'
import { ICK_ESLEME_YOK, ICK_TERMIN_TIPI_ETIKET, ickTarihMetni } from '@/lib/ick/tanim'

export default function IckAktarimClient({ planId, mudurlukler }: { planId: number; mudurlukler: { id: number; ad: string }[] }) {
  const router = useRouter()
  const [dosya, setDosya] = useState<File | null>(null)
  const [eslesme, setEslesme] = useState<Record<string, string>>({})
  const [onizleme, setOnizleme] = useState<IckAktarimOnizleme | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [bilgi, setBilgi] = useState<string | null>(null)
  const [mesgul, setMesgul] = useState(false)
  const mudAd = new Map(mudurlukler.map(m => [m.id, m.ad]))

  function form(es: Record<string, string>) {
    const fd = new FormData()
    fd.set('planId', String(planId))
    if (dosya) fd.set('dosya', dosya)
    fd.set('eslesme', JSON.stringify(es))
    return fd
  }

  async function onizle(es = eslesme) {
    if (!dosya || mesgul) return
    setMesgul(true)
    setHata(null)
    setBilgi(null)
    const s = await ickAktarimOnizleAction(form(es))
    setMesgul(false)
    if (s.hata) {
      setHata(s.hata)
      setOnizleme(null)
      return
    }
    setOnizleme(s.onizleme ?? null)
  }

  async function uygula() {
    if (!dosya || mesgul) return
    setMesgul(true)
    setHata(null)
    const s = await ickAktarimUygula(form(eslesme))
    setMesgul(false)
    if (s.hata) {
      setHata(s.hata)
      return
    }
    setBilgi(
      `${s.eylem} eylem ve ${s.gerceklesme} gerçekleşme aktarıldı.${s.kapatilanDonem ? ` ${s.kapatilanDonem} geçmiş izleme dönemi "Tamamlandı" olarak kapatıldı.` : ''}`,
    )
    router.push(`/ic-kontrol/planlar/${planId}`)
    router.refresh()
  }

  function eslesmeDegistir(ad: string, deger: string) {
    const yeni = { ...eslesme, [ad]: deger }
    setEslesme(yeni)
    void onizle(yeni)
  }

  const hataliEylem = onizleme?.eylemler.filter(e => e.hatalar.length) ?? []
  const hataliGs = onizleme?.genelSartlar.filter(e => e.hatalar.length) ?? []
  const hataliGer = onizleme?.gerceklesmeler.filter(e => e.hatalar.length) ?? []

  return (
    <div className="space-y-4">
      <IckKart baslik="1. Dosya">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".xlsx"
            onChange={e => {
              setDosya(e.target.files?.[0] ?? null)
              setOnizleme(null)
            }}
            className="text-sm"
          />
          <button type="button" className={ICK_BUTON} disabled={!dosya || mesgul} onClick={() => onizle()}>
            {mesgul ? 'Okunuyor…' : 'Önizle'}
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Şablonda üç sayfa okunur. <b>GenelSartlar</b>: Genel Şart Kodu, Mevcut Durum, Güvence, Açıklama. <b>Eylemler</b>: Genel Şart Kodu, Eylem Kodu, Öngörülen Eylem, Sorumlu Birim, İşbirliği Yapılacak Birim, Çıktı / Sonuç, Tamamlanma Tarihi, Açıklama. <b>Gerceklesmeler</b> (isteğe bağlı): Eylem Kodu, Yıl, Durum, Gerçekleştirilen Çalışma, Kanıtlayıcı Belge / Çıktı, İzleme Değerlendirmesi, Sonuç.
        </p>
      </IckKart>

      {hata ? <IckUyari tur="hata" metin={hata} /> : null}
      {bilgi ? <IckUyari tur="bilgi" metin={bilgi} /> : null}

      {onizleme ? (
        <>
          <IckKart baslik="2. Özet">
            <ul className="text-sm text-slate-700 space-y-1">
              <li>
                Genel şart değerlendirmesi: {onizleme.genelSartlar.length} (makul güvence:{' '}
                {onizleme.genelSartlar.filter(g => g.guvence === 'makul_guvence').length})
              </li>
              <li>Eylem: {onizleme.eylemler.length}</li>
              <li>Önceki dönem gerçekleşmesi: {onizleme.gerceklesmeler.length} (kesinleşmiş olarak aktarılır)</li>
              <li className={onizleme.hataSayisi ? 'text-red-700 font-medium' : 'text-emerald-700 font-medium'}>
                {onizleme.hataSayisi ? `${onizleme.hataSayisi} hata var. Düzeltmeden aktarım yapılmaz.` : 'Hata yok.'}
              </li>
            </ul>
            {onizleme.genelHatalar.map(h => (
              <p key={h} className="mt-2 text-sm text-red-700">
                {h}
              </p>
            ))}
          </IckKart>

          {onizleme.eslesmeyenAdlar.length ? (
            <IckKart baslik="3. Müdürlük eşleme">
              <p className="mb-3 text-sm text-slate-600">
                Bu adlar müdürlük tanımında birebir bulunamadı. Sorumlu birim için eşleme zorunludur. İşbirliği adını eşlemesiz bırakırsanız ad yalnızca metin olarak kalır.
              </p>
              <div className="space-y-2">
                {onizleme.eslesmeyenAdlar.map(ad => (
                  <div key={ad} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
                    <span className="text-sm text-slate-800">{ad}</span>
                    <select className={ICK_INPUT} value={eslesme[ad] ?? ''} onChange={e => eslesmeDegistir(ad, e.target.value)}>
                      <option value="">Seçin</option>
                      <option value={ICK_ESLEME_YOK}>Eşleme yok (yalnızca metin)</option>
                      {mudurlukler.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.ad}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </IckKart>
          ) : null}

          {hataliGs.length || hataliEylem.length || hataliGer.length ? (
            <IckKart baslik="Hatalı satırlar">
              <ul className="space-y-1 text-sm text-red-700">
                {hataliGs.map(g => (
                  <li key={`g${g.satir}`}>
                    GenelSartlar satır {g.satir} ({g.kod}): {g.hatalar.join(' ')}
                  </li>
                ))}
                {hataliEylem.map(e => (
                  <li key={`e${e.satir}`}>
                    Eylemler satır {e.satir} ({e.kodNorm}): {e.hatalar.join(' ')}
                  </li>
                ))}
                {hataliGer.map(g => (
                  <li key={`r${g.satir}`}>
                    Gerceklesmeler satır {g.satir} ({g.kodNorm}): {g.hatalar.join(' ')}
                  </li>
                ))}
              </ul>
            </IckKart>
          ) : null}

          <IckKart baslik="Eylemler">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className={ICK_TH}>Satır</th>
                    <th className={ICK_TH}>Kod</th>
                    <th className={ICK_TH}>Genel şart</th>
                    <th className={ICK_TH}>Öngörülen eylem</th>
                    <th className={ICK_TH}>Sorumlu</th>
                    <th className={ICK_TH}>İşbirliği</th>
                    <th className={ICK_TH}>Tamamlanma Tarihi</th>
                  </tr>
                </thead>
                <tbody>
                  {onizleme.eylemler.map(e => (
                    <tr key={e.satir} className={`border-b border-slate-100 ${e.hatalar.length ? 'bg-red-50' : ''}`}>
                      <td className={ICK_TD}>{e.satir}</td>
                      <td className={`${ICK_TD} whitespace-nowrap`}>
                        {e.kodNorm}
                        {e.kodNorm !== e.kod ? <span className="block text-xs text-slate-400">{e.kod}</span> : null}
                      </td>
                      <td className={ICK_TD}>{e.genelSartKod}</td>
                      <td className={ICK_TD}>{e.ongorulenEylem}</td>
                      <td className={ICK_TD}>
                        {e.sorumluTur === 'ust_yonetim' ? e.sorumluMetin : e.sorumluMudurlukId ? mudAd.get(e.sorumluMudurlukId) : <span className="text-red-700">{e.sorumluMetin}</span>}
                      </td>
                      <td className={ICK_TD}>
                        {e.isbirligiKapsam === 'tum_mudurlukler' ? 'Tüm müdürlükler' : e.isbirligiKapsam === 'ilgili_mudurlukler' ? 'İlgili müdürlükler' : 'Yok'}
                        {e.isbirligiMudurlukIdleri.length ? (
                          <span className="block text-xs text-slate-500">{e.isbirligiMudurlukIdleri.map(i => mudAd.get(i)).join('; ')}</span>
                        ) : null}
                      </td>
                      <td className={`${ICK_TD} whitespace-nowrap`}>
                        {e.terminMetin}
                        {e.terminTipi ? (
                          <span className="block text-xs text-slate-500">
                            {ICK_TERMIN_TIPI_ETIKET[e.terminTipi]}
                            {e.terminIlk ? ` — ${ickTarihMetni(e.terminIlk)}` : ''}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </IckKart>

          <div className="flex justify-end gap-2">
            <button type="button" className={ICK_BUTON_IKINCIL} onClick={() => router.push(`/ic-kontrol/planlar/${planId}`)}>
              Vazgeç
            </button>
            <button type="button" className={ICK_BUTON} disabled={mesgul || onizleme.hataSayisi > 0} onClick={uygula}>
              Aktar
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
