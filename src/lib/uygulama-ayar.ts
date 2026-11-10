import { unstable_cache } from 'next/cache'
import { TASINIR_GOREVLENDIRME_MENU_ANAHTAR } from '@/lib/tasinir-gorevi'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

async function rawUygulamaAyarOku(anahtar: string): Promise<string | null> {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('uygulama_ayar')
      .select('deger')
      .eq('anahtar', anahtar)
      .maybeSingle()
    if (error) return null
    return data?.deger != null ? String(data.deger) : null
  } catch {
    return null
  }
}

/** Uygulama ayarı oku (önbellekli: 10 dakika). */
export async function uygulamaAyarOku(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  _supabase: any,
  anahtar: string,
): Promise<string | null> {
  return unstable_cache(
    async () => rawUygulamaAyarOku(anahtar),
    [`uygulama-ayar-${anahtar}`],
    { revalidate: 600, tags: ['uygulama-ayar'] },
  )()
}

export async function tasinirGorevlendirmeMenuAcikMi(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<boolean> {
  const deger = await uygulamaAyarOku(supabase, TASINIR_GOREVLENDIRME_MENU_ANAHTAR)
  // Migration çalışmadan önce menü görünür kalsın
  if (deger == null) return true
  return deger === 'aktif'
}
