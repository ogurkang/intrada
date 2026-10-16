import Link from 'next/link'
import { ICK_TD, ICK_TH, IckBaslik, IckKart, IckRozet, IckUyari } from '@/components/ic-kontrol/IckUi'
import { ICK_YETKI_YOK, ickHataMetni, ickSayfa } from '@/lib/ick/erisim'
import { ICK_AKIS_ETIKET, ICK_EYLEM_DURUM_ETIKET, ickBugun, ickGecikti, ickKodSiralama, ickTerminGoster, type IckAkis } from '@/lib/ick/tanim'
import { ICK_EYLEM_KOLON, ickSorumluAdi, ickTumMudurlukHaritasi, type IckEylemKayit } from '@/lib/ick/yukle'

export default async function IckIsKutusuPage() {
  const { db, yetki, hata } = await ickSayfa()
  if (!yetki.okuyabilir) {
    return (
      <div className="space-y-6">
        <IckBaslik baslik="İş Kutum" />
        <IckUyari metin={hata ?? ICK_YETKI_YOK} />
      </div>
    )
  }
  if (!yetki.birimler.length) {
    return (
      <div className="space-y-6">
        <IckBaslik baslik="İş Kutum" />
        <IckUyari
          tur="bilgi"
          metin={
            yetki.koordinator
              ? 'Birim rolünüz yok. İncelemeye gelen bildirimler İnceleme ekranındadır.'
              : 'Birim rolünüz yok. İş kutusu birim yöneticisi ve birim iç kontrol ve risk koordinatörü içindir.'
          }
        />
      </div>
    )
  }

  const [planlar, mudAd] = await Promise.all([
    db.from('ick_plan').select('id, ad, durum').in('durum', ['yururlukte', 'kurulda', 'onay_bekliyor', 'taslak']),
    ickTumMudurlukHaritasi(db),
  ])
  const planListe = (planlar.data as { id: number; ad: string; durum: string }[] | null) ?? []
  const planAd = new Map(planListe.map(p => [p.id, p.ad]))
  const { data: eHam, error } = planListe.length
    ? await db.from('ick_eylem').select(ICK_EYLEM_KOLON).in('sorumlu_mudurluk_id', yetki.birimler).in('plan_id', planListe.map(p => p.id))
    : { data: [], error: null }
  const eylemler = ((eHam as IckEylemKayit[] | null) ?? []).sort((a, b) => ickKodSiralama(a.kod_norm, b.kod_norm))
  const ids = eylemler.map(e => e.id)
  const { data: gHam } = ids.length
    ? await db.from('ick_gerceklesme').select('id, eylem_id, akis, olusturan_id, iade_gerekcesi, created_at').in('eylem_id', ids).order('created_at', { ascending: false })
    : { data: [] }
  const son = new Map<number, { akis: IckAkis; iade_gerekcesi: string; olusturan_id: string | null }>()
  for (const g of (gHam as { eylem_id: number; akis: IckAkis; iade_gerekcesi: string; olusturan_id: string | null }[] | null) ?? []) {
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
    e =>
      e.termin_tipi === 'tek' &&
      e.termin_guncel &&
      e.termin_guncel >= bugun &&
      e.termin_guncel <= otuzGun &&
      !['tamamlandi', 'iptal'].includes(e.durum),
  )

  function tablo(liste: IckEylemKayit[], bos: string, ekKolon?: (e: IckEylemKayit) => React.ReactNode) {
    if (!liste.length) return <p className="text-sm text-slate-500">{bos}</p>
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[860px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className={ICK_TH}>Kod</th>
              <th className={ICK_TH}>Öngörülen eylem</th>
              <th className={ICK_TH}>Sorumlu</th>
              <th className={ICK_TH}>Termin</th>
              <th className={ICK_TH}>Durum</th>
              {ekKolon ? <th className={ICK_TH}>Not</th> : null}
            </tr>
          </thead>
          <tbody>
            {liste.map(e => {
              const s = son.get(e.id)
              return (
                <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className={`${ICK_TD} whitespace-nowrap`}>
                    <Link href={`/ic-kontrol/eylemler/${e.id}`} className="font-medium text-blue-700 hover:underline">
                      {e.kod_norm}
                    </Link>
                    <span className="block text-xs text-slate-400">{planAd.get(e.plan_id)}</span>
                  </td>
                  <td className={ICK_TD}>{e.ongorulen_eylem}</td>
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
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <IckBaslik baslik="İş Kutum" />
      <p className="text-sm leading-6 text-slate-600">
        Müdürlüğünüzün sorumlu olduğu eylemler: {yetki.birimler.map(b => mudAd.get(b)).join(', ')}. Bildirim eylem kartından girilir.
      </p>
      {error ? <IckUyari tur="hata" metin={ickHataMetni(error.message)} /> : null}
      <IckKart baslik={`İade edilen bildirimler (${iade.length})`}>
        {tablo(iade, 'İade edilen bildirim yok.', e => <span className="text-red-700">{son.get(e.id)?.iade_gerekcesi}</span>)}
      </IckKart>
      <IckKart baslik={`Gönderilmemiş taslaklar (${taslak.length})`}>{tablo(taslak, 'Taslak yok.')}</IckKart>
      <IckKart baslik={`Termini geçen eylemler (${geciken.length})`}>{tablo(geciken, 'Termini geçen eylem yok.')}</IckKart>
      <IckKart baslik={`30 gün içinde termini gelen eylemler (${yaklasan.length})`}>{tablo(yaklasan, 'Yaklaşan termin yok.')}</IckKart>
      <IckKart baslik={`İncelemede (${incelemede.length})`}>{tablo(incelemede, 'İncelemede bildirim yok.')}</IckKart>
      <IckKart baslik={`Tüm eylemler (${eylemler.length})`}>{tablo(eylemler, 'Müdürlüğünüze bağlı eylem yok.')}</IckKart>
    </div>
  )
}
