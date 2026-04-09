import { createClient } from '@/lib/supabase/server'
import ZabitaHavuzuClient from '@/components/kesintiler/ZabitaHavuzuClient'
import { ayyZabitaHavuzSatirlari } from '@/lib/ayy-zabita-havuz'

export default async function ZabitaHavuzuPage() {
  const supabase = await createClient()
  const satirlar = await ayyZabitaHavuzSatirlari(supabase)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Zabıta Havuzu (AYY)</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Düzenlemeleri yapın, kaydedin; bu sekme kaydet sonrası otomatik kapanır.
        </p>
      </div>
      <ZabitaHavuzuClient satirlar={satirlar} closeAfterSave />
    </div>
  )
}
