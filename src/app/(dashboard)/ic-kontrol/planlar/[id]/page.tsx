import Link from 'next/link'
import { notFound } from 'next/navigation'
import IckEylemFormClient from '@/components/ic-kontrol/IckEylemFormClient'
import IckPlanDetayClient from '@/components/ic-kontrol/IckPlanDetayClient'
import IckPlanFormClient from '@/components/ic-kontrol/IckPlanFormClient'
import { IckIncelemeBolum, IckIsKutusuBolum, IckRaporlarBolum } from '@/components/ic-kontrol/IckPlanBolumleri'
import { ICK_BUTON_GEZINTI, ICK_BUTON_IKINCIL, IckBaslik, IckKart, IckUyari } from '@/components/ic-kontrol/IckUi'
import { ICK_YETKI_YOK, ickHataMetni, ickPlanKoordinatoru, ickSayfa, type IckDb } from '@/lib/ick/erisim'
import { ICK_IZLEME_SIKLIGI_ETIKET, ICK_PLAN_DURUM_ETIKET, ickGenelSartSiralama, ickTarihMetni, type IckPlanDurum } from '@/lib/ick/tanim'
import { ickEylemKisileri, ickMudurlukler, ickPlanEylemleri, ickPlanKoordinatorleri, ickTumMudurlukHaritasi } from '@/lib/ick/yukle'

/** Eylem başına bilgi ve kişi değişikliği kaydı sayısı (saat işaretindeki sayı) */
async function eylemLogSayilari(db: IckDb, ids: number[]): Promise<Map<number, number>> {
  const m = new Map<number, number>()
  const ekle = (id: unknown) => {
    const n = Number(id)
    if (Number.isFinite(n) && n > 0) m.set(n, (m.get(n) ?? 0) + 1)
  }
  for (let i = 0; i < ids.length; i += 200) {
    const parca = ids.slice(i, i + 200)
    const liste = parca.join(',')
    for (let s = 0; ; s += 1000) {
      const { data } = await db
        .from('ick_audit_log')
        .select('kayit_id')
        .eq('tablo', 'ick_eylem')
        .in('kayit_id', parca.map(String))
        .order('id')
        .range(s, s + 999)
      const satir = (data as { kayit_id: string }[] | null) ?? []
      for (const r of satir) ekle(r.kayit_id)
      if (satir.length < 1000) break
    }
    for (let s = 0; ; s += 1000) {
      const { data } = await db
        .from('ick_audit_log')
        .select('yeni:sonraki->>eylem_id, eski:onceki->>eylem_id')
        .eq('tablo', 'ick_eylem_kisi')
        .or(`sonraki->>eylem_id.in.(${liste}),onceki->>eylem_id.in.(${liste})`)
        .order('id')
        .range(s, s + 999)
      const satir = (data as { yeni: string | null; eski: string | null }[] | null) ?? []
      for (const r of satir) ekle(r.yeni ?? r.eski)
      if (satir.length < 1000) break
    }
  }
  return m
}

export default async function IckPlanDetayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ sekme?: string }>
}) {
  const { id } = await params
  const { sekme } = await searchParams
  const planId = Number(id)
  const { db, yetki, hata } = await ickSayfa()
  if (!yetki.okuyabilir) {
    return (
      <div className="space-y-6">
        <IckBaslik baslik="Eylem Planı" />
        <IckUyari metin={hata ?? ICK_YETKI_YOK} />
      </div>
    )
  }
  const { data: plan, error } = await db.from('ick_plan').select('*').eq('id', planId).maybeSingle()
  if (error) return <IckUyari tur="hata" metin={ickHataMetni(error.message)} />
  if (!plan) notFound()

  const planKoord = ickPlanKoordinatoru(yetki, planId)
  const [mudAd, mudurlukler, koordHarita, incelemeSay, sartlar, standartlar, degerlendirmeler] = await Promise.all([
    ickTumMudurlukHaritasi(db),
    ickMudurlukler(db),
    ickPlanKoordinatorleri(db, [planId]),
    db.from('ick_gerceklesme').select('id, ick_eylem!inner(plan_id)', { count: 'exact', head: true }).eq('akis', 'incelemede').eq('ick_eylem.plan_id', planId),
    db.from('ick_genel_sart').select('id, kod, metin, standart_id').eq('surum_id', plan.surum_id),
    db.from('ick_standart').select('id, no, ad').eq('surum_id', plan.surum_id),
    db.from('ick_genel_sart_degerlendirme').select('genel_sart_id, mevcut_durum, guvence, aciklama').eq('plan_id', planId),
  ])
  const { satirlar: eylemler, hata: eHata } = await ickPlanEylemleri(db, planId, mudAd)
  const eylemIdler = eylemler.map(e => e.id)
  const gecmisGorur = yetki.admin || yetki.koordinator || yetki.izleyici
  const [kisiler, isbirligi, logSayilari] = await Promise.all([
    ickEylemKisileri(db, eylemIdler),
    planKoord && eylemIdler.length
      ? db.from('ick_eylem_isbirligi').select('eylem_id, mudurluk_id').in('eylem_id', eylemIdler)
      : Promise.resolve({ data: [] }),
    gecmisGorur ? eylemLogSayilari(db, eylemIdler) : Promise.resolve(new Map<number, number>()),
  ])
  const isbHarita = new Map<number, number[]>()
  for (const r of (isbirligi.data as { eylem_id: number; mudurluk_id: number }[] | null) ?? []) {
    isbHarita.set(Number(r.eylem_id), [...(isbHarita.get(Number(r.eylem_id)) ?? []), Number(r.mudurluk_id)])
  }
  const stdAd = new Map(((standartlar.data as { id: number; no: number; ad: string }[] | null) ?? []).map(s => [s.id, `${s.no}. ${s.ad}`]))
  const deg = new Map(
    ((degerlendirmeler.data as { genel_sart_id: number; mevcut_durum: string; guvence: 'makul_guvence' | 'eylem_gerekli'; aciklama: string }[] | null) ?? []).map(d => [
      d.genel_sart_id,
      d,
    ]),
  )
  const gsListe = ((sartlar.data as { id: number; kod: string; metin: string; standart_id: number }[] | null) ?? []).sort((a, b) =>
    ickGenelSartSiralama(a.kod, b.kod),
  )
  const genelSartlar = gsListe.map(g => ({
    genelSartId: g.id,
    kod: g.kod,
    metin: g.metin,
    standart: stdAd.get(g.standart_id) ?? '',
    guvence: deg.get(g.id)?.guvence ?? null,
    mevcutDurum: deg.get(g.id)?.mevcut_durum ?? '',
    aciklama: deg.get(g.id)?.aciklama ?? '',
    eylemKodlari: eylemler.filter(e => e.genel_sart_id === g.id).map(e => e.kod_norm),
  }))

  const koordinatorler = koordHarita.get(planId) ?? []
  const aktif = eylemler.filter(e => e.durum !== 'iptal' && e.durum !== 'devredildi')
  const isKutusuVar = planKoord || eylemIdler.some(i => yetki.eylemRolleri[i] != null)
  const ekSekmeler = [
    ...(isKutusuVar
      ? [{ id: 'is-kutusu', ad: 'İş Kutum', icerik: <IckIsKutusuBolum db={db} yetki={yetki} planId={planId} mudAd={mudAd} /> }]
      : []),
    {
      id: 'inceleme',
      ad: `İnceleme (${incelemeSay.count ?? 0})`,
      icerik: <IckIncelemeBolum db={db} yetki={yetki} planId={planId} mudAd={mudAd} />,
    },
    { id: 'raporlar', ad: 'Raporlar', icerik: <IckRaporlarBolum db={db} yetki={yetki} planId={planId} /> },
  ]
  const tamam = aktif.filter(e => e.durum === 'tamamlandi').length
  const devam = aktif.filter(e => e.durum === 'devam').length
  const geciken = aktif.filter(e => e.gecikti).length
  const makul = genelSartlar.filter(g => g.guvence === 'makul_guvence').length

  return (
    <div className="space-y-6">
      <IckBaslik baslik={plan.ad}>
        <a href={`/api/ic-kontrol/plan/${planId}/word`} className={ICK_BUTON_IKINCIL}>
          Word indir
        </a>
        <a href={`/api/ic-kontrol/plan/${planId}/excel`} className={ICK_BUTON_IKINCIL}>
          Excel indir
        </a>
        {planKoord && !eylemler.some(e => !e.onceki_eylem_id) ? (
          <Link href={`/ic-kontrol/planlar/${planId}/aktarim`} className={ICK_BUTON_IKINCIL}>
            Excel&apos;den aktar
          </Link>
        ) : null}
        {yetki.admin || planKoord ? (
          <IckPlanFormClient
            ikincil
            dugmeMetni="Planı düzenle"
            mudurlukler={mudurlukler}
            baslangic={{
              id: planId,
              ad: plan.ad,
              kapsam: plan.kapsam,
              mudurlukId: plan.mudurluk_id,
              basYil: plan.bas_yil,
              bitYil: plan.bit_yil,
              koordinatorMudurlukId: plan.koordinator_mudurluk_id,
              koordinatorSiciller: koordinatorler.map(k => k.sicil),
              izlemeSikligi: plan.izleme_sikligi ?? 2,
              durum: plan.durum,
              onayTarihi: plan.onay_tarihi ?? '',
              onaySayi: plan.onay_sayi ?? '',
              bakanlikGonderimTarihi: plan.bakanlik_gonderim_tarihi ?? '',
              aciklama: plan.aciklama ?? '',
            }}
          />
        ) : null}
        {planKoord ? (
          <>
            <IckEylemFormClient
              dugmeMetni="Eylem ekle"
              planBasYil={plan.bas_yil}
              genelSartlar={gsListe}
              mudurlukler={mudurlukler}
              baslangic={{
                planId,
                genelSartId: 0,
                kod: '',
                ongorulenEylem: '',
                sorumluTur: 'mudurluk',
                sorumluMudurlukId: plan.koordinator_mudurluk_id,
                sorumluMetin: '',
                isbirligiKapsam: 'yok',
                isbirligiMudurlukIdleri: [],
                isbirligiMetin: '',
                cikti: '',
                terminMetin: '',
                aciklama: '',
                revizyonNotu: '',
                koordinatorSiciller: [],
                islemciSiciller: [],
                kisileriMudurlugeUygula: false,
              }}
            />
          </>
        ) : null}
        <Link href="/ic-kontrol/planlar" className={ICK_BUTON_GEZINTI}>
          Eylem Planları
        </Link>
      </IckBaslik>
      {eHata ? <IckUyari tur="hata" metin={ickHataMetni(eHata)} /> : null}

      <IckKart>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Dönem</dt>
            <dd className="font-medium text-slate-800">
              {plan.bas_yil}–{plan.bit_yil}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Durum</dt>
            <dd className="font-medium text-slate-800">{ICK_PLAN_DURUM_ETIKET[plan.durum as IckPlanDurum]}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Onay</dt>
            <dd className="font-medium text-slate-800">
              {plan.onay_tarihi ? `${ickTarihMetni(plan.onay_tarihi)}${plan.onay_sayi ? ` / ${plan.onay_sayi}` : ''}` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Koordinasyon müdürlüğü</dt>
            <dd className="font-medium text-slate-800">{plan.koordinator_mudurluk_id ? mudAd.get(plan.koordinator_mudurluk_id) : '—'}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-slate-500">İç kontrol koordinatörleri</dt>
            <dd className={`font-medium ${koordinatorler.length ? 'text-slate-800' : 'text-red-700'}`}>
              {koordinatorler.length ? koordinatorler.map(k => k.ad).join(', ') : 'Seçilmedi — planı düzenleyip koordinatör seçin.'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">İzleme sıklığı</dt>
            <dd className="font-medium text-slate-800">{ICK_IZLEME_SIKLIGI_ETIKET[plan.izleme_sikligi ?? 2]}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Eylem</dt>
            <dd className="font-medium text-slate-800">{aktif.length}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Tamamlanan / devam eden</dt>
            <dd className="font-medium text-slate-800">
              {tamam} / {devam}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Tamamlanma tarihi geçen</dt>
            <dd className={`font-medium ${geciken ? 'text-red-700' : 'text-slate-800'}`}>{geciken}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Makul güvence sağlanan genel şart</dt>
            <dd className="font-medium text-slate-800">
              {makul} / {genelSartlar.length}
            </dd>
          </div>
        </dl>
      </IckKart>

      <IckPlanDetayClient
        planId={planId}
        koordinator={planKoord}
        ekSekmeler={ekSekmeler}
        ilkSekme={sekme}
        genelSartlar={genelSartlar}
        planBasYil={plan.bas_yil}
        genelSartSecenek={gsListe}
        mudurlukler={mudurlukler}
        gecmisGorur={gecmisGorur}
        eylemler={eylemler.map(e => {
          const k = kisiler.get(e.id)
          return {
            id: e.id,
            kodNorm: e.kod_norm,
            genelSartKod: e.genelSartKod,
            ongorulenEylem: e.ongorulen_eylem,
            sorumlu: e.sorumlu,
            sorumluMudurlukId: e.sorumlu_tur === 'mudurluk' ? e.sorumlu_mudurluk_id : null,
            termin: e.terminGoster,
            durum: e.durum,
            ilerleme: e.ilerleme,
            gecikti: e.gecikti,
            sonAkis: e.sonAkis,
            devirNotu: e.onceki_eylem_id || e.durum === 'devredildi' ? e.devir_notu : '',
            koordinatorler: (k?.koordinatorler ?? []).map(x => x.ad).join(', '),
            islemciler: (k?.islemciler ?? []).map(x => x.ad).join(', '),
            logSayisi: logSayilari.get(e.id) ?? 0,
            form:
              planKoord && e.durum !== 'devredildi'
                ? {
                    id: e.id,
                    planId,
                    genelSartId: e.genel_sart_id,
                    kod: e.kod_norm,
                    ongorulenEylem: e.ongorulen_eylem,
                    sorumluTur: e.sorumlu_tur,
                    sorumluMudurlukId: e.sorumlu_mudurluk_id,
                    sorumluMetin: e.sorumlu_metin,
                    isbirligiKapsam: e.isbirligi_kapsam,
                    isbirligiMudurlukIdleri: isbHarita.get(e.id) ?? [],
                    isbirligiMetin: e.isbirligi_metin,
                    cikti: e.cikti,
                    terminMetin: e.termin_metin || e.terminGoster,
                    aciklama: e.aciklama,
                    revizyonNotu: '',
                    koordinatorSiciller: (k?.koordinatorler ?? []).map(x => x.sicil),
                    islemciSiciller: (k?.islemciler ?? []).map(x => x.sicil),
                    kisileriMudurlugeUygula: false,
                  }
                : null,
          }
        })}
      />
    </div>
  )
}
