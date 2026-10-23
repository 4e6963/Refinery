import { createApp } from 'vue'
import App from './ui/App.vue'
import { registerServiceWorker } from './ui/pwa'
import './ui/style.css'

registerServiceWorker()
createApp(App).mount('#app')
