'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import { SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import {
  appProfilGuncelle,
  appProfilOlustur,
  appProfilTopluAdmin,
  appProfilTopluKaydet,
  appProfilTopluOlustur,
} from './actions'
import {
  MENU_YETKILENDIRME_MODULLERI,
  MENU_YETKILENDIRME_TABLO_MODULLERI,
  type MenuModulKey,
} from '@/lib/menu-yetki'
import { yetkiAuditDiffSatirlari, yetkiAuditDegerGoster } from '@/lib/yetkilendirme-audit'
import type { Json, Tables } from '@/types/database'

export type YetkiSatir = {
  sicil_no: string
  ad_soyad: string
  gorev_unvani: string | null
  gorev_mudurlugu: string | null
  profil: {
    id: string
    rol: 'admin' | 'kullanici'
    menu_izinleri: Json | null
    hesap_aktif: boolean
  } | null
}

type Draft = {
  rol: 'admin' | 'kullanici'
  /** Kullanıcı için: sadece true tutulur; admin için hepsi true (görüntü) */
  menu: Partial<Record<MenuModulKey, boolean>>
  hesapAktif: boolean
  authUuid: string
}

function menuDbOku(p: YetkiSatir['profil']): Partial<Record<MenuModulKey, boolean>> {
  const m: Partial<Record<MenuModulKey, boolean>> = {}
  if (!p) return m
  if (p.rol === 'admin') {
    for (const x of MENU_YETKILENDIRME_MODULLERI) m[x.key] = true
    return m
  }
  const raw = (p.menu_izinleri as Record<string, boolean> | null) ?? {}
  for (const x of MENU_YETKILENDIRME_TABLO_MODULLERI) {
    if (raw[x.key] === true) m[x.key] = true
  }
  return m
}

function baslangicDraft(p: YetkiSatir['profil']): Draft {
  if (!p) {
    return {
      rol: 'kullanici',
      menu: {},
      hesapAktif: true,
      authUuid: '',
    }
  }
  if (p.rol === 'admin') {
    const menu: Partial<Record<MenuModulKey, boolean>> = {}
    for (const x of MENU_YETKILENDIRME_MODULLERI) menu[x.key] = true
    return { rol: 'admin', menu, hesapAktif: p.hesap_aktif !== false, authUuid: '' }
  }
  return {
    rol: 'kullanici',
    menu: menuDbOku(p),
    hesapAktif: p.hesap_aktif !== false,
    authUuid: '',
  }
}

/** Uzun sicil listelerini mesajda kısaltır */
function sicilOzet(siciller: string[], gosterilecek = 5): string {
  const ilk = siciller.slice(0, gosterilecek).join(', ')
  return siciller.length > gosterilecek ? `${ilk}, +${siciller.length - gosterilecek}` : ilk
}

/** Satırın kaydedilmemiş değişikliği olup olmadığını karşılaştırmak için */
function draftImza(d: Draft): string {
  const acik = MENU_YETKILENDIRME_TABLO_MODULLERI.filter(x => d.menu[x.key] === true).map(x => x.key)
  return `${d.rol}|${d.hesapAktif ? 1 : 0}|${acik.join(',')}`
}

const SAYFA_BOYUTU = 10

export default function YetkilendirmeClient({
  satirlar,
  auditLoglarByRefId = {},
}: {
  satirlar: YetkiSatir[]
  auditLoglarByRefId?: Record<string, Tables<'personel_audit_log'>[]>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)
  const [basari, setBasari] = useState<string | null>(null)
  const [arama, setArama] = useState('')
  const [sayfa, setSayfa] = useState(1)
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)

  const veriImza = useMemo(
    () =>
      JSON.stringify(
        satirlar.map(s => ({
          s: s.sicil_no,
          id: s.profil?.id ?? null,
          r: s.profil?.rol ?? null,
          m: s.profil?.menu_izinleri,
          h: s.profil?.hesap_aktif ?? null,
        })),
      ),
    [satirlar],
  )

  const [draft, setDraft] = useState<Record<string, Draft>>({})

  useEffect(() => {
    setDraft(prev => {
      const o: Record<string, Draft> = {}
      for (const s of satirlar) {
        const yeni = baslangicDraft(s.profil)
        const eski = prev[s.sicil_no]
        if (!s.profil && eski?.authUuid?.trim()) {
          o[s.sicil_no] = { ...yeni, authUuid: eski.authUuid }
        } else {
          o[s.sicil_no] = yeni
        }
      }
      return o
    })
  }, [veriImza, satirlar])

  const filtreliSatirlar = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr-TR')
    if (!q) return satirlar
    return satirlar.filter(
      s =>
        s.sicil_no.toLocaleLowerCase('tr-TR').includes(q) ||
        (s.ad_soyad ?? '').toLocaleLowerCase('tr-TR').includes(q) ||
        (s.gorev_unvani ?? '').toLocaleLowerCase('tr-TR').includes(q) ||
        (s.gorev_mudurlugu ?? '').toLocaleLowerCase('tr-TR').includes(q),
    )
  }, [satirlar, arama])

  const toplamSayfa = Math.max(1, Math.ceil(filtreliSatirlar.length / SAYFA_BOYUTU))
  const sayfaSatirlari = useMemo(() => {
    const s = Math.min(Math.max(1, sayfa), toplamSayfa)
    const start = (s - 1) * SAYFA_BOYUTU
    return filtreliSatirlar.slice(start, start + SAYFA_BOYUTU)
  }, [filtreliSatirlar, sayfa, toplamSayfa])

  useEffect(() => {
    setSayfa(1)
  }, [arama, veriImza])

  const [seciliProfilId, setSeciliProfilId] = useState<Set<string>>(new Set())

  const guncelleDraft = useCallback((sicil: string, patch: Partial<Draft> | ((d: Draft) => Draft)) => {
    setDraft(prev => {
      const cur = prev[sicil] ?? baslangicDraft(null)
      const next = typeof patch === 'function' ? patch(cur) : { ...cur, ...patch }
      return { ...prev, [sicil]: next }
    })
  }, [])

  const rolDegistir = useCallback(
    (sicil: string, rol: 'admin' | 'kullanici') => {
      guncelleDraft(sicil, d => {
        if (rol === 'admin') {
          const menu: Partial<Record<MenuModulKey, boolean>> = {}
          for (const x of MENU_YETKILENDIRME_MODULLERI) menu[x.key] = true
          return { ...d, rol: 'admin', menu }
        }
        return { ...d, rol: 'kullanici', menu: {} }
      })
    },
    [guncelleDraft],
  )

  const menuToggle = useCallback(
    (sicil: string, key: MenuModulKey, checked: boolean) => {
      guncelleDraft(sicil, d => {
        if (d.rol === 'admin') return d
        const menu = { ...d.menu }
        if (checked) menu[key] = true
        else delete menu[key]
        return { ...d, menu }
      })
    },
    [guncelleDraft],
  )

  /** Sütun başlığındaki kutu: filtredeki tüm kullanıcı satırlarına aynı modülü uygular. */
  const sutunToggle = useCallback(
    (key: MenuModulKey, checked: boolean) => {
      setDraft(prev => {
        const next = { ...prev }
        for (const s of filtreliSatirlar) {
          const cur = next[s.sicil_no] ?? baslangicDraft(s.profil)
          if (cur.rol === 'admin') continue
          const menu = { ...cur.menu }
          if (checked) menu[key] = true
          else delete menu[key]
          next[s.sicil_no] = { ...cur, menu }
        }
        return next
      })
    },
    [filtreliSatirlar],
  )

  const sutunTumuAcik = useMemo(() => {
    const hedefler = filtreliSatirlar.filter(s => (draft[s.sicil_no]?.rol ?? 'kullanici') !== 'admin')
    const map: Partial<Record<MenuModulKey, boolean>> = {}
    for (const m of MENU_YETKILENDIRME_TABLO_MODULLERI) {
      map[m.key] = hedefler.length > 0 && hedefler.every(s => draft[s.sicil_no]?.menu[m.key] === true)
    }
    return map
  }, [filtreliSatirlar, draft])

  /** Kaydedilmemiş değişikliği olan satırlar (profili olanlar toplu kaydedilebilir) */
  const degisenler = useMemo(() => {
    const kaydedilebilir: { profileId: string; sicil: string; d: Draft }[] = []
    const profilsiz: string[] = []
    for (const s of satirlar) {
      const d = draft[s.sicil_no]
      if (!d) continue
      if (draftImza(d) === draftImza(baslangicDraft(s.profil))) continue
      if (s.profil) kaydedilebilir.push({ profileId: s.profil.id, sicil: s.sicil_no, d })
      else profilsiz.push(s.sicil_no)
    }
    return { kaydedilebilir, profilsiz }
  }, [satirlar, draft])

  const degisenSiciller = useMemo(
    () => new Set(degisenler.kaydedilebilir.map(x => x.sicil).concat(degisenler.profilsiz)),
    [degisenler],
  )

  /** Filtredeki profili olmayan satırlar — toplu oluşturmanın hedefi */
  const olusturulacaklar = useMemo(
    () => filtreliSatirlar.filter(s => !s.profil),
    [filtreliSatirlar],
  )

  const authUuidDegistir = useCallback(
    (sicil: string, v: string) => {
      guncelleDraft(sicil, d => ({ ...d, authUuid: v }))
    },
    [guncelleDraft],
  )

  function satirKaydet(s: YetkiSatir) {
    const d = draft[s.sicil_no]
    if (!d) return
    setHata(null)
    setBasari(null)

    if (s.profil) {
      const fd = new FormData()
      fd.set('profile_id', s.profil.id)
      fd.set('rol', d.rol)
      if (d.hesapAktif) fd.set('hesap_aktif', 'on')
        if (d.rol === 'kullanici') {
        for (const x of MENU_YETKILENDIRME_TABLO_MODULLERI) {
          if (d.menu[x.key] === true) fd.set(`menu_${x.key}`, 'on')
        }
      }
      startTransition(async () => {
        const r = await appProfilGuncelle(null, fd)
        if (r.hata) setHata(r.hata)
        else {
          setBasari('Kaydedildi.')
          router.refresh()
        }
      })
      return
    }

    const fd = new FormData()
    const uuid = d.authUuid.trim()
    if (uuid) fd.set('auth_user_id', uuid)
    fd.set('sicil_no', s.sicil_no)
    fd.set('rol', d.rol)
    if (d.hesapAktif) fd.set('hesap_aktif', 'on')
        if (d.rol === 'kullanici') {
        for (const x of MENU_YETKILENDIRME_TABLO_MODULLERI) {
          if (d.menu[x.key] === true) fd.set(`menu_${x.key}`, 'on')
        }
      }
    startTransition(async () => {
      const r = await appProfilOlustur(null, fd)
      if (r.hata) setHata(r.hata)
      else {
        setBasari('Profil oluşturuldu.')
        router.refresh()
      }
    })
  }

  function topluKaydet() {
    const { kaydedilebilir, profilsiz } = degisenler
    if (!kaydedilebilir.length) {
      setBasari(null)
      setHata(
        profilsiz.length
          ? `Değişen ${profilsiz.length} satırın profili yok; bu satırları «Oluştur» ile kaydedin.`
          : 'Kaydedilecek değişiklik yok.',
      )
      return
    }
    setHata(null)
    setBasari(null)
    startTransition(async () => {
      const r = await appProfilTopluKaydet(
        kaydedilebilir.map(x => ({
          profile_id: x.profileId,
          rol: x.d.rol,
          hesap_aktif: x.d.hesapAktif,
          menu: MENU_YETKILENDIRME_TABLO_MODULLERI.filter(m => x.d.menu[m.key] === true).map(m => m.key),
        })),
      )
      if (r.hata) setHata(r.hata)
      else {
        setBasari(
          `${r.guncellenen ?? kaydedilebilir.length} kayıt güncellendi.` +
            (profilsiz.length ? ` Profili olmayan ${profilsiz.length} satır atlandı («Oluştur» kullanın).` : ''),
        )
        router.refresh()
      }
    })
  }

  function topluOlustur() {
    if (!olusturulacaklar.length) {
      setBasari(null)
      setHata('Filtrede profili olmayan satır yok.')
      return
    }
    const onay = window.confirm(
      `Filtredeki profili olmayan ${olusturulacaklar.length} satır için yetkilendirme profili açılacak.\n` +
        'Tablodaki rol, erişim ve modül işaretleri uygulanır.\n\n' +
        'Supabase Auth hesabı olmayanlar için varsayılan şifreyle (TCKN ilk 3 hane + nokta + doğum yılı) ' +
        'giriş hesabı da oluşturulur.\n\nDevam edilsin mi?',
    )
    if (!onay) return

    setHata(null)
    setBasari(null)
    startTransition(async () => {
      const r = await appProfilTopluOlustur(
        olusturulacaklar.map(s => {
          const d = draft[s.sicil_no] ?? baslangicDraft(null)
          return {
            sicil_no: s.sicil_no,
            rol: d.rol,
            hesap_aktif: d.hesapAktif,
            menu: MENU_YETKILENDIRME_TABLO_MODULLERI.filter(m => d.menu[m.key] === true).map(m => m.key),
          }
        }),
        true,
      )
      if (r.hata) {
        setHata(r.hata)
        return
      }
      const notlar: string[] = []
      if (r.epostasiz?.length) {
        notlar.push(`${r.epostasiz.length} sicilde e-posta yok (${sicilOzet(r.epostasiz)})`)
      }
      if (r.sifresiz?.length) {
        notlar.push(
          `${r.sifresiz.length} sicilde TCKN/doğum tarihi eksik olduğundan şifre üretilemedi (${sicilOzet(r.sifresiz)})`,
        )
      }
      if (r.authsiz?.length) {
        notlar.push(`${r.authsiz.length} sicilin Auth hesabı açılamadı (${sicilOzet(r.authsiz)})`)
      }
      if (r.baglantili?.length) {
        notlar.push(
          `${r.baglantili.length} sicilin Auth hesabı başka bir profile bağlı (${sicilOzet(r.baglantili)})`,
        )
      }
      setBasari(
        `${r.olusturulan ?? 0} profil oluşturuldu` +
          (r.authOlusturulan ? `, ${r.authOlusturulan} giriş hesabı açıldı` : '') +
          '.' +
          (notlar.length ? ` Atlananlar: ${notlar.join('; ')}.` : ''),
      )
      router.refresh()
    })
  }

  function topluAdmin() {
    const ids = [...seciliProfilId]
    if (!ids.length) {
      setHata('Önce satır başındaki kutulardan profil seçin.')
      return
    }
    setHata(null)
    setBasari(null)
    startTransition(async () => {
      const r = await appProfilTopluAdmin(ids)
      if (r.hata) setHata(r.hata)
      else {
        setBasari(`${ids.length} kullanıcı yönetici yapıldı.`)
        setSeciliProfilId(new Set())
        router.refresh()
      }
    })
  }

  const profilliSayisi = useMemo(() => satirlar.filter(s => s.profil).length, [satirlar])

  function profilToggle(id: string, checked: boolean) {
    setSeciliProfilId(prev => {
      const n = new Set(prev)
      if (checked) n.add(id)
      else n.delete(id)
      return n
    })
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <p className="text-sm text-slate-600">
          <strong>Tüm statülerdeki</strong> aktif belediye personeli ile <strong>ADABEL Personeli</strong> ekranındaki çalışanlar
          sekmesinde yer alan aktif çalışanlar aynı tabloda listelenir (sicil sırası). <strong>Terfi</strong> erişimi bu
          tabloda yok; Terfi personel yönetimi üzerinden yönetilir. Varsayılan:{' '}
          <strong>Kullanıcı</strong>, menüler kapalı. Yönetici = tüm modüller (salt okunur işaretler).
        </p>
        <div className="shrink-0 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isPending || degisenler.kaydedilebilir.length === 0}
            onClick={topluKaydet}
            title="Tabloda yaptığınız tüm işaretlemeleri tek seferde kaydeder"
            className="text-sm font-medium bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-40"
          >
            Toplu kaydet ({degisenler.kaydedilebilir.length})
          </button>
          <button
            type="button"
            disabled={isPending || olusturulacaklar.length === 0}
            onClick={topluOlustur}
            title="Filtredeki profili olmayan tüm satırlar için profil açar"
            className="text-sm font-medium bg-emerald-700 text-white px-4 py-2 rounded-lg hover:bg-emerald-800 disabled:opacity-40"
          >
            Toplu oluştur ({olusturulacaklar.length})
          </button>
          <button
            type="button"
            disabled={isPending || seciliProfilId.size === 0}
            onClick={topluAdmin}
            className="text-sm font-medium bg-amber-700 text-white px-4 py-2 rounded-lg hover:bg-amber-800 disabled:opacity-40"
          >
            Seçilenleri yönetici yap ({seciliProfilId.size})
          </button>
        </div>
      </div>

      {hata && <p className="mb-3 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
      {basari && <p className="mb-3 text-sm text-green-800 bg-green-50 px-3 py-2 rounded-lg">{basari}</p>}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
        <input
          type="search"
          value={arama}
          onChange={e => setArama(e.target.value)}
          placeholder="Sicil, ad soyad veya ünvan ara…"
          className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
        <p className="text-xs text-slate-500 sm:ml-auto">
          {filtreliSatirlar.length} kayıt · Sayfa {Math.min(sayfa, toplamSayfa)} / {toplamSayfa}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto max-w-full shadow-sm">
        <table className="text-xs min-w-[1000px] w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="sticky left-0 z-10 bg-slate-50 w-10 px-1 py-2 text-center font-semibold text-slate-600 border-r border-slate-100">
                Seç
              </th>
              <th className="sticky left-10 z-10 bg-slate-50 w-8 px-1 py-2 text-left font-semibold text-slate-600 border-r border-slate-100">#</th>
              <th className="sticky left-[4.5rem] z-10 bg-slate-50 w-20 px-2 py-2 text-left font-semibold text-slate-600 border-r border-slate-100">Sicil</th>
              <th className="sticky left-[9.5rem] z-10 bg-slate-50 min-w-[140px] px-2 py-2 text-left font-semibold text-slate-600 border-r border-slate-200">
                Ad Soyad
              </th>
              <th className="text-center px-1 py-2 font-semibold text-slate-600 whitespace-nowrap border-r border-slate-100" colSpan={2}>
                Rol
              </th>
              <th className="text-center px-1 py-2 font-semibold text-slate-600 whitespace-nowrap border-r border-slate-100 min-w-[4rem]">
                Erişim
              </th>
              {MENU_YETKILENDIRME_TABLO_MODULLERI.map(m => (
                <th
                  key={m.key}
                  className="text-center px-1 py-2 font-semibold text-slate-600 whitespace-nowrap min-w-[3rem]"
                  title={m.label}
                >
                  {m.labelKisa}
                </th>
              ))}
              <th
                className="text-left px-2 py-2 font-semibold text-slate-600 min-w-[120px] border-l border-slate-200"
                title="Boş bırakın: personel veya ADABEL Personeli e-postası ile Auth hesabı otomatik eşleşir"
              >
                UUID (isteğe)
              </th>
              <th className="sticky right-0 z-10 bg-slate-50 px-2 py-2 font-semibold text-slate-600 border-l border-slate-200">
                İşlem
              </th>
            </tr>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] text-slate-500">
              <th colSpan={4} />
              <th className="text-center px-1 py-0.5 font-normal">Admin</th>
              <th className="text-center px-1 py-0.5 font-normal border-r border-slate-100">Kullanıcı</th>
              <th className="text-center px-1 py-0.5 font-normal border-r border-slate-100">Açık</th>
              {MENU_YETKILENDIRME_TABLO_MODULLERI.map(m => (
                <th key={m.key} className="text-center px-0.5 py-0.5">
                  <input
                    type="checkbox"
                    className="rounded border-slate-400"
                    checked={sutunTumuAcik[m.key] === true}
                    onChange={e => sutunToggle(m.key, e.target.checked)}
                    title={`${m.label}: filtredeki tüm kullanıcı satırlarına uygula`}
                  />
                </th>
              ))}
              <th colSpan={2} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sayfaSatirlari.map((s, ri) => {
              const i = (Math.min(Math.max(1, sayfa), toplamSayfa) - 1) * SAYFA_BOYUTU + ri
              const d = draft[s.sicil_no] ?? baslangicDraft(s.profil)
              const adminMi = d.rol === 'admin'
              const menuSaltOkunur = adminMi
              const pid = s.profil?.id
              const degisti = degisenSiciller.has(s.sicil_no)
              const hucreZemin = degisti ? 'bg-amber-50' : 'bg-white'

              return (
                <tr key={s.sicil_no} className={degisti ? 'bg-amber-50' : 'hover:bg-slate-50/50'}>
                  <td className={`sticky left-0 z-[5] ${hucreZemin} border-r border-slate-100 px-1 py-1.5 text-center`}>
                    {pid ? (
                      <input
                        type="checkbox"
                        checked={seciliProfilId.has(pid)}
                        onChange={e => profilToggle(pid, e.target.checked)}
                        className="rounded border-slate-400"
                        title="Toplu yönetici için seç"
                      />
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className={`sticky left-10 z-[5] ${hucreZemin} border-r border-slate-100 px-1 py-1.5 text-slate-500`}>{i + 1}</td>
                  <td className={`sticky left-[4.5rem] z-[5] ${hucreZemin} border-r border-slate-100 px-2 py-1.5 font-mono text-slate-800 whitespace-nowrap`}>
                    {s.sicil_no}
                  </td>
                  <td className={`sticky left-[9.5rem] z-[5] ${hucreZemin} border-r border-slate-200 px-2 py-1.5 text-slate-800 min-w-[140px]`}>
                    {s.ad_soyad}
                  </td>
                  <td className="text-center px-1 py-1">
                    <input
                      type="radio"
                      className="accent-slate-800"
                      checked={adminMi}
                      onChange={() => rolDegistir(s.sicil_no, 'admin')}
                      name={`rol-${s.sicil_no}`}
                    />
                  </td>
                  <td className="text-center px-1 py-1 border-r border-slate-100">
                    <input
                      type="radio"
                      className="accent-slate-800"
                      checked={!adminMi}
                      onChange={() => rolDegistir(s.sicil_no, 'kullanici')}
                      name={`rol-${s.sicil_no}`}
                    />
                  </td>
                  <td className="text-center px-1 py-1 border-r border-slate-100">
                    <input
                      type="checkbox"
                      className="rounded border-slate-400"
                      checked={d.hesapAktif}
                      onChange={e => guncelleDraft(s.sicil_no, cur => ({ ...cur, hesapAktif: e.target.checked }))}
                      title="Kapatılırsa kullanıcı sisteme erişemez"
                    />
                  </td>
                  {MENU_YETKILENDIRME_TABLO_MODULLERI.map(m => (
                    <td key={m.key} className="text-center px-0.5 py-1">
                      <input
                        type="checkbox"
                        className="rounded border-slate-400"
                        checked={d.menu[m.key] === true}
                        disabled={menuSaltOkunur}
                        onChange={e => menuToggle(s.sicil_no, m.key, e.target.checked)}
                        title={adminMi ? 'Yönetici: tüm menüler açık' : m.label}
                      />
                    </td>
                  ))}
                  <td className="px-1 py-1 border-l border-slate-100">
                    {!s.profil ? (
                      <input
                        type="text"
                        value={d.authUuid}
                        onChange={e => authUuidDegistir(s.sicil_no, e.target.value)}
                        placeholder="Boş = otomatik"
                        title="Genelde boş bırakın; personel veya ADABEL Personeli e-postası ile Auth’ta eşleşir. Özel durumda UUID yapıştırın."
                        className="w-full min-w-[100px] max-w-[160px] border border-slate-200 rounded px-1 py-0.5 font-mono text-[10px]"
                      />
                    ) : (
                      <span className="text-slate-400 text-[10px]">—</span>
                    )}
                  </td>
                  <td className={`sticky right-0 z-[5] ${hucreZemin} border-l border-slate-200 px-2 py-1`}>
                    <div className="flex items-center justify-end gap-1">
                      <SaatGecmisDugmesi
                        sayi={(auditLoglarByRefId[s.sicil_no] ?? []).length}
                        onClick={() => setGecmisRefId(s.sicil_no)}
                        title="Yetkilendirme geçmişi"
                      />
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => satirKaydet(s)}
                        className="text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded"
                      >
                        {s.profil ? 'Kaydet' : 'Oluştur'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {toplamSayfa > 1 && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={sayfa <= 1}
            onClick={() => setSayfa(p => Math.max(1, p - 1))}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40"
          >
            Önceki
          </button>
          <span className="text-sm text-slate-600">
            {Math.min(sayfa, toplamSayfa)} / {toplamSayfa}
          </span>
          <button
            type="button"
            disabled={sayfa >= toplamSayfa}
            onClick={() => setSayfa(p => Math.min(toplamSayfa, p + 1))}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40"
          >
            Sonraki
          </button>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">
        Profilli satır: {profilliSayisi} / {satirlar.length}. Profil yoksa: Auth’ta hesap + personel veya ADABEL Personeli
        e-posta uyumluysa <strong>Oluştur</strong> yeterli (UUID isteğe bağlı). Toplu yönetici için sol kutuyu
        işaretleyin. <strong>Erişim</strong> kutusunu kapatırsanız ilgili kullanıcı sisteme giriş yapsa bile ekranlara erişemez.
        Modül başlığının altındaki kutu, o modülü <strong>filtredeki tüm kullanıcı satırlarına</strong> (diğer sayfalar dahil)
        uygular; sarı işaretli satırlar kaydedilmemiş değişikliklerdir ve <strong>Toplu kaydet</strong> ile tek seferde
        kaydedilir. <strong>Toplu oluştur</strong>, filtredeki profili olmayan satırlara tablodaki işaretlerle profil açar ve
        Auth hesabı olmayanlara varsayılan şifreyle (TCKN ilk 3 hane + doğum yılı) giriş hesabı oluşturur; e-postası ya da
        TCKN/doğum tarihi eksik olan siciller atlanır ve sonuç mesajında listelenir.
      </p>

      <AuditGecmisPanel
        acik={gecmisRefId != null}
        onKapat={() => setGecmisRefId(null)}
        auditLoglar={gecmisRefId ? (auditLoglarByRefId[gecmisRefId] ?? []) : []}
        baslik={gecmisRefId ? `Yetkilendirme Geçmişi — ${gecmisRefId}` : 'Yetkilendirme Geçmişi'}
        diffSatirlari={yetkiAuditDiffSatirlari}
        degerGoster={yetkiAuditDegerGoster}
      />
    </div>
  )
}
