import { notFound } from 'next/navigation'
import IckAktarimClient from '@/components/ic-kontrol/IckAktarimClient'
import { IckBaslik, IckUyari } from '@/components/ic-kontrol/IckUi'
import { ickPlanKoordinatoru, ickSayfa } from '@/lib/ick/erisim'
import { ickMudurlukler } from '@/lib/ick/yukle'

export default async function IckAktarimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const planId = Number(id)
  const { db, yetki } = await ickSayfa()
  const geri = { href: `/ic-kontrol/planlar/${planId}`, label: 'Plana dön' }
  if (!ickPlanKoordinatoru(yetki, planId)) {
    return (
      <div className="space-y-6">
        <IckBaslik baslik="Excel'den Aktarım" geri={geri} />
        <IckUyari metin="Aktarımı bu planın iç kontrol koordinatörü yapar." />
      </div>
    )
  }
  const { data: plan } = await db.from('ick_plan').select('id, ad').eq('id', planId).maybeSingle()
  if (!plan) notFound()
  const { count } = await db
    .from('ick_eylem')
    .select('id', { count: 'exact', head: true })
    .eq('plan_id', planId)
    .is('onceki_eylem_id', null)
  const mudurlukler = await ickMudurlukler(db)

  return (
    <div className="space-y-6">
      <IckBaslik baslik={`Excel'den Aktarım — ${plan.ad}`} geri={geri} />
      <div className="w-full space-y-3 text-sm leading-6 text-slate-600">
        <p>
          Dosya önce önizlenir. Genel şart kodu mevzuat listesinde aranır, eylem kodu &quot;KOS 01&quot; biçimine çevrilir, müdürlük adı müdürlük tanımıyla eşlenir, tamamlanma tarihi metni tarihe çevrilir. Hatasız önizleme aktarılır. Dosyanın özeti ve satırları aktarım kaydında saklanır.
        </p>
        <p>
          Gerçekleşmeler sayfasındaki satırlar onaylı izleme raporundan geldiği için kesinleşmiş olarak yazılır; kayda &quot;onaylı izleme raporundan aktarıldı&quot; notu düşülür.
        </p>
        <p>
          Aktarımdan sonra gerçekleşmelerin ait olduğu yılın izleme dönemleri &quot;Tamamlandı&quot; olarak kapatılır ve bu dönemlerin içeriği aktarılan gerçekleşmelerden
          oluşur. Her yıl tekrarlanan ve sürekli eylemler sonraki yıldan itibaren dönemlere girer.
        </p>
      </div>
      {(count ?? 0) > 0 ? (
        <IckUyari metin="Bu planda eylem var. Aktarım yalnızca boş plana yapılır." />
      ) : (
        <IckAktarimClient planId={planId} mudurlukler={mudurlukler} />
      )}
    </div>
  )
}
