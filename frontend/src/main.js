import { createApp } from 'vue'             // Crea l'istanza principale dell'applicazione Vue
import App from './App.vue'                 // Importa il file di layout principale (Root component)
import router from './router'               // Importa il sistema di navigazione (Vue Router)

// IMPORTAZIONE DI BOOSTRAP (Globale per tutto il sito)
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap';
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './css/style.css'

const app = createApp(App)                  // Inizializzazione dell'App

app.use(router)                             // Inserimento del router nell'App
app.mount('#app')                           // Inserimento dell'intera App all'intero di "<div id=app>" presente in 'index.html'
