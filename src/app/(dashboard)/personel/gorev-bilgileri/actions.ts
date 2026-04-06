'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { revalidatePersonelDetayPaths } from '@/lib/revalidate-personel'
import { gorevTuruTarihZorunlu } from '@/lib/gorev-bilgileri'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

export interface GorevBilgiSatir {
  sicil_no: string
  gorev_yeri: string | null
  gorev_turu: string
  gorev_turu_tarihi: string | null
  gorev_turu_aciklama: string | null
  gorev_durumu: string | null
}

function payloadFromForm(fd: FormData): { ok: true; payload: GorevBilgiSatir } | { ok: false; hata: string } {
  const sicil_no = str(fd, 'sicil_no')
  if (!sicil_no) return { ok: false, hata: 'Sicil no eksik.' }
  const gorev_turu = str(fd, 'gorev_turu') ?? 'Çalışan'
  const gorev_turu_tarihi = gorev_turu === 'Çalışan' ? null : str(fd, 'gorev_turu_tarihi')
  const gorev_turu_aciklama =
    gorev_turu === 'Geçici Görevlendirme' ? str(fd, 'gorev_turu_aciklama') : null
  if (gorevTuruTarihZorunlu(gorev_turu) && !gorev_turu_tarihi) {
    return { ok: false, hata: 'Aylıksız izin veya geçici görevlendirme için tarih seçilmelidir.' }
  }
  return {
    ok: true,
    payload: {
      sicil_no,
      gorev_yeri: str(fd, 'gorev_yeri'),
      gorev_turu,
      gorev_turu_tarihi,
      gorev_turu_aciklama,
      gorev_durumu: str(fd, 'gorev_durumu') ?? 'Diğer',
    },
  }
}

function normalizeSatir(s: GorevBilgiSatir): GorevBilgiSatir {
  const gorev_turu = (s.gorev_turu ?? '').trim() || 'Çalışan'
  const gorev_turu_tarihi = gorev_turu === 'Çalışan' ? null : (s.gorev_turu_tarihi?.trim() || null)
  const gorev_turu_aciklama =
    gorev_turu === 'Geçici Görevlendirme' ? (s.gorev_turu_aciklama?.trim() || null) : null
  return {
    sicil_no: s.sicil_no,
    gorev_yeri: s.gorev_yeri?.trim() || null,
    gorev_turu,
    gorev_turu_tarihi,
    gorev_turu_aciklama,
    gorev_durumu: (s.gorev_durumu ?? '').trim() || 'Diğer',
  }
}

async function revalidateGorevListesi(sicil_no: string) {
  await revalidatePersonelDetayPaths(sicil_no)
  revalidatePath('/personel')
  revalidatePath('/personel/gorev-bilgileri')
}

/** Tek satır (liste görünümü) — yalnızca görev alanları. */
export async function gorevBilgileriSatirKaydet(
  sicil_no: string,
  fd: FormData
): Promise<{ hata?: string }> {
  fd.set('sicil_no', sicil_no)
  const parsed = payloadFromForm(fd)
  if (!parsed.ok) return { hata: parsed.hata }
  const p = normalizeSatir(parsed.payload)
  if (gorevTuruTarihZorunlu(p.gorev_turu) && !p.gorev_turu_tarihi) {
    return { hata: 'Aylıksız izin veya geçici görevlendirme için tarih seçilmelidir.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('calisan')
    .update({
      gorev_yeri: p.gorev_yeri,
      gorev_turu: p.gorev_turu,
      gorev_turu_tarihi: p.gorev_turu_tarihi,
      gorev_turu_aciklama: p.gorev_turu_aciklama,
      gorev_durumu: p.gorev_durumu,
    })
    .eq('sicil_no', sicil_no)

  if (error) return { hata: error.message }
  await revalidateGorevListesi(sicil_no)
  return {}
}

/** Toplu güncelleme — değişen siciller. */
export async function gorevBilgileriTopluKaydet(
  satirlar: GorevBilgiSatir[]
): Promise<{ hata?: string; kaydedilen?: number }> {
  if (!satirlar.length) return { kaydedilen: 0 }
  const supabase = await createClient()

  for (const raw of satirlar) {
    const s = normalizeSatir(raw)
    if (gorevTuruTarihZorunlu(s.gorev_turu) && !s.gorev_turu_tarihi) {
      return { hata: `${s.sicil_no}: Aylıksız izin veya geçici görevlendirme için tarih zorunludur.` }
    }
    const { error } = await supabase
      .from('calisan')
      .update({
        gorev_yeri: s.gorev_yeri,
        gorev_turu: s.gorev_turu,
        gorev_turu_tarihi: s.gorev_turu_tarihi,
        gorev_turu_aciklama: s.gorev_turu_aciklama,
        gorev_durumu: s.gorev_durumu,
      })
      .eq('sicil_no', s.sicil_no)
    if (error) return { hata: error.message }
  }

  const siciller = [...new Set(satirlar.map(s => s.sicil_no))]
  for (const sicil of siciller) {
    await revalidateGorevListesi(sicil)
  }
  return { kaydedilen: satirlar.length }
}
