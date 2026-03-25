'use client'

import { useEffect } from 'react'

/** Aynı kökteki diğer sekmelerde `router.refresh()` tetiklemek için */
export const INTRADA_TAB_CHANNEL = 'intrada'

export type IntradaTabScope = 'izin' | 'aile' | 'mal' | 'kesintiler'

export type IntradaTabMsg = { type: 'router-refresh'; scope: IntradaTabScope }

const LS_PREFIX = 'intrada-refresh-'

/** Yeni kayıt / güncelleme sonrası liste sekmesini güncellemek için (BroadcastChannel + localStorage). */
export function broadcastIntradaRefresh(scope: IntradaTabScope) {
  if (typeof window === 'undefined') return
  try {
    const bc = new BroadcastChannel(INTRADA_TAB_CHANNEL)
    bc.postMessage({ type: 'router-refresh', scope } satisfies IntradaTabMsg)
    bc.close()
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(LS_PREFIX + scope, String(Date.now()))
  } catch {
    /* ignore */
  }
}

type RouterRefresh = { refresh: () => void }

/** Liste sayfası bileşeninde: başka sekmede kayıt olunca veya storage ile yenileme */
export function useIntradaTabRefresh(scope: IntradaTabScope, router: RouterRefresh) {
  useEffect(() => {
    const refresh = () => router.refresh()
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel(INTRADA_TAB_CHANNEL)
      bc.onmessage = (e: MessageEvent<IntradaTabMsg>) => {
        if (e.data?.type === 'router-refresh' && e.data.scope === scope) refresh()
      }
    } catch {
      /* ignore */
    }
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === LS_PREFIX + scope && ev.newValue) refresh()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      try {
        bc?.close()
      } catch {
        /* ignore */
      }
      window.removeEventListener('storage', onStorage)
    }
  }, [scope, router])
}
