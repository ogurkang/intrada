'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { revalidatePersonelDetayPaths } from '@/lib/revalidate-personel'
import { gorevTuruTarihZorunlu, gorevTuruAciklamaGoster, gorevTuruYemekHakkiGoster } from '@/lib/gorev-bilgileri'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

export interface GorevBilgiSatir {
  sicil_no: string
  gorev_yeri: string | null
  gorev_turu: string
  gorev_turu_tarihi: string | null
  gorev_turu_bitis_tarihi: string | null
  gorev_turu_aciklama: string | null
  gorev_turu_yemek_hakki: boolean | null
  gorev_durumu: string | null
  engelli_oran: number | null
  engelli_baslangic: string | null
  engelli_bitis: string | null
}

function payloadFromForm(fd: FormData): { ok: true; payload: GorevBilgiSatir } | { ok: false; hata: string } {
  const sicil_no = str(fd, 'sicil_no')
  if (!sicil_no) return { ok: false, hata: 'Sicil no eksik.' }
  const gorev_turu = str(fd, 'gorev_turu') ?? 'Çalışan'
  const gorev_turu_tarihi = gorev_turu === 'Çalışan' ? null : str(fd, 'gorev_turu_tarihi')
  const gorev_turu_bitis_tarihi = gorev_turu === 'Çalışan' ? null : str(fd, 'gorev_turu_bitis_tarihi')
  const gorev_turu_aciklama = gorevTuruAciklamaGoster(gorev_turu) ? str(fd, 'gorev_turu_aciklama') : null

  // Yemek hakkı: Geçici Görevlendirmede form değeri 'true'/'false'/''; diğerlerinde null
  let gorev_turu_yemek_hakki: boolean | null = null
  if (gorevTuruYemekHakkiGoster(gorev_turu)) {
    const raw = String(fd.get('gorev_turu_yemek_hakki') ?? '').trim()
    gorev_turu_yemek_hakki = raw === 'true' ? true : raw === 'false' ? false : null
  }

  if (gorevTuruTarihZorunlu(gorev_turu) && !gorev_turu_tarihi) {
    return { ok: false, hata: 'Aylıksız izin, geçici görevlendirme veya yarı zamanlı için başlangıç tarihi seçilmelidir.' }
  }

  const gorev_durumu = str(fd, 'gorev_durumu') ?? 'Diğer'
  const engelli_oran_raw = str(fd, 'engelli_oran')
  const engelli_oran = engelli_oran_raw !== null ? parseInt(engelli_oran_raw, 10) || null : null
  const engelli_baslangic = gorev_durumu === 'Engelli' ? str(fd, 'engelli_baslangic') : null
  const engelli_bitis = gorev_durumu === 'Engelli' ? str(fd, 'engelli_bitis') : null

  return {
    ok: true,
    payload: {
      sicil_no,
      gorev_yeri: str(fd, 'gorev_yeri'),
      gorev_turu,
      gorev_turu_tarihi,
      gorev_turu_bitis_tarihi,
      gorev_turu_aciklama,
      gorev_turu_yemek_hakki,
      gorev_durumu,
      engelli_oran,
      engelli_baslangic,
      engelli_bitis,
    },
  }
}

function normalizeSatir(s: GorevBilgiSatir): GorevBilgiSatir {
  const gorev_turu = (s.gorev_turu ?? '').trim() || 'Çalışan'
  const gorev_turu_tarihi = gorev_turu === 'Çalışan' ? null : (s.gorev_turu_tarihi?.trim() || null)
  const gorev_turu_bitis_tarihi = gorev_turu === 'Çalışan' ? null : (s.gorev_turu_bitis_tarihi?.trim() || null)
  const gorev_turu_aciklama = gorevTuruAciklamaGoster(gorev_turu) ? (s.gorev_turu_aciklama?.trim() || null) : null
  const gorev_turu_yemek_hakki = gorevTuruYemekHakkiGoster(gorev_turu) ? (s.gorev_turu_yemek_hakki ?? null) : null
  const gorev_durumu = (s.gorev_durumu ?? '').trim() || 'Diğer'
  const engelli_baslangic = gorev_durumu === 'Engelli' ? (s.engelli_baslangic?.trim() || null) : null
  const engelli_bitis = gorev_durumu === 'Engelli' ? (s.engelli_bitis?.trim() || null) : null
  const engelli_oran = gorev_durumu === 'Engelli' ? (s.engelli_oran ?? null) : null

  return {
    sicil_no: s.sicil_no,
    gorev_yeri: s.gorev_yeri?.trim() || null,
    gorev_turu,
    gorev_turu_tarihi,
    gorev_turu_bitis_tarihi,
    gorev_turu_aciklama,
    gorev_turu_yemek_hakki,
    gorev_durumu,
    engelli_oran,
    engelli_baslangic,
    engelli_bitis,
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
    return { hata: 'Aylıksız izin, geçici görevlendirme veya yarı zamanlı için başlangıç tarihi seçilmelidir.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('calisan')
    .update({
      gorev_yeri: p.gorev_yeri,
      gorev_turu: p.gorev_turu,
      gorev_turu_tarihi: p.gorev_turu_tarihi,
      gorev_turu_bitis_tarihi: p.gorev_turu_bitis_tarihi,
      gorev_turu_aciklama: p.gorev_turu_aciklama,
      gorev_turu_yemek_hakki: p.gorev_turu_yemek_hakki,
      gorev_durumu: p.gorev_durumu,
      engelli_oran: p.engelli_oran,
      engelli_baslangic: p.engelli_baslangic,
      engelli_bitis: p.engelli_bitis,
    } as Record<string, unknown>)
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
      return { hata: `${s.sicil_no}: Aylıksız izin, geçici görevlendirme veya yarı zamanlı için başlangıç tarihi zorunludur.` }
    }
    const { error } = await supabase
      .from('calisan')
      .update({
        gorev_yeri: s.gorev_yeri,
        gorev_turu: s.gorev_turu,
        gorev_turu_tarihi: s.gorev_turu_tarihi,
        gorev_turu_bitis_tarihi: s.gorev_turu_bitis_tarihi,
        gorev_turu_aciklama: s.gorev_turu_aciklama,
        gorev_turu_yemek_hakki: s.gorev_turu_yemek_hakki,
        gorev_durumu: s.gorev_durumu,
        engelli_oran: s.engelli_oran,
        engelli_baslangic: s.engelli_baslangic,
        engelli_bitis: s.engelli_bitis,
      } as Record<string, unknown>)
      .eq('sicil_no', s.sicil_no)
    if (error) return { hata: error.message }
  }

  const siciller = [...new Set(satirlar.map(s => s.sicil_no))]
  for (const sicil of siciller) {
    await revalidateGorevListesi(sicil)
  }
  return { kaydedilen: satirlar.length }
}
