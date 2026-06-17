'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireTanimlarYazma } from '@/lib/tanimlar-yazma-guard'
import { ilGecerliMi, ilceGecerliMi } from '@/lib/turkiye-adres'
import { writePersonelAuditLogSafe, degisiklikPayload, alanDegisiklikleriHesapla } from '@/lib/personel-audit'
import { tanimAdresAuditSnapshot } from '@/lib/tanim-adres-audit'
import { TANIM_ADRES_ALAN_ETIKETLERI } from '@/lib/tanim-adres-audit'
import { adresMahalleAnahtari } from '@/lib/turkiye-adres'
import { adresMahalleExcelSatirlariOku } from '@/lib/tanim-adres-excel'

const SAYFA = '/tanimlar/adres'

function parseAktif(raw: unknown): boolean {
  const v = String(raw ?? '').trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'aktif' || v === 'on'
}

function formOku(fd: FormData) {
  const il = String(fd.get('il') ?? '').trim()
  const ilce = String(fd.get('ilce') ?? '').trim()
  const mahalle_adi = String(fd.get('mahalle_adi') ?? '').trim()
  const aktif = parseAktif(fd.get('aktif') ?? 'true')
  return { il, ilce, mahalle_adi, aktif }
}

function dogrula(input: ReturnType<typeof formOku>): string | null {
  if (!input.il) return 'İl seçilmelidir.'
  if (!ilGecerliMi(input.il)) return 'Geçersiz il seçimi.'
  if (!input.ilce) return 'İlçe seçilmelidir.'
  if (!ilceGecerliMi(input.il, input.ilce)) return 'Seçilen il için geçersiz ilçe.'
  if (!input.mahalle_adi) return 'Mahalle adı boş bırakılamaz.'
  return null
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
    modul: 'tanim_adres',
    islem,
    ozet,
    ref_table: 'tanim_adres_mahalle',
    ref_id: String(id),
    onceki,
    sonraki,
  })
}

export async function adresMahalleEkle(fd: FormData): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }

  const input = formOku(fd)
  const err = dogrula(input)
  if (err) return { hata: err }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tanim_adres_mahalle')
    .insert({
      il: input.il,
      ilce: input.ilce,
      mahalle_adi: input.mahalle_adi,
      aktif: input.aktif,
      updated_at: new Date().toISOString(),
    })
    .select('id, il, ilce, mahalle_adi, aktif')
    .single()

  if (error) {
    if (error.code === '23505') return { hata: 'Bu il, ilçe ve mahalle adı zaten tanımlı.' }
    return { hata: error.message }
  }

  await auditYaz(
    supabase,
    data.id,
    'Ekle',
    `Mahalle tanımı eklendi (${input.mahalle_adi}, ${input.ilce}/${input.il}).`,
    {},
    tanimAdresAuditSnapshot(data),
  )

  revalidatePath(SAYFA)
  revalidatePath('/personel/yeni')
  revalidatePath('/personel')
  return {}
}

export async function adresMahalleGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  if (!Number.isInteger(id) || id <= 0) return { hata: 'Geçersiz kayıt.' }

  const input = formOku(fd)
  const err = dogrula(input)
  if (err) return { hata: err }

  const supabase = await createClient()
  const { data: onceki } = await supabase
    .from('tanim_adres_mahalle')
    .select('id, il, ilce, mahalle_adi, aktif')
    .eq('id', id)
    .maybeSingle()

  const { data, error } = await supabase
    .from('tanim_adres_mahalle')
    .update({
      il: input.il,
      ilce: input.ilce,
      mahalle_adi: input.mahalle_adi,
      aktif: input.aktif,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, il, ilce, mahalle_adi, aktif')
    .single()

  if (error) {
    if (error.code === '23505') return { hata: 'Bu il, ilçe ve mahalle adı zaten tanımlı.' }
    return { hata: error.message }
  }

  const degisiklikler = alanDegisiklikleriHesapla(
    tanimAdresAuditSnapshot(onceki ?? {}),
    tanimAdresAuditSnapshot(data),
    TANIM_ADRES_ALAN_ETIKETLERI,
  )
  if (degisiklikler.length > 0) {
    const payload = degisiklikPayload(degisiklikler)
    await auditYaz(
      supabase,
      id,
      'Güncelle',
      `Mahalle tanımı güncellendi (${input.mahalle_adi}).`,
      payload.onceki,
      payload.sonraki,
    )
  }

  revalidatePath(SAYFA)
  revalidatePath('/personel')
  return {}
}

export type AdresExcelIceAktarSonuc = {
  hata?: string
  eklenen?: number
  atlanan?: number
  uyari?: string[]
}

export async function adresMahalleExcelIceAktar(fd: FormData): Promise<AdresExcelIceAktarSonuc> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }

  const file = fd.get('file')
  if (!(file instanceof File)) return { hata: 'Excel dosyası seçiniz.' }
  if (!file.name.match(/\.xlsx?$/i)) return { hata: 'Yalnızca .xlsx veya .xls dosyası yükleyebilirsiniz.' }

  const { satirlar, hatalar: parseHatalar } = adresMahalleExcelSatirlariOku(await file.arrayBuffer())
  if (!satirlar.length) {
    return {
      hata: parseHatalar.length ? parseHatalar.slice(0, 8).join(' ') : 'İçe aktarılacak geçerli satır yok.',
      uyari: parseHatalar.length > 8 ? parseHatalar.slice(8) : undefined,
    }
  }

  const supabase = await createClient()
  const iller = [...new Set(satirlar.map(s => s.il))]
  const { data: mevcutRaw, error: mevcutErr } = await supabase
    .from('tanim_adres_mahalle')
    .select('il, ilce, mahalle_adi')
    .in('il', iller)

  if (mevcutErr) return { hata: mevcutErr.message }

  const mevcutAnahtar = new Set(
    (mevcutRaw ?? []).map(r =>
      adresMahalleAnahtari(String(r.il), String(r.ilce), String(r.mahalle_adi)),
    ),
  )

  let eklenen = 0
  let atlanan = 0
  const islemHatalar: string[] = [...parseHatalar]

  for (const s of satirlar) {
    const anahtar = adresMahalleAnahtari(s.il, s.ilce, s.mahalle_adi)
    if (mevcutAnahtar.has(anahtar)) {
      atlanan++
      continue
    }

    const { data, error } = await supabase
      .from('tanim_adres_mahalle')
      .insert({
        il: s.il,
        ilce: s.ilce,
        mahalle_adi: s.mahalle_adi,
        aktif: true,
        updated_at: new Date().toISOString(),
      })
      .select('id, il, ilce, mahalle_adi, aktif')
      .single()

    if (error) {
      if (error.code === '23505') {
        atlanan++
        mevcutAnahtar.add(anahtar)
        continue
      }
      return {
        hata: `Satır ${s.excelSatir}: ${error.message}`,
        eklenen,
        atlanan,
        uyari: islemHatalar.length ? islemHatalar : undefined,
      }
    }

    mevcutAnahtar.add(anahtar)
    await auditYaz(
      supabase,
      data.id,
      'Excel İçe Aktar',
      `Excel ile mahalle tanımı eklendi (${s.mahalle_adi}, ${s.ilce}/${s.il}).`,
      {},
      tanimAdresAuditSnapshot(data),
    )
    eklenen++
  }

  revalidatePath(SAYFA)
  revalidatePath('/personel/yeni')
  revalidatePath('/personel')

  if (!eklenen && !atlanan) {
    return { hata: 'Kayıt eklenemedi.', uyari: islemHatalar.length ? islemHatalar : undefined }
  }

  return {
    eklenen,
    atlanan,
    uyari: islemHatalar.length ? islemHatalar : undefined,
  }
}
