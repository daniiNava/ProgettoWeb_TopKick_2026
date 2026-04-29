// Modulo di configurazione del routing
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL), // garantisce che gli URL dell'applicazione appaiano standard
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView
        }
    ]
})

export default router       // rende l'istanza 'router' (appena configurata) disponibile al di fuori del file circostante