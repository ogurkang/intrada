import Link from 'next/link'
import { notFound } from 'next/navigation'
import IckEylemFormClient from '@/components/ic-kontrol/IckEylemFormClient'
import IckPlanDetayClient from '@/components/ic-kontrol/IckPlanDetayClient'
import IckPlanFormClient from '@/components/ic-kontrol/IckPlanFormClient'
import { ICK_BUTON_IKINCIL, IckBaslik, IckKart, IckUyari } from '@/components/ic-kontrol/IckUi'
import { ICK_YETKI_YOK, ickHataMetni, ickSayfa } from '@/lib/ick/erisim'
import { ICK_PLAN_DURUM_ETIKET, ickGenelSartSiralama, ickTarihMetni, type IckPlanDurum } from '@/lib/ick/tanim'
import { ickMudurlukler, ickPlanEylemleri, ickTumMudurlukHaritasi } from '@/lib/ick/yukle'

export default async function IckPlanDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  const [mudAd, mudurlukler, sartlar, standartlar, degerlendirmeler] = await Promise.all([
    ickTumMudurlukHaritasi(db),
    ickMudurlukler(db),
    db.from('ick_genel_sart').select('id, kod, metin, standart_id').eq('surum_id', plan.surum_id),
    db.from('ick_standart').select('id, no, ad').eq('surum_id', plan.surum_id),
    db.from('ick_genel_sart_degerlendirme').select('genel_sart_id, mevcut_durum, guvence, aciklama').eq('plan_id', planId),
  ])
  const { satirlar: eylemler, hata: eHata } = await ickPlanEylemleri(db, planId, mudAd)
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

  const aktif = eylemler.filter(e => e.durum !== 'iptal')
  const tamam = aktif.filter(e => e.durum === 'tamamlandi').length
  const devam = aktif.filter(e => e.durum === 'devam').length
  const geciken = aktif.filter(e => e.gecikti).length
  const makul = genelSartlar.filter(g => g.guvence === 'makul_guvence').length

  return (
    <div className="space-y-6">
      <IckBaslik baslik={plan.ad} geri={{ href: '/ic-kontrol/planlar', label: 'Eylem planları' }}>
        <a href={`/api/ic-kontrol/plan/${planId}/excel`} className={ICK_BUTON_IKINCIL}>
          Excel indir
        </a>
        {yetki.koordinator && eylemler.length === 0 ? (
          <Link href={`/ic-kontrol/planlar/${planId}/aktarim`} className={ICK_BUTON_IKINCIL}>
            Excel&apos;den aktar
          </Link>
        ) : null}
        {yetki.koordinator ? (
          <>
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
                durum: plan.durum,
                onayTarihi: plan.onay_tarihi ?? '',
                onaySayi: plan.onay_sayi ?? '',
                bakanlikGonderimTarihi: plan.bakanlik_gonderim_tarihi ?? '',
                aciklama: plan.aciklama ?? '',
              }}
            />
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
              }}
            />
          </>
        ) : null}
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
            <dt className="text-slate-500">Koordinasyon birimi</dt>
            <dd className="font-medium text-slate-800">{plan.koordinator_mudurluk_id ? mudAd.get(plan.koordinator_mudurluk_id) : '—'}</dd>
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
            <dt className="text-slate-500">Termini geçen</dt>
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
        koordinator={yetki.koordinator}
        genelSartlar={genelSartlar}
        eylemler={eylemler.map(e => ({
          id: e.id,
          kodNorm: e.kod_norm,
          genelSartKod: e.genelSartKod,
          ongorulenEylem: e.ongorulen_eylem,
          sorumlu: e.sorumlu,
          sorumluMudurlukId: e.sorumlu_mudurluk_id,
          termin: e.terminGoster,
          durum: e.durum,
          ilerleme: e.ilerleme,
          gecikti: e.gecikti,
          sonAkis: e.sonAkis,
        }))}
      />
    </div>
  )
}
