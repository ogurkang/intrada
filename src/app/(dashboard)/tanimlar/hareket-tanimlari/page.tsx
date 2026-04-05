import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import BasitTanimClient from '@/components/tanimlar/BasitTanimClient'
import { hareketTanimEkle, hareketTanimGuncelle, hareketTanimToggleAktif } from './actions'
import type { Tables } from '@/types/database'

export const dynamic = 'force-dynamic'

type HareketTanim = Tables<'tanim_hareket_tanim'>

export default async function HareketTanimlariPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const saltOkunur = user ? (await getAppAccess(supabase, user.id)).mode === 'kullanici' : false

  const { data, error } = await supabase
    .from('tanim_hareket_tanim')
    .select('*')
    .order('tip')
    .order('tur')
    .order('id')

  const kayitlar: HareketTanim[] = (data ?? []) as HareketTanim[]

  return (
    <>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
          {error.message.includes('relation') && (
            <span className="block mt-2 text-xs">
              Veritabanında <code className="bg-red-100 px-1 rounded">tanim_hareket_tanim</code> tablosunun oluşturulmuş
              olduğundan emin olun (migration).
            </span>
          )}
        </div>
      )}
      <BasitTanimClient<HareketTanim>
        baslik="Hareket Tanımları"
        data={kayitlar}
        nameField="tip"
        nameLabel="Tanım"
        extraSelectFields={[
          {
            key: 'tur',
            label: 'Tür',
            required: true,
            options: [
              { value: 'Geliş', label: 'Geliş' },
              { value: 'Gidiş', label: 'Gidiş' },
            ],
          },
        ]}
        onAdd={hareketTanimEkle}
        onUpdate={hareketTanimGuncelle}
        onToggle={hareketTanimToggleAktif}
        ustBaglantilar={
          !saltOkunur ? (
            <Link
              href="/tanimlar/hareket-tanimlari/ekle"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 border border-slate-300 text-slate-800 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Çoklu ekle
            </Link>
          ) : null
        }
      />
    </>
  )
}
