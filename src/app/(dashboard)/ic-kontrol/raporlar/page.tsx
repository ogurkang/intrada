import { IckRaporlarBolum } from '@/components/ic-kontrol/IckPlanBolumleri'
import { IckBaslik, IckUyari } from '@/components/ic-kontrol/IckUi'
import { ICK_YETKI_YOK, ickSayfa } from '@/lib/ick/erisim'

export default async function IckRaporlarPage() {
  const { db, yetki, hata } = await ickSayfa()
  if (!yetki.okuyabilir) {
    return (
      <div className="space-y-6">
        <IckBaslik baslik="Raporlar" />
        <IckUyari metin={hata ?? ICK_YETKI_YOK} />
      </div>
    )
  }
  return (
    <div className="space-y-6">
      <IckBaslik baslik="Raporlar" />
      <IckRaporlarBolum db={db} yetki={yetki} />
    </div>
  )
}
