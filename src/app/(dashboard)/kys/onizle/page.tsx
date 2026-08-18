import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DenetimOnizlemeClient from '@/components/denetim/DenetimOnizlemeClient'

export const dynamic = 'force-dynamic'

export default async function KysOnizlePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const id = Number.parseInt((await searchParams).id ?? '', 10)
  if (!Number.isFinite(id) || id <= 0) notFound()

  const supabase = await createClient()
  const [{ data: belge }, { data: { user } }] = await Promise.all([
    supabase.from('kys_belge').select('id, dosya_adi, mime_type').eq('id', id).maybeSingle(),
    supabase.auth.getUser(),
  ])
  if (!belge) notFound()

  if (user) {
    const { data: profil } = await supabase
      .from('app_profiles')
      .select('profil_turu, kullanici_adi, ad_soyad, kurum_adi, e_posta')
      .eq('id', user.id)
      .maybeSingle()
    await supabase.from('kys_belge_goruntuleme').insert({
      belge_id: id,
      viewed_by: user.id,
      viewed_by_email: profil?.e_posta ?? user.email ?? null,
      viewed_by_username: profil?.kullanici_adi ?? null,
      viewed_by_name: profil?.ad_soyad ?? null,
      viewed_by_institution: profil?.kurum_adi ?? null,
      viewed_by_profile_kind: profil?.profil_turu ?? 'personel',
    })
  }

  return (
    <DenetimOnizlemeClient
      belgeUrl={`/api/kys/onizle?id=${id}`}
      dosyaAdi={belge.dosya_adi}
      mimeType={belge.mime_type}
    />
  )
}
