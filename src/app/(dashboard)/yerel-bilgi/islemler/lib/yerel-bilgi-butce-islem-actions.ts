'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import { mudurlukIdFromAuthSession } from '@/lib/kadro-mudurluk-id'
import { requireYerelBilgiIslem } from '@/lib/yerel-bilgi-islem-guard'

export type ButceIslemTur = 'tahmin' | 'gider'

const TABLO: Record<ButceIslemTur, 'yerel_bilgi_butce_tahmin_islem' | 'yerel_bilgi_butce_gider_islem'> = {
  tahmin: 'yerel_bilgi_butce_tahmin_islem',
  gider: 'yerel_bilgi_butce_gider_islem',
}

const REVALIDATE_PATHS: Record<ButceIslemTur, string[]> = {
  tahmin: [
    '/yerel-bilgi/islemler/butce-tahminleri',
    '/yerel-bilgi/islemler/butce-tahminleri/giris',
    '/yerel-bilgi/raporlar/butce-tahminleri',
  ],
  gider: [
    '/yerel-bilgi/islemler/butce-gerceklesmeleri',
    '/yerel-bilgi/islemler/butce-gerceklesmeleri/giris',
    '/yerel-bilgi/raporlar/butce-gerceklesmeleri',
  ],
}

function parseTutar(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/** Tanımlardaki tüm gider + gelir kalemleri için tutarları kaydeder. Personel: oturum kadrosu; admin: seçili müdürlük. */
export async function butceMatrisKaydet(
  tur: ButceIslemTur,
  gider: Record<string, string>,
  gelir: Record<string, string>,
  adminMudurlukId?: number,
): Promise<{ hata?: string }> {
  const auth = await requireYerelBilgiIslem()
  if (!auth.ok) return { hata: auth.hata }
  const userId = auth.userId

  const supabase = await createClient()
  let mudIdKayit: number | null = null

  if (auth.isAdmin) {
    if (adminMudurlukId == null || !Number.isFinite(adminMudurlukId) || adminMudurlukId <= 0) {
      return { hata: 'Kayıt için müdürlük seçilmelidir.' }
    }
    mudIdKayit = adminMudurlukId
  } else {
    const access = await getAppAccess(supabase, userId)
    mudIdKayit = await mudurlukIdFromAuthSession(supabase, userId, access)
    if (mudIdKayit == null) {
      return {
        hata:
          'Profilinizde sicil veya kadroda görev müdürlüğü bulunamadı; kayıt atanamıyor. IK ile iletişime geçin.',
      }
    }
  }
  const { data: mudRow, error: mudErr } = await supabase
    .from('tanim_mudurluk')
    .select('id')
    .eq('id', mudIdKayit)
    .eq('aktif', true)
    .maybeSingle()
  if (mudErr || !mudRow) return { hata: 'Müdürlük geçerli değil.' }

  const mudId = mudIdKayit

  const giderIds = Object.keys(gider)
    .map(Number)
    .filter(n => Number.isFinite(n) && n > 0)
  const gelirIds = Object.keys(gelir)
    .map(Number)
    .filter(n => Number.isFinite(n) && n > 0)

  if (giderIds.length > 0) {
    const { data: okG, error: e1 } = await supabase
      .from('yerel_bilgi_butce_gider')
      .select('id')
      .in('id', giderIds)
      .eq('aktif', true)
    if (e1 || !okG || okG.length !== giderIds.length) return { hata: 'Gider kalemi listesi geçersiz.' }
  }
  if (gelirIds.length > 0) {
    const { data: okL, error: e2 } = await supabase
      .from('yerel_bilgi_butce_gelir')
      .select('id')
      .in('id', gelirIds)
      .eq('aktif', true)
    if (e2 || !okL || okL.length !== gelirIds.length) return { hata: 'Gelir kalemi listesi geçersiz.' }
  }

  const tablo = TABLO[tur]
  const nowIso = new Date().toISOString()

  async function upsertGider(kalemId: number, tutStr: string) {
    const tut = parseTutar(tutStr)
    const { data: ex } = await supabase
      .from(tablo)
      .select('id')
      .eq('mudurluk_id', mudId)
      .eq('butce_gider_kalem_id', kalemId)
      .maybeSingle()

    if (ex?.id) {
      const { error } = await supabase
        .from(tablo)
        .update({ tutar: tut, updated_at: nowIso } as never)
        .eq('id', ex.id)
      if (error) return error.message
    } else {
      const { error } = await supabase.from(tablo).insert({
        mudurluk_id: mudId,
        butce_gider_kalem_id: kalemId,
        butce_gelir_kalem_id: null,
        tutar: tut,
        aktif: true,
        created_by: userId,
        created_at: nowIso,
        updated_at: nowIso,
      } as never)
      if (error) return error.message
    }
    return null
  }

  async function upsertGelir(kalemId: number, tutStr: string) {
    const tut = parseTutar(tutStr)
    const { data: ex } = await supabase
      .from(tablo)
      .select('id')
      .eq('mudurluk_id', mudId)
      .eq('butce_gelir_kalem_id', kalemId)
      .maybeSingle()

    if (ex?.id) {
      const { error } = await supabase
        .from(tablo)
        .update({ tutar: tut, updated_at: nowIso } as never)
        .eq('id', ex.id)
      if (error) return error.message
    } else {
      const { error } = await supabase.from(tablo).insert({
        mudurluk_id: mudId,
        butce_gider_kalem_id: null,
        butce_gelir_kalem_id: kalemId,
        tutar: tut,
        aktif: true,
        created_by: userId,
        created_at: nowIso,
        updated_at: nowIso,
      } as never)
      if (error) return error.message
    }
    return null
  }

  for (const id of giderIds) {
    const err = await upsertGider(id, gider[String(id)] ?? '')
    if (err) return { hata: err }
  }
  for (const id of gelirIds) {
    const err = await upsertGelir(id, gelir[String(id)] ?? '')
    if (err) return { hata: err }
  }

  for (const p of REVALIDATE_PATHS[tur]) revalidatePath(p)
  return {}
}
