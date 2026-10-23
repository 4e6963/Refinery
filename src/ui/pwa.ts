import { ref } from 'vue'
import { registerSW } from 'virtual:pwa-register'

/** True once the service worker has cached the app for offline use. */
export const offlineReady = ref(Boolean(navigator.serviceWorker?.controller))

export function registerServiceWorker() {
  registerSW({
    immediate: true,
    onOfflineReady: () => {
      offlineReady.value = true
    },
  })
}
