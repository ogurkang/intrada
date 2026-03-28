import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import { fetchUnvanlarKadrodaPersonelAtanmis } from '@/lib/kazanc-unvan-kadro'
import KazancBilgiEkleClient from '@/components/tanimlar/KazancBilgiEkleClient'

export default async function KazancBilgiEklePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const saltOkunur = user ? (await getAppAccess(supabase, user.id)).mode === 'kullanici' : false

  const [unvanlar, { data: ogrenimler }] = await Promise.all([
    fetchUnvanlarKadrodaPersonelAtanmis(supabase),
    supabase.from('tanim_ogrenim').select('id, isim').eq('aktif', true).order('isim'),
  ])

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Kazanç Bilgisi Ekle</h1>
        <Link
          href="/tanimlar/kazanc-bilgi"
          className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50"
        >
          ← Listeye dön
        </Link>
      </div>

      <KazancBilgiEkleClient
        unvanlar={unvanlar}
        ogrenimler={(ogrenimler ?? []) as { id: number; isim: string }[]}
        saltOkunur={saltOkunur}
      />
    </div>
  )
}
