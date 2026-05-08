'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getKullaniciGorevMudurlukleri, assertKullaniciMudurlukErisimi } from '@/lib/kullanici-mudurluk'
import { getAppAccess } from '@/lib/app-access'
import { buildTurAdiToKodMap } from '@/lib/izin-puantaj-kodu'
import { izinKodlariBySicilGunFromHareketler } from '@/lib/arazi-izin-gunleri'
import { haftaSonuIzinHucreKodu } from '@/lib/puantaj-hafta-sonu-izin'

const GUNLER_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']

function toISO(d: Date): string {
  return d.toISOString().split('T')[0]
}

function tarihParse(str: string): Date | null {
  if (!str || typeof str !== 'string') return null
  const s = str.trim()
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return d
}

function yilAraligi(baslangic: string, bitis: string): number[] {
  const b = new Date(baslangic)
  const s = new Date(bitis)
  if (isNaN(b.getTime()) || isNaN(s.getTime())) return []
  const yillar: number[] = []
  for (let y = b.getFullYear(); y <= s.getFullYear(); y++) yillar.push(y)
  return yillar
}

function tatilleriDonemeUydur(
  tatiller: Array<{ tatil_baslangici: string | null; tatil_bitisi: string | null; tatil_turu?: string | null; tatil_adi?: string | null; tatil_yapisi?: string | null }>,
  baslangic: string,
  bitis: string,
) {
  const yillar = yilAraligi(baslangic, bitis)
  return tatiller.flatMap(t => {
    const bas = String(t.tatil_baslangici ?? '').slice(0, 10)
    const son = String(t.tatil_bitisi ?? '').slice(0, 10)
    if (!bas || !son) return []
    const yapi = String(t.tatil_yapisi ?? '').trim()
    if (yapi !== 'Sabit Tatil') {
      return [{ baslangic: bas, bitis: son, tatil_turu: t.tatil_turu, tatil_adi: t.tatil_adi }]
    }
    const mmddBas = bas.slice(5, 10)
    const mmddSon = son.slice(5, 10)
    return yillar.map(y => ({
      baslangic: `${y}-${mmddBas}`,
      bitis: `${y}-${mmddSon}`,
      tatil_turu: t.tatil_turu,
      tatil_adi: t.tatil_adi,
    }))
  })
}

/** Dönem içindeki tüm günleri üretir */
function gunlerUret(baslangic: string, bitis: string): { tarih: string; gun: number; isHaftaTatil: boolean; isResmiTatil: boolean; tatilKod: string }[] {
  const result: { tarih: string; gun: number; isHaftaTatil: boolean; isResmiTatil: boolean; tatilKod: string }[] = []
  const d = new Date(baslangic)
  const son = new Date(bitis)
  while (d <= son) {
    const gun = d.getDay()
    const cumartesiPazar = gun === 0 || gun === 6
    result.push({
      tarih: toISO(d),
      gun: d.getDate(),
      isHaftaTatil: cumartesiPazar,
      isResmiTatil: false,
      tatilKod: '',
    })
    d.setDate(d.getDate() + 1)
  }
  return result
}

export interface YevmiyeGun {
  tarih: string
  gun: number
  gunAdi: string
  isHaftaTatil: boolean
  isResmiTatil: boolean
  tatilKod: string
}

export interface YevmiyePersonel {
  sicil_no: string
  ad_soyad: string
  statu: string
  siraNo: number
  gunX: number
  gunHT: number
  gunB: number
  fmNor: number
  fmBay: number
  izinS: number
  izinUI: number
  izinU: number
  izinIst: number
}

export interface YevmiyeMudurlukData {
  mudurlukAdi: string
  personeller: YevmiyePersonel[]
  gunler: YevmiyeGun[]
  grid: Record<string, Record<string, string>>
  fazlaMesaiGrid: Record<string, Record<string, number>>
}

export interface YevmiyeStatuSekme {
  statu: string
  mudurlukler: YevmiyeMudurlukData[]
}

export interface YevmiyeMudurlukPersonel {
  sicil_no: string
  ad_soyad: string
}

export interface YevmiyePuantajYukleResult {
  donem: { id: number; donem_adi: string | null; baslangic_tarihi: string; bitis_tarihi: string; durum: string }
  mudurlukler: string[]
  statuSekmeleri: YevmiyeStatuSekme[]
  kayitOzeti: string
  mudurlukPersonelMap: Record<string, YevmiyeMudurlukPersonel[]>
  /** Kullanıcı rolü: tek görev müdürlüğü → müdürlük seçimi salt okunur */
  mudurlukSaltOkunur?: boolean
}

export async function yevmiyePuantajYukle(
  donem_id: number,
  opts?: { sicilNo?: string },
): Promise<{ data?: YevmiyePuantajYukleResult; hata?: string }> {
  const supabase = await createClient()
  const normMud = (v: string | null | undefined) =>
    String(v ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLocaleLowerCase('tr-TR')

  let kullaniciMudFiltre: Set<string> | null = null
  let kullaniciMudSalt = false
  if (opts?.sicilNo) {
    const km = await getKullaniciGorevMudurlukleri(supabase, opts.sicilNo)
    kullaniciMudFiltre = new Set(km.mudurlukler)
    kullaniciMudSalt = km.tekSecimSaltOkunur
  }

  const { data: donemRow, error: donemErr } = await supabase
    .from('yevmiye_donem')
    .select('id, yil, sira_no, donem_adi, baslangic_tarihi, bitis_tarihi, durum')
    .eq('id', donem_id)
    .single()

  if (donemErr || !donemRow) return { hata: 'Dönem bulunamadı.' }

  const baslangic = donemRow.baslangic_tarihi
  const bitis = donemRow.bitis_tarihi

  // Müdürlük listesi
  const { data: mudRaw } = await supabase
    .from('tanim_mudurluk')
    .select('mudurluk_adi')
    .eq('aktif', true)
    .order('mudurluk_adi')
  let mudurlukler = (mudRaw ?? []).map(m => m.mudurluk_adi).filter(Boolean)
  if (kullaniciMudFiltre) {
    const izinNorm = new Set([...kullaniciMudFiltre].map(normMud))
    mudurlukler = mudurlukler.filter(m => izinNorm.has(normMud(m)))
  }
  const mudurlukByNorm = new Map<string, string>()
  for (const m of mudurlukler) mudurlukByNorm.set(normMud(m), m)

  // Tatil aralıkları (B=Bayram, RT=Resmi Tatil)
  const { data: tatilRaw } = await supabase
    .from('tanim_izin_tatil')
    .select('tatil_baslangici, tatil_bitisi, tatil_turu, tatil_adi, tatil_yapisi')
    .eq('durum', true)

  const tatilRanges: { baslangic: Date; bitis: Date; kod: string }[] = []
  const tatiller = tatilleriDonemeUydur(tatilRaw ?? [], baslangic, bitis)
    .filter(t => t.baslangic <= bitis && t.bitis >= baslangic)
  tatiller.forEach(t => {
    const b = tarihParse(t.baslangic)
    const e = tarihParse(t.bitis)
    if (!b || !e) return
    const tur = String(t.tatil_turu ?? '').trim().toLocaleLowerCase('tr-TR')
    const kod = tur.includes('bayram') ? 'B' : 'RT'
    tatilRanges.push({ baslangic: b, bitis: e, kod })
  })

  // İzin türü -> kod eşlemesi (Arazi ile aynı kural)
  const { data: izinTurRaw } = await supabase
    .from('tanim_izin_tur')
    .select('tur_adi, kod')
    .eq('durum', true)
  const turAdiToKod = buildTurAdiToKodMap(izinTurRaw ?? [])

  // İzin hareketleri (Arazi kuralı: iptal hariç, Taslak dahil)
  const { data: izinRaw } = await supabase
    .from('izin_hareketleri')
    .select('sicil_no, tur, ayrilis, baslama, durum')
    .neq('durum', 'İptal Edildi')
    .lte('ayrilis', bitis)
    .gt('baslama', baslangic)
  const izinKodlariBySicilGun = izinKodlariBySicilGunFromHareketler(
    izinRaw ?? [],
    String(baslangic).slice(0, 10),
    String(bitis).slice(0, 10),
    turAdiToKod,
  )

  // Kadro: Sözleşmeli ve İşçi, ayrılış boş
  const { data: kadroRaw } = await supabase
    .from('kadro_hareketleri')
    .select('asil, vekil, statu, gorev_mudurlugu, kadro_mudurlugu, ayrilis_tarihi')
    .is('ayrilis_tarihi', null)
    .in('statu', ['Sözleşmeli', 'İşçi'])

  const calisanMap: Record<string, string> = {}
  const siciller = [...new Set((kadroRaw ?? []).flatMap(k => [k.asil, k.vekil].filter(Boolean) as string[]))]
  if (siciller.length > 0) {
    const { data: cal } = await supabase.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', siciller)
    ;(cal ?? []).forEach(c => { if (c.sicil_no) calisanMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })
  }

  const personelByMudurluk: Record<string, { sicil: string; adSoyad: string; statu: string }[]> = {}
  mudurlukler.forEach(m => { personelByMudurluk[m] = [] })
  const seenByMud: Record<string, Record<string, boolean>> = {}

  ;(kadroRaw ?? []).forEach(k => {
    const statu = String(k.statu ?? '').trim()
    if (!statu || (statu !== 'Sözleşmeli' && statu !== 'İşçi')) return
    const gorevMudRaw = String(k.gorev_mudurlugu ?? k.kadro_mudurlugu ?? '').trim()
    const gorevMud = mudurlukByNorm.get(normMud(gorevMudRaw)) ?? gorevMudRaw
    if (!personelByMudurluk[gorevMud]) personelByMudurluk[gorevMud] = []
    if (!seenByMud[gorevMud]) seenByMud[gorevMud] = {}
    for (const sicil of [k.asil, k.vekil].filter(Boolean) as string[]) {
      if (!sicil || seenByMud[gorevMud][sicil]) continue
      seenByMud[gorevMud][sicil] = true
      personelByMudurluk[gorevMud].push({
        sicil,
        adSoyad: calisanMap[sicil] ?? sicil,
        statu,
      })
    }
  })

  // Günler
  const gunlerHam = gunlerUret(baslangic, bitis)
  const gunler: YevmiyeGun[] = gunlerHam.map(g => {
    const d = tarihParse(g.tarih)!
    const gunAdi = GUNLER_TR[d.getDay()]
    let tatilKod = g.tatilKod
    let isResmiTatil = g.isResmiTatil
    for (const t of tatilRanges) {
      if (d >= t.baslangic && d <= t.bitis) {
        tatilKod = t.kod
        isResmiTatil = true
        break
      }
    }
    return {
      tarih: g.tarih,
      gun: g.gun,
      gunAdi,
      isHaftaTatil: g.isHaftaTatil,
      isResmiTatil,
      tatilKod,
    }
  })

  // Kaydedilmiş kayıtlar
  const { data: kayitRaw } = await supabase
    .from('yevmiye_puantaj_kayit')
    .select('mudurluk, sicil_no, tarih, deger, fazla_mesai_saat')
    .eq('donem_id', donem_id)

  const savedGrid: Record<string, Record<string, Record<string, string>>> = {}
  const savedFazlaMesai: Record<string, Record<string, Record<string, number>>> = {}
  ;(kayitRaw ?? []).forEach(k => {
    const mud = String(k.mudurluk ?? '').trim()
    const sicil = String(k.sicil_no ?? '').trim()
    const tarih = String(k.tarih ?? '').slice(0, 10)
    if (!savedGrid[mud]) savedGrid[mud] = {}
    if (!savedGrid[mud][sicil]) savedGrid[mud][sicil] = {}
    if (k.deger) savedGrid[mud][sicil][tarih] = k.deger
    const fm = (k.fazla_mesai_saat ?? 0) > 0 ? Number(k.fazla_mesai_saat) : 0
    if (fm > 0) {
      if (!savedFazlaMesai[mud]) savedFazlaMesai[mud] = {}
      if (!savedFazlaMesai[mud][sicil]) savedFazlaMesai[mud][sicil] = {}
      savedFazlaMesai[mud][sicil][tarih] = fm
    }
  })

  const mudurlukDataList: YevmiyeMudurlukData[] = []

  for (const mudAdi of mudurlukler) {
    const personeller = (personelByMudurluk[mudAdi] ?? []).sort((a, b) => (a.adSoyad || '').localeCompare(b.adSoyad || '', 'tr'))
    personeller.forEach((p, i) => { (p as { siraNo?: number }).siraNo = i + 1 })

    const grid: Record<string, Record<string, string>> = {}
    const fazlaMesaiGrid: Record<string, Record<string, number>> = {}
    const savedForMud = savedGrid[mudAdi] ?? {}
    const savedFmForMud = savedFazlaMesai[mudAdi] ?? {}

    for (const p of personeller) {
      const sicilP = p.sicil
      grid[sicilP] = {}
      fazlaMesaiGrid[sicilP] = {}
      const savedForSicil = savedForMud[sicilP] ?? {}
      const savedFmForSicil = savedFmForMud[sicilP] ?? {}

      for (const g of gunler) {
        const tarihStr = g.tarih
        let deger: string
        if (savedForSicil[tarihStr] !== undefined && savedForSicil[tarihStr] !== '') {
          deger = savedForSicil[tarihStr]
        } else {
          const dow = new Date(`${tarihStr}T12:00:00`).getDay()
          const izinKodRaw = izinKodlariBySicilGun[sicilP]?.[tarihStr]
          if (g.isResmiTatil && g.tatilKod) {
            deger = g.tatilKod
          } else if (izinKodRaw) {
            if (g.isHaftaTatil) {
              const goster = haftaSonuIzinHucreKodu({
                statu: p.statu,
                izinKodu: izinKodRaw,
                haftaGunu: dow,
              })
              deger = goster ?? 'HT'
            } else {
              deger = izinKodRaw
            }
          } else if (g.isHaftaTatil) {
            deger = 'HT'
          } else {
            deger = 'X'
          }
        }
        grid[sicilP][tarihStr] = deger
        if (savedFmForSicil[tarihStr] != null) {
          fazlaMesaiGrid[sicilP][tarihStr] = savedFmForSicil[tarihStr]
        }
      }
    }

    // Özet hesapla
    const personellerOzet: YevmiyePersonel[] = personeller.map(p => {
      const sicilAgg = p.sicil
      const gridAgg = grid[sicilAgg] ?? {}
      const fmAgg = fazlaMesaiGrid[sicilAgg] ?? {}
      let gunX = 0, gunHT = 0, gunB = 0, fmNor = 0, fmBay = 0, izinS = 0, izinUI = 0, izinU = 0, izinIst = 0
      for (const g of gunler) {
        const deg = gridAgg[g.tarih] ?? ''
        if (deg === 'X' || deg === 'x') gunX++
        else if (deg === 'HT') gunHT++
        else if (deg === 'B') gunB++
        else if (deg === 'S') izinS++
        else if (deg === 'Üİ') izinUI++
        else if (deg === 'Ü') izinU++
        else if (deg === 'R') izinIst++
        const fmVal = fmAgg[g.tarih] ?? 0
        if (fmVal > 0) {
          if (deg === 'X' || deg === 'x' || deg === 'HT') fmNor += fmVal
          else if (deg === 'B') fmBay += fmVal
        }
      }
      return {
        sicil_no: sicilAgg,
        ad_soyad: p.adSoyad,
        statu: p.statu,
        siraNo: (p as { siraNo?: number }).siraNo ?? 0,
        gunX,
        gunHT,
        gunB,
        fmNor: Math.round(fmNor * 100) / 100,
        fmBay: Math.round(fmBay * 100) / 100,
        izinS,
        izinUI,
        izinU,
        izinIst,
      }
    })

    mudurlukDataList.push({
      mudurlukAdi: mudAdi,
      personeller: personellerOzet,
      gunler,
      grid,
      fazlaMesaiGrid,
    })
  }

  const toplamSatir = mudurlukDataList.reduce((s, m) => s + m.personeller.length, 0)

  // Müdürlük bazında tüm personel (Puantör/Birim Amiri/Müdür dropdown için - asil/vekil, her statu)
  const mudurlukPersonelMap: Record<string, YevmiyeMudurlukPersonel[]> = {}
  const { data: ozetTumRaw } = await supabase
    .from('personel_kadro_ozet')
    .select('sicil_no, ad_soyad, gorev_mudurlugu')
  const { data: kadroTumRaw } = await supabase
    .from('kadro_hareketleri')
    .select('asil, vekil, gorev_mudurlugu, kadro_mudurlugu')
    .is('ayrilis_tarihi', null)
  for (const m of mudurlukler) {
    const hedefMud = normMud(m)
    const siciller = new Set<string>()
    const adMap: Record<string, string> = {}
    for (const k of kadroTumRaw ?? []) {
      const gorevMud = normMud(k.gorev_mudurlugu)
      const kadroMud = normMud(k.kadro_mudurlugu)
      if (gorevMud === hedefMud || kadroMud === hedefMud) {
        if (k.asil) siciller.add(k.asil)
        if (k.vekil) siciller.add(k.vekil)
      }
    }
    for (const o of ozetTumRaw ?? []) {
      if (!o.sicil_no) continue
      if (normMud(o.gorev_mudurlugu) !== hedefMud) continue
      siciller.add(o.sicil_no)
      adMap[o.sicil_no] = o.ad_soyad ?? o.sicil_no
    }
    const sicilList = [...siciller]
    if (sicilList.length > 0) {
      const { data: cal } = await supabase.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', sicilList)
      ;(cal ?? []).forEach(c => { if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })
    }
    mudurlukPersonelMap[m] = sicilList
      .map(s => ({ sicil_no: s, ad_soyad: adMap[s] ?? s }))
      .sort((a, b) => (a.ad_soyad || '').localeCompare(b.ad_soyad || '', 'tr'))
  }

  const statuSekmeleri: YevmiyeStatuSekme[] = [
    {
      statu: 'Sözleşmeli',
      mudurlukler: mudurlukDataList
        .map(m => ({
          ...m,
          personeller: m.personeller.filter(p => p.statu === 'Sözleşmeli'),
        }))
        .filter(m => m.personeller.length > 0),
    },
    {
      statu: 'İşçi',
      mudurlukler: mudurlukDataList
        .map(m => ({
          ...m,
          personeller: m.personeller.filter(p => p.statu === 'İşçi'),
        }))
        .filter(m => m.personeller.length > 0),
    },
  ]

  return {
    data: {
      donem: {
        id: donemRow.id,
        donem_adi: donemRow.donem_adi,
        baslangic_tarihi: baslangic,
        bitis_tarihi: bitis,
        durum: donemRow.durum ?? 'Açık',
      },
      mudurlukler,
      statuSekmeleri,
      kayitOzeti: `${toplamSatir} satır, ${mudurlukler.length} müdürlük`,
      mudurlukPersonelMap,
      mudurlukSaltOkunur: Boolean(opts?.sicilNo && kullaniciMudSalt),
    },
  }
}

export async function yevmiyePuantajKaydet(
  donem_id: number,
  mudurluk: string,
  _statu: string,
  sicilNolar: string[],
  fazlaMesai: Array<{ sicil_no: string; tarih: string; deger: string; saat: number }>
): Promise<{ hata?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }
  const access = await getAppAccess(supabase, user.id)
  const mudOk = await assertKullaniciMudurlukErisimi(supabase, access, mudurluk)
  if (!mudOk.ok) return { hata: mudOk.mesaj }

  // Önce müdürlükteki seçili personellerin mevcut FM kayıtlarını temizle
  const temizlenecekSiciller = [...new Set(sicilNolar.filter(Boolean))]
  if (temizlenecekSiciller.length > 0) {
    const { error: delErr } = await supabase
      .from('yevmiye_puantaj_kayit')
      .delete()
      .eq('donem_id', donem_id)
      .eq('mudurluk', mudurluk)
      .in('sicil_no', temizlenecekSiciller)
    if (delErr) return { hata: delErr.message }
  }

  // Sonra sadece fazla mesai > 0 olanları yeniden yaz
  const toInsert = fazlaMesai
    .filter(f => f.saat > 0)
    .map(f => ({
      donem_id,
      mudurluk,
      sicil_no: f.sicil_no,
      tarih: f.tarih,
      deger: f.deger || 'X',
      fazla_mesai_saat: f.saat,
    }))

  if (toInsert.length === 0) {
    revalidatePath(`/kesintiler/yevmiye/${donem_id}`)
    return {}
  }

  const { error } = await supabase.from('yevmiye_puantaj_kayit').insert(toInsert)
  if (error) return { hata: error.message }

  revalidatePath(`/kesintiler/yevmiye/${donem_id}`)
  return {}
}
