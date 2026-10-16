import IckTanimlarClient from '@/components/ic-kontrol/IckTanimlarClient'
import { IckBaslik, IckUyari } from '@/components/ic-kontrol/IckUi'
import { ICK_YETKI_YOK, ickHataMetni, ickSayfa } from '@/lib/ick/erisim'
import { ickUstYonetim } from '@/lib/ick/yukle'

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

  const [turler, bilesenler, standartlar, sartlar, ustYonetim] = await Promise.all([
    db.from('ick_belge_turu').select('id, ad, aciklama, sira, aktif').order('sira'),
    db.from('ick_bilesen').select('id, kod, ad, sira').order('sira'),
    db.from('ick_standart').select('id, bilesen_id, no, ad, aciklama').order('no'),
    db.from('ick_genel_sart').select('id, standart_id, kod, sira, metin').order('sira'),
    ickUstYonetim(db),
  ])
  const ilkHata = turler.error ?? sartlar.error

  return (
    <div className="space-y-6">
      <IckBaslik baslik="İç Kontrol Tanımları" />
      <div className="w-full space-y-3 text-sm leading-6 text-slate-600">
        <p>
          İç kontrol koordinatörleri her planda, planın koordinasyon müdürlüğü personelinden seçilir. Müdürlük koordinatörü ve müdürlük işlemcisi her eylemde, sorumlu
          müdürlüğün personelinden seçilir. Belediye Başkanı ve Başkan Yardımcıları aktif organizasyondan otomatik olarak izleyicidir.
        </p>
        <p>
          Bileşen, standart ve genel şart metinleri Kamu İç Kontrol Standartları Tebliğinden gelir ve sürümlüdür. Mevzuat değişirse yeni sürüm eklenir; eski planlar kendi sürümüne bağlı kalır.
        </p>
      </div>
      {ilkHata ? <IckUyari tur="hata" metin={ickHataMetni(ilkHata.message)} /> : null}
      <IckTanimlarClient
        yetki={{ admin: yetki.admin, koordinator: yetki.koordinator }}
        izleyiciler={ustYonetim.map(u => ({ ad: u.ad, gorev: u.gorev }))}
        turler={turler.data ?? []}
        bilesenler={bilesenler.data ?? []}
        standartlar={standartlar.data ?? []}
        sartlar={sartlar.data ?? []}
      />
    </div>
  )
}
