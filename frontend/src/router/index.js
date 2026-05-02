import { createRouter, createWebHistory} from 'vue-router' //importiamo dal pacchetto vue-router 2 funzioni architetturali
//dove createRouter è il costruttore principale mentre createWeb... erve a gestire la cronologia del web
import HomeView from '../views/HomeView.vue'
import ProfiloView from '../views/ProfiloView.vue'
import NotizieView from '../views/NotizieView.vue'
import RisultatiRicercaView from '../views/RisultatiRicercaView.vue'
//importiamo le componenti 'pagina' che fungono da contenitori principali per un'intera schermata


        {path: '/', name:'home', component: HomeView},
        {path: '/profilo', name:'profilo', component: ProfiloView},
        {path: '/notizie', name:'notizie', component: NotizieView},
        {path: '/ricerca', name:'ricerca', component: RisultatiRicercaView}
    ]
})

export default router