import { redirect } from 'next/navigation'
import { ickSayfa } from '@/lib/ick/erisim'
import { ickPlanlar, ickVarsayilanPlan } from '@/lib/ick/yukle'

/** Eski menü adresleri: yürürlükteki planın ilgili sekmesine gider */
export async function ickPlanSekmesineYonlendir(sekme: 'is-kutusu' | 'inceleme'): Promise<never> {
  const { db, yetki } = await ickSayfa()
  if (!yetki.okuyabilir) redirect('/ic-kontrol/genel-bakis')
  const { planlar } = await ickPlanlar(db)
  const plan = ickVarsayilanPlan(planlar)
  redirect(plan ? `/ic-kontrol/planlar/${plan.id}?sekme=${sekme}` : '/ic-kontrol/planlar')
}
