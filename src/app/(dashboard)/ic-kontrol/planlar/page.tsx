import IckPlanFormClient from '@/components/ic-kontrol/IckPlanFormClient'
import IckPlanListeClient, { type IckPlanListeSatir } from '@/components/ic-kontrol/IckPlanListeClient'
import { IckBaslik, IckUyari } from '@/components/ic-kontrol/IckUi'
import { ICK_YETKI_YOK, ickHataMetni, ickSayfa } from '@/lib/ick/erisim'
import type { IckPlanDurum } from '@/lib/ick/tanim'
import { ickMudurlukler, ickTumMudurlukHaritasi } from '@/lib/ick/yukle'

type PlanKayit = {
  id: number
  ad: string
  kapsam: 'idare' | 'birim'
  mudurluk_id: number | null
  bas_yil: number
  bit_yil: number
  koordinator_mudurluk_id: number | null
  durum: IckPlanDurum
  onay_tarihi: string | null
  onay_sayi: string | null
  bakanlik_gonderim_tarihi: string | null
  aciklama: string | null
  created_at: string
}

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
  const gecmisGorur = yetki.admin || yetki.koordinator || yetki.izleyici
  const [planSorgu, mudurlukler, mudAd, eylemler, loglar] = await Promise.all([
    db.from('ick_plan').select('*').order('bas_yil', { ascending: false }).order('id', { ascending: false }),
    ickMudurlukler(db),
    ickTumMudurlukHaritasi(db),
    db.from('ick_eylem').select('plan_id, durum'),
    gecmisGorur ? db.from('ick_audit_log').select('kayit_id').eq('tablo', 'ick_plan') : Promise.resolve({ data: [] }),
  ])
  const planlar = (planSorgu.data as PlanKayit[] | null) ?? []
  const sayac = new Map<number, { toplam: number; tamam: number }>()
  for (const e of (eylemler.data as { plan_id: number; durum: string }[] | null) ?? []) {
    const s = sayac.get(e.plan_id) ?? { toplam: 0, tamam: 0 }
    if (e.durum !== 'iptal') s.toplam++
    if (e.durum === 'tamamlandi') s.tamam++
    sayac.set(e.plan_id, s)
  }
  const logSay = new Map<string, number>()
  for (const l of (loglar.data as { kayit_id: string }[] | null) ?? []) logSay.set(l.kayit_id, (logSay.get(l.kayit_id) ?? 0) + 1)
  const sira = new Map(
    planlar
      .slice()
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || a.id - b.id)
      .map((p, i) => [p.id, i + 1]),
  )
  const satirlar: IckPlanListeSatir[] = planlar.map(p => {
    const s = sayac.get(p.id) ?? { toplam: 0, tamam: 0 }
    return {
      id: p.id,
      sira: sira.get(p.id) ?? 0,
      ad: p.ad,
      kapsamMetni: p.kapsam === 'idare' ? 'İdare' : `Birim — ${mudAd.get(p.mudurluk_id ?? 0) ?? ''}`,
      basYil: p.bas_yil,
      bitYil: p.bit_yil,
      durum: p.durum,
      eylem: s.toplam,
      tamam: s.tamam,
      logSayisi: logSay.get(String(p.id)) ?? 0,
      form: {
        id: p.id,
        ad: p.ad,
        kapsam: p.kapsam,
        mudurlukId: p.mudurluk_id,
        basYil: p.bas_yil,
        bitYil: p.bit_yil,
        koordinatorMudurlukId: p.koordinator_mudurluk_id,
        durum: p.durum,
        onayTarihi: p.onay_tarihi ?? '',
        onaySayi: p.onay_sayi ?? '',
        bakanlikGonderimTarihi: p.bakanlik_gonderim_tarihi ?? '',
        aciklama: p.aciklama ?? '',
      },
    }
  })
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
        <p>
          Mevcut planın eylemleri Excel şablonundan aktarılır. Aktarım yalnızca eylemi olmayan plana yapılır. İşlemler sütununda kalem plan bilgilerini düzenler, saat oluşturma ve düzenleme geçmişini gösterir, göz plan detayını açar.
        </p>
      </div>
      {planSorgu.error ? <IckUyari tur="hata" metin={ickHataMetni(planSorgu.error.message)} /> : null}
      <IckPlanListeClient satirlar={satirlar} mudurlukler={mudurlukler} duzenleyebilir={yetki.koordinator} gecmisGorur={gecmisGorur} />
    </div>
  )
}
