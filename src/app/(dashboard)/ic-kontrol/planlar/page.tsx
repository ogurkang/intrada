import Link from 'next/link'
import IckPlanFormClient from '@/components/ic-kontrol/IckPlanFormClient'
import { ICK_TD, ICK_TH, IckBaslik, IckRozet, IckUyari } from '@/components/ic-kontrol/IckUi'
import { ICK_YETKI_YOK, ickHataMetni, ickSayfa } from '@/lib/ick/erisim'
import { ICK_PLAN_DURUM_ETIKET, type IckPlanDurum } from '@/lib/ick/tanim'
import { ickMudurlukler, ickPlanlar, ickTumMudurlukHaritasi } from '@/lib/ick/yukle'

export default async function IckPlanlarPage() {
  const { db, yetki, hata } = await ickSayfa()
  if (!yetki.okuyabilir) {
    return (
      <div className="space-y-6">
        <IckBaslik baslik="Eylem Planları" />
        <IckUyari metin={hata ?? ICK_YETKI_YOK} />
      </div>
    )
  }
  const [{ planlar, hata: pHata }, mudurlukler, mudAd, eylemler] = await Promise.all([
    ickPlanlar(db),
    ickMudurlukler(db),
    ickTumMudurlukHaritasi(db),
    db.from('ick_eylem').select('plan_id, durum'),
  ])
  const sayac = new Map<number, { toplam: number; tamam: number }>()
  for (const e of (eylemler.data as { plan_id: number; durum: string }[] | null) ?? []) {
    const s = sayac.get(e.plan_id) ?? { toplam: 0, tamam: 0 }
    if (e.durum !== 'iptal') s.toplam++
    if (e.durum === 'tamamlandi') s.tamam++
    sayac.set(e.plan_id, s)
  }
  const yil = new Date().getFullYear()

  return (
    <div className="space-y-6">
      <IckBaslik baslik="Eylem Planları">
        {yetki.koordinator ? (
          <IckPlanFormClient
            dugmeMetni="Plan oluştur"
            mudurlukler={mudurlukler}
            baslangic={{
              ad: `${yil + 1}-${yil + 2} Kamu İç Kontrol Standartlarına Uyum Eylem Planı`,
              kapsam: 'idare',
              mudurlukId: null,
              basYil: yil + 1,
              bitYil: yil + 2,
              koordinatorMudurlukId: null,
              durum: 'taslak',
              onayTarihi: '',
              onaySayi: '',
              bakanlikGonderimTarihi: '',
              aciklama: '',
            }}
          />
        ) : null}
      </IckBaslik>
      <div className="w-full space-y-3 text-sm leading-6 text-slate-600">
        <p>
          İdare eylem planı en fazla iki yıllıktır ve ilk yılın ocak ayının ilk haftasında yürürlükte olmalıdır. Üst yönetici onayından sonra on iş günü içinde Bakanlığa gönderilir. Birim uyum eylem planları harcama birimi bazında ayrı plan olarak açılır.
        </p>
        <p>Mevcut planın eylemleri Excel şablonundan aktarılır. Aktarım yalnızca eylemi olmayan plana yapılır.</p>
      </div>
      {pHata ? <IckUyari tur="hata" metin={ickHataMetni(pHata)} /> : null}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className={ICK_TH}>Plan</th>
              <th className={ICK_TH}>Kapsam</th>
              <th className={ICK_TH}>Dönem</th>
              <th className={ICK_TH}>Durum</th>
              <th className={ICK_TH}>Eylem</th>
              <th className={ICK_TH}>Tamamlanan</th>
            </tr>
          </thead>
          <tbody>
            {planlar.length === 0 ? (
              <tr>
                <td className={ICK_TD} colSpan={6}>
                  Plan yok.
                </td>
              </tr>
            ) : null}
            {planlar.map(p => {
              const s = sayac.get(p.id) ?? { toplam: 0, tamam: 0 }
              return (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className={ICK_TD}>
                    <Link href={`/ic-kontrol/planlar/${p.id}`} className="font-medium text-blue-700 hover:underline">
                      {p.ad}
                    </Link>
                  </td>
                  <td className={ICK_TD}>{p.kapsam === 'idare' ? 'İdare' : `Birim — ${mudAd.get(p.mudurluk_id ?? 0) ?? ''}`}</td>
                  <td className={ICK_TD}>
                    {p.bas_yil}–{p.bit_yil}
                  </td>
                  <td className={ICK_TD}>
                    <IckRozet durum={p.durum === 'yururlukte' ? 'devam' : p.durum === 'tamamlandi' ? 'tamamlandi' : 'taslak'} etiket={ICK_PLAN_DURUM_ETIKET[p.durum as IckPlanDurum] ?? p.durum} />
                  </td>
                  <td className={ICK_TD}>{s.toplam}</td>
                  <td className={ICK_TD}>
                    {s.tamam} {s.toplam ? `(%${Math.round((s.tamam / s.toplam) * 100)})` : ''}
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
