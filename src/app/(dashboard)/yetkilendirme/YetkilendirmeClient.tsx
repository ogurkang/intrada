'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { appProfilGuncelle, appProfilOlustur, appProfilTopluAdmin } from './actions'
import { MENU_YETKILENDIRME_MODULLERI, type MenuModulKey } from '@/lib/menu-yetki'
import type { Json } from '@/types/database'

export type YetkiSatir = {
  sicil_no: string
  ad_soyad: string
  gorev_unvani: string | null
  gorev_mudurlugu: string | null
  profil: {
    id: string
    rol: 'admin' | 'kullanici'
    menu_izinleri: Json | null
  } | null
}

type Draft = {
  rol: 'admin' | 'kullanici'
  /** Kullanıcı için: sadece true tutulur; admin için hepsi true (görüntü) */
  menu: Partial<Record<MenuModulKey, boolean>>
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
  for (const x of MENU_YETKILENDIRME_MODULLERI) {
    if (raw[x.key] === true) m[x.key] = true
  }
  return m
}

function baslangicDraft(p: YetkiSatir['profil']): Draft {
  if (!p) {
    return {
      rol: 'kullanici',
      menu: {},
      authUuid: '',
    }
  }
  if (p.rol === 'admin') {
    const menu: Partial<Record<MenuModulKey, boolean>> = {}
    for (const x of MENU_YETKILENDIRME_MODULLERI) menu[x.key] = true
    return { rol: 'admin', menu, authUuid: '' }
  }
  return {
    rol: 'kullanici',
    menu: menuDbOku(p),
    authUuid: '',
  }
}

export default function YetkilendirmeClient({ satirlar }: { satirlar: YetkiSatir[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)
  const [basari, setBasari] = useState<string | null>(null)

  const veriImza = useMemo(
    () =>
      JSON.stringify(
        satirlar.map(s => ({
          s: s.sicil_no,
          id: s.profil?.id ?? null,
          r: s.profil?.rol ?? null,
          m: s.profil?.menu_izinleri,
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
      if (d.rol === 'kullanici') {
        for (const x of MENU_YETKILENDIRME_MODULLERI) {
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
    if (d.rol === 'kullanici') {
      for (const x of MENU_YETKILENDIRME_MODULLERI) {
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
          Statüsü <strong>Memur</strong> olan aktif personel, <strong>Terfi Hareketleri</strong> listesiyle aynı
          sırada (sicil no). Varsayılan: <strong>Kullanıcı</strong>, menüler kapalı. Yönetici = tüm modüller (salt
          okunur işaretler).
        </p>
        <button
          type="button"
          disabled={isPending || seciliProfilId.size === 0}
          onClick={topluAdmin}
          className="shrink-0 text-sm font-medium bg-amber-700 text-white px-4 py-2 rounded-lg hover:bg-amber-800 disabled:opacity-40"
        >
          Seçilenleri yönetici yap ({seciliProfilId.size})
        </button>
      </div>

      {hata && <p className="mb-3 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
      {basari && <p className="mb-3 text-sm text-green-800 bg-green-50 px-3 py-2 rounded-lg">{basari}</p>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto max-w-full shadow-sm">
        <table className="text-xs min-w-[1100px] w-full">
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
              {MENU_YETKILENDIRME_MODULLERI.map(m => (
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
                title="Boş bırakın: personel e-postası ile Auth hesabı otomatik eşleşir"
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
              {MENU_YETKILENDIRME_MODULLERI.map(m => (
                <th key={m.key} className="p-0" />
              ))}
              <th colSpan={2} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {satirlar.map((s, i) => {
              const d = draft[s.sicil_no] ?? baslangicDraft(s.profil)
              const adminMi = d.rol === 'admin'
              const menuSaltOkunur = adminMi
              const pid = s.profil?.id

              return (
                <tr key={s.sicil_no} className="hover:bg-slate-50/50">
                  <td className="sticky left-0 z-[5] bg-white border-r border-slate-100 px-1 py-1.5 text-center">
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
                  <td className="sticky left-10 z-[5] bg-white border-r border-slate-100 px-1 py-1.5 text-slate-500">{i + 1}</td>
                  <td className="sticky left-[4.5rem] z-[5] bg-white border-r border-slate-100 px-2 py-1.5 font-mono text-slate-800 whitespace-nowrap">
                    {s.sicil_no}
                  </td>
                  <td className="sticky left-[9.5rem] z-[5] bg-white border-r border-slate-200 px-2 py-1.5 text-slate-800 min-w-[140px]">
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
                  {MENU_YETKILENDIRME_MODULLERI.map(m => (
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
                        title="Genelde boş bırakın; e-posta ile Auth’ta eşleşir. Özel durumda UUID yapıştırın."
                        className="w-full min-w-[100px] max-w-[160px] border border-slate-200 rounded px-1 py-0.5 font-mono text-[10px]"
                      />
                    ) : (
                      <span className="text-slate-400 text-[10px]">—</span>
                    )}
                  </td>
                  <td className="sticky right-0 z-[5] bg-white border-l border-slate-200 px-2 py-1">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => satirKaydet(s)}
                      className="text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded"
                    >
                      {s.profil ? 'Kaydet' : 'Oluştur'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Profilli satır: {profilliSayisi} / {satirlar.length}. Profil yoksa: Auth’ta hesap + personelde e-posta
        uyumluysa <strong>Oluştur</strong> yeterli (UUID isteğe bağlı). Toplu yönetici için sol kutuyu işaretleyin.
      </p>
    </div>
  )
}
