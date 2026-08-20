import { TASINIR_GOREVLENDIRME_MENU_ANAHTAR } from '@/lib/tasinir-gorevi'

/** Uygulama ayarı oku (tablo yoksa / hata olursa varsayılan). */
export async function uygulamaAyarOku(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  anahtar: string,
): Promise<string | null> {
  try {
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

export async function tasinirGorevlendirmeMenuAcikMi(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<boolean> {
  const deger = await uygulamaAyarOku(supabase, TASINIR_GOREVLENDIRME_MENU_ANAHTAR)
  // Migration çalışmadan önce menü görünür kalsın
  if (deger == null) return true
  return deger === 'aktif'
}
