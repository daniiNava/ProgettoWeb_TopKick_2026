import { createApp } from 'vue'     // importa la funzione createApp dal nucleo del framework Vue
import App from './App.vue'         // importa il componente radice (Root component)
import router from './router'

// IMPORTAZIONE DI BOOSTRAP predentemente installato
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

const app = createApp(App)

app.use(router)
app.mount('#app')
