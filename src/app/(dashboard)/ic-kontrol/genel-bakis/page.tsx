import Link from 'next/link'
import { ICK_BUTON, IckBaslik, IckKart, IckUyari } from '@/components/ic-kontrol/IckUi'
import { ICK_YETKI_YOK, ickHataMetni, ickPlanKoordinatoru, ickSayfa } from '@/lib/ick/erisim'
import { ICK_BILESEN_SIRA, ICK_ROL_ETIKET, ickBugun, ickKodBilesen, ickTarihMetni } from '@/lib/ick/tanim'
import { ickPlanEylemleri, ickPlanlar, ickTumMudurlukHaritasi, ickUstYonetim, ickVarsayilanPlan } from '@/lib/ick/yukle'

function Kpi({
  ad,
  deger,
  ton,
  href,
}: {
  ad: string
  deger: string | number
  ton: 'slate' | 'emerald' | 'amber' | 'red' | 'blue' | 'rose'
  href?: string
}) {
  const tonlar = {
    slate: 'border-slate-200 bg-slate-50 text-slate-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    red: 'border-red-200 bg-red-50 text-red-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
  }
  const ic = (
    <div className={`h-full rounded-xl border px-4 py-3 ${tonlar[ton]}`}>
      <p className="text-xs font-medium opacity-80">{ad}</p>
      <p className="mt-1 text-2xl font-bold">{deger}</p>
    </div>
  )
  return href ? (
    <Link href={href} className="block rounded-xl hover:opacity-90">
      {ic}
    </Link>
  ) : (
    ic
  )
}

function Halka({ yuzde }: { yuzde: number }) {
  const aci = Math.max(0, Math.min(100, yuzde)) * 3.6
  return (
    <div
      className="relative h-36 w-36 shrink-0 rounded-full"
      style={{ background: `conic-gradient(#059669 0deg ${aci}deg, #e2e8f0 ${aci}deg 360deg)` }}
      aria-label={`Gerçekleşme yüzde ${yuzde}`}
    >
      <div className="absolute inset-3.5 flex flex-col items-center justify-center rounded-full bg-white">
        <span className="text-2xl font-bold text-emerald-700">%{yuzde}</span>
        <span className="text-[11px] text-slate-500">gerçekleşme</span>
      </div>
    </div>
  )
}

function YigilmisCubuk({
  tamam,
  devam,
  baslanmadi,
}: {
  tamam: number
  devam: number
  baslanmadi: number
}) {
  const toplam = tamam + devam + baslanmadi
  if (!toplam) return <div className="h-3 rounded-full bg-slate-100" />
  const gen = (n: number) => `${(n / toplam) * 100}%`
  return (
    <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
      {tamam ? <div className="bg-emerald-500" style={{ width: gen(tamam) }} /> : null}
      {devam ? <div className="bg-amber-400" style={{ width: gen(devam) }} /> : null}
      {baslanmadi ? <div className="bg-slate-300" style={{ width: gen(baslanmadi) }} /> : null}
    </div>
  )
}

function sonrakiIzleme(bugun: string, siklik: number): string {
  const y = Number(bugun.slice(0, 4))
  const sonlar = siklik === 4 ? ['03-31', '06-30', '09-30', '12-31'] : siklik === 1 ? ['12-31'] : ['06-30', '12-31']
  return sonlar.map(s => `${y}-${s}`).find(t => bugun <= t) ?? `${y}-12-31`
}

const SIKLIK_METNI: Record<number, string> = {
  1: 'yıl sonunda',
  2: 'haziran ve aralık sonunda',
  4: 'her üç ayın sonunda',
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
  const [{ planlar, hata: pHata }, mudAd, ustYonetim] = await Promise.all([ickPlanlar(db), ickTumMudurlukHaritasi(db), ickUstYonetim(db)])
  const plan = ickVarsayilanPlan(planlar)
  const [{ satirlar }, incelemeR] = plan
    ? await Promise.all([
        ickPlanEylemleri(db, plan.id, mudAd),
        db
          .from('ick_gerceklesme')
          .select('id, ick_eylem!inner(plan_id)', { count: 'exact', head: true })
          .eq('akis', 'incelemede')
          .eq('ick_eylem.plan_id', plan.id),
      ])
    : [{ satirlar: [] }, { count: 0 }]
  const aktif = satirlar.filter(e => e.durum !== 'iptal' && e.durum !== 'devredildi')
  const benimBY = yetki.sicil ? ustYonetim.find(u => u.sicil === yetki.sicil && u.gorev === 'Başkan Yardımcısı') : undefined
  const bagli = new Set(benimBY?.bagliMudurlukler ?? [])
  const bagliEylem = aktif.filter(e => e.sorumlu_mudurluk_id != null && bagli.has(e.sorumlu_mudurluk_id))
  const tamam = aktif.filter(e => e.durum === 'tamamlandi').length
  const devam = aktif.filter(e => e.durum === 'devam').length
  const baslanmadi = aktif.filter(e => e.durum === 'baslanmadi').length
  const geciken = aktif.filter(e => e.gecikti).length
  const iade = aktif.filter(e => e.sonAkis === 'iade').length
  const benim = aktif.filter(e => yetki.eylemRolleri[e.id] != null)

  const mudurlukSay = new Map<string, { toplam: number; tamam: number; devam: number; baslanmadi: number; geciken: number; bagli: boolean }>()
  for (const e of aktif) {
    const s = mudurlukSay.get(e.sorumlu) ?? {
      toplam: 0,
      tamam: 0,
      devam: 0,
      baslanmadi: 0,
      geciken: 0,
      bagli: e.sorumlu_mudurluk_id != null && bagli.has(e.sorumlu_mudurluk_id),
    }
    s.toplam++
    if (e.durum === 'tamamlandi') s.tamam++
    else if (e.durum === 'devam') s.devam++
    else if (e.durum === 'baslanmadi') s.baslanmadi++
    if (e.gecikti) s.geciken++
    mudurlukSay.set(e.sorumlu, s)
  }
  const bugun = ickBugun()
  const roller = [
    yetki.admin ? 'Yönetici' : '',
    plan && ickPlanKoordinatoru(yetki, plan.id) ? ICK_ROL_ETIKET.koordinator : yetki.koordinator ? `${ICK_ROL_ETIKET.koordinator} (başka planda)` : '',
    yetki.mudurlukKoordinatoru.length ? `${ICK_ROL_ETIKET.mudurluk_koordinatoru}: ${yetki.mudurlukKoordinatoru.map(b => mudAd.get(b)).join(', ')}` : '',
    yetki.islemci.length ? `${ICK_ROL_ETIKET.mudurluk_islemcisi}: ${yetki.islemci.map(b => mudAd.get(b)).join(', ')}` : '',
    yetki.izleyici ? ICK_ROL_ETIKET.izleyici : '',
  ].filter(Boolean)
  const planLink = plan ? `/ic-kontrol/planlar/${plan.id}` : '/ic-kontrol/planlar'

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
              <Link href={`/ic-kontrol/planlar/${plan.id}`} className={ICK_BUTON}>
                Plana git
              </Link>
            }
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
              <Halka yuzde={aktif.length ? Math.round((tamam / aktif.length) * 100) : 0} />
              <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-4">
                <Kpi ad="Eylem" deger={aktif.length} ton="slate" />
                <Kpi ad="Tamamlanan" deger={tamam} ton="emerald" />
                <Kpi ad="Devam eden" deger={devam} ton="amber" />
                <Kpi ad="Başlanmadı" deger={baslanmadi} ton="slate" />
                <Kpi ad="Tamamlanma tarihi geçen" deger={geciken} ton={geciken ? 'red' : 'slate'} />
                <Kpi ad="İncelemede" deger={incelemeR.count ?? 0} ton="blue" href={`${planLink}?sekme=inceleme`} />
                <Kpi ad="İade edilen" deger={iade} ton={iade ? 'rose' : 'slate'} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Tamamlanan</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Devam eden</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Başlanmadı</span>
            </div>
          </IckKart>

          {benim.length ? (
            <IckKart
              baslik="Seçildiğim eylemler"
              sag={
                <Link href={`${planLink}?sekme=is-kutusu`} className="text-sm text-blue-700 hover:underline">
                  İş kutuma git
                </Link>
              }
            >
              <p className="text-sm text-slate-700">
                {benim.length} eylem · {benim.filter(e => e.durum === 'tamamlandi').length} tamamlandı · {benim.filter(e => e.gecikti).length} tamamlanma tarihi geçti ·{' '}
                {benim.filter(e => e.sonAkis === 'iade').length} iade edildi
              </p>
            </IckKart>
          ) : null}

          {benimBY ? (
            <IckKart baslik="Bağlı müdürlüklerimin eylemleri">
              {bagli.size ? (
                <>
                  <p className="text-sm text-slate-700">
                    {bagli.size} müdürlük · {bagliEylem.length} eylem · {bagliEylem.filter(e => e.durum === 'tamamlandi').length} tamamlandı ·{' '}
                    {bagliEylem.filter(e => e.durum === 'devam').length} devam ediyor · {bagliEylem.filter(e => e.gecikti).length} tamamlanma tarihi geçti
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Sorumlu birim tablosunda bağlı müdürlükleriniz vurgulanır.</p>
                </>
              ) : (
                <p className="text-sm text-slate-500">Aktif organizasyonda size bağlı müdürlük tanımlı değil.</p>
              )}
            </IckKart>
          ) : null}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <IckKart baslik="Bileşen bazında">
              <ul className="space-y-4">
                {ICK_BILESEN_SIRA.map(b => {
                  const l = aktif.filter(e => ickKodBilesen(e.kod_norm) === b)
                  if (!l.length) return null
                  const t = l.filter(e => e.durum === 'tamamlandi').length
                  const d = l.filter(e => e.durum === 'devam').length
                  const n = l.filter(e => e.durum === 'baslanmadi').length
                  const g = l.filter(e => e.gecikti).length
                  return (
                    <li key={b}>
                      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-800">{b}</span>
                        <span className="text-xs text-slate-500">
                          {l.length} eylem · {t} tamam · {d} devam{g ? ` · ${g} tarihi geçti` : ''}
                        </span>
                      </div>
                      <YigilmisCubuk tamam={t} devam={d} baslanmadi={n} />
                    </li>
                  )
                })}
              </ul>
            </IckKart>
            <IckKart baslik="Sorumlu birim bazında">
              <ul className="space-y-4">
                {[...mudurlukSay.entries()]
                  .sort((a, b) => Number(b[1].bagli) - Number(a[1].bagli) || b[1].toplam - a[1].toplam)
                  .map(([ad, s]) => (
                    <li key={ad} className={s.bagli ? 'rounded-lg bg-blue-50 px-2 py-1.5' : ''}>
                      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                        <span className={s.bagli ? 'font-medium text-blue-800' : 'font-medium text-slate-800'}>{ad}</span>
                        <span className="text-xs text-slate-500">
                          {s.tamam}/{s.toplam}
                          {s.geciken ? <span className="text-red-700"> · {s.geciken} tarihi geçti</span> : null}
                        </span>
                      </div>
                      <YigilmisCubuk tamam={s.tamam} devam={s.devam} baslanmadi={s.baslanmadi} />
                    </li>
                  ))}
              </ul>
            </IckKart>
          </div>
        </>
      )}

      <IckKart baslik="Mevzuat takvimi">
        <ul className="space-y-1 text-sm text-slate-700">
          <li>
            Sıradaki izleme raporu: {ickTarihMetni(sonrakiIzleme(bugun, plan?.izleme_sikligi ?? 2))} ({SIKLIK_METNI[plan?.izleme_sikligi ?? 2] ?? SIKLIK_METNI[2]}{' '}
            üst yöneticiye sunulur).
          </li>
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
