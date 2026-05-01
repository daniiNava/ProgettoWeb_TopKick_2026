// Modulo di configurazione del routing
import { createRouter, createWebHistory} from 'vue-router' //importiamo dal pacchetto vue-router 2 funzioni architetturali
//dove createRouter è il costruttore principale mentre createWeb... serve a gestire la cronologia del web
import HomeView from '../views/HomeView.vue'
import ProfiloView from '../views/ProfiloView.vue'
import NotizieView from '../views/NotizieView.vue'
//importiamo le componenti 'pagina' che fungono da contenitori principali per un'intera schermata


const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL), // garantisce che gli URL dell'applicazione appaiano standard
    routes: [
        {path: '/', name:'home', component: HomeView},
        {path: '/profilo', name:'profilo', component: ProfiloView},
        {path: '/notizie', name:'notizie', component: NotizieView}
    ]
})

export default router