import { createRouter, createWebHistory } from 'vue-router'

// Importiamo tutte le viste (pagine) del nostro sito
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
import DettaglioGiocatoriView from '../views/DettaglioGiocatoriView.vue'
import PreferitiView from '@/views/PreferitiView.vue'

// Configurazione del router di Vue (SPA)
const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL), // Usa la history API di HTML5 per URL puliti (senza #)
    routes: [
        { path: '/', name: 'home', component: HomeView },
        { path: '/profilo', name: 'profilo', component: ProfiloView },
        { path: '/notizie', name: 'notizie', component: NotizieView },
        { path: '/ricerca', name: 'ricerca', component: RisultatiRicercaView },
        { path: '/competizioni', name: 'competizioni', component: CompetizioniView },
        { path: '/notizie/:id', name: 'notizia-dettaglio', component: NotiziaDettaglioView },
        
        // Rotte protette (Premium)
        { path: '/mie-competizioni', name: 'mie-competizioni', component: MieCompetizioniView },
        { path: '/mie-competizioni/:id/squadre', name: 'gestione-squadre', component: GestioneSquadreView },
        { path: '/squadre/:id/giocatori', name: 'gestione-giocatori', component: GestioneGiocatoriView },
        { path: '/mie-competizioni/:id/calendario', name: 'gestione-calendario', component: GestioneCalendarioView },
        
        // Dettagli pubblici
        { path: '/competizioni/:id', name: 'dettaglio-competizione', component: DettaglioCompetizioneView },
        { path: '/squadre/:id', name: 'DettaglioSquadra', component: DettaglioSquadraView },
        { path: '/giocatori/:identifier', name: 'DettaglioGiocatore', component: DettaglioGiocatoriView },
        
        // Preferiti (Utenti loggati)
        { path: '/preferiti', name: 'preferiti', component: PreferitiView }
    ]
})

export default router