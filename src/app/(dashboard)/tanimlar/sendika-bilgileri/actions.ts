'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireTanimlarYazma } from '@/lib/tanimlar-yazma-guard'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import { tanimSendikaAuditSnapshot } from '@/lib/tanim-sendika-audit'

const SAYFA = '/tanimlar/sendika-bilgileri'

const GECERLI_STATULER = new Set(['Memur', 'İşçi'])

function parseAktif(raw: unknown): boolean {
  const v = String(raw ?? '').trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'aktif' || v === 'on'
}

function validateSatir(
  statu: string,
  kisa_ad: string,
  uzun_ad: string,
): { ok: true } | { ok: false; hata: string } {
  if (!GECERLI_STATULER.has(statu)) return { ok: false, hata: 'Statü Memur veya İşçi olmalıdır.' }
  if (!kisa_ad) return { ok: false, hata: 'Kısa ad boş bırakılamaz.' }
  if (!uzun_ad) return { ok: false, hata: 'Uzun ad boş bırakılamaz.' }
  return { ok: true }
}

async function auditYaz(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: number,
  islem: string,
  ozet: string,
  onceki: unknown,
  sonraki: unknown,
) {
  await writePersonelAuditLogSafe(supabase, {
    sicil_no: '—',
    modul: 'tanim_sendika',
    islem,
    ozet,
    ref_table: 'tanim_sendika',
    ref_id: String(id),
    onceki,
    sonraki,
  })
}

export async function sendikaBilgileriTopluEkle(
  satirlar: { statu: string; kisa_ad: string; uzun_ad: string }[],
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  if (!satirlar.length) return { hata: 'En az bir satır ekleyin.' }

  const insertRows: { statu: string; kisa_ad: string; uzun_ad: string; aktif: boolean }[] = []
  for (const s of satirlar) {
    const statu = s.statu.trim()
    const kisa_ad = s.kisa_ad.trim()
    const uzun_ad = s.uzun_ad.trim()
    const v = validateSatir(statu, kisa_ad, uzun_ad)
    if (!v.ok) return { hata: v.hata }
    insertRows.push({ statu, kisa_ad, uzun_ad, aktif: true })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tanim_sendika')
    .insert(insertRows)
    .select('id, statu, kisa_ad, uzun_ad, aktif')

  if (error) return { hata: error.message }

  for (const row of data ?? []) {
    const snap = tanimSendikaAuditSnapshot(row)
    await auditYaz(
      supabase,
      row.id,
      'Ekle',
      `${row.kisa_ad} sendika tanımı eklendi.`,
      null,
      snap,
    )
  }

  revalidatePath(SAYFA)
  return {}
}

export async function sendikaBilgileriGuncelle(
  id: number,
  formData: FormData,
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }

  const statu = String(formData.get('statu') ?? '').trim()
  const kisa_ad = String(formData.get('kisa_ad') ?? '').trim()
  const uzun_ad = String(formData.get('uzun_ad') ?? '').trim()
  const aktif = parseAktif(formData.get('aktif') ?? 'aktif')

  const v = validateSatir(statu, kisa_ad, uzun_ad)
  if (!v.ok) return { hata: v.hata }

  const supabase = await createClient()
  const { data: oncekiRow } = await supabase
    .from('tanim_sendika')
    .select('id, statu, kisa_ad, uzun_ad, aktif')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('tanim_sendika')
    .update({ statu, kisa_ad, uzun_ad, aktif, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { hata: error.message }

  const oncekiSnap = tanimSendikaAuditSnapshot(oncekiRow ?? {})
  const sonrakiSnap = tanimSendikaAuditSnapshot({ statu, kisa_ad, uzun_ad, aktif })
  await auditYaz(
    supabase,
    id,
    'Güncelle',
    `${kisa_ad} sendika tanımı güncellendi.`,
    oncekiSnap,
    sonrakiSnap,
  )

  revalidatePath(SAYFA)
  return {}
}

/** @deprecated Satır düzenleme modalından yönetilir */
export async function sendikaBilgileriToggleAktif(
  id: number,
  mevcutAktif: boolean,
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const supabase = await createClient()
  const { data: oncekiRow } = await supabase
    .from('tanim_sendika')
    .select('id, statu, kisa_ad, uzun_ad, aktif')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('tanim_sendika')
    .update({ aktif: !mevcutAktif, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { hata: error.message }

  if (oncekiRow) {
    const sonrakiSnap = tanimSendikaAuditSnapshot({ ...oncekiRow, aktif: !mevcutAktif })
    await auditYaz(
      supabase,
      id,
      'Güncelle',
      `${oncekiRow.kisa_ad} sendika durumu güncellendi.`,
      tanimSendikaAuditSnapshot(oncekiRow),
      sonrakiSnap,
    )
  }

  revalidatePath(SAYFA)
  return {}
}
