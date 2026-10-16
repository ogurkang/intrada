import { notFound } from 'next/navigation'
import IckEylemKartClient, {
  type IckBelgeSatir,
  type IckBelgeVersiyon,
  type IckGecmisSatir,
  type IckGerceklesmeSatir,
} from '@/components/ic-kontrol/IckEylemKartClient'
import { ICK_BUTON_GEZINTI, IckBaslik, IckKart, IckRozet, IckUyari } from '@/components/ic-kontrol/IckUi'
import Link from 'next/link'
import { ICK_YETKI_YOK, ickEylemGonderebilir, ickEylemYazabilir, ickHataMetni, ickPlanKoordinatoru, ickSayfa } from '@/lib/ick/erisim'
import {
  ICK_DOGRUDAN_IBARE,
  ICK_EYLEM_DURUM_ETIKET,
  ICK_TERMIN_TIPI_ETIKET,
  ICK_VEKALET_IBARE,
  ickBugun,
  ickGecikti,
  ickPlanKisaAd,
  ickTarihMetni,
  ickTerminGoster,
} from '@/lib/ick/tanim'
import {
  ICK_EYLEM_KOLON,
  ickEylemKisileri,
  ickKullaniciAdlari,
  ickSorumluAdi,
  ickTumMudurlukHaritasi,
  type IckEylemKayit,
} from '@/lib/ick/yukle'

const ALAN_ETIKET: Record<string, string> = {
  akis: 'Akış',
  beyan_durum: 'Bildirilen durum',
  beyan_ilerleme: 'İlerleme',
  calisma: 'Çalışma',
  kanit_aciklama: 'Kanıt açıklaması',
  kanit_yeterlilik: 'Kanıt yeterliliği',
  degerlendirme: 'Değerlendirme',
  sonuc: 'Sonuç',
  iade_gerekcesi: 'İade gerekçesi',
  istisna_gerekcesi: 'İstisna gerekçesi',
  durum: 'Durum',
  ilerleme: 'İlerleme',
  termin_guncel: 'Güncel tamamlanma tarihi',
  revizyon_notu: 'Revizyon notu',
  ongorulen_eylem: 'Öngörülen eylem',
  sorumlu_mudurluk_id: 'Sorumlu müdürlük',
  cikti: 'Çıktı',
  aktif: 'Aktif',
  pasif_gerekce: 'Pasif gerekçesi',
  vekalet_kaynak: 'Bilginin kaynağı',
  vekalet_aciklama: 'Kaynak açıklaması',
}

const TABLO_ETIKET: Record<string, string> = {
  ick_eylem: 'Eylem',
  ick_gerceklesme: 'Bildirim',
  ick_belge: 'Belge',
  ick_belge_versiyon: 'Belge sürümü',
}

export default async function IckEylemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const eylemId = Number(id)
  const { db, yetki, hata } = await ickSayfa()
  if (!yetki.okuyabilir) {
    return (
      <div className="space-y-6">
        <IckBaslik baslik="Eylem" />
        <IckUyari metin={hata ?? ICK_YETKI_YOK} />
      </div>
    )
  }
  const { data: eRaw, error } = await db.from('ick_eylem').select(ICK_EYLEM_KOLON).eq('id', eylemId).maybeSingle()
  if (error) return <IckUyari tur="hata" metin={ickHataMetni(error.message)} />
  if (!eRaw) notFound()
  const eylem = eRaw as IckEylemKayit

  const [planR, gsR, isbR, gerR, turR, mudAd, kisiHarita, devirR] = await Promise.all([
    db.from('ick_plan').select('id, ad, bas_yil, bit_yil, surum_id').eq('id', eylem.plan_id).maybeSingle(),
    db.from('ick_genel_sart').select('id, kod, metin, surum_id'),
    db.from('ick_eylem_isbirligi').select('mudurluk_id').eq('eylem_id', eylemId),
    db.from('ick_gerceklesme').select('*').eq('eylem_id', eylemId).order('created_at', { ascending: false }),
    db.from('ick_belge_turu').select('id, ad, aktif').order('sira'),
    ickTumMudurlukHaritasi(db),
    ickEylemKisileri(db, [eylemId]),
    db
      .from('ick_eylem')
      .select('id, plan_id, kod_norm, ick_plan!plan_id(ad)')
      .or(`onceki_eylem_id.eq.${eylemId}${eylem.onceki_eylem_id ? `,id.eq.${eylem.onceki_eylem_id}` : ''}`),
  ])
  type Bagli = { id: number; plan_id: number; kod_norm: string; ick_plan: { ad: string } | null }
  const bagli = (devirR.data as Bagli[] | null) ?? []
  const onceki = bagli.find(b => b.id === eylem.onceki_eylem_id) ?? null
  const sonraki = bagli.find(b => b.id !== eylem.onceki_eylem_id) ?? null
  const kisiler = kisiHarita.get(eylemId) ?? { koordinatorler: [], islemciler: [] }
  const plan = planR.data as { id: number; ad: string; bas_yil: number; bit_yil: number; surum_id: number }
  const tumGs = (gsR.data as { id: number; kod: string; metin: string; surum_id: number }[] | null) ?? []
  const gs = tumGs.find(g => g.id === eylem.genel_sart_id)
  const isbirligiIdleri = ((isbR.data as { mudurluk_id: number }[] | null) ?? []).map(r => Number(r.mudurluk_id))
  const gerceklesmeHam = (gerR.data as (IckGerceklesmeSatir & { karar_veren_id?: string | null })[] | null) ?? []
  const gerIdleri = gerceklesmeHam.map(g => g.id)

  const belgeSorgu = db
    .from('ick_belge')
    .select('id, belge_turu_id, eylem_id, gerceklesme_id, baslik, aktif, pasif_gerekce, created_by, created_by_ad, created_at')
  const { data: belgeHam } = gerIdleri.length
    ? await belgeSorgu.or(`eylem_id.eq.${eylemId},gerceklesme_id.in.(${gerIdleri.join(',')})`)
    : await belgeSorgu.eq('eylem_id', eylemId)
  const belgeler = (belgeHam as Omit<IckBelgeSatir, 'versiyonlar' | 'tur'>[] | null) ?? []
  const belgeIdleri = belgeler.map(b => b.id)
  const { data: versiyonHam } = belgeIdleri.length
    ? await db
        .from('ick_belge_versiyon')
        .select('id, belge_id, versiyon, dosya_adi, boyut_byte, sha256, yukleyen_id, yukleyen_ad, created_at')
        .in('belge_id', belgeIdleri)
        .order('versiyon', { ascending: false })
    : { data: [] }
  const turAd = new Map(((turR.data as { id: number; ad: string }[] | null) ?? []).map(t => [t.id, t.ad]))
  const versiyonHamSatir = (versiyonHam as (IckBelgeVersiyon & { yukleyen_id?: string | null })[] | null) ?? []
  const kisiIdler = [
    ...gerceklesmeHam.flatMap(g => [g.olusturan_id, g.gonderen_id, g.karar_veren_id ?? null]),
    ...belgeler.map(b => b.created_by),
    ...versiyonHamSatir.map(v => v.yukleyen_id ?? null),
  ].filter((x): x is string => Boolean(x))
  const kisiAdlari = await ickKullaniciAdlari(db, kisiIdler)
  const adYaz = (id: string | null | undefined, kayitli: string) => {
    const sistem = id ? kisiAdlari.get(id) : undefined
    if (sistem) return sistem
    const k = (kayitli ?? '').trim()
    return k && !/^\d+$/.test(k) ? k : 'Ad soyad yok'
  }
  const gerceklesmeler: IckGerceklesmeSatir[] = gerceklesmeHam.map(g => ({
    ...g,
    olusturan_ad: adYaz(g.olusturan_id, g.olusturan_ad),
    gonderen_ad: adYaz(g.gonderen_id, g.gonderen_ad),
    karar_veren_ad: adYaz(g.karar_veren_id, g.karar_veren_ad),
  }))
  const versiyonlar: IckBelgeVersiyon[] = versiyonHamSatir.map(v => ({ ...v, yukleyen_ad: adYaz(v.yukleyen_id, v.yukleyen_ad) }))
  const belgeSatirlari: IckBelgeSatir[] = belgeler.map(b => ({
    ...b,
    created_by_ad: adYaz(b.created_by, b.created_by_ad),
    tur: turAd.get(b.belge_turu_id) ?? '',
    versiyonlar: versiyonlar.filter(v => v.belge_id === b.id),
  }))

  let gecmis: IckGecmisSatir[] = []
  const gecmisGorur = yetki.admin || yetki.koordinator || yetki.izleyici
  if (gecmisGorur) {
    const kayitlar = [
      `and(tablo.eq.ick_eylem,kayit_id.eq.${eylemId})`,
      ...(gerIdleri.length ? [`and(tablo.eq.ick_gerceklesme,kayit_id.in.(${gerIdleri.join(',')}))`] : []),
      ...(belgeIdleri.length ? [`and(tablo.eq.ick_belge,kayit_id.in.(${belgeIdleri.join(',')}))`] : []),
    ]
    const { data: log } = await db
      .from('ick_audit_log')
      .select('id, tablo, kayit_id, islem, onceki, sonraki, actor_id, created_at')
      .or(kayitlar.join(','))
      .order('created_at', { ascending: false })
      .limit(200)
    const satirlar = (log as { id: number; tablo: string; kayit_id: string; islem: string; onceki: Record<string, unknown> | null; sonraki: Record<string, unknown> | null; actor_id: string | null; created_at: string }[] | null) ?? []
    const adlar = await ickKullaniciAdlari(db, satirlar.map(s => s.actor_id).filter((x): x is string => Boolean(x)))
    gecmis = satirlar.map(s => {
      const degisen =
        s.islem === 'UPDATE' && s.onceki && s.sonraki
          ? Object.keys(ALAN_ETIKET)
              .filter(k => JSON.stringify(s.onceki?.[k]) !== JSON.stringify(s.sonraki?.[k]))
              .map(k => {
                const once = s.onceki?.[k]
                const sonra = s.sonraki?.[k]
                return `${ALAN_ETIKET[k]}: ${once == null || once === '' ? '—' : String(once)} → ${sonra == null || sonra === '' ? '—' : String(sonra)}`
              })
          : []
      const kayit = s.sonraki ?? s.onceki
      const ekler =
        s.tablo === 'ick_gerceklesme' && kayit?.vekaleten
          ? ` — ${ICK_VEKALET_IBARE}${s.sonraki?.dogrudan && !s.onceki?.dogrudan ? `; ${ICK_DOGRUDAN_IBARE}` : ''}`
          : ''
      return {
        id: s.id,
        zaman: s.created_at,
        kim: s.actor_id ? adlar.get(s.actor_id) ?? 'Kullanıcı' : 'Sistem',
        ne: `${TABLO_ETIKET[s.tablo] ?? s.tablo} #${s.kayit_id} ${s.islem === 'INSERT' ? 'oluşturuldu' : s.islem === 'UPDATE' ? 'güncellendi' : 'silindi'}${ekler}`,
        degisen,
      }
    })
  }

  const planKoord = ickPlanKoordinatoru(yetki, eylem.plan_id)
  const kapali = eylem.durum === 'iptal' || eylem.durum === 'devredildi'
  const yazabilir = !kapali && ickEylemYazabilir(yetki, eylem)
  const gonderebilir = !kapali && ickEylemGonderebilir(yetki, eylem)
  const bugun = ickBugun()
  const gecikti = ickGecikti(eylem, bugun)
  const tekrarlayan = eylem.termin_tipi === 'yillik' || eylem.termin_tipi === 'alti_aylik'

  return (
    <div className="space-y-6">
      <IckBaslik baslik={`${eylem.kod_norm} — ${gs?.kod ?? ''}`}>
        <Link href={`/ic-kontrol/planlar/${plan.id}`} className={ICK_BUTON_GEZINTI}>
          {ickPlanKisaAd(plan.bas_yil, plan.bit_yil)} Ana Sayfa
        </Link>
      </IckBaslik>

      <IckKart>
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-slate-500">Genel şart {gs?.kod}</p>
            <p className="text-slate-800">{gs?.metin}</p>
          </div>
          <div>
            <p className="text-slate-500">Öngörülen eylem</p>
            <p className="text-slate-800 font-medium">{eylem.ongorulen_eylem}</p>
          </div>
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <dt className="text-slate-500">Sorumlu</dt>
              <dd className="text-slate-800">
                {ickSorumluAdi(eylem, mudAd)}
                {eylem.sorumlu_tur === 'mudurluk' ? (
                  <>
                    {kisiler.koordinatorler.length ? (
                      <span className="block text-xs text-slate-500">Müdürlük koordinatörü: {kisiler.koordinatorler.map(k => k.ad).join(', ')}</span>
                    ) : (
                      <span className="block text-xs text-red-700">Müdürlük koordinatörü seçilmedi; bildirim gönderilemez.</span>
                    )}
                    {kisiler.islemciler.length ? (
                      <span className="block text-xs text-slate-500">Müdürlük işlemcisi: {kisiler.islemciler.map(k => k.ad).join(', ')}</span>
                    ) : null}
                  </>
                ) : (
                  <span className="block text-xs text-slate-500">Bildirimi planın koordinatörleri girer ve birbirlerine gönderir.</span>
                )}
              </dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-slate-500">İşbirliği</dt>
              <dd className="text-slate-800">
                {eylem.isbirligi_metin || '—'}
                {isbirligiIdleri.length ? (
                  <span className="block text-xs text-slate-500">Bağlı müdürlükler: {isbirligiIdleri.map(i => mudAd.get(i)).join('; ')}</span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Çıktı / sonuç</dt>
              <dd className="text-slate-800">{eylem.cikti || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Tamamlanma Tarihi</dt>
              <dd className="text-slate-800">
                {ickTerminGoster(eylem)} <span className="text-xs text-slate-500">({ICK_TERMIN_TIPI_ETIKET[eylem.termin_tipi]})</span>
                {eylem.termin_ilk && eylem.termin_guncel !== eylem.termin_ilk ? (
                  <span className="block text-xs text-slate-500">İlk tamamlanma tarihi: {ickTarihMetni(eylem.termin_ilk)}</span>
                ) : null}
                {gecikti ? <span className="block text-xs font-medium text-red-700">Tamamlanma tarihi geçti</span> : null}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Kesinleşmiş durum</dt>
              <dd>
                <IckRozet
                  durum={eylem.durum}
                  etiket={eylem.durum === 'devam' ? `Devam %${Math.round(Number(eylem.ilerleme))}` : ICK_EYLEM_DURUM_ETIKET[eylem.durum]}
                />
              </dd>
            </div>
          </dl>
          {onceki ? (
            <p className="text-xs text-violet-700">
              {eylem.devir_notu || 'Önceki eylem planından.'}{' '}
              <Link href={`/ic-kontrol/eylemler/${onceki.id}`} className="underline">
                Önceki eylemi aç ({onceki.kod_norm})
              </Link>
            </p>
          ) : null}
          {eylem.durum === 'devredildi' ? (
            <p className="text-xs text-violet-700">
              {eylem.devir_notu || 'Yeni plana devredildi.'}{' '}
              {sonraki ? (
                <Link href={`/ic-kontrol/eylemler/${sonraki.id}`} className="underline">
                  Yeni plandaki eylemi aç ({sonraki.kod_norm})
                </Link>
              ) : null}
            </p>
          ) : null}
          {eylem.revizyon_notu ? <p className="text-xs text-slate-500">Son revizyon: {eylem.revizyon_notu}</p> : null}
          {eylem.aciklama ? <p className="text-xs text-slate-500">Açıklama: {eylem.aciklama}</p> : null}
        </div>
      </IckKart>

      <IckEylemKartClient
        eylemId={eylem.id}
        eylemDurum={eylem.durum}
        tekrarlayan={tekrarlayan}
        planYillari={[plan.bas_yil, plan.bit_yil]}
        gerceklesmeler={gerceklesmeler}
        belgeler={belgeSatirlari}
        belgeTurleri={((turR.data as { id: number; ad: string; aktif: boolean }[] | null) ?? []).filter(t => t.aktif)}
        gecmis={gecmis}
        gecmisGorur={gecmisGorur}
        yetki={{ userId: yetki.userId, koordinator: planKoord, yazabilir, gonderebilir }}
      />
    </div>
  )
}
