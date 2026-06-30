import type { SupabaseClient } from '@supabase/supabase-js'
import { getAppAccess, isAdminLike, type AppAccess } from '@/lib/app-access'

/**
 * Kullanıcının aktif kadro satırlarında (asil veya vekil) görev müdürlüğü kümesi.
 * Alan: gorev_mudurlugu ?? kadro_mudurlugu (kesintiler / yevmiye ile aynı mantık).
 */
export async function getKullaniciGorevMudurlukleri(
  supabase: SupabaseClient,
  sicilNo: string,
): Promise<{ mudurlukler: string[]; tekSecimSaltOkunur: boolean }> {
  const sn = sicilNo.trim()
  if (!sn) {
    return { mudurlukler: [], tekSecimSaltOkunur: true }
  }

  const set = new Set<string>()

  const { data, error } = await supabase
    .from('kadro_hareketleri')
    .select('gorev_mudurlugu, kadro_mudurlugu')
    .is('ayrilis_tarihi', null)
    .or(`asil.eq.${sn},vekil.eq.${sn}`)

  if (error) {
    console.error('getKullaniciGorevMudurlukleri', error.message)
  } else {
    for (const row of data ?? []) {
      const m = String(row.gorev_mudurlugu ?? row.kadro_mudurlugu ?? '').trim()
      if (m) set.add(m)
    }
  }

  // ADABEL personeli (firma_calisanlar) kadro_hareketleri'nde yok; müdürlüğü orada tutulur.
  const { data: firmaData, error: firmaErr } = await supabase
    .from('firma_calisanlar')
    .select('gorev_mudurlugu')
    .eq('sicil_no', sn)
    .is('ayrilis_tarihi', null)

  if (firmaErr) {
    console.error('getKullaniciGorevMudurlukleri firma', firmaErr.message)
  } else {
    for (const row of firmaData ?? []) {
      const m = String(row.gorev_mudurlugu ?? '').trim()
      if (m) set.add(m)
    }
  }

  const mudurlukler = [...set].sort((a, b) => a.localeCompare(b, 'tr'))
  return {
    mudurlukler,
    tekSecimSaltOkunur: mudurlukler.length <= 1,
  }
}

/** Kullanıcı rolü için müdürlük seçimine izin var mı? Admin / profilsiz tam erişim: her zaman evet. */
export async function assertKullaniciMudurlukErisimi(
  supabase: SupabaseClient,
  access: AppAccess,
  mudurluk: string,
): Promise<{ ok: true } | { ok: false; mesaj: string }> {
  const m = mudurluk.trim()
  if (!m) return { ok: false, mesaj: 'Müdürlük gerekli.' }

  if (isAdminLike(access)) return { ok: true }
  if (access.mode !== 'kullanici') return { ok: true }

  const { mudurlukler } = await getKullaniciGorevMudurlukleri(supabase, access.sicilNo)
  if (!mudurlukler.includes(m)) {
    return { ok: false, mesaj: 'Bu müdürlük için yetkiniz yok.' }
  }
  return { ok: true }
}

/** API route / server action: oturum + müdürlük kontrolü */
export async function assertKullaniciMudurlukFromSession(
  supabase: SupabaseClient,
  mudurluk: string,
): Promise<{ ok: true; access: AppAccess } | { ok: false; mesaj: string; status: number }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, mesaj: 'Oturum gerekli.', status: 401 }
  }
  const access = await getAppAccess(supabase, user.id)
  const r = await assertKullaniciMudurlukErisimi(supabase, access, mudurluk)
  if (!r.ok) {
    return { ok: false, mesaj: r.mesaj, status: 403 }
  }
  return { ok: true, access }
}

/** Arazi ünvanlı aktif kadroda asil bu müdürlükte mi? (gorev/kadro müdürlüğü) */
export async function araziSicilMudurlukteMi(
  supabase: SupabaseClient,
  sicil_no: string,
  mudurluk: string,
): Promise<boolean> {
  const mud = mudurluk.trim()
  if (!sicil_no.trim() || !mud) return false

  const { data: unvanRaw } = await supabase
    .from('tanim_unvan')
    .select('unvan_adi')
    .eq('arazi', true)
    .eq('aktif', true)

  const araziUnvanlar = (unvanRaw ?? []).map(u => u.unvan_adi).filter(Boolean) as string[]
  if (araziUnvanlar.length === 0) return false

  const { data } = await supabase
    .from('kadro_hareketleri')
    .select('gorev_mudurlugu, kadro_mudurlugu')
    .is('ayrilis_tarihi', null)
    .eq('asil', sicil_no.trim())
    .in('kadro_unvani', araziUnvanlar)
    .limit(1)
    .maybeSingle()

  if (!data) return false
  const rowMud = String(data.gorev_mudurlugu ?? data.kadro_mudurlugu ?? '').trim()
  return rowMud === mud
}
