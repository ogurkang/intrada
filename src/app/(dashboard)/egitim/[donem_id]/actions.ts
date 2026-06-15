'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  katilimAuditSnapshot,
  writeEgitimKatilimAuditLogSafe,
} from '@/lib/egitim-katilim-audit'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

function revalidate(donem_id: number) {
  revalidatePath(`/egitim/${donem_id}`)
  revalidatePath('/egitim/istatistik')
}

export async function egitimEkle(donem_id: number, fd: FormData): Promise<{ hata?: string }> {
  const egitim_adi = str(fd, 'egitim_adi')
  if (!egitim_adi) return { hata: 'Eğitim adı zorunludur.' }

  const sure_str = str(fd, 'sure_dakika')
  const supabase = await createClient()
  const { error } = await supabase.from('egitim_takvimi_egitim').insert({
    donem_id,
    egitim_adi,
    kanal:           str(fd, 'kanal'),
    kisa_ad:         str(fd, 'kisa_ad'),
    egitim_baslangic: str(fd, 'egitim_baslangic'),
    egitim_bitis:     str(fd, 'egitim_bitis'),
    sure_dakika:     sure_str ? parseInt(sure_str, 10) : 0,
    program:         (str(fd, 'program') === 'Program' ? 'Evet' : 'Hayır') as 'Evet' | 'Hayır',
    katilimci_sayisi: 0,
  })
  if (error) return { hata: error.message }
  revalidate(donem_id)
  return {}
}

export async function egitimGuncelle(id: number, donem_id: number, fd: FormData): Promise<{ hata?: string }> {
  const egitim_adi = str(fd, 'egitim_adi')
  if (!egitim_adi) return { hata: 'Eğitim adı zorunludur.' }

  const sure_str = str(fd, 'sure_dakika')
  const supabase = await createClient()
  const { error } = await supabase.from('egitim_takvimi_egitim').update({
    egitim_adi,
    kanal:            str(fd, 'kanal'),
    kisa_ad:          str(fd, 'kisa_ad'),
    egitim_baslangic: str(fd, 'egitim_baslangic') ?? undefined,
    egitim_bitis:     str(fd, 'egitim_bitis') ?? undefined,
    sure_dakika:      sure_str ? parseInt(sure_str, 10) : 0,
    program:          (str(fd, 'program') === 'Program' ? 'Evet' : 'Hayır') as 'Evet' | 'Hayır',
  }).eq('id', id)
  if (error) return { hata: error.message }
  revalidate(donem_id)
  return {}
}

export async function egitimSil(id: number, donem_id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('egitim_takvimi_egitim').delete().eq('id', id)
  if (error) return { hata: error.message }
  revalidate(donem_id)
  return {}
}

export async function katilimciKaydet(
  egitim_id: number,
  donem_id:  number,
  sicilNolar: string[],
  mudurlukMap: Record<string, string>
): Promise<{ hata?: string }> {
  const supabase = await createClient()

  const { data: mevcutKatilim, error: mevcutErr } = await supabase
    .from('egitim_istatistik_katilim')
    .select('sicil_no, mudurluk')
    .eq('egitim_id', egitim_id)

  if (mevcutErr) return { hata: mevcutErr.message }

  const mevcutSet = new Set((mevcutKatilim ?? []).map(k => k.sicil_no))
  const yeniSet = new Set(sicilNolar)

  // Mevcut katılımcıları sil ve yeniden yaz
  const { error: delErr } = await supabase
    .from('egitim_istatistik_katilim')
    .delete()
    .eq('egitim_id', egitim_id)

  if (delErr) return { hata: delErr.message }

  if (sicilNolar.length > 0) {
    const rows = sicilNolar.map(s => ({
      donem_id,
      egitim_id,
      sicil_no: s,
      mudurluk: mudurlukMap[s] ?? null,
    }))
    const { error: insErr } = await supabase.from('egitim_istatistik_katilim').insert(rows)
    if (insErr) return { hata: insErr.message }
  }

  for (const row of mevcutKatilim ?? []) {
    if (!yeniSet.has(row.sicil_no)) {
      await writeEgitimKatilimAuditLogSafe(supabase, {
        sicil_no: row.sicil_no,
        egitim_id,
        donem_id,
        islem: 'Katılım Kaldır',
        ozet: 'Eğitim katılımı kaldırıldı',
        mudurluk: row.mudurluk,
        onceki: katilimAuditSnapshot({ katildi: true, mudurluk: row.mudurluk, egitim_id, donem_id }),
        sonraki: null,
      })
    }
  }

  for (const sicil of sicilNolar) {
    if (!mevcutSet.has(sicil)) {
      await writeEgitimKatilimAuditLogSafe(supabase, {
        sicil_no: sicil,
        egitim_id,
        donem_id,
        islem: 'Katılım Ekle',
        ozet: 'Eğitim katılımı işaretlendi',
        mudurluk: mudurlukMap[sicil] ?? null,
        onceki: null,
        sonraki: katilimAuditSnapshot({
          katildi: true,
          mudurluk: mudurlukMap[sicil] ?? null,
          egitim_id,
          donem_id,
        }),
      })
    }
  }

  // Katılımcı sayısını güncelle
  await supabase
    .from('egitim_takvimi_egitim')
    .update({ katilimci_sayisi: sicilNolar.length })
    .eq('id', egitim_id)

  revalidate(donem_id)
  return {}
}
