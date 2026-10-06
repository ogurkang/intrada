'use client'

import { useEffect, useState, useTransition } from 'react'
import { personelMaliyetKaydet } from '@/app/(dashboard)/hesaplama/personel-maliyeti/actions'
import {
  personelMaliyetBelgeCoz,
  varsayilanPersonelMaliyetBelge,
  type PersonelMaliyetBelge,
} from '@/lib/personel-maliyet-hesap'

const DEPO = 'intrada.personel-maliyet.v2'

export function useMaliyetBelge(sunucuBelge: PersonelMaliyetBelge | null, tabloYok: boolean) {
  const [belge, setBelge] = useState<PersonelMaliyetBelge>(sunucuBelge ?? varsayilanPersonelMaliyetBelge())
  const [hazir, setHazir] = useState(false)
  const [mesaj, setMesaj] = useState<string | null>(
    tabloYok ? 'Sunucu tablosu henüz yok. Değişiklik bu tarayıcıda durur.' : null,
  )
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    try {
      const ham = localStorage.getItem(DEPO)
      if (ham) {
        const coz = personelMaliyetBelgeCoz(JSON.parse(ham))
        if (coz) {
          setBelge(coz)
          setHazir(true)
          return
        }
      }
    } catch {
      /* varsayılan */
    }
    if (sunucuBelge) setBelge(sunucuBelge)
    setHazir(true)
  }, [sunucuBelge])

  function guncelle(sonraki: PersonelMaliyetBelge) {
    setBelge(sonraki)
    try {
      localStorage.setItem(DEPO, JSON.stringify(sonraki))
    } catch {
      /* kota */
    }
  }

  function kaydet() {
    setMesaj(null)
    try {
      localStorage.setItem(DEPO, JSON.stringify(belge))
    } catch {
      /* kota */
    }
    startTransition(async () => {
      const res = await personelMaliyetKaydet(belge)
      if (res.hata === 'tablo-yok') {
        setMesaj('Bu tarayıcıya yazıldı. Sunucu tablosu açılınca kayıt oraya da gider.')
        return
      }
      setMesaj(res.hata ?? 'Kaydedildi.')
    })
  }

  return { belge, hazir, mesaj, setMesaj, guncelle, kaydet, pending }
}
