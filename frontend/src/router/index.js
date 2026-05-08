import { createRouter, createWebHistory} from 'vue-router' //importiamo dal pacchetto vue-router 2 funzioni architetturali
//dove createRouter è il costruttore principale mentre createWeb... erve a gestire la cronologia del web
import HomeView from '../views/HomeView.vue'
import ProfiloView from '../views/ProfiloView.vue'
import NotizieView from '../views/NotizieView.vue'
import RisultatiRicercaView from '../views/RisultatiRicercaView.vue'
import CompetizioniView from '../views/CompetizioniView.vue'
import NotiziaDettaglioView from '../views/NotiziaDettaglioView.vue'
import MieCompetizioniView from '@/views/MieCompetizioniView.vue'
import GestioneSquadreView from '@/views/GestioneSquadreView.vue'
import GestioneGiocatoriView from '@/views/GestioneGiocatoriView.vue'
import GestioneCalendarioView from '@/views/GestioneCalendarioView.vue'
import DettaglioCompetizioneView from '../views/DettaglioCompetizioneView.vue'
import DettaglioSquadraView from '../views/DettaglioSquadraView.vue'

//importiamo le componenti 'pagina' che fungono da contenitori principali per un'intera schermata, stiamo caricando nella memoria del file tutte le schermate che abbiamo costruito fisicamente nella cartella views

const router=createRouter({ //creaimo l'oggetto che gestirà i cambi di pagina
    history: createWebHistory(import.meta.env.BASE_URL), //impostazione fondamentale-> rende gli URL puliti, eliminando gli hashtag che si usavano una volta, e dice a vue di ascoltare i pulsanti fisici indietro e avanti del browser dell'utente, facendoli funzionare come in un sito web tradizionale 
    routes: [
        { path: '/', name:'home', component: HomeView },
        { path: '/profilo', name:'profilo', component: ProfiloView },
        { path: '/notizie', name:'notizie', component: NotizieView },
        { path: '/ricerca', name:'ricerca', component: RisultatiRicercaView },
        { path: '/competizioni', name:'competizioni', component: CompetizioniView },
        { path: '/notizie/:id', name: 'notizia-dettaglio', component: NotiziaDettaglioView },
        { path: '/mie-competizioni', name: 'mie-competizioni', component: MieCompetizioniView },
        { path: '/mie-competizioni/:id/squadre', name: 'gestione-squadre', component: GestioneSquadreView },
        { path: '/squadre/:id/giocatori', name: 'gestione-giocatori', component: GestioneGiocatoriView },
        { path: '/mie-competizioni/:id/calendario', name: 'gestione-calendario', component: GestioneCalendarioView },
        { path: '/competizioni/:id', name: 'dettaglio-competizione', component: DettaglioCompetizioneView},
        { path: '/squadre/:id', name: 'DettaglioSquadra', component: DettaglioSquadraView }
    ] // elenco delle regole, per ogni blocco stiamo indicando -> 1. path -> se l'utente digita eattamentoe quest'indirizzo nell'URL
        // 2 name->  targhetta interna, che facile la gestione dell'arrivo alle rotte 
        // 3 component-> cancella la pagina attuale e stampa a schermo questo specifico file vue
})

export default router