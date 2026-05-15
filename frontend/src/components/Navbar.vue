<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from '@/utils/toastStore'
// ATTENZIONE: Abbiamo rimosso import { Modal } from 'bootstrap' perché ora gestiamo tutto con Vue!

const router = useRouter()

// Variabili di stato globale e UI
const utenteLoggato = ref(null)  
const isLoginMode = ref(true)       // true = Login, false = Registrazione

// Variabili reattive per i form di Auth
const loginEmail = ref('')
const loginPassword = ref('')
const regUsername = ref('')
const regEmail = ref('')
const regPassword = ref('')

// Variabili per il popup e la corretta pulizia dopo l'accesso
const isDropdownOpen = ref(false)   // Gestione manuale tendina profilo
const errorMessage = ref('')
const showAuthModal = ref(false)    // Gestione esclusiva Vue per il modale

// Variabili per la barra di ricerca intelligente
const testoRicerca = ref('')
const tipoRicerca = ref('tutto')
const suggerimenti = ref(null)
let timeoutRicerca = null // Timer per il debouncing

// --- LOGICA AUTENTICAZIONE ---

// 1. Controlla se c'è una sessione attiva al caricamento
const checkSession = async () => {
    try {
        const response = await fetch('/api/me')
        if(response.ok){
            utenteLoggato.value = await response.json()
        } else {
            utenteLoggato.value = null
        }
    } catch(error){
        console.error("Errore controllo della sessione:", error)
    }
}

// Funzione di supporto: apre la modale tramite Vue
const apriPopup = (mode) => {
    isLoginMode.value = mode; // true = Login, false = Registrazione
    showAuthModal.value = true;
}

// Funzione di supporto: chiude la modale di Bootstrap e pulisce il DOM
const chiudiPopup = () => {
    // Gestione puramente reattiva: basta impostare la variabile a false
    showAuthModal.value = false;
    errorMessage.value = ''; // Pulisce eventuali errori precedenti
}

// 2. Esegue il Login
const handleLogin = async () => {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: loginEmail.value, password: loginPassword.value })
        })
        const data = await response.json()

        if(response.ok) {
            await checkSession() // Aggiorna la UI istantaneamente
            chiudiPopup()
            
            // Svuoto i campi
            loginEmail.value = ''
            loginPassword.value = ''
            errorMessage.value = ''

            showToast(`Benvenuto ${utenteLoggato.value.username}!`, 'success')
        } else {
            errorMessage.value = data.error
        }
    } catch(err) {
        errorMessage.value = "Errore di connessione al server"
    }
}

// 3. Esegue la Registrazione
const handleRegister = async () => {
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: regUsername.value, email: regEmail.value, password: regPassword.value })
        })
        const data = await response.json()
        
        if(response.ok) {
            await checkSession()
            chiudiPopup()
            
            regUsername.value = ''
            regEmail.value = ''
            regPassword.value = ''
            errorMessage.value = ''
            
            showToast("Registrazione completata!", 'success')
        } else {
            errorMessage.value = data.error
        }
    } catch(error){
        errorMessage.value = "Errore di connessione al server"
    }
}

// 4. Esegue il Logout
const handleLogout = async () => {
    try {
        await fetch('/api/logout', { method: 'POST' })
        utenteLoggato.value = null
        isDropdownOpen.value = false // Chiude la tendina
        
        // Se l'utente era in una pagina protetta, lo rimandiamo alla home
        const pathCorrente = router.currentRoute.value.path;
        if(
            pathCorrente.includes('mie-competizioni') || 
            pathCorrente.includes('preferiti') ||
            pathCorrente.includes('profilo')
        ) {
            router.push('/')
        }

        showToast("Logout effettuato con successo.", 'info')
    } catch(error){
        console.error("Errore logout:", error)
    }
}

const toggleDropdown = () => {
    isDropdownOpen.value = !isDropdownOpen.value
}

// --- LOGICA RICERCA INTELLIGENTE ---

// Ricerca in tempo reale (con debouncing per non intasare il server)
const cercaLive = () => {
    clearTimeout(timeoutRicerca)

    // Mostriamo i suggerimenti solo se ha scritto almeno 3 caratteri
    if(testoRicerca.value.trim().length < 3) {
        suggerimenti.value = null 
        return 
    }

    timeoutRicerca = setTimeout(async () => {
        try {
            const response = await fetch(`/api/ricerca?q=${testoRicerca.value}&tipo=${tipoRicerca.value}`)
            if (response.ok) {
                suggerimenti.value = await response.json()
            }
        } catch(error) {
            console.error("Errore live search:", error)
        }
    }, 150) // Aspetta 150ms da quando l'utente smette di digitare
}

// Invia la ricerca e cambia pagina
const eseguiRicerca = () => {
    if(testoRicerca.value.trim() !== '') {
        router.push({
            path: '/ricerca',
            query: { q: testoRicerca.value, tipo: tipoRicerca.value }
        })
        testoRicerca.value = ''
        suggerimenti.value = null
        isDropdownOpen.value = false
    }
}

// Cliccando su un suggerimento specifico
const selezionaSuggerimento = (testo) => {
  testoRicerca.value = testo
  eseguiRicerca()
}

// Handler per processare l'evento globale
const gestisciAggiornamentoSessione = (event) => {
    // Verifica l'esistenza dell'oggetto utente e del payload
    if (utenteLoggato.value && event.detail && event.detail.nuovoRuolo) {
        // Aggiornamento reattivo e sincrono: la stellina appare immediatamente (0 delay)
        utenteLoggato.value.ruolo = event.detail.nuovoRuolo;
    } else {
        // Fallback: se mancano i dati, si forza un ricaricamento bypassando la cache
        checkSession(); 
    }
};

// --- CICLO DI VITA ---
onMounted(() => {
    checkSession() // Controlla chi è loggato appena si carica il sito
    window.addEventListener('session-updated', gestisciAggiornamentoSessione)
})

onUnmounted(() => {
    // Rimozione dei listener globali alla distruzione del nodo
    window.removeEventListener('session-updated', gestisciAggiornamentoSessione);
});
</script>

<template>
    <nav class="navbar navbar-expand-xl navbar-dark bg-dark sticky-top py-2"> 
        <div class="container-fluid px-4 d-flex align-items-center">
            
            <!-- LOGO -->
            <RouterLink class="navbar-brand d-flex align-items-center w-0 w-xl-100 mx-auto" to="/">
                <img 
                    src="/logo.png" 
                    alt="Logo TopKick" 
                    class="me-2" 
                    style="height: 70px; width: auto; object-fit: contain; mix-blend-mode: screen;"
                >
            </RouterLink>

            <!-- RICERCA MOBILE -->
            <form class="d-flex align-items-center justify-content-center position-relative d-xl-none w-100" role="search" @submit.prevent="eseguiRicerca"> 
                <select class="form-select me-2 bg-dark text-white border-secondary" style="width: 40% !important; max-width: 200px;" v-model="tipoRicerca" @change="cercaLive"> 
                    <option value="tutto">Tutto</option>
                    <option value="squadre">Squadre</option>
                    <option value="giocatori">Giocatori </option>
                    <option value="competizioni">Competizioni</option>
                    <option value="notizie">Notizie</option>
                </select>

                <div class="position-relative w-100" style="width: 40% !important; max-width: 400px;">
                    <input class="form-control me-2 w-100" type="search" placeholder="Cerca..." v-model="testoRicerca" @input="cercaLive" required autocomplete="off">
                    
                    <!-- Tendina suggerimenti Mobile -->
                    <ul v-if="suggerimenti && (suggerimenti.squadre.length>0 || suggerimenti.giocatori.length>0 || suggerimenti.competizioni.length>0 || suggerimenti.notizie.length>0 )" class="dropdown-menu show position-absolute w-100 mt-1 shadow-xl" style="z-index: 1050; max-height: 300px; overflow-y: auto;">
                        <li v-if="suggerimenti.squadre.length>0"><h6 class="dropdown-header text-success">Squadre</h6></li>
                        <li v-for="sq in suggerimenti.squadre.slice(0, 3)" :key="'sq'+sq.id">
                            <a class="dropdown-item" href="#" @click.prevent="selezionaSuggerimento(sq.nome)"> {{ sq.nome }}</a>
                        </li>

                        <li v-if="suggerimenti.giocatori.length>0"><h6 class="dropdown-header text-primary">Giocatori</h6></li>
                        <li v-for="gio in suggerimenti.giocatori.slice(0, 3)" :key="'gio'+gio.id">
                            <a class="dropdown-item" href="#" @click.prevent="selezionaSuggerimento(gio.nome_cognome)"> {{ gio.nome_cognome }}</a>
                        </li>

                        <li v-if="suggerimenti.competizioni.length>0"><h6 class="dropdown-header text-primary">Competizioni</h6></li>
                        <li v-for="comp in suggerimenti.competizioni.slice(0, 3)" :key="'comp'+comp.id">
                            <a class="dropdown-item" href="#" @click.prevent="selezionaSuggerimento(comp.nome)"> {{ comp.nome }}</a>
                        </li>

                        <li v-if="suggerimenti.notizie.length>0"><h6 class="dropdown-header text-primary">Notizie</h6></li>
                        <li v-for="notizia in suggerimenti.notizie.slice(0, 3)" :key="'not'+notizia.id">
                            <a class="dropdown-item text-truncate" href="#" @click.prevent="selezionaSuggerimento(notizia.titolo)"> {{ notizia.titolo }}</a>
                        </li>

                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-center text-muted small" href="#" @click.prevent="eseguiRicerca">Vedi tutti i risultati...</a></li>
                    </ul>
                </div>

                <button class="btn btn-outline-success ms-2" type="submit">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-search" viewBox="0 0 16 16">
                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
                    </svg>
                </button>
                <button class="navbar-toggler border-0" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasNavbar">
                    <span class="navbar-toggler-icon"></span>
                </button>
            </form>

            <!-- MENU OFFCANVAS -->
            <div class="offcanvas offcanvas-end bg-dark" tabindex="-1" id="offcanvasNavbar">
                <div class="offcanvas-header">
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
                </div>
                <div class="offcanvas-body">
                    <ul class="navbar-nav w-100 d-flex flex-column flex-xl-row align-items-xl-center">
                        
                        <li class="nav-item order-3 order-xl-1 me-xl-3" data-bs-dismiss="offcanvas">
                            <RouterLink class="nav-link fs-5 ms-xl-3" to="/competizioni">Competizioni</RouterLink>
                        </li>
                        <li class="nav-item order-2 order-xl-2" data-bs-dismiss="offcanvas">
                            <RouterLink class="nav-link fs-5" to="/notizie">Notizie</RouterLink>
                        </li>

                        <!-- RICERCA DESKTOP -->
                        <li class="nav-item order-4 order-xl-3 d-none d-xl-block ms-xl-auto me-xl-3" style="max-width: 370px;">
                            <form class="d-flex align-items-center position-relative w-100" role="search" @submit.prevent="eseguiRicerca"> 
                                <select class="form-select me-2 w-auto bg-dark text-white border-secondary" v-model="tipoRicerca" @change="cercaLive"> 
                                    <option value="tutto">Tutto</option>
                                    <option value="squadre">Squadre</option>
                                    <option value="giocatori">Giocatori </option>
                                    <option value="competizioni">Competizioni</option>
                                    <option value="notizie">Notizie</option>
                                </select>

                                <div class="position-relative w-100">
                                    <input class="form-control w-100" type="search" placeholder="Cerca..." v-model="testoRicerca" @input="cercaLive" required autocomplete="off">
                                    
                                    <!-- Tendina suggerimenti Desktop -->
                                    <ul v-if="suggerimenti && (suggerimenti.squadre.length>0 || suggerimenti.giocatori.length>0 || suggerimenti.competizioni.length>0 || suggerimenti.notizie.length>0 )" class="dropdown-menu show position-absolute w-100 mt-1 shadow-xl" style="z-index: 1050; max-height: 300px; overflow-y: auto;">
                                        <li v-if="suggerimenti.squadre.length>0"><h6 class="dropdown-header text-success">Squadre</h6></li>
                                        <li v-for="sq in suggerimenti.squadre.slice(0, 3)" :key="'sq'+sq.id">
                                            <a class="dropdown-item" href="#" @click.prevent="selezionaSuggerimento(sq.nome)"> {{ sq.nome }}</a>
                                        </li>

                                        <li v-if="suggerimenti.giocatori.length>0"><h6 class="dropdown-header text-primary">Giocatori</h6></li>
                                        <li v-for="gio in suggerimenti.giocatori.slice(0, 3)" :key="'gio'+gio.id">
                                            <a class="dropdown-item" href="#" @click.prevent="selezionaSuggerimento(gio.nome_cognome)"> {{ gio.nome_cognome }}</a>
                                        </li>

                                        <li v-if="suggerimenti.competizioni.length>0"><h6 class="dropdown-header text-primary">Competizioni</h6></li>
                                        <li v-for="comp in suggerimenti.competizioni.slice(0, 3)" :key="'comp'+comp.id">
                                            <a class="dropdown-item" href="#" @click.prevent="selezionaSuggerimento(comp.nome)"> {{ comp.nome }}</a>
                                        </li>

                                        <li v-if="suggerimenti.notizie.length>0"><h6 class="dropdown-header text-primary">Notizie</h6></li>
                                        <li v-for="notizia in suggerimenti.notizie.slice(0, 3)" :key="'not'+notizia.id">
                                            <a class="dropdown-item text-truncate" href="#" @click.prevent="selezionaSuggerimento(notizia.titolo)"> {{ notizia.titolo }}</a>
                                        </li>

                                        <li><hr class="dropdown-divider"></li>
                                        <li><a class="dropdown-item text-center text-muted small" href="#" @click.prevent="eseguiRicerca">Vedi tutti i risultati...</a></li>
                                    </ul>
                                </div>
                                <button class="btn btn-outline-success ms-2" type="submit">Cerca</button>
                            </form>
                        </li>

                        <!-- ZONA PROFILO / AUTH -->
                        <li class="nav-item order-1 order-xl-4 mb-3 mb-xl-0">
                            <div class="d-flex align-items-center">
                                
                                <!-- UTENTE NON LOGGATO -->
                                <div v-if="!utenteLoggato" class="d-flex flex-column flex-xl-row gap-2 w-100">
                                    <!-- rimosso data-bs-toggle e target, usiamo solo @click di Vue -->
                                    <button class="btn btn-outline-light fw-bold px-4 text-nowrap" @click="apriPopup(true)" data-bs-dismiss="offcanvas">
                                        Accedi
                                    </button>
                                    <button class="btn btn-success fw-bold px-4 text-nowrap" @click="apriPopup(false)" data-bs-dismiss="offcanvas">
                                        Iscriviti
                                    </button>
                                </div>

                                <!-- UTENTE LOGGATO -->
                                <div v-else class="nav-item dropdown w-100">
                                    <button class="nav-link dropdown-toggle text-white border-0 bg-transparent d-flex align-items-center w-100" type="button" @click="toggleDropdown"> 
                                        <span class="text-nowrap"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-person-circle me-2 mb-1" viewBox="0 0 16 16">
                                            <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0"/>
                                            <path fill-rule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1"/>
                                        </svg> Ciao, {{ utenteLoggato.username }} 
                                            <span v-if="utenteLoggato.ruolo === 'premium'" class="ms-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-star-fill text-warning me-2 mb-1" viewBox="0 0 16 16"><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
                                                </svg>
                                            </span>
                                        </span>
                                    </button>

                                    <ul class="dropdown-menu dropdown-menu-end shadow border-0" :class="{ 'show': isDropdownOpen }" style="right: 0; left: auto; min-width: 200px;" data-bs-dismiss="offcanvas"> 
                                        <li>
                                            <RouterLink class="dropdown-item py-2" to="/profilo" @click="isDropdownOpen = false">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person me-2 mb-1" viewBox="0 0 16 16">
                                                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/>
                                                </svg>Il mio Profilo
                                            </RouterLink>
                                        </li>
                                        <li>
                                            <RouterLink class="dropdown-item py-2" to="/preferiti" @click="isDropdownOpen = false">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-star-fill me-2 mb-1" viewBox="0 0 16 16">
                                                    <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
                                                </svg>I miei Preferiti
                                            </RouterLink>
                                        </li>
                                        <li v-if="utenteLoggato.ruolo === 'premium'">
                                            <RouterLink class="dropdown-item py-2" to="/mie-competizioni" @click="isDropdownOpen = false">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trophy me-2 mb-1" viewBox="0 0 16 16">
                                                    <path d="M2.5.5A.5.5 0 0 1 3 0h10a.5.5 0 0 1 .5.5q0 .807-.034 1.536a3 3 0 1 1-1.133 5.89c-.79 1.865-1.878 2.777-2.833 3.011v2.173l1.425.356c.194.048.377.135.537.255L13.3 15.1a.5.5 0 0 1-.3.9H3a.5.5 0 0 1-.3-.9l1.838-1.379c.16-.12.343-.207.537-.255L6.5 13.11v-2.173c-.955-.234-2.043-1.146-2.833-3.012a3 3 0 1 1-1.132-5.89A33 33 0 0 1 2.5.5m.099 2.54a2 2 0 0 0 .72 3.935c-.333-1.05-.588-2.346-.72-3.935m10.083 3.935a2 2 0 0 0 .72-3.935c-.133 1.59-.388 2.885-.72 3.935M3.504 1q.01.775.056 1.469c.13 2.028.457 3.546.87 4.667C5.294 9.48 6.484 10 7 10a.5.5 0 0 1 .5.5v2.61a1 1 0 0 1-.757.97l-1.426.356a.5.5 0 0 0-.179.085L4.5 15h7l-.638-.479a.5.5 0 0 0-.18-.085l-1.425-.356a1 1 0 0 1-.757-.97V10.5A.5.5 0 0 1 9 10c.516 0 1.706-.52 2.57-2.864.413-1.12.74-2.64.87-4.667q.045-.694.056-1.469z"/>
                                                </svg>Le mie Competizioni
                                            </RouterLink>
                                        </li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li>
                                            <a class="dropdown-item text-danger py-2" href="#" @click.prevent="handleLogout">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-box-arrow-left me-2 mb-1" viewBox="0 0 16 16">
                                                <path fill-rule="evenodd" d="M6 12.5a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-8a.5.5 0 0 0-.5.5v2a.5.5 0 0 1-1 0v-2A1.5 1.5 0 0 1 6.5 2h8A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 5 12.5v-2a.5.5 0 0 1 1 0z"/>
                                                <path fill-rule="evenodd" d="M.146 8.354a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L1.707 7.5H10.5a.5.5 0 0 1 0 1H1.707l2.147 2.146a.5.5 0 0 1-.708.708z"/>
                                                </svg>Esci
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </nav>

    <!-- MODALE LOGIN / REGISTRAZIONE GESTITA CON VUE -->
    <div v-if="showAuthModal">
        <!-- Sfondo scuro e blur -->
        <div class="modal-backdrop fade show" @click="chiudiPopup"></div>
        
        <!-- Finestra Modale visibile forzatamente -->
        <div class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true" style="z-index: 1055;"> 
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content shadow-xl border-0">

                    <div class="modal-header text-white" :class="isLoginMode ? 'bg-success' : 'bg-primary'">
                        <h5 class="modal-title fw-bold">
                            {{ isLoginMode ? 'Bentornato su TOPKICK' : 'Crea un nuovo account' }}       
                        </h5>
                        <button type="button" class="btn-close btn-close-white" @click="chiudiPopup" aria-label="Close"></button>
                    </div>

                    <div class="modal-body p-4">

                        <!-- Alert per gli errori -->
                        <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show" role="alert"> 
                            <strong>Attenzione!</strong> {{ errorMessage }}
                            <button type="button" class="btn-close" @click="errorMessage = ''" aria-label="Close"></button>
                        </div>

                        <!-- Form Login -->
                        <form v-if="isLoginMode" @submit.prevent="handleLogin">  
                            <div class="mb-3">
                                <label class="form-label fw-semibold">Email</label>
                                <input type="email" class="form-control" v-model="loginEmail" required> 
                            </div>
                            <div class="mb-3">
                                <label class="form-label fw-semibold">Password</label>
                                <input type="password" class="form-control" v-model="loginPassword" required>
                            </div>
                            <button type="submit" class="btn btn-success w-100 fw-bold">Accedi</button>
                        </form>

                        <!-- Form Registrazione -->
                        <form v-else @submit.prevent="handleRegister">
                            <div class="mb-3">
                                <label class="form-label fw-semibold">Username</label>
                                <input type="text" class="form-control" v-model="regUsername" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label fw-semibold">Email</label>
                                <input type="email" class="form-control" v-model="regEmail" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label fw-semibold">Password (min. 8 caratteri)</label>
                                <input type="password" class="form-control" v-model="regPassword" minlength="8" required>
                            </div>
                            <button type="submit" class="btn btn-primary w-100 fw-bold">Registrati</button>
                        </form>

                    </div>

                    <div class="modal-footer justify-content-center bg-light">
                        <p class="mb-0" v-if="isLoginMode">
                            Non hai un account?
                            <a href="#" class="text-primary fw-bold text-decoration-none" @click.prevent="isLoginMode = false"> 
                                Registrati ora
                            </a>
                        </p>
                        <p class="mb-0" v-else>
                            Hai già un account?
                            <a href="#" class="text-primary fw-bold text-decoration-none" @click.prevent="isLoginMode = true"> 
                                Accedi
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
/* Regola per bloccare lo scroll del body solo quando la modale Vue è visibile.
    Usiamo il selettore globale :global() per colpire il body dall'interno di uno style scoped */
:global(body:has(.modal.show.d-block)) {
    overflow: hidden;
}
</style>