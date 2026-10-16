import { GozDetayLink } from '@/components/ui/TabloIslemIkonlari'
import IckRaporlarClient, { type IckDonemSatir } from '@/components/ic-kontrol/IckRaporlarClient'
import { ICK_TD, ICK_TH, IckKart, IckRozet, IckUyari } from '@/components/ic-kontrol/IckUi'
import { ickHataMetni, ickPlanKoordinatoru, type IckDb, type IckYetki } from '@/lib/ick/erisim'
import { ICK_AKIS_ETIKET, ICK_EYLEM_DURUM_ETIKET, ickBugun, ickGecikti, ickKodSiralama, ickTerminGoster, type IckAkis, type IckBeyanDurum } from '@/lib/ick/tanim'
import { ICK_EYLEM_KOLON, ickEylemKisileri, ickKullaniciAdlari, ickSorumluAdi, type IckEylemKayit } from '@/lib/ick/yukle'

// ---------------------------------------------------------------------------
// İş Kutum: kullanıcının müdürlüğüne düşen eylemler
// ---------------------------------------------------------------------------
export async function IckIsKutusuBolum({ db, yetki, planId, mudAd }: { db: IckDb; yetki: IckYetki; planId: number; mudAd: Map<number, string> }) {
  const planKoord = ickPlanKoordinatoru(yetki, planId)
  const eylemR = await db.from('ick_eylem').select(ICK_EYLEM_KOLON).eq('plan_id', planId)
  const tum = (eylemR.data as IckEylemKayit[] | null) ?? []
  const eylemler = tum
    .filter(e => (e.sorumlu_tur === 'ust_yonetim' ? planKoord : yetki.eylemRolleri[e.id] != null))
    .filter(e => e.durum !== 'devredildi')
    .sort((a, b) => ickKodSiralama(a.kod_norm, b.kod_norm))
  if (!eylemler.length && !planKoord) {
    return <IckUyari tur="bilgi" metin="Bu planda size düşen eylem yok. İş Kutum, eylemde müdürlük koordinatörü veya işlemcisi seçilen kişiler içindir." />
  }
  const ids = eylemler.map(e => e.id)
  const { data: gHam } = ids.length
    ? await db.from('ick_gerceklesme').select('id, eylem_id, akis, iade_gerekcesi, created_at').in('eylem_id', ids).order('created_at', { ascending: false })
    : { data: [] }
  const son = new Map<number, { akis: IckAkis; iade_gerekcesi: string }>()
  for (const g of (gHam as { eylem_id: number; akis: IckAkis; iade_gerekcesi: string }[] | null) ?? []) {
    if (!son.has(g.eylem_id)) son.set(g.eylem_id, g)
  }
  const bugun = ickBugun()
  const otuzGunTarih = new Date(`${bugun}T00:00:00Z`)
  otuzGunTarih.setUTCDate(otuzGunTarih.getUTCDate() + 30)
  const otuzGun = otuzGunTarih.toISOString().slice(0, 10)

  const iade = eylemler.filter(e => son.get(e.id)?.akis === 'iade')
  const taslak = eylemler.filter(e => son.get(e.id)?.akis === 'taslak')
  const incelemede = eylemler.filter(e => son.get(e.id)?.akis === 'incelemede')
  const geciken = eylemler.filter(e => ickGecikti(e, bugun) && !['taslak', 'incelemede', 'iade'].includes(son.get(e.id)?.akis ?? ''))
  const yaklasan = eylemler.filter(
    e => e.termin_tipi === 'tek' && e.termin_guncel && e.termin_guncel >= bugun && e.termin_guncel <= otuzGun && !['tamamlandi', 'iptal'].includes(e.durum),
  )
  const kisiler = await ickEylemKisileri(db, ids)
  const koordinatorsuz = eylemler.filter(
    e => e.sorumlu_tur === 'mudurluk' && e.durum !== 'iptal' && !(kisiler.get(e.id)?.koordinatorler ?? []).length,
  )
  const gonderebilir = planKoord || eylemler.some(e => yetki.eylemRolleri[e.id] === 'mudurluk_koordinatoru')
  const kendiMudurlukler = [...new Set(eylemler.map(e => e.sorumlu_mudurluk_id).filter((m): m is number => m != null))]

  function tablo(liste: IckEylemKayit[], bos: string, ekKolon?: (e: IckEylemKayit) => React.ReactNode) {
    if (!liste.length) return <p className="text-sm text-slate-500">{bos}</p>
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[860px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className={`${ICK_TH} w-20`}>Sıra No</th>
              <th className={ICK_TH}>Kod</th>
              <th className={ICK_TH}>Öngörülen eylem</th>
              <th className={ICK_TH}>Sorumlu</th>
              <th className={ICK_TH}>Tamamlanma Tarihi</th>
              <th className={ICK_TH}>Durum</th>
              {ekKolon ? <th className={ICK_TH}>Not</th> : null}
              <th className={`${ICK_TH} text-center w-24`}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {liste.map((e, i) => {
              const s = son.get(e.id)
              const rol = yetki.eylemRolleri[e.id]
              return (
                <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className={ICK_TD}>{i + 1}</td>
                  <td className={`${ICK_TD} whitespace-nowrap font-medium text-slate-800`}>
                    {e.kod_norm}
                    {rol ? <span className="block text-xs font-normal text-slate-500">{rol === 'mudurluk_koordinatoru' ? 'Rolünüz: müdürlük koordinatörü' : 'Rolünüz: işlemci'}</span> : null}
                  </td>
                  <td className={ICK_TD}>
                    {e.ongorulen_eylem}
                    {e.onceki_eylem_id ? <span className="block text-xs text-violet-700">{e.devir_notu || 'Önceki eylem planından'}</span> : null}
                  </td>
                  <td className={ICK_TD}>{ickSorumluAdi(e, mudAd)}</td>
                  <td className={`${ICK_TD} whitespace-nowrap`}>{ickTerminGoster(e)}</td>
                  <td className={ICK_TD}>
                    <IckRozet durum={e.durum} etiket={ICK_EYLEM_DURUM_ETIKET[e.durum]} />
                    {s ? (
                      <span className="ml-1">
                        <IckRozet durum={s.akis} etiket={ICK_AKIS_ETIKET[s.akis]} />
                      </span>
                    ) : null}
                  </td>
                  {ekKolon ? <td className={ICK_TD}>{ekKolon(e)}</td> : null}
                  <td className={ICK_TD}>
                    <div className="flex items-center justify-center gap-1">
                      <GozDetayLink href={`/ic-kontrol/eylemler/${e.id}`} title="Eylem detayı ve bildirimler" />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-slate-600">
        {planKoord
          ? 'Üst yönetim eylemleri bu planın koordinatörlerine düşer; bildirimi bir koordinatör girer, başka bir koordinatör karara bağlar.'
          : `Size seçildiğiniz eylemler düşer (${kendiMudurlukler.map(b => mudAd.get(b)).join(', ')}). Bildirim eylem kartından girilir.`}{' '}
        {gonderebilir
          ? 'Müdürlük koordinatörü olduğunuz eylemlerde taslağı koordinatöre siz gönderirsiniz; işlemci olduğunuz eylemlerde taslağı kaydedersiniz.'
          : 'Taslağı siz kaydedersiniz; koordinatöre eylemin müdürlük koordinatörü gönderir.'}
      </p>
      {koordinatorsuz.length ? (
        <IckUyari
          metin={`Müdürlük koordinatörü seçilmediği için bildirimi gönderilemeyen eylem: ${koordinatorsuz.map(e => e.kod_norm).join(', ')}. Seçim plandaki eylem listesinde kalem işaretiyle yapılır.`}
        />
      ) : null}
      {eylemR.error ? <IckUyari tur="hata" metin={ickHataMetni(eylemR.error.message)} /> : null}
      <IckKart baslik={`İade edilen bildirimler (${iade.length})`}>
        {tablo(iade, 'İade edilen bildirim yok.', e => <span className="text-red-700">{son.get(e.id)?.iade_gerekcesi}</span>)}
      </IckKart>
      <IckKart baslik={`Gönderilmemiş taslaklar (${taslak.length})`}>{tablo(taslak, 'Taslak yok.')}</IckKart>
      <IckKart baslik={`Tamamlanma tarihi geçen eylemler (${geciken.length})`}>{tablo(geciken, 'Tamamlanma tarihi geçen eylem yok.')}</IckKart>
      <IckKart baslik={`30 gün içinde tamamlanma tarihi gelen eylemler (${yaklasan.length})`}>{tablo(yaklasan, 'Yaklaşan tamamlanma tarihi yok.')}</IckKart>
      <IckKart baslik={`İncelemede (${incelemede.length})`}>{tablo(incelemede, 'İncelemede bildirim yok.')}</IckKart>
      <IckKart baslik={`Tüm eylemler (${eylemler.length})`}>{tablo(eylemler, 'Size düşen eylem yok.')}</IckKart>
    </div>
  )
}

// ---------------------------------------------------------------------------
// İnceleme: koordinatöre gönderilen bildirimler
// ---------------------------------------------------------------------------
type IncelemeSatir = {
  id: number
  eylem_id: number
  beyan_durum: IckBeyanDurum
  beyan_ilerleme: number
  donem_yili: number | null
  olusturan_id: string | null
  olusturan_ad: string
  gonderen_id: string | null
  gonderen_ad: string
  gonderim_at: string | null
  vekaleten?: boolean
}

export async function IckIncelemeBolum({ db, yetki, planId, mudAd }: { db: IckDb; yetki: IckYetki; planId: number; mudAd: Map<number, string> }) {
  const { data: eHam } = await db.from('ick_eylem').select(ICK_EYLEM_KOLON).eq('plan_id', planId)
  const eylemler = new Map(((eHam as IckEylemKayit[] | null) ?? []).map(e => [Number(e.id), e]))
  const ids = [...eylemler.keys()]
  const { data, error } = ids.length
    ? await db
        .from('ick_gerceklesme')
        .select('id, eylem_id, beyan_durum, beyan_ilerleme, donem_yili, olusturan_id, olusturan_ad, gonderen_id, gonderen_ad, gonderim_at, vekaleten')
        .eq('akis', 'incelemede')
        .in('eylem_id', ids)
        .order('gonderim_at', { ascending: true })
    : { data: [], error: null }
  const satirlar = (data as IncelemeSatir[] | null) ?? []
  const gonderenAdlari = await ickKullaniciAdlari(
    db,
    satirlar.flatMap(s => [s.gonderen_id, s.olusturan_id].filter((x): x is string => Boolean(x))),
  )
  const planKoord = ickPlanKoordinatoru(yetki, planId)

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-slate-600">
        Müdürlük koordinatörlerinin gönderdiği bildirimler, gönderim sırasıyla. Karar eylem kartında verilir. Kendi girdiğiniz veya gönderdiğiniz bildirime karar veremezsiniz.
        {planKoord ? '' : ' Karar yetkisi bu planın iç kontrol koordinatörlerindedir; bu listeyi yalnızca okursunuz.'}
      </p>
      {error ? <IckUyari tur="hata" metin={ickHataMetni(error.message)} /> : null}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className={`${ICK_TH} w-20`}>Sıra No</th>
              <th className={ICK_TH}>Kod</th>
              <th className={ICK_TH}>Öngörülen eylem</th>
              <th className={ICK_TH}>Sorumlu</th>
              <th className={ICK_TH}>Bildirilen</th>
              <th className={ICK_TH}>Gönderen</th>
              <th className={ICK_TH}>Gönderim</th>
              <th className={`${ICK_TH} text-center w-24`}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {satirlar.length === 0 ? (
              <tr>
                <td className={ICK_TD} colSpan={8}>
                  İncelemede bildirim yok.
                </td>
              </tr>
            ) : null}
            {satirlar.map((s, i) => {
              const e = eylemler.get(Number(s.eylem_id))
              const kendi = s.olusturan_id === yetki.userId || s.gonderen_id === yetki.userId
              return (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className={ICK_TD}>{i + 1}</td>
                  <td className={`${ICK_TD} whitespace-nowrap font-medium text-slate-800`}>
                    {e?.kod_norm}
                    {s.donem_yili ? <span className="block text-xs font-normal text-slate-400">{s.donem_yili}</span> : null}
                  </td>
                  <td className={ICK_TD}>{e?.ongorulen_eylem}</td>
                  <td className={ICK_TD}>{e ? ickSorumluAdi(e, mudAd) : ''}</td>
                  <td className={ICK_TD}>
                    <IckRozet
                      durum={s.beyan_durum}
                      etiket={s.beyan_durum === 'devam' ? `Devam %${Math.round(Number(s.beyan_ilerleme))}` : ICK_EYLEM_DURUM_ETIKET[s.beyan_durum]}
                    />
                  </td>
                  <td className={ICK_TD}>
                    {(s.gonderen_id && gonderenAdlari.get(s.gonderen_id)) || (s.olusturan_id && gonderenAdlari.get(s.olusturan_id)) || 'Ad soyad yok'}
                    {s.vekaleten ? (
                      <span className="block text-xs text-amber-700">Müdürlük adına girildi</span>
                    ) : kendi ? (
                      <span className="block text-xs text-amber-700">Sizin kaydınız</span>
                    ) : null}
                  </td>
                  <td className={`${ICK_TD} whitespace-nowrap`}>
                    {s.gonderim_at ? new Date(s.gonderim_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short' }) : ''}
                  </td>
                  <td className={ICK_TD}>
                    <div className="flex items-center justify-center gap-1">
                      <GozDetayLink href={`/ic-kontrol/eylemler/${s.eylem_id}`} title={planKoord ? 'Eylem detayı ve karar' : 'Eylem detayı'} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Raporlar: plandan otomatik oluşan izleme dönemleri
// ---------------------------------------------------------------------------
export async function IckRaporlarBolum({ db, yetki, planId }: { db: IckDb; yetki: IckYetki; planId?: number }) {
  let sorgu = db
    .from('ick_izleme_donemi')
    .select('id, plan_id, yil, yari, siklik, bas, bit, durum, kilit_at, kilitleyen_id, ick_plan!plan_id(ad)')
    .order('bas', { ascending: false })
  if (planId) sorgu = sorgu.eq('plan_id', planId)
  const { data, error } = await sorgu
  type Ham = Omit<IckDonemSatir, 'planAd' | 'kilitleyen' | 'kapatabilir'> & { kilitleyen_id: string | null; ick_plan: { ad: string } | null }
  const ham = (data as Ham[] | null) ?? []
  const adlar = await ickKullaniciAdlari(db, ham.map(d => d.kilitleyen_id).filter((x): x is string => Boolean(x)))
  const bugun = ickBugun()
  const donemler: IckDonemSatir[] = ham.map(d => ({
    id: d.id,
    plan_id: d.plan_id,
    planAd: d.ick_plan?.ad ?? '',
    yil: d.yil,
    yari: d.yari,
    siklik: d.siklik ?? 2,
    bas: d.bas,
    bit: d.bit,
    durum: d.durum,
    kilit_at: d.kilit_at,
    kilitleyen: d.kilitleyen_id ? adlar.get(d.kilitleyen_id) ?? '' : '',
    kapatabilir: d.durum === 'acik' && d.bit < bugun && ickPlanKoordinatoru(yetki, d.plan_id),
  }))
  return (
    <div className="space-y-4">
      <div className="w-full space-y-3 text-sm leading-6 text-slate-600">
        <p>
          İzleme dönemleri planın yıllarına ve izleme sıklığına göre kendiliğinden oluşur. Dönem açıkken rapor taslaktır ve canlı veriden üretilir. Dönem bittikten sonra
          koordinatör dönemi kapatır; eylemlerin kesinleşmiş durumu dönem görüntüsüne yazılır, dönem &quot;Tamamlandı&quot; olur ve rapor bundan sonra değişmez.
        </p>
        <p>
          Eylem, tamamlanma tarihinin düştüğü dönemde görünür. Tamamlanma tarihi geçip tamamlanmayan eylem, tamamlanana dek sonraki dönemlerde &quot;Gecikmiş&quot; notuyla yer alır; sürekli eylemler
          her dönem listelenir.
        </p>
      </div>
      {error ? <IckUyari tur="hata" metin={ickHataMetni(error.message)} /> : null}
      <IckRaporlarClient donemler={donemler} planGoster={!planId} />
    </div>
  )
}
