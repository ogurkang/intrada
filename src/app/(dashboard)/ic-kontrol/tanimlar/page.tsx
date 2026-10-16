import IckTanimlarClient, { type IckRolSatir } from '@/components/ic-kontrol/IckTanimlarClient'
import { IckBaslik, IckUyari } from '@/components/ic-kontrol/IckUi'
import { ICK_YETKI_YOK, ickHataMetni, ickSayfa } from '@/lib/ick/erisim'
import { ickKullaniciAdlari, ickMudurlukler } from '@/lib/ick/yukle'

export default async function IckTanimlarPage() {
  const { db, yetki, hata } = await ickSayfa()
  if (!yetki.okuyabilir) {
    return (
      <div className="space-y-6">
        <IckBaslik baslik="İç Kontrol Tanımları" />
        <IckUyari metin={hata ?? ICK_YETKI_YOK} />
      </div>
    )
  }

  const [roller, turler, bilesenler, standartlar, sartlar, mudurlukler, profiller] = await Promise.all([
    db.from('ick_rol_atama').select('id, user_id, rol, mudurluk_id, baslangic, bitis, aciklama').order('baslangic', { ascending: false }),
    db.from('ick_belge_turu').select('id, ad, aciklama, sira, aktif').order('sira'),
    db.from('ick_bilesen').select('id, kod, ad, sira').order('sira'),
    db.from('ick_standart').select('id, bilesen_id, no, ad, aciklama').order('no'),
    db.from('ick_genel_sart').select('id, standart_id, kod, sira, metin').order('sira'),
    ickMudurlukler(db),
    yetki.admin ? db.from('app_profiles').select('id, ad_soyad, kullanici_adi, hesap_aktif').order('ad_soyad') : Promise.resolve({ data: [] }),
  ])
  const ilkHata = roller.error ?? turler.error ?? sartlar.error
  const rolSatirlari = (roller.data as Omit<IckRolSatir, 'kullanici'>[] | null) ?? []
  const adlar = await ickKullaniciAdlari(db, rolSatirlari.map(r => r.user_id))

  return (
    <div className="space-y-6">
      <IckBaslik baslik="İç Kontrol Tanımları" />
      <div className="w-full space-y-3 text-sm leading-6 text-slate-600">
        <p>
          Rol atamasını yönetici yapar. İç kontrol koordinatörü planı ve eylemleri yönetir, birim bildirimlerini inceler, kesinleştirir veya iade eder. Birim yöneticisi ve birim iç kontrol ve risk koordinatörü yalnızca kendi müdürlüğünün eylemlerinde bildirim girer. İzleyici okur. Yönetici hesabı kendiliğinden koordinatör değildir; koordinatörlük ayrıca atanır.
        </p>
        <p>
          Bileşen, standart ve genel şart metinleri Kamu İç Kontrol Standartları Tebliğinden gelir ve sürümlüdür. Mevzuat değişirse yeni sürüm eklenir; eski planlar kendi sürümüne bağlı kalır.
        </p>
      </div>
      {ilkHata ? <IckUyari tur="hata" metin={ickHataMetni(ilkHata.message)} /> : null}
      <IckTanimlarClient
        yetki={{ admin: yetki.admin, koordinator: yetki.koordinator }}
        roller={rolSatirlari.map(r => ({ ...r, kullanici: adlar.get(r.user_id) ?? 'Kullanıcı' }))}
        turler={turler.data ?? []}
        bilesenler={bilesenler.data ?? []}
        standartlar={standartlar.data ?? []}
        sartlar={sartlar.data ?? []}
        mudurlukler={mudurlukler}
        kullanicilar={((profiller.data as { id: string; ad_soyad: string | null; kullanici_adi: string | null; hesap_aktif: boolean | null }[] | null) ?? [])
          .filter(p => p.hesap_aktif !== false)
          .map(p => ({ id: p.id, ad: (p.ad_soyad || p.kullanici_adi || p.id).trim() }))}
      />
    </div>
  )
}
