import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/dashboard/DashboardClient'
import KullaniciAnaSayfa from '@/components/dashboard/KullaniciAnaSayfa'
import type { GorevHatirlaticiItem } from '@/components/dashboard/GorevHatirlaticiWidget'
import { getGelistirmelerCount } from '@/lib/gelistirmeler-server'
import { getAppAccess } from '@/lib/app-access'
import { dashboardStatuSayilariHesapla, dashboardKadroSatirlariYukle } from '@/lib/dashboard-statu-sayilari'
import { izinDurumDegistir } from './izin/actions'
import type {
  KadroDoluluk, IzinIstatistik, BekleyenIzin,
  YaklaşanTatil, IzindekiPersonel, IzinArtisAdayi,
} from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }

  if (user && access.mode === 'kullanici') {
    return (
      <KullaniciAnaSayfa
        sicilNo={access.sicilNo}
        menuIzinleri={access.menuIzinleri}
      />
    )
  }

  const buYil    = new Date().getFullYear()
  const bugun    = new Date().toISOString().split('T')[0]

  const [
    kadroRaw,
    { data: izinYilRaw },
    { data: bekleyenRaw },
    { data: tatilRaw },
    { data: izindekiRaw },
  ] = await Promise.all([
    dashboardKadroSatirlariYukle(supabase),

    // Bu yılın tüm izin hareketleri (durum dağılımı)
    supabase
      .from('izin_hareketleri')
      .select('durum')
      .eq('yil', buYil),

    // 4) Bekleyen (Taslak) izinler — en fazla 20
    supabase
      .from('izin_hareketleri')
      .select('id, sira_no, sicil_no, tur, baslama, ayrilis, gun, kayit_tarihi, islem_yapan')
      .eq('durum', 'Taslak')
      .order('kayit_tarihi', { ascending: true })
      .limit(20),

    // 5) Yaklaşan tatiller (bugün ve sonrası, en fazla 6)
    supabase
      .from('tanim_izin_tatil')
      .select('id, tatil_adi, tatil_turu, tatil_baslangici, tatil_bitisi')
      .gte('tatil_baslangici', bugun)
      .order('tatil_baslangici')
      .limit(6),

    // 6) Bugün izinde olanlar
    supabase
      .from('izin_hareketleri')
      .select('id, sicil_no, tur, ayrilis')
      .eq('durum', 'Onaylandı')
      .lte('baslama', bugun)
      .gte('ayrilis', bugun)
      .limit(10),
  ])

  // 7b) Görev bitiş hatırlatıcıları: gorev_turu_bitis_tarihi veya engelli_bitis bugün+15 gün içinde
  type HatirlaticiRow = {
    sicil_no: string; ad_soyad: string | null
    gorev_turu: string | null; gorev_turu_bitis_tarihi: string | null
    engelli_bitis: string | null
  }
  const hatirlaticiGun = new Date()
  hatirlaticiGun.setDate(hatirlaticiGun.getDate() + 15)
  const hatirlaticiSon = hatirlaticiGun.toISOString().split('T')[0]

  // İki ayrı sorgu: gorev bitiş ve engelli bitiş — sonra JS'te filtrele
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [gorevBitisResult, engeliBitisResult] = await Promise.all([
    sb.from('calisan')
      .select('sicil_no, ad_soyad, gorev_turu, gorev_turu_bitis_tarihi, engelli_bitis')
      .not('gorev_turu_bitis_tarihi', 'is', null)
      .gte('gorev_turu_bitis_tarihi', bugun)
      .lte('gorev_turu_bitis_tarihi', hatirlaticiSon),
    sb.from('calisan')
      .select('sicil_no, ad_soyad, gorev_turu, gorev_turu_bitis_tarihi, engelli_bitis')
      .not('engelli_bitis', 'is', null)
      .gte('engelli_bitis', bugun)
      .lte('engelli_bitis', hatirlaticiSon),
  ])

  // Dedup by sicil_no — birleştir
  const hatirlaticiMap = new Map<string, HatirlaticiRow>()
  for (const r of [...(gorevBitisResult.data ?? []), ...(engeliBitisResult.data ?? [])]) {
    const key = r.sicil_no
    if (!hatirlaticiMap.has(key)) hatirlaticiMap.set(key, r)
    else {
      // Birleştir: her iki bitiş tarihini de koru
      const cur = hatirlaticiMap.get(key)!
      if (!cur.gorev_turu_bitis_tarihi) cur.gorev_turu_bitis_tarihi = r.gorev_turu_bitis_tarihi
      if (!cur.engelli_bitis) cur.engelli_bitis = r.engelli_bitis
    }
  }
  const hatirlaticiRaw: HatirlaticiRow[] = [...hatirlaticiMap.values()]

  const gorevHatirlaticilar: GorevHatirlaticiItem[] = []
  const bugunMs = new Date(bugun).getTime()

  for (const r of hatirlaticiRaw) {
    if (r.gorev_turu_bitis_tarihi) {
      const bitisMs = new Date(r.gorev_turu_bitis_tarihi).getTime()
      const kalanGun = Math.round((bitisMs - bugunMs) / 86_400_000)
      if (kalanGun >= 0 && kalanGun <= 15) {
        gorevHatirlaticilar.push({
          sicil_no: r.sicil_no,
          ad_soyad: r.ad_soyad ?? r.sicil_no,
          gorev_turu: r.gorev_turu ?? '',
          bitis_tarihi: r.gorev_turu_bitis_tarihi,
          bitis_turu: 'gorev',
          kalan_gun: kalanGun,
        })
      }
    }
    if (r.engelli_bitis) {
      const bitisMs = new Date(r.engelli_bitis).getTime()
      const kalanGun = Math.round((bitisMs - bugunMs) / 86_400_000)
      if (kalanGun >= 0 && kalanGun <= 15) {
        gorevHatirlaticilar.push({
          sicil_no: r.sicil_no,
          ad_soyad: r.ad_soyad ?? r.sicil_no,
          gorev_turu: r.gorev_turu ?? '',
          bitis_tarihi: r.engelli_bitis,
          bitis_turu: 'engelli',
          kalan_gun: kalanGun,
        })
      }
    }
  }
  gorevHatirlaticilar.sort((a, b) => a.kalan_gun - b.kalan_gun)

  // 7) Sadece panoda görünen siciller için çalışan adı / public_id (tüm tabloyu çekme — yavaşlık riski)
  const sicilSet = new Set<string>()
  ;(bekleyenRaw ?? []).forEach(iz => {
    if (iz.sicil_no) sicilSet.add(iz.sicil_no)
  })
  ;(izindekiRaw ?? []).forEach(i => {
    if (i.sicil_no) sicilSet.add(i.sicil_no)
  })
  const siciller = [...sicilSet]

  let calisanAdRaw: { sicil_no: string; public_id: string | null; ad_soyad: string | null }[] = []
  if (siciller.length > 0) {
    const { data } = await supabase
      .from('calisan')
      .select('sicil_no, public_id, ad_soyad')
      .in('sicil_no', siciller)
    calisanAdRaw = data ?? []
  }

  // Ad + canonical link (public_id) haritası
  const adMap: Record<string, string> = {}
  const publicIdMap: Record<string, string> = {}
  ;(calisanAdRaw ?? []).forEach(c => {
    if (c.sicil_no) {
      adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no
      if (c.public_id) publicIdMap[c.sicil_no] = c.public_id
    }
  })

  // Kadro doluluk + statü sayıları (asil kadro)
  const kadroDoluluk: KadroDoluluk = { dolu: 0, vekil: 0, bos: 0 }
  ;(kadroRaw ?? []).forEach(k => {
    if (k.durumu === 'Dolu') kadroDoluluk.dolu++
    if (k.durumu === 'Vekil') kadroDoluluk.vekil++
    if (k.durumu === 'Boş') kadroDoluluk.bos++
  })
  const statuSayilari = dashboardStatuSayilariHesapla(kadroRaw)

  // İzin istatistik
  const izinIstatistik: IzinIstatistik = { taslak: 0, onaylandi: 0, iptal: 0, degistirildi: 0 }
  ;(izinYilRaw ?? []).forEach(i => {
    if (i.durum === 'Taslak')        izinIstatistik.taslak++
    if (i.durum === 'Onaylandı')     izinIstatistik.onaylandi++
    if (i.durum === 'İptal Edildi')  izinIstatistik.iptal++
    if (i.durum === 'Değiştirildi')  izinIstatistik.degistirildi++
  })

  // Bekleyen izinler
  const bekleyenIzinler: BekleyenIzin[] = (bekleyenRaw ?? []).map(iz => ({
    id:               iz.id,
    sira_no:          iz.sira_no,
    sicil_no:         iz.sicil_no ?? '',
    public_id:        publicIdMap[iz.sicil_no ?? ''],
    ad_soyad:         adMap[iz.sicil_no ?? ''] ?? iz.sicil_no ?? '',
    izin_turu:        iz.tur,
    /** Sol: ayrılış / izin başlangıcı (küçük tarih). Sağ: işe başlama (büyük tarih). */
    baslangic:        iz.ayrilis,
    bitis:            iz.baslama,
    gun_sayisi:       iz.gun,
    olusturma_tarihi: iz.kayit_tarihi,
    islem_yapan:      iz.islem_yapan,
  }))

  // Yaklaşan tatiller
  const yaklaşanTatiller: YaklaşanTatil[] = (tatilRaw ?? []).map(t => ({
    id:               t.id,
    tatil_adi:        t.tatil_adi,
    tatil_turu:       t.tatil_turu,
    tatil_baslangici: t.tatil_baslangici,
    tatil_bitisi:     t.tatil_bitisi,
  }))

  // İzindekiler
  const izindekiler: IzindekiPersonel[] = (izindekiRaw ?? []).map(i => ({
    id:        i.id,
    sicil_no:  i.sicil_no ?? '',
    public_id: publicIdMap[i.sicil_no ?? ''],
    ad_soyad:  adMap[i.sicil_no ?? ''] ?? i.sicil_no ?? '',
    izin_turu: i.tur,
    bitis:     i.ayrilis,
  }))

  // Yıllık izni artacak/eklenecek adaylar (yalnızca dashboard içinde hesaplanır)
  let izinArtisAdaylari: IzinArtisAdayi[] = []
  if (user && access?.mode === 'admin') {
    const [{ data: personelOzet }, { data: terfiRaw }, { data: hakRaw }, { data: hakKuralRaw }] = await Promise.all([
      supabase.from('personel_kadro_ozet').select('sicil_no, ad_soyad, statu, kuruma_giris_tarihi'),
      supabase
        .from('terfi_hareketleri')
        .select('sicil_no, kidem_yili, kidem_tarihi, kayit_zamani')
        .order('kayit_zamani', { ascending: false }),
      supabase.from('izin_haklari').select('sicil_no, hak_edilen_gun').eq('yil', buYil),
      supabase
        .from('tanim_izin_hak')
        .select('statu, en_az, en_cok, hak_edilen_gun, sira_no')
        .eq('durum', true)
        .order('sira_no', { nullsFirst: false }),
    ])

    type HakKural = { statu: string; en_az: number | null; en_cok: number | null; hak_edilen_gun: number; sira_no: number | null }
    const kurallar: HakKural[] = (hakKuralRaw ?? []).map((h) => ({
      statu: h.statu ?? '',
      en_az: h.en_az != null ? Number(h.en_az) : null,
      en_cok: h.en_cok != null ? Number(h.en_cok) : null,
      hak_edilen_gun: h.hak_edilen_gun ?? 0,
      sira_no: h.sira_no != null ? Number(h.sira_no) : null,
    }))
    const norm = (s: string | null | undefined) => String(s ?? '').trim().toLocaleLowerCase('tr-TR')
    const hakKuralBul = (statu: string, kidemYili: number): number => {
      const statuNorm = norm(statu)
      const aday = kurallar.filter((k) => {
        if (norm(k.statu) !== statuNorm) return false
        if (k.en_az != null && kidemYili < k.en_az) return false
        if (k.en_cok != null && kidemYili > k.en_cok) return false
        return true
      })
      if (!aday.length) return 0
      aday.sort((a, b) => {
        const aralikA = (a.en_cok ?? 999) - (a.en_az ?? 0)
        const aralikB = (b.en_cok ?? 999) - (b.en_az ?? 0)
        if (aralikA !== aralikB) return aralikA - aralikB
        return (a.sira_no ?? 999) - (b.sira_no ?? 999)
      })
      return aday[0].hak_edilen_gun ?? 0
    }

    const sonTerfiMap = new Map<string, { kidemYili: number; kidemTarihi: string | null }>()
    for (const t of terfiRaw ?? []) {
      if (!t.sicil_no || sonTerfiMap.has(t.sicil_no)) continue
      sonTerfiMap.set(t.sicil_no, {
        kidemYili: parseInt(String(t.kidem_yili ?? '0'), 10) || 0,
        kidemTarihi: t.kidem_tarihi ?? null,
      })
    }
    const hakMap = new Map((hakRaw ?? []).map((h) => [h.sicil_no, h.hak_edilen_gun ?? 0]))
    const adMapAdmin = new Map((personelOzet ?? []).map((p) => [p.sicil_no ?? '', {
      ad: p.ad_soyad,
      statu: p.statu ?? '',
      kurumaGirisTarihi: p.kuruma_giris_tarihi ?? null,
    }]))

    const isIsciStatu = (statu: string | null | undefined) => norm(statu).includes('işçi')
    const parseTarih = (raw: string | null): Date | null => {
      if (!raw) return null
      const s = String(raw).trim()
      if (!s) return null
      const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
      const iso = m ? `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}` : s.slice(0, 10)
      const d = new Date(iso + 'T12:00:00')
      return Number.isNaN(d.getTime()) ? null : d
    }
    const kidemYiliKurumaGiris = (kurumaGiris: string | null): number => {
      const d = parseTarih(kurumaGiris)
      if (!d) return 0
      const t = new Date(bugun + 'T12:00:00')
      let yilFark = t.getFullYear() - d.getFullYear()
      const ayFark = t.getMonth() - d.getMonth()
      const gunFark = t.getDate() - d.getDate()
      if (ayFark < 0 || (ayFark === 0 && gunFark < 0)) yilFark--
      return Math.max(0, yilFark)
    }
    const yilDonumuBuYil = (kurumaGiris: string | null): string | null => {
      const d = parseTarih(kurumaGiris)
      if (!d) return null
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${buYil}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    }

    const adaylar: IzinArtisAdayi[] = []
    for (const p of personelOzet ?? []) {
      const sicil = p.sicil_no ?? ''
      if (!sicil) continue
      const personel = adMapAdmin.get(sicil)
      if (!personel) continue
      const statu = personel.statu ?? ''
      const terfi = sonTerfiMap.get(sicil)
      const isIsci = isIsciStatu(statu)
      const kidemYili = isIsci ? kidemYiliKurumaGiris(personel.kurumaGirisTarihi) : (terfi?.kidemYili ?? 0)
      const kidemTarihi = isIsci ? yilDonumuBuYil(personel.kurumaGirisTarihi) : (terfi?.kidemTarihi ?? null)
      const mevcutHak = hakMap.get(sicil) ?? 0

      if (!isIsci && !terfi) continue

      const kidemTarihBuYil =
        !!kidemTarihi &&
        kidemTarihi.slice(0, 4) === String(buYil) &&
        kidemTarihi <= bugun
      const kapsamaGiriyor = isIsci
        ? Boolean(kidemTarihBuYil)
        : Boolean(kidemYili >= 10 || (kidemYili === 9 && kidemTarihBuYil))
      if (!kapsamaGiriyor) continue

      const kidemHedef = isIsci ? kidemYili : (kidemYili >= 10 ? kidemYili : 10)
      const onerilenHak = hakKuralBul(statu, kidemHedef)
      if (onerilenHak <= 0 || onerilenHak === mevcutHak) continue
      adaylar.push({
        sicil_no: sicil,
        public_id: publicIdMap[sicil],
        ad_soyad: personel.ad,
        kidem_tarihi: kidemTarihi,
        kidem_yili: kidemYili,
        mevcut_hak: mevcutHak,
        onerilen_hak: onerilenHak,
      })
    }
    adaylar.sort((a, b) => a.sicil_no.localeCompare(b.sicil_no, undefined, { numeric: true }))
    izinArtisAdaylari = adaylar.slice(0, 25)
  }

  return (
    <div className="space-y-6">
      <DashboardClient
        statuSayilari={statuSayilari}
        kadroDoluluk={kadroDoluluk}
        izinIstatistik={izinIstatistik}
        bekleyenIzinler={bekleyenIzinler}
        yaklaşanTatiller={yaklaşanTatiller}
        izindekiler={izindekiler}
        izinArtisAdaylari={izinArtisAdaylari}
        gorevHatirlaticilar={gorevHatirlaticilar}
        mihenkTasiSayisi={getGelistirmelerCount()}
        buYil={buYil}
        canEditIzinHak={access.mode === 'admin'}
        onDurumDegistir={izinDurumDegistir}
      />
    </div>
  )
}
