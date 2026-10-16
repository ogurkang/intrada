import IckIzlemeClient, { type IckDonemSatir } from '@/components/ic-kontrol/IckIzlemeClient'
import { IckBaslik, IckUyari } from '@/components/ic-kontrol/IckUi'
import { ICK_YETKI_YOK, ickHataMetni, ickSayfa } from '@/lib/ick/erisim'
import { ickKullaniciAdlari, ickPlanlar } from '@/lib/ick/yukle'

export default async function IckIzlemePage() {
  const { db, yetki, hata } = await ickSayfa()
  if (!yetki.okuyabilir) {
    return (
      <div className="space-y-6">
        <IckBaslik baslik="İzleme Dönemleri" />
        <IckUyari metin={hata ?? ICK_YETKI_YOK} />
      </div>
    )
  }
  const [{ planlar }, donemR, incelemeR] = await Promise.all([
    ickPlanlar(db),
    db.from('ick_izleme_donemi').select('id, plan_id, yil, yari, bas, bit, durum, kilit_at, kilitleyen_id').order('yil', { ascending: false }).order('yari', { ascending: false }),
    db.from('ick_gerceklesme').select('id', { count: 'exact', head: true }).eq('akis', 'incelemede'),
  ])
  const planAd = new Map(planlar.map(p => [p.id, p.ad]))
  const ham = (donemR.data as (Omit<IckDonemSatir, 'planAd' | 'kilitleyen'> & { kilitleyen_id: string | null })[] | null) ?? []
  const adlar = await ickKullaniciAdlari(db, ham.map(d => d.kilitleyen_id).filter((x): x is string => Boolean(x)))

  return (
    <div className="space-y-6">
      <IckBaslik baslik="İzleme Dönemleri" />
      <div className="w-full space-y-3 text-sm leading-6 text-slate-600">
        <p>
          Eylem planı en az altı ayda bir izlenir; sonuçlar haziran ve aralık sonunda eylem planı formatında üst yöneticiye sunulur. Dönem açıkken rapor taslaktır ve canlı veriden üretilir. Koordinatör dönemi kilitlediğinde eylemlerin kesinleşmiş durumu dönem görüntüsüne yazılır; rapor bundan sonra değişmez.
        </p>
        <p>Gerçekleşme oranı eylem sayısına göre hesaplanır. Raporda hem termini bu dönemde olan eylemler hem de termini dönem sonuna kadar gelen tüm eylemler ayrı gösterilir.</p>
      </div>
      {donemR.error ? <IckUyari tur="hata" metin={ickHataMetni(donemR.error.message)} /> : null}
      {(incelemeR.count ?? 0) > 0 ? <IckUyari metin={`İncelemede bekleyen ${incelemeR.count} bildirim var. Kilitlemeden önce karara bağlayın.`} /> : null}
      <IckIzlemeClient
        koordinator={yetki.koordinator}
        planlar={planlar.map(p => ({ id: p.id, ad: p.ad, bas_yil: p.bas_yil, bit_yil: p.bit_yil }))}
        donemler={ham.map(d => ({ ...d, planAd: planAd.get(d.plan_id) ?? '', kilitleyen: d.kilitleyen_id ? adlar.get(d.kilitleyen_id) ?? '' : '' }))}
      />
    </div>
  )
}
