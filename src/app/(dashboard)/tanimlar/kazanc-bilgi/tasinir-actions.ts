'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireTanimlarYazma } from '@/lib/tanimlar-yazma-guard'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import {
  kazancTasinirGoreviGecerliMi,
  tanimKazancTasinirAuditSnapshot,
} from '@/lib/kazanc-tasinir-yetkili'

const SAYFA = '/tanimlar/kazanc-bilgi'
const REF_TABLE = 'tanim_kazanc_tasinir_yetkili'

function revalidateTasinir() {
  revalidatePath(SAYFA)
  revalidatePath('/tanimlar/kazanc-bilgi/tasinir/ekle')
  revalidatePath('/terfi/bilgiler')
}

function str(v: unknown): string {
  return String(v ?? '').trim()
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
    modul: REF_TABLE,
    islem,
    ozet,
    ref_table: REF_TABLE,
    ref_id: String(id),
    onceki,
    sonraki,
  })
}

export async function kazancTasinirYetkiliTopluEkle(
  satirlar: { gorev_adi: string; tutar: string }[],
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  if (!satirlar.length) return { hata: 'En az bir satır ekleyin.' }

  const insertRows: { gorev_adi: string; tutar: string | null }[] = []
  const gorulen = new Set<string>()
  for (const s of satirlar) {
    const gorev_adi = str(s.gorev_adi)
    const tutar = str(s.tutar)
    if (!kazancTasinirGoreviGecerliMi(gorev_adi)) {
      return { hata: 'Taşınır görevi, Kayıt Yetkilisi veya Kontrol Yetkilisi olmalıdır.' }
    }
    if (!tutar) return { hata: 'Puan boş bırakılamaz.' }
    if (gorulen.has(gorev_adi)) return { hata: `${gorev_adi} satırı birden fazla girilmiş.` }
    gorulen.add(gorev_adi)
    insertRows.push({ gorev_adi, tutar })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tanim_kazanc_tasinir_yetkili')
    .insert(insertRows)
    .select('id, gorev_adi, tutar')

  if (error) {
    if (error.code === '23505') return { hata: 'Bu taşınır görevi için tanım zaten var.' }
    return { hata: error.message }
  }

  for (const row of data ?? []) {
    await auditYaz(
      supabase,
      row.id,
      'Ekle',
      `${row.gorev_adi} kazanç tanımı eklendi.`,
      null,
      tanimKazancTasinirAuditSnapshot(row),
    )
  }

  revalidateTasinir()
  return {}
}

export async function kazancTasinirYetkiliGuncelle(
  id: number,
  formData: FormData,
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }

  const gorev_adi = str(formData.get('gorev_adi'))
  const tutar = str(formData.get('tutar'))
  if (!kazancTasinirGoreviGecerliMi(gorev_adi)) {
    return { hata: 'Taşınır görevi, Kayıt Yetkilisi veya Kontrol Yetkilisi olmalıdır.' }
  }
  if (!tutar) return { hata: 'Puan boş bırakılamaz.' }

  const supabase = await createClient()
  const { data: oncekiRow } = await supabase
    .from('tanim_kazanc_tasinir_yetkili')
    .select('id, gorev_adi, tutar')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase
    .from('tanim_kazanc_tasinir_yetkili')
    .update({ gorev_adi, tutar, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') return { hata: 'Bu taşınır görevi için tanım zaten var.' }
    return { hata: error.message }
  }

  await auditYaz(
    supabase,
    id,
    'Güncelle',
    `${gorev_adi} kazanç tanımı güncellendi.`,
    tanimKazancTasinirAuditSnapshot(oncekiRow ?? {}),
    tanimKazancTasinirAuditSnapshot({ gorev_adi, tutar }),
  )

  revalidateTasinir()
  return {}
}

export async function kazancTasinirYetkiliSil(id: number): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }

  const supabase = await createClient()
  const { data: oncekiRow } = await supabase
    .from('tanim_kazanc_tasinir_yetkili')
    .select('id, gorev_adi, tutar')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase.from('tanim_kazanc_tasinir_yetkili').delete().eq('id', id)
  if (error) return { hata: error.message }

  if (oncekiRow) {
    await auditYaz(
      supabase,
      id,
      'Sil',
      `${oncekiRow.gorev_adi} kazanç tanımı silindi.`,
      tanimKazancTasinirAuditSnapshot(oncekiRow),
      null,
    )
  }

  revalidateTasinir()
  return {}
}
