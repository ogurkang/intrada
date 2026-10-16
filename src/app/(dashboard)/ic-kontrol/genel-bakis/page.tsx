import Link from 'next/link'
import { ICK_TD, ICK_TH, IckBaslik, IckKart, IckUyari } from '@/components/ic-kontrol/IckUi'
import { ICK_YETKI_YOK, ickHataMetni, ickSayfa } from '@/lib/ick/erisim'
import { ICK_BILESEN_SIRA, ICK_ROL_ETIKET, ickBugun, ickKodBilesen, ickTarihMetni } from '@/lib/ick/tanim'
import { ickPlanEylemleri, ickPlanlar, ickTumMudurlukHaritasi, ickVarsayilanPlan } from '@/lib/ick/yukle'

function Kpi({ ad, deger, renk, href }: { ad: string; deger: string | number; renk?: string; href?: string }) {
  const ic = (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 h-full">
      <p className="text-xs text-slate-500">{ad}</p>
      <p className={`text-2xl font-bold ${renk ?? 'text-slate-800'}`}>{deger}</p>
    </div>
  )
  return href ? (
    <Link href={href} className="block hover:opacity-90">
      {ic}
    </Link>
  ) : (
    ic
  )
}

function sonrakiIzleme(bugun: string): string {
  const y = Number(bugun.slice(0, 4))
  return bugun <= `${y}-06-30` ? `${y}-06-30` : `${y}-12-31`
}

export default async function IckGenelBakisPage() {
  const { db, yetki, hata } = await ickSayfa()
  if (!yetki.okuyabilir) {
    return (
      <div className="space-y-6">
        <IckBaslik baslik="İç Kontrol — Genel Bakış" />
        <IckUyari metin={hata ?? ICK_YETKI_YOK} />
      </div>
    )
  }
  const [{ planlar, hata: pHata }, mudAd, incelemeR] = await Promise.all([
    ickPlanlar(db),
    ickTumMudurlukHaritasi(db),
    db.from('ick_gerceklesme').select('id', { count: 'exact', head: true }).eq('akis', 'incelemede'),
  ])
  const plan = ickVarsayilanPlan(planlar)
  const { satirlar } = plan ? await ickPlanEylemleri(db, plan.id, mudAd) : { satirlar: [] }
  const aktif = satirlar.filter(e => e.durum !== 'iptal')
  const tamam = aktif.filter(e => e.durum === 'tamamlandi').length
  const devam = aktif.filter(e => e.durum === 'devam').length
  const baslanmadi = aktif.filter(e => e.durum === 'baslanmadi').length
  const geciken = aktif.filter(e => e.gecikti).length
  const iade = aktif.filter(e => e.sonAkis === 'iade').length
  const benim = aktif.filter(e => e.sorumlu_mudurluk_id != null && yetki.birimler.includes(e.sorumlu_mudurluk_id))

  const mudurlukSay = new Map<string, { toplam: number; tamam: number; geciken: number }>()
  for (const e of aktif) {
    const s = mudurlukSay.get(e.sorumlu) ?? { toplam: 0, tamam: 0, geciken: 0 }
    s.toplam++
    if (e.durum === 'tamamlandi') s.tamam++
    if (e.gecikti) s.geciken++
    mudurlukSay.set(e.sorumlu, s)
  }
  const bugun = ickBugun()
  const roller = [
    yetki.admin ? 'Yönetici' : '',
    yetki.koordinator ? ICK_ROL_ETIKET.koordinator : '',
    yetki.izleyici ? ICK_ROL_ETIKET.izleyici : '',
    yetki.birimler.length ? `Birim rolü: ${yetki.birimler.map(b => mudAd.get(b)).join(', ')}` : '',
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <IckBaslik baslik="İç Kontrol — Genel Bakış" />
      <p className="text-sm text-slate-600">Rolünüz: {roller.join(' · ') || '—'}</p>
      {pHata ? <IckUyari tur="hata" metin={ickHataMetni(pHata)} /> : null}
      {!plan ? (
        <IckUyari
          tur="bilgi"
          metin={yetki.koordinator ? 'Henüz eylem planı yok. Eylem Planları ekranından plan oluşturun ve Excel şablonundan aktarın.' : 'Henüz eylem planı yok.'}
        />
      ) : (
        <>
          <IckKart
            baslik={plan.ad}
            sag={
              <Link href={`/ic-kontrol/planlar/${plan.id}`} className="text-sm text-blue-700 hover:underline">
                Plana git
              </Link>
            }
          >
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
              <Kpi ad="Eylem" deger={aktif.length} />
              <Kpi ad="Tamamlanan" deger={`${tamam}${aktif.length ? ` (%${Math.round((tamam / aktif.length) * 100)})` : ''}`} renk="text-emerald-700" />
              <Kpi ad="Devam eden" deger={devam} renk="text-amber-700" />
              <Kpi ad="Başlanmadı" deger={baslanmadi} />
              <Kpi ad="Termini geçen" deger={geciken} renk={geciken ? 'text-red-700' : undefined} />
              <Kpi ad="İncelemede" deger={incelemeR.count ?? 0} renk="text-blue-700" href="/ic-kontrol/inceleme" />
              <Kpi ad="İade edilen" deger={iade} renk={iade ? 'text-red-700' : undefined} />
            </div>
          </IckKart>

          {yetki.birimler.length ? (
            <IckKart
              baslik="Müdürlüğümün eylemleri"
              sag={
                <Link href="/ic-kontrol/is-kutusu" className="text-sm text-blue-700 hover:underline">
                  İş kutuma git
                </Link>
              }
            >
              <p className="text-sm text-slate-700">
                {benim.length} eylem · {benim.filter(e => e.durum === 'tamamlandi').length} tamamlandı · {benim.filter(e => e.gecikti).length} termini geçti ·{' '}
                {benim.filter(e => e.sonAkis === 'iade').length} iade edildi
              </p>
            </IckKart>
          ) : null}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <IckKart baslik="Bileşen bazında">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className={ICK_TH}>Bileşen</th>
                    <th className={ICK_TH}>Eylem</th>
                    <th className={ICK_TH}>Tamamlanan</th>
                    <th className={ICK_TH}>Devam</th>
                    <th className={ICK_TH}>Termini geçen</th>
                  </tr>
                </thead>
                <tbody>
                  {ICK_BILESEN_SIRA.map(b => {
                    const l = aktif.filter(e => ickKodBilesen(e.kod_norm) === b)
                    if (!l.length) return null
                    return (
                      <tr key={b} className="border-b border-slate-100">
                        <td className={ICK_TD}>{b}</td>
                        <td className={ICK_TD}>{l.length}</td>
                        <td className={ICK_TD}>{l.filter(e => e.durum === 'tamamlandi').length}</td>
                        <td className={ICK_TD}>{l.filter(e => e.durum === 'devam').length}</td>
                        <td className={ICK_TD}>{l.filter(e => e.gecikti).length}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </IckKart>
            <IckKart baslik="Sorumlu birim bazında">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className={ICK_TH}>Sorumlu</th>
                    <th className={ICK_TH}>Eylem</th>
                    <th className={ICK_TH}>Tamamlanan</th>
                    <th className={ICK_TH}>Termini geçen</th>
                  </tr>
                </thead>
                <tbody>
                  {[...mudurlukSay.entries()]
                    .sort((a, b) => b[1].toplam - a[1].toplam)
                    .map(([ad, s]) => (
                      <tr key={ad} className="border-b border-slate-100">
                        <td className={ICK_TD}>{ad}</td>
                        <td className={ICK_TD}>{s.toplam}</td>
                        <td className={ICK_TD}>{s.tamam}</td>
                        <td className={`${ICK_TD} ${s.geciken ? 'text-red-700 font-medium' : ''}`}>{s.geciken}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </IckKart>
          </div>
        </>
      )}

      <IckKart baslik="Mevzuat takvimi">
        <ul className="space-y-1 text-sm text-slate-700">
          <li>Sıradaki izleme raporu: {ickTarihMetni(sonrakiIzleme(bugun))} (haziran ve aralık sonunda üst yöneticiye sunulur).</li>
          {plan ? (
            <li>
              Yeni eylem planı {plan.bit_yil + 1} yılı ocak ayının ilk haftasında yürürlükte olmalı; onaydan sonra on iş günü içinde Bakanlığa gönderilir.
            </li>
          ) : null}
          <li>Birim uyum eylem planları: her yıl en az üç harcama birimi; tüm birimler için 01.01.2028.</li>
          <li>İç kontrol izleme ve yönlendirme kurulu yılda en az iki kez toplanır.</li>
          <li>Yıllık iç kontrol sistemi değerlendirme raporu her yıl hazırlanır.</li>
        </ul>
        <p className="mt-2 text-xs text-slate-500">Dayanak: Kamu İç Kontrol Yönetmeliği (RG 05.03.2025 / 32832).</p>
      </IckKart>
    </div>
  )
}
