'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireTanimlarYazma } from '@/lib/tanimlar-yazma-guard'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import { tanimYerleskeAuditSnapshot } from '@/lib/tanim-yerleske-audit'

const SAYFA = '/tanimlar/yerleske-adresi'

function parseAktif(raw: unknown): boolean {
  const v = String(raw ?? '').trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'aktif' || v === 'on'
}

function validateSatir(
  yerleske_adi: string,
  adres: string,
): { ok: true } | { ok: false; hata: string } {
  if (!yerleske_adi) return { ok: false, hata: 'Yerleşke adı boş bırakılamaz.' }
  if (!adres) return { ok: false, hata: 'Adres boş bırakılamaz.' }
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
    modul: 'tanim_yerleske',
    islem,
    ozet,
    ref_table: 'tanim_yerleske_adresi',
    ref_id: String(id),
    onceki,
    sonraki,
  })
}

export async function yerleskeAdresiTopluEkle(
  satirlar: { yerleske_adi: string; adres: string }[],
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  if (!satirlar.length) return { hata: 'En az bir satır ekleyin.' }

  const insertRows: { yerleske_adi: string; adres: string; aktif: boolean }[] = []
  for (const s of satirlar) {
    const yerleske_adi = s.yerleske_adi.trim()
    const adres = s.adres.trim()
    const v = validateSatir(yerleske_adi, adres)
    if (!v.ok) return { hata: v.hata }
    insertRows.push({ yerleske_adi, adres, aktif: true })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tanim_yerleske_adresi')
    .insert(insertRows)
    .select('id, yerleske_adi, adres, aktif')

  if (error) return { hata: error.message }

  for (const row of data ?? []) {
    const snap = tanimYerleskeAuditSnapshot(row)
    await auditYaz(
      supabase,
      row.id,
      'Ekle',
      `${row.yerleske_adi} yerleşke tanımı eklendi.`,
      null,
      snap,
    )
  }

  revalidatePath(SAYFA)
  revalidatePath('/tanimlar/mudurluk')
  return {}
}

export async function yerleskeAdresiGuncelle(
  id: number,
  formData: FormData,
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }

  const yerleske_adi = String(formData.get('yerleske_adi') ?? '').trim()
  const adres = String(formData.get('adres') ?? '').trim()
  const aktif = parseAktif(formData.get('aktif') ?? 'aktif')

  const v = validateSatir(yerleske_adi, adres)
  if (!v.ok) return { hata: v.hata }

  const supabase = await createClient()
  const { data: oncekiRow } = await supabase
    .from('tanim_yerleske_adresi')
    .select('id, yerleske_adi, adres, aktif')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('tanim_yerleske_adresi')
    .update({
      yerleske_adi,
      adres,
      aktif,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { hata: error.message }

  const oncekiSnap = tanimYerleskeAuditSnapshot(oncekiRow ?? {})
  const sonrakiSnap = tanimYerleskeAuditSnapshot({ yerleske_adi, adres, aktif })
  await auditYaz(
    supabase,
    id,
    'Güncelle',
    `${yerleske_adi} yerleşke tanımı güncellendi.`,
    oncekiSnap,
    sonrakiSnap,
  )

  revalidatePath(SAYFA)
  revalidatePath('/tanimlar/mudurluk')
  return {}
}

/** @deprecated Satır düzenleme modalından yönetilir */
export async function yerleskeAdresiToggleAktif(
  id: number,
  mevcutAktif: boolean,
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const supabase = await createClient()
  const { data: oncekiRow } = await supabase
    .from('tanim_yerleske_adresi')
    .select('id, yerleske_adi, adres, aktif')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('tanim_yerleske_adresi')
    .update({ aktif: !mevcutAktif, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { hata: error.message }

  if (oncekiRow) {
    const sonrakiSnap = tanimYerleskeAuditSnapshot({ ...oncekiRow, aktif: !mevcutAktif })
    await auditYaz(
      supabase,
      id,
      'Güncelle',
      `${oncekiRow.yerleske_adi} yerleşke durumu güncellendi.`,
      tanimYerleskeAuditSnapshot(oncekiRow),
      sonrakiSnap,
    )
  }

  revalidatePath(SAYFA)
  revalidatePath('/tanimlar/mudurluk')
  return {}
}
