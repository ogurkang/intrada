'use server'

import { createClient } from '@/lib/supabase/server'
import { fetchAllPaged } from '@/lib/supabase-sayfala'
import { revalidatePath } from 'next/cache'
import { revalidatePersonelDetayPaths } from '@/lib/revalidate-personel'
import {
  gunBasitHesapla,
  gunYillikIzinHesapla,
  gunHakAzalir,
  zabitaUnvaniMi,
  type IzinGunSonuc,
} from '@/lib/izin-gun'
import { tatilYapisiHesapla } from '@/lib/tatil-yapisi'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'

type Durum = 'Taslak' | 'Onaylandı' | 'Değiştirildi' | 'İptal Edildi'

const HAKTAN_DUSEN_DURUMLAR: Durum[] = ['Onaylandı', 'Değiştirildi']
/** tanim_izin_tur.izin_hakki_kullanimi bu değerlerden biri ise izin hakkından düşer */
const HAKTAN_DUSEN_HAKKI_KULLANIMI = ['Evet', 'Yıllık İzin']

function hareketYili(ayrilis: string | null | undefined, yil: number | null | undefined): number | null {
  const fromAyrilis = String(ayrilis ?? '').slice(0, 4)
  if (/^\d{4}$/.test(fromAyrilis)) return Number(fromAyrilis)
  return typeof yil === 'number' ? yil : null
}

/** Belirtilen (sicil_no, yil) için izin_hareketleri'ndeki Onaylandı/Değiştirildi günlerini topla ve izin_haklari.kullanilan_gun güncelle.
 * Hak yılı ayrılış tarihine göre alınır (Excel 2025/ sıra no ile gelen 2026 izinleri 2026 hakkına düşer).
 * Sadece izin_hakki_kullanımı=Evet (veya Yıllık İzin) olan izin türleri izin hakkından düşer. */
async function izinHaklariKullanilanGuncelle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sicil_no: string,
  yil: number
): Promise<void> {
  const { data: hakKullananTurler } = await supabase
    .from('tanim_izin_tur')
    .select('tur_adi')
    .in('izin_hakki_kullanimi', HAKTAN_DUSEN_HAKKI_KULLANIMI)
  const hakKullananTurSet = new Set((hakKullananTurler ?? []).map(t => t.tur_adi))

  const { data: hareketler } = await fetchAllPaged<{ tur: string | null; gun: number | null; yil: number | null; ayrilis: string | null }>((from, to) =>
    supabase
      .from('izin_hareketleri')
      .select('tur, gun, yil, ayrilis')
      .eq('sicil_no', sicil_no)
      .in('durum', HAKTAN_DUSEN_DURUMLAR)
      .order('id')
      .range(from, to),
  )
  const kullanilan = (hareketler ?? []).reduce((s, h) => {
    if (hareketYili(h.ayrilis, h.yil) !== yil) return s
    if (hakKullananTurSet.has(h.tur ?? '')) return s + (h.gun ?? 0)
    return s
  }, 0)
  await supabase
    .from('izin_haklari')
    // kalan_gun veritabanında hesaplanan / sadece DEFAULT ile güncellenebilen bir alan;
    // burada yalnızca kullanilan_gun'u güncelliyoruz.
    .update({ kullanilan_gun: kullanilan, updated_at: new Date().toISOString() })
    .eq('sicil_no', sicil_no)
    .eq('yil', yil)
}

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

/** Süper yönetici için varsayılan görünen kullanıcı adı (profilde özel ad yoksa). */
const SUPER_ADMIN_ISLEM_ETIKETI = 'IKEM'

/** Oturum açan kullanıcının izin ekranında gösterilecek işlem etiketi (kullanıcı adı veya ad soyad). */
async function getIslemYapanEtiketi(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: prof } = await supabase
    .from('app_profiles')
    .select('kullanici_adi, sicil_no, rol')
    .eq('id', user.id)
    .maybeSingle()
  if (prof?.kullanici_adi?.trim()) return prof.kullanici_adi.trim()
  if (prof?.rol === 'admin') return SUPER_ADMIN_ISLEM_ETIKETI
  if (prof?.sicil_no) {
    const { data: c } = await supabase.from('calisan').select('ad_soyad').eq('sicil_no', prof.sicil_no).maybeSingle()
    if (c?.ad_soyad?.trim()) return c.ad_soyad.trim()
  }
  const mail = user.email?.split('@')[0]
  return mail || null
}

/** Yıl içinde bir sonraki sıra numarasını üretir: "001", "002" ... */
export async function siradakiIzinSiraNo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  yil: number,
): Promise<string> {
  const { data } = await supabase
    .from('izin_hareketleri')
    .select('sira_no')
    .eq('yil', yil)
    .not('sira_no', 'is', null)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  const son = data?.sira_no ? parseInt(data.sira_no, 10) : 0
  return String(son + 1).padStart(3, '0')
}

export async function izinEkle(formData: FormData): Promise<{ hata?: string }> {
  const sicil_no = String(formData.get('sicil_no') ?? '').trim()
  const tur      = String(formData.get('tur')      ?? '').trim()
  const ayrilis  = str(formData, 'ayrilis')
  const baslama  = str(formData, 'baslama')
  let gun        = parseInt(String(formData.get('gun') ?? '0'), 10)
  const yil      = parseInt(String(formData.get('yil') ?? new Date().getFullYear()), 10)

  if (!sicil_no) return { hata: 'Personel seçimi zorunludur.' }
  if (!tur)      return { hata: 'İzin türü seçimi zorunludur.' }
  if (!ayrilis)  return { hata: 'Ayrılış tarihi zorunludur.' }
  if (!baslama)  return { hata: 'Başlama tarihi zorunludur.' }
  if (baslama <= ayrilis) return { hata: 'Başlama tarihi ayrılış tarihinden sonra olmalıdır.' }

  let ayrilisKayit = ayrilis
  const isYillikIzin = tur === 'Yıllık İzin' || tur.includes('Yıllık')
  if (isYillikIzin) {
    const hesap = await izinGunHesapla(sicil_no, tur, ayrilis, baslama)
    gun = hesap.gun
    if (hesap.ayrilisGuncel) ayrilisKayit = hesap.ayrilisGuncel
  }
  if (gun <= 0) return { hata: 'Gün sayısı 0\'dan büyük olmalıdır.' }

  const supabase = await createClient()

  // Çalışan kontrolü
  const { data: calisan } = await supabase
    .from('calisan').select('sicil_no').eq('sicil_no', sicil_no).maybeSingle()
  if (!calisan) return { hata: `"${sicil_no}" sicil numaralı personel bulunamadı.` }

  const cakisma = await izinCakismaMesaji(supabase, sicil_no, ayrilisKayit, baslama)
  if (cakisma) return { hata: cakisma }

  const sira_no = await siradakiIzinSiraNo(supabase, yil)

  let bilgiStr = str(formData, 'bilgi')
  if (isYillikIzin && !bilgiStr) {
    const hesap = await izinGunHesapla(sicil_no, tur, ayrilis, baslama)
    if (hesap.bilgiler && hesap.bilgiler.length) {
      bilgiStr = hesap.bilgiler.join('\n')
    }
  }

  const islemEtiketi = await getIslemYapanEtiketi()

  const { data: inserted, error } = await supabase.from('izin_hareketleri').insert({
    yil,
    sira_no,
    sicil_no,
    tur,
    ayrilis: ayrilisKayit,
    baslama,
    gun,
    vekalet:   str(formData, 'vekalet'),
    aciklama:  str(formData, 'aciklama'),
    bilgi:     bilgiStr,
    durum:     'Taslak' as Durum,
    kayit_tarihi: new Date().toISOString(),
    islem_yapan: islemEtiketi,
  }).select('id, public_id').single()

  if (error) return { hata: error.message }
  await writePersonelAuditLogSafe(supabase, {
    sicil_no,
    modul: 'izin',
    islem: 'Ekle',
    ozet: `${tur} izni eklendi (${gun} gün, ${yil}/${sira_no}).`,
    ref_table: 'izin_hareketleri',
    ref_id: String(inserted?.id ?? ''),
    sonraki: {
      yil,
      sira_no,
      tur,
      ayrilis: ayrilisKayit,
      baslama,
      gun,
      durum: 'Taslak',
    },
  })
  revalidatePath('/izin')
  revalidatePath('/izin/haklar')
  if (inserted?.public_id) revalidatePath(`/link/${inserted.public_id}`)
  return {}
}

async function izinCakismaMesaji(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sicilNo: string,
  ayrilis: string,
  baslama: string,
): Promise<string | null> {
  const { data: cakisan } = await supabase
    .from('izin_hareketleri')
    .select('sira_no, islem_yapan')
    .eq('sicil_no', sicilNo)
    .neq('durum', 'İptal Edildi')
    .lt('ayrilis', baslama)
    .gt('baslama', ayrilis)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!cakisan) return null
  const islemYapan = (cakisan.islem_yapan ?? 'Bilinmeyen kullanıcı').trim() || 'Bilinmeyen kullanıcı'
  const siraNo = (cakisan.sira_no ?? '—').trim() || '—'
  return `Personelin "${islemYapan}" tarafından kaydedilmiş "${siraNo}" no'lu izni ile çakışıyor.`
}

export async function izinCakismaKontrol(formData: FormData): Promise<{ hata?: string }> {
  const sicilNo = String(formData.get('sicil_no') ?? '').trim()
  const ayrilis = str(formData, 'ayrilis')
  const baslama = str(formData, 'baslama')
  if (!sicilNo || !ayrilis || !baslama || baslama <= ayrilis) return {}

  const supabase = await createClient()
  const cakisma = await izinCakismaMesaji(supabase, sicilNo, ayrilis, baslama)
  return cakisma ? { hata: cakisma } : {}
}

export async function izinGuncelle(id: number, formData: FormData): Promise<{ hata?: string }> {
  const tur     = String(formData.get('tur')     ?? '').trim()
  const ayrilis = str(formData, 'ayrilis')
  const baslama = str(formData, 'baslama')
  let gun       = parseInt(String(formData.get('gun') ?? '0'), 10)
  const durumVal = String(formData.get('durum') ?? '').trim() as Durum

  if (!tur)     return { hata: 'İzin türü seçimi zorunludur.' }
  if (!ayrilis) return { hata: 'Ayrılış tarihi zorunludur.' }
  if (!baslama) return { hata: 'Başlama tarihi zorunludur.' }

  const supabase = await createClient()
  const { data: mevcut } = await supabase
    .from('izin_hareketleri')
    .select('id, sicil_no, yil, public_id, tur, ayrilis, baslama, gun, vekalet, aciklama, durum, bilgi')
    .eq('id', id)
    .single()

  let ayrilisKayit = ayrilis
  const isYillikIzin = tur === 'Yıllık İzin' || tur.includes('Yıllık')
  if (isYillikIzin && mevcut?.sicil_no && ayrilis && baslama) {
    const hesap = await izinGunHesapla(mevcut.sicil_no, tur, ayrilis, baslama, mevcut.id)
    gun = hesap.gun
    if (hesap.ayrilisGuncel) ayrilisKayit = hesap.ayrilisGuncel
  }
  if (gun <= 0) return { hata: 'Gün sayısı 0\'dan büyük olmalıdır.' }

  const yeniDurum = (durumVal || 'Değiştirildi') as Durum
  const vekaletStr = str(formData, 'vekalet')
  const aciklamaStr = str(formData, 'aciklama')

  if (mevcut?.durum === 'Onaylandı') {
    const eskiAyrilis = mevcut.ayrilis ?? ''
    const eskiBaslama = mevcut.baslama ?? ''
    const eskiVekalet = (mevcut.vekalet ?? '').trim()
    const degisti =
      tur !== (mevcut.tur ?? '') ||
      (ayrilisKayit ?? '') !== eskiAyrilis ||
      baslama !== eskiBaslama ||
      gun !== (mevcut.gun ?? 0) ||
      (vekaletStr ?? '') !== eskiVekalet ||
      yeniDurum !== mevcut.durum
    if (degisti && !aciklamaStr) {
      return { hata: 'Onaylanmış izinde değişiklik için açıklama zorunludur.' }
    }
  }

  const islemEtiketi = await getIslemYapanEtiketi()

  const { data: updated, error } = await supabase.from('izin_hareketleri').update({
    tur,
    ayrilis: ayrilisKayit,
    baslama,
    gun,
    vekalet:     vekaletStr,
    aciklama:    aciklamaStr,
    bilgi:       str(formData, 'bilgi'),
    islem_yapan: islemEtiketi,
    durum:       yeniDurum,
  }).eq('id', id).select('public_id').single()

  if (error) return { hata: error.message }
  await writePersonelAuditLogSafe(supabase, {
    sicil_no: mevcut?.sicil_no ?? '',
    modul: 'izin',
    islem: 'Güncelle',
    ozet: `${tur} izni güncellendi (${gun} gün, durum: ${yeniDurum}).`,
    ref_table: 'izin_hareketleri',
    ref_id: String(id),
    onceki: {
      tur: mevcut?.tur,
      ayrilis: mevcut?.ayrilis,
      baslama: mevcut?.baslama,
      gun: mevcut?.gun,
      vekalet: mevcut?.vekalet,
      aciklama: mevcut?.aciklama,
      durum: mevcut?.durum,
      bilgi: mevcut?.bilgi,
    },
    sonraki: {
      tur,
      ayrilis: ayrilisKayit,
      baslama,
      gun,
      vekalet: vekaletStr,
      aciklama: aciklamaStr,
      durum: yeniDurum,
      bilgi: str(formData, 'bilgi'),
    },
  })
  const linkPid = updated?.public_id ?? mevcut?.public_id
  if (linkPid) revalidatePath(`/link/${linkPid}`)
  if (mevcut?.sicil_no && mevcut?.yil) {
    await izinHaklariKullanilanGuncelle(supabase, mevcut.sicil_no, mevcut.yil)
    // İlgili personelin detay ekranını da güncelle
    revalidatePath(`/personel/${mevcut.sicil_no}`)
  }
  revalidatePath('/izin')
  revalidatePath('/izin/haklar')
  return {}
}

export async function izinDurumDegistir(id: number, yeniDurum: Durum): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const islemEtiketi = await getIslemYapanEtiketi()
  const { data: mevcut } = await supabase
    .from('izin_hareketleri')
    .select('sicil_no, yil, public_id, tur, durum')
    .eq('id', id)
    .single()
  const { error } = await supabase
    .from('izin_hareketleri')
    .update({ durum: yeniDurum, islem_yapan: islemEtiketi })
    .eq('id', id)

  if (error) return { hata: error.message }
  if (mevcut?.sicil_no) {
    await writePersonelAuditLogSafe(supabase, {
      sicil_no: mevcut.sicil_no,
      modul: 'izin',
      islem: 'Durum Değiştir',
      ozet: `${mevcut.tur ?? 'İzin'} durumu ${mevcut.durum ?? '—'} -> ${yeniDurum} olarak güncellendi.`,
      ref_table: 'izin_hareketleri',
      ref_id: String(id),
      onceki: { durum: mevcut.durum },
      sonraki: { durum: yeniDurum },
    })
  }
  if (mevcut?.public_id) revalidatePath(`/link/${mevcut.public_id}`)
  if (mevcut?.sicil_no && mevcut?.yil) {
    await izinHaklariKullanilanGuncelle(supabase, mevcut.sicil_no, mevcut.yil)
    // İlgili personelin detay ekranını da güncelle
    await revalidatePersonelDetayPaths(mevcut.sicil_no)
  }
  revalidatePath('/izin')
  revalidatePath('/izin/haklar')
  return {}
}

/** İzin günü hesapla: Yıllık İzin + Zabıta → takvim; Yıllık İzin + diğer → kural/tatil + devam; diğer türler → takvim. haricId: düzenlemede mevcut kaydı devam kontrolünden hariç tutar. */
export async function izinGunHesapla(
  sicil_no: string,
  tur: string,
  ayrilis: string,
  baslama: string,
  haricId?: number
): Promise<IzinGunSonuc> {
  if (!ayrilis || !baslama) return { gun: 0, bilgiler: [] }
  const baslangic = new Date(ayrilis)
  const bitis = new Date(baslama)
  if (isNaN(baslangic.getTime()) || isNaN(bitis.getTime()) || bitis.getTime() <= baslangic.getTime()) {
    return { gun: 0, bilgiler: [] }
  }

  const isYillikIzin = tur === 'Yıllık İzin' || (tur && tur.includes('Yıllık'))

  if (!isYillikIzin) {
    return gunBasitHesapla(ayrilis, baslama)
  }

  const supabase = await createClient()

  // Personelin görev unvanı (kadro_hareketleri'nden - asil veya vekil)
  let gorevUnvani: string | null = null
  const { data: khRows } = await supabase
    .from('kadro_hareketleri')
    .select('gorev_unvani, statu, asil, vekil')
    .or(`asil.eq.${sicil_no},vekil.eq.${sicil_no}`)
  const kh = (khRows ?? []).find(
    (r: { asil?: string | null; vekil?: string | null }) =>
      (r.asil ?? '').trim() === sicil_no || (r.vekil ?? '').trim() === sicil_no
  ) ?? (khRows ?? [])[0]
  if (kh) gorevUnvani = (kh as { gorev_unvani?: string }).gorev_unvani ?? null

  if (zabitaUnvaniMi(gorevUnvani)) {
    const sonuc = gunBasitHesapla(ayrilis, baslama)
    return { gun: sonuc.gun, bilgiler: ['Zabıta unvanı: takvim günü uygulanır.'] }
  }

  // Statü (kadro statüsü)
  const statu = (kh as { statu?: string })?.statu ?? ''
  const { data: kurallar } = await supabase
    .from('tanim_izin_kural')
    .select('statu, cumartesi, pazar, haftaici_tatil, tatil_haftasonu')
    .eq('durum', true)
  const kuralRow = (kurallar ?? []).find((r: { statu?: string }) => (r.statu ?? '').trim() === statu.trim())
  const kural = kuralRow
    ? {
        statu: (kuralRow as { statu?: string }).statu ?? '',
        cumartesi: (kuralRow as { cumartesi?: boolean }).cumartesi ?? null,
        pazar: (kuralRow as { pazar?: boolean }).pazar ?? null,
        haftaici_tatil: (kuralRow as { haftaici_tatil?: boolean }).haftaici_tatil ?? null,
        tatil_haftasonu: (kuralRow as { tatil_haftasonu?: boolean }).tatil_haftasonu ?? null,
      }
    : null

  const { ggAayyyyToIso } = await import('@/lib/tarih')
  const hedefYil = new Date(ayrilis).getFullYear()
  const { data: tatiller } = await supabase
    .from('tanim_izin_tatil')
    .select('tatil_adi, tatil_turu, tatil_yapisi, tatil_baslangici, tatil_bitisi')
    .eq('durum', true)
  const tatilRanges = (tatiller ?? []).map((t: { tatil_adi?: string; tatil_baslangici?: string; tatil_bitisi?: string }) => {
    const bStr = (t.tatil_baslangici ?? '').trim()
    const eStr = (t.tatil_bitisi ?? '').trim()
    const bIso = bStr.includes('.') ? ggAayyyyToIso(bStr) : bStr
    const eIso = eStr.includes('.') ? ggAayyyyToIso(eStr) : eStr
    const yapisi =
      (t as { tatil_yapisi?: 'Yıllık Tatil' | 'Sabit Tatil' | null }).tatil_yapisi ??
      tatilYapisiHesapla((t as { tatil_adi?: string | null }).tatil_adi, (t as { tatil_turu?: string | null }).tatil_turu)
    const bSrc = new Date(bIso ?? bStr)
    const eSrc = new Date(eIso ?? eStr)
    const b = yapisi === 'Sabit Tatil'
      ? new Date(hedefYil, bSrc.getMonth(), bSrc.getDate())
      : bSrc
    const e = yapisi === 'Sabit Tatil'
      ? new Date(hedefYil, eSrc.getMonth(), eSrc.getDate())
      : eSrc
    return {
      baslangic: b,
      bitis: e,
      tatilAdi: (t.tatil_adi ?? '').trim(),
    }
  }).filter((r: { baslangic: Date; bitis: Date }) => !isNaN(r.baslangic.getTime()) && !isNaN(r.bitis.getTime()))

  // Devam niteliğindeki izin: eski iznin başlama (işe dönüş) = yeni iznin ayrılış (izne çıkış)
  let ayrilisGuncel = ayrilis
  let devamBilgi = ''
  let oncekiSorgu = supabase
    .from('izin_hareketleri')
    .select('baslama')
    .eq('sicil_no', sicil_no)
    .in('durum', ['Taslak', ...HAKTAN_DUSEN_DURUMLAR])
    .or('tur.ilike.%Yıllık%')
    .order('baslama', { ascending: false })
  if (haricId != null) oncekiSorgu = oncekiSorgu.neq('id', haricId)
  const { data: oncekiIzinler } = await oncekiSorgu
  const ayrilisDate = new Date(ayrilis)
  const baslamaDate = new Date(baslama)
  if (!isNaN(ayrilisDate.getTime()) && !isNaN(baslamaDate.getTime()) && oncekiIzinler?.length) {
    // Önceki izin: baslama (işe dönüş) < mevcut baslama — eski iznin başlama = yeni iznin ayrılış
    const prevBaslamalar = (oncekiIzinler ?? [])
      .map((r: { baslama?: string | null }) => r.baslama ? new Date(r.baslama) : null)
      .filter((d): d is Date => d !== null && !isNaN(d.getTime()) && d.getTime() < baslamaDate.getTime())
    const prevBaslama = prevBaslamalar.length
      ? prevBaslamalar.reduce((a, b) => (a.getTime() > b.getTime() ? a : b))
      : null
    if (prevBaslama) {
      const prevBaslamaNorm = new Date(prevBaslama.getFullYear(), prevBaslama.getMonth(), prevBaslama.getDate())
      const ayrilisNorm = new Date(ayrilisDate.getFullYear(), ayrilisDate.getMonth(), ayrilisDate.getDate())
      const gapIlkGun = new Date(prevBaslamaNorm.getTime())
      const gapSonGun = new Date(ayrilisNorm.getTime())
      gapSonGun.setDate(gapSonGun.getDate() - 1) // ayrılıştan 1 gün öncesi
      if (gapIlkGun.getTime() <= gapSonGun.getTime()) {
        let hepsiHakAzalir = true
        const walkCheck = new Date(gapIlkGun.getTime())
        while (walkCheck.getTime() <= gapSonGun.getTime()) {
          if (!gunHakAzalir(walkCheck, kural, tatilRanges)) {
            hepsiHakAzalir = false
            break
          }
          walkCheck.setDate(walkCheck.getDate() + 1)
        }
        if (hepsiHakAzalir) {
          ayrilisGuncel = prevBaslamaNorm.toISOString().slice(0, 10)
          devamBilgi = 'Devam niteliğindeki izin'
        }
      }
    }
  }

  const sonuc = gunYillikIzinHesapla(ayrilisGuncel, baslama, kural, tatilRanges)
  if (devamBilgi) {
    sonuc.bilgiler = [...(sonuc.bilgiler ?? []), devamBilgi]
    sonuc.ayrilisGuncel = ayrilisGuncel
  }
  return sonuc
}

/** Tüm izin_haklari kayıtları için kullanilan_gun değerini izin_hareketleri'nden hesapla (Taslak/İptal hariç).
 * Sadece izin_hakki_kullanımı=Evet (veya Yıllık İzin) olan izin türleri izin hakkından düşer. */
export async function izinHaklariKullanilanTopluGuncelle(): Promise<{ hata?: string; guncellenen?: number; toplam?: number }> {
  const supabase = await createClient()
  const { data: hakKullananTurler } = await supabase
    .from('tanim_izin_tur')
    .select('tur_adi')
    .in('izin_hakki_kullanimi', HAKTAN_DUSEN_HAKKI_KULLANIMI)
  const hakKullananTurSet = new Set((hakKullananTurler ?? []).map(t => t.tur_adi))

  const { data: haklar } = await supabase.from('izin_haklari').select('id, sicil_no, yil')
  const toplam = haklar?.length ?? 0
  if (!haklar?.length) return { guncellenen: 0, toplam: 0 }
  let guncellenen = 0
  for (const h of haklar) {
    const { data: hareketler } = await fetchAllPaged<{ tur: string | null; gun: number | null; yil: number | null; ayrilis: string | null }>((from, to) =>
      supabase
        .from('izin_hareketleri')
        .select('tur, gun, yil, ayrilis')
        .eq('sicil_no', h.sicil_no)
        .in('durum', HAKTAN_DUSEN_DURUMLAR)
        .order('id')
        .range(from, to),
    )
    const kullanilan = (hareketler ?? []).reduce((s, x) => {
      if (hareketYili(x.ayrilis, x.yil) !== h.yil) return s
      if (hakKullananTurSet.has(x.tur ?? '')) return s + (x.gun ?? 0)
      return s
    }, 0)
    const { error } = await supabase
      .from('izin_haklari')
      .update({ kullanilan_gun: kullanilan, updated_at: new Date().toISOString() })
      .eq('id', h.id)
    if (error) {
      // İlk hatada döndür; hangi kayıt patlamış görmek için sicil + yıl bilgisini de iletelim
      return {
        hata: `Güncelleme hatası (sicil: ${h.sicil_no}, yıl: ${h.yil}): ${error.message}`,
        guncellenen,
        toplam,
      }
    }
    guncellenen++
  }
  revalidatePath('/izin')
  revalidatePath('/izin/haklar')
  return { guncellenen, toplam }
}

/** Devam niteliğindeki izin kayıtlarının ayrılış tarihini önceki izinin başlama tarihine günceller. */
export async function izinDevamAyrilisTopluGuncelle(): Promise<{ hata?: string; guncellenen: number }> {
  const supabase = await createClient()
  const { data: kayitlar } = await fetchAllPaged((from, to) =>
    supabase
      .from('izin_hareketleri')
      .select('id, sicil_no, tur, ayrilis, baslama')
      .in('durum', HAKTAN_DUSEN_DURUMLAR)
      .or('tur.ilike.%Yıllık%')
      .order('id')
      .range(from, to),
  )
  if (!kayitlar?.length) return { guncellenen: 0 }
  let guncellenen = 0
  for (const k of kayitlar) {
    if (!k.sicil_no || !k.ayrilis || !k.baslama) continue
    const hesap = await izinGunHesapla(k.sicil_no, k.tur ?? '', k.ayrilis, k.baslama, k.id)
    if (hesap.ayrilisGuncel && hesap.ayrilisGuncel !== k.ayrilis) {
      const { error } = await supabase
        .from('izin_hareketleri')
        .update({ ayrilis: hesap.ayrilisGuncel })
        .eq('id', k.id)
      if (!error) guncellenen++
    }
  }
  revalidatePath('/izin')
  return { guncellenen }
}

export type GecmisIzinAktarSatir = {
  excelSatir?: number
  siraNo: string
  islemYapan: string
  tarih: string
  sicilNo: string
  adSoyad: string
  vekalet: string
  tur: string
  ayrilis: string
  baslama: string
  gun: string
  durum: string
}

export type GecmisIzinAtlama = {
  excelSatir: number | null
  siraNo: string
  sicilNo: string
  adSoyad: string
  sutun: string
  deger: string
  neden: string
}

function normalizeSicilGecmis(s: string): string {
  let t = String(s ?? '').trim()
  if (/^\d+\.0+$/.test(t)) t = t.replace(/\.0+$/, '')
  return t
}

function tarihIsoGecmis(s: string): string | null {
  const t = String(s ?? '').trim()
  if (!t) return null
  const m = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
  if (m) return `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10)
  return null
}

function parseSiraGecmis(raw: string, yilVarsayilan: number): { yil: number; sira_no: string } {
  const t = String(raw ?? '').trim()
  const m = t.match(/^(\d{4})\s*[\/.\-]\s*(.+)$/)
  if (m) return { yil: Number(m[1]), sira_no: String(m[2]).trim() }
  return { yil: yilVarsayilan, sira_no: t || '001' }
}

function mapDurumGecmis(raw: string): Durum {
  const n = String(raw ?? '').trim().toLocaleLowerCase('tr-TR')
  if (n.includes('iptal')) return 'İptal Edildi'
  if (n.includes('değiştir') || n.includes('degistir')) return 'Değiştirildi'
  if (n.includes('taslak')) return 'Taslak'
  if (n.includes('onay')) return 'Onaylandı'
  return 'Onaylandı'
}

/** Excel önizlemesindeki geçmiş izinleri izin_hareketleri'ne yazar; haktan düşen türlerde bakiyeyi günceller. */
export async function gecmisIzinleriSistemeIsle(
  satirlar: GecmisIzinAktarSatir[],
): Promise<{ hata?: string; eklenen?: number; atlanan?: number; mesaj?: string; atlananlar?: GecmisIzinAtlama[] }> {
  if (!satirlar?.length) return { hata: 'Aktarılacak kayıt yok.' }
  const supabase = await createClient()

  const siciller = [...new Set(satirlar.map(s => normalizeSicilGecmis(s.sicilNo)).filter(Boolean))]
  const calisanSet = new Set<string>()
  for (let i = 0; i < siciller.length; i += 200) {
    const { data } = await supabase
      .from('calisan')
      .select('sicil_no')
      .in('sicil_no', siciller.slice(i, i + 200))
    for (const c of data ?? []) if (c.sicil_no) calisanSet.add(c.sicil_no)
  }

  let eklenen = 0
  const atlananlar: GecmisIzinAtlama[] = []
  const hakGuncelle = new Map<string, { sicil: string; yil: number }>()

  const atla = (
    s: GecmisIzinAktarSatir,
    sutun: string,
    deger: string,
    neden: string,
  ) => {
    atlananlar.push({
      excelSatir: s.excelSatir ?? null,
      siraNo: s.siraNo.trim(),
      sicilNo: normalizeSicilGecmis(s.sicilNo),
      adSoyad: s.adSoyad.trim(),
      sutun,
      deger,
      neden,
    })
  }

  for (const s of satirlar) {
    const sicil_no = normalizeSicilGecmis(s.sicilNo)
    const tur = s.tur.trim()
    const ayrilisHam = s.ayrilis.trim()
    const baslamaHam = s.baslama.trim()
    const ayrilis = tarihIsoGecmis(ayrilisHam)
    const baslama = tarihIsoGecmis(baslamaHam)
    const gun = parseInt(String(s.gun).replace(',', '.'), 10)
    if (!sicil_no) {
      atla(s, 'Sicil No', s.sicilNo, 'Sicil No boş. Excel’de bu hücreyi doldurun.')
      continue
    }
    if (!tur) {
      atla(s, 'Tür', s.tur, 'İzin türü boş. Yıllık İzin, Rapor vb. yazın.')
      continue
    }
    if (!ayrilis) {
      atla(s, 'Ayrılış', ayrilisHam || '(boş)', 'Ayrılış tarihi okunamadı. gg.aa.yyyy (ör. 02.01.2026) yazın.')
      continue
    }
    if (!baslama) {
      atla(s, 'Başlama', baslamaHam || '(boş)', 'Başlama tarihi okunamadı. gg.aa.yyyy (ör. 03.01.2026) yazın.')
      continue
    }
    if (!(gun > 0)) {
      atla(s, 'Gün', String(s.gun || '(boş)'), 'Gün sayısı 0 veya boş. Pozitif bir gün yazın.')
      continue
    }
    if (!calisanSet.has(sicil_no)) {
      let ipucu = ' Ad Soyad da sistemde eşleşmedi.'
      const ad = s.adSoyad.trim()
      if (ad) {
        const { data: adEslesen } = await supabase
          .from('calisan')
          .select('sicil_no, ad_soyad')
          .ilike('ad_soyad', ad)
          .limit(5)
        const aday = (adEslesen ?? []).map(c => c.sicil_no).filter(Boolean)
        if (aday.length) ipucu = ` Ad Soyad ile sistemde bulunan sicil: ${aday.join(', ')}.`
      }
      atla(
        s,
        'Sicil No',
        sicil_no,
        `Bu sicil sistemde yok (personel kartı bulunamadı).${ipucu} Sicil No sütununu personel kartındaki sicille aynı yazın.`,
      )
      continue
    }
    const yilVarsayilan = Number(ayrilis.slice(0, 4))
    const { yil, sira_no } = parseSiraGecmis(s.siraNo, yilVarsayilan)
    const durum = mapDurumGecmis(s.durum)
    const kayitTarihi = tarihIsoGecmis(s.tarih)

    const { data: mevcutSira } = await supabase
      .from('izin_hareketleri')
      .select('id')
      .eq('yil', yil)
      .eq('sira_no', sira_no)
      .maybeSingle()
    if (mevcutSira) {
      atla(
        s,
        'Sıra No',
        `${yil}/${sira_no}`,
        'Bu sıra no zaten sistemde var. Aynı satırı tekrar yüklemeyin veya Sıra No’yu değiştirin.',
      )
      continue
    }

    const { data: cakisan } = await supabase
      .from('izin_hareketleri')
      .select('id')
      .eq('sicil_no', sicil_no)
      .eq('tur', tur)
      .eq('ayrilis', ayrilis)
      .eq('baslama', baslama)
      .neq('durum', 'İptal Edildi')
      .limit(1)
      .maybeSingle()
    if (cakisan) {
      atla(
        s,
        'Ayrılış / Başlama',
        `${ayrilisHam} → ${baslamaHam}`,
        'Bu personelde aynı tür ve aynı tarih aralığında izin zaten kayıtlı.',
      )
      continue
    }

    const { error } = await supabase.from('izin_hareketleri').insert({
      yil,
      sira_no,
      sicil_no,
      tur,
      ayrilis,
      baslama,
      gun,
      vekalet: s.vekalet.trim() || null,
      durum,
      kayit_tarihi: kayitTarihi ? `${kayitTarihi}T12:00:00.000Z` : new Date().toISOString(),
      islem_yapan: s.islemYapan.trim() || null,
    })
    if (error) {
      atla(s, 'Kayıt', s.siraNo, `Veritabanı yazamadı: ${error.message}`)
      continue
    }
    eklenen++
    if (durum === 'Onaylandı' || durum === 'Değiştirildi') {
      const hakYil = hareketYili(ayrilis, yil) ?? yil
      hakGuncelle.set(`${sicil_no}|${hakYil}`, { sicil: sicil_no, yil: hakYil })
    }
    await revalidatePersonelDetayPaths(sicil_no)
  }

  for (const { sicil, yil } of hakGuncelle.values()) {
    await izinHaklariKullanilanGuncelle(supabase, sicil, yil)
  }

  revalidatePath('/izin')
  revalidatePath('/izin/haklar')
  revalidatePath('/izin/gecmis-izinler')
  const atlanan = atlananlar.length
  const ozetAtlama = atlananlar.slice(0, 8).map(a => {
    const yer = a.excelSatir ? `Excel satır ${a.excelSatir}` : (a.adSoyad || a.sicilNo || a.siraNo)
    return `${yer} · ${a.sutun}: ${a.neden}`
  })
  const ekstra = ozetAtlama.length ? ` Atlanan: ${ozetAtlama.join(' | ')}${atlanan > 8 ? ` (+${atlanan - 8})` : ''}` : ''
  return {
    eklenen,
    atlanan,
    atlananlar,
    mesaj: `${eklenen} kayıt yazıldı, ${atlanan} atlandı.${ekstra}`,
  }
}
