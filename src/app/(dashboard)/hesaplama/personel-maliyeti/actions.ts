'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { kullaniciPathAllowed } from '@/lib/menu-yetki'
import {
  personelMaliyetBelgeCoz,
  type PersonelMaliyetBelge,
} from '@/lib/personel-maliyet-hesap'

async function oturum() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum bulunamadı. Tekrar giriş yapın.' as const }
  const access = await getAppAccess(supabase, user.id)
  if (isAdminLike(access)) return { supabase }
  if (
    access.mode === 'kullanici' &&
    kullaniciPathAllowed('/hesaplama', access.sicilNo, access.menuIzinleri)
  ) {
    return { supabase }
  }
  return { hata: 'Bu ekrana erişim yok.' as const }
}

export async function personelMaliyetOku(): Promise<{ belge: PersonelMaliyetBelge | null; uyari?: string }> {
  const ot = await oturum()
  if ('hata' in ot) return { belge: null, uyari: ot.hata }
  const { supabase } = ot
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data, error } = await sb
    .from('hesaplama_personel_maliyet')
    .select('belge')
    .eq('id', 1)
    .maybeSingle()
  if (error) {
    const mesaj = String(error.message ?? '')
    if (mesaj.includes('hesaplama_personel_maliyet') || mesaj.includes('schema cache')) {
      return { belge: null, uyari: 'tablo-yok' }
    }
    return { belge: null, uyari: mesaj }
  }
  if (!data?.belge) return { belge: null }
  const belge = personelMaliyetBelgeCoz(data.belge)
  if (!belge) return { belge: null, uyari: 'Kayıtlı senaryo okunamadı.' }
  return { belge }
}

export async function personelMaliyetKaydet(belge: PersonelMaliyetBelge): Promise<{ hata?: string }> {
  const ot = await oturum()
  if ('hata' in ot) return { hata: ot.hata }
  const { supabase } = ot
  if (!personelMaliyetBelgeCoz(belge)) return { hata: 'Senaryo eksik.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { error } = await sb.from('hesaplama_personel_maliyet').upsert({
    id: 1,
    belge,
    updated_at: new Date().toISOString(),
  })
  if (error) {
    const mesaj = String(error.message ?? '')
    if (mesaj.includes('hesaplama_personel_maliyet') || mesaj.includes('schema cache')) {
      return { hata: 'tablo-yok' }
    }
    return { hata: mesaj }
  }
  revalidatePath('/hesaplama')
  revalidatePath('/hesaplama/personel-maliyeti')
  revalidatePath('/hesaplama/tanimlar')
  return {}
}
