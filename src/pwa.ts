import { useEffect, useState } from 'react'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface PwaState {
  install: InstallPromptEvent | null
  update: ServiceWorkerRegistration | null
  online: boolean
}

export function usePwa(): PwaState {
  const [install, setInstall] = useState<InstallPromptEvent | null>(null)
  const [update, setUpdate] = useState<ServiceWorkerRegistration | null>(null)
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const setOnlineStatus = () => setOnline(navigator.onLine)
    const captureInstall = (event: Event) => {
      event.preventDefault()
      setInstall(event as InstallPromptEvent)
    }
    window.addEventListener('online', setOnlineStatus)
    window.addEventListener('offline', setOnlineStatus)
    window.addEventListener('beforeinstallprompt', captureInstall)

    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then((registration) => {
        if (registration.waiting) setUpdate(registration)
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) setUpdate(registration)
          })
        })
      }).catch(() => {
        // The app remains usable if private browsing or browser policy blocks workers.
      })
    }

    return () => {
      window.removeEventListener('online', setOnlineStatus)
      window.removeEventListener('offline', setOnlineStatus)
      window.removeEventListener('beforeinstallprompt', captureInstall)
    }
  }, [])

  return { install, update, online }
}

export async function activateUpdate(registration: ServiceWorkerRegistration) {
  const reload = () => window.location.reload()
  navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true })
  registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
}
