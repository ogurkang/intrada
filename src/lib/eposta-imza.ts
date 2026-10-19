import type { SupabaseClient } from '@supabase/supabase-js'
import { getAppAccess } from '@/lib/app-access'
import { unvanMuduruMi } from '@/lib/kazanc-mudur-th-overlay'

export interface EpostaImza {
  adSoyad: string
  mudurluk: string
  unvan: string
  /** Tanımlar ekranındaki sabit metin (adres, telefon). Personel satırlarının altında durur. */
  sabit: string
  metin: string
}

function satir(v: string | null | undefined): string {
  return String(v ?? '').trim()
}

function kadroAcik(ayrilis: string | null | undefined): boolean {
  const t = satir(ayrilis).slice(0, 10)
  if (!t) return true
  return t > new Date().toISOString().slice(0, 10)
}

/** Vekil satırında unvan «müdürü» ise o unvan ve müdürlük imzaya yazılır. */
async function vekilMudurUnvani(
  supabase: SupabaseClient,
  sicil: string,
): Promise<{ unvan: string; mudurluk: string } | null> {
  const { data } = await supabase
    .from('kadro_hareketleri')
    .select('kadro_unvani, gorev_unvani, gorev_mudurlugu, kadro_mudurlugu, ayrilis_tarihi')
    .eq('vekil', sicil)
  const bugun = (data ?? []).filter(k => kadroAcik(k.ayrilis_tarihi))
  for (const k of bugun) {
    const kadro = satir(k.kadro_unvani)
    const gorev = satir(k.gorev_unvani)
    const unvan = unvanMuduruMi(kadro) ? kadro : unvanMuduruMi(gorev) ? gorev : ''
    if (!unvan) continue
    return { unvan, mudurluk: satir(k.gorev_mudurlugu) || satir(k.kadro_mudurlugu) }
  }
  return null
}

/** Gönderen personelin ad soyad, müdürlük ve görev unvanı; altında tanımlardaki imza metni. */
export async function epostaImzaOlustur(supabase: SupabaseClient, userId: string, sabitHam: string): Promise<EpostaImza> {
  const sabit = String(sabitHam ?? '').trim()
  const access = await getAppAccess(supabase, userId)
  let sicil = access.mode === 'kullanici' ? access.sicilNo.trim() : ''
  if (!sicil && access.mode !== 'dis_denetci') {
    const { data: profil } = await supabase.from('app_profiles').select('sicil_no').eq('id', userId).maybeSingle()
    sicil = satir(profil?.sicil_no)
  }

  let adSoyad = ''
  let mudurluk = ''
  let unvan = ''
  if (sicil) {
    const { data: ozet } = await supabase
      .from('personel_kadro_ozet')
      .select('ad_soyad, gorev_unvani, kadro_unvani, gorev_mudurlugu, kadro_mudurlugu')
      .eq('sicil_no', sicil)
      .maybeSingle()
    adSoyad = satir(ozet?.ad_soyad)
    mudurluk = satir(ozet?.gorev_mudurlugu) || satir(ozet?.kadro_mudurlugu)
    unvan = satir(ozet?.gorev_unvani) || satir(ozet?.kadro_unvani)
    const vekil = await vekilMudurUnvani(supabase, sicil)
    if (vekil) {
      unvan = vekil.unvan
      if (vekil.mudurluk) mudurluk = vekil.mudurluk
    }
    if (!adSoyad) {
      const { data: cal } = await supabase.from('calisan').select('ad_soyad').eq('sicil_no', sicil).maybeSingle()
      adSoyad = satir(cal?.ad_soyad)
    }
  }

  const ust = [adSoyad, mudurluk, unvan].filter(Boolean).join('\n')
  const metin = [ust, sabit].filter(Boolean).join('\n\n')
  return { adSoyad, mudurluk, unvan, sabit, metin }
}
