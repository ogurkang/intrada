import { createClient } from '@/lib/supabase/server'
import OrganizasyonListeClient from '@/components/tanimlar/OrganizasyonListeClient'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import { organizasyonEkle, organizasyonGuncelle, organizasyonToggleAktif } from './actions'
import type { Tables } from '@/types/database'

export const dynamic = 'force-dynamic'

export type OrganizasyonKayit = Tables<'tanim_organizasyon'> & { birim_sayisi: number }

export default async function OrganizasyonPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tanim_organizasyon')
    .select('*, tanim_organizasyon_birim ( id )')
    .order('organizasyon_adi')

  const kayitlar: OrganizasyonKayit[] = (data ?? []).map(row => {
    const { tanim_organizasyon_birim: birimler, ...rest } = row as typeof row & {
      tanim_organizasyon_birim?: { id: number }[]
    }
    return {
      ...(rest as Tables<'tanim_organizasyon'>),
      birim_sayisi: (birimler ?? []).length,
    }
  })

  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'tanim_organizasyon',
    kayitlar.map(k => String(k.id)),
  )

  return (
    <>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}
      <OrganizasyonListeClient
        data={kayitlar}
        auditLoglarByRefId={auditLoglarByRefId}
        onAdd={organizasyonEkle}
        onUpdate={organizasyonGuncelle}
        onToggle={organizasyonToggleAktif}
      />
    </>
  )
}
