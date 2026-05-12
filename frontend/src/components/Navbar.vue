<script setup>
import { ref, onMounted } from 'vue'
import { Modal } from 'bootstrap'
import { useRouter } from 'vue-router'
import { showToast } from '@/utils/toastStore'

const router = useRouter()

// Variabili di stato globale e UI
const utenteLoggato = ref(null)  
const isLoginMode = ref(true)       // true = Login, false = Registrazione
const isDropdownOpen = ref(false)   // Gestione manuale tendina profilo
const errorMessage = ref('')

// Variabili reattive per i form di Auth
const loginEmail = ref('')
const loginPassword = ref('')
const regUsername = ref('')
const regEmail = ref('')
const regPassword = ref('')

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

// Funzione di supporto: chiude la modale di Bootstrap e pulisce il DOM
const chiudiPopup = () => {
    const modalElement = document.getElementById('authModal')
    if(modalElement){
        const modalInstance = Modal.getInstance(modalElement)
        if(modalInstance) modalInstance.hide()
    }
    
    // Hack necessario perché Vue e Bootstrap a volte litigano sul DOM:
    // Rimuoviamo a mano gli sfondi scuri rimasti appesi e sblocchiamo lo scroll
    document.body.classList.remove('modal-open')
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
    const backdrops = document.querySelectorAll('.modal-backdrop')
    backdrops.forEach(backdrop => backdrop.remove())
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
        if(router.currentRoute.value.path.includes('mie-competizioni') || router.currentRoute.value.path.includes('preferiti')) {
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

// --- CICLO DI VITA ---
onMounted(() => {
    checkSession() // Controlla chi è loggato appena si carica il sito
})
</script>

<template>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark sticky-top py-2"> 
        <div class="container-fluid px-4 d-flex align-items-center">
            
            <!-- LOGO -->
            <RouterLink class="navbar-brand d-flex align-items-center w-0 w-lg-100 mx-auto" to="/">
                <img 
                    src="/logo.png" 
                    alt="Logo TopKick" 
                    class="me-2" 
                    style="height: 70px; width: auto; object-fit: contain; mix-blend-mode: screen;"
                >
            </RouterLink>

            <!-- RICERCA MOBILE -->
            <form class="d-flex align-items-center position-relative d-lg-none w-auto" role="search" @submit.prevent="eseguiRicerca"> 
                <select class="form-select me-2 bg-dark text-white border-secondary" style="width: 40% !important;" v-model="tipoRicerca" @change="cercaLive"> 
                    <option value="tutto">Tutto</option>
                    <option value="squadre">Squadre</option>
                    <option value="giocatori">Giocatori </option>
                    <option value="competizioni">Competizioni</option>
                    <option value="notizie">Notizie</option>
                </select>

                <div class="position-relative flex-grow-1">
                    <input class="form-control me-2 w-100" type="search" placeholder="Cerca..." v-model="testoRicerca" @input="cercaLive" required autocomplete="off">
                    
                    <!-- Tendina suggerimenti Mobile -->
                    <ul v-if="suggerimenti && (suggerimenti.squadre.length>0 || suggerimenti.giocatori.length>0 || suggerimenti.competizioni.length>0 || suggerimenti.notizie.length>0 )" class="dropdown-menu show position-absolute w-100 mt-1 shadow-lg" style="z-index: 1050; max-height: 300px; overflow-y: auto;">
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
                <button class="navbar-toggler border-0 ms-3" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasNavbar">
                    <span class="navbar-toggler-icon"></span>
                </button>
            </form>

            <!-- MENU OFFCANVAS -->
            <div class="offcanvas offcanvas-end bg-dark" tabindex="-1" id="offcanvasNavbar">
                <div class="offcanvas-header">
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
                </div>
                <div class="offcanvas-body">
                    <ul class="navbar-nav w-100 d-flex flex-column flex-lg-row align-items-lg-center">
                        
                        <li class="nav-item order-3 order-lg-1 me-lg-3" data-bs-dismiss="offcanvas">
                            <RouterLink class="nav-link fs-5 ms-lg-3" to="/competizioni">Competizioni</RouterLink>
                        </li>
                        <li class="nav-item order-2 order-lg-2" data-bs-dismiss="offcanvas">
                            <RouterLink class="nav-link fs-5" to="/notizie">Notizie</RouterLink>
                        </li>

                        <!-- RICERCA DESKTOP -->
                        <li class="nav-item order-4 order-lg-3 d-none d-lg-block ms-lg-auto me-lg-3" style="max-width: 370px;">
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
                                    <ul v-if="suggerimenti && (suggerimenti.squadre.length>0 || suggerimenti.giocatori.length>0 || suggerimenti.competizioni.length>0 || suggerimenti.notizie.length>0 )" class="dropdown-menu show position-absolute w-100 mt-1 shadow-lg" style="z-index: 1050; max-height: 300px; overflow-y: auto;">
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
                        <li class="nav-item order-1 order-lg-4 mb-3 mb-lg-0">
                            <div class="d-flex align-items-center">
                                
                                <!-- UTENTE NON LOGGATO -->
                                <div v-if="!utenteLoggato" class="d-flex flex-column flex-lg-row gap-2 w-100">
                                    <button class="btn btn-outline-light fw-bold px-4 text-nowrap" data-bs-toggle="modal" data-bs-target="#authModal" @click="isLoginMode = true" data-bs-dismiss="offcanvas">
                                        Accedi
                                    </button>
                                    <button class="btn btn-success fw-bold px-4 text-nowrap" data-bs-toggle="modal" data-bs-target="#authModal" @click="isLoginMode = false" data-bs-dismiss="offcanvas">
                                        Iscriviti
                                    </button>
                                </div>

                                <!-- UTENTE LOGGATO -->
                                <div v-else class="nav-item dropdown w-100">
                                    <button class="nav-link dropdown-toggle text-white border-0 bg-transparent d-flex align-items-center w-100" type="button" @click="toggleDropdown"> 
                                        <span class="text-nowrap">👤 Ciao, {{ utenteLoggato.username }} <span v-if="utenteLoggato.ruolo === 'premium'" class="ms-1">⭐</span></span>
                                    </button>

                                    <ul class="dropdown-menu dropdown-menu-end shadow border-0" :class="{ 'show': isDropdownOpen }" style="right: 0; left: auto; min-width: 200px;" data-bs-dismiss="offcanvas"> 
                                        <li>
                                            <RouterLink class="dropdown-item py-2" to="/profilo" @click="isDropdownOpen = false">
                                                <i class="bi bi-person me-2"></i>Il mio Profilo
                                            </RouterLink>
                                        </li>
                                        <li>
                                            <RouterLink class="dropdown-item py-2" to="/preferiti" @click="isDropdownOpen = false">
                                                <i class="bi bi-star-fill text-warning me-2"></i>I miei Preferiti
                                            </RouterLink>
                                        </li>
                                        <li v-if="utenteLoggato.ruolo === 'premium'">
                                            <RouterLink class="dropdown-item py-2" to="/mie-competizioni" @click="isDropdownOpen = false">
                                                <i class="bi bi-trophy me-2"></i>Le mie Competizioni
                                            </RouterLink>
                                        </li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li>
                                            <a class="dropdown-item text-danger py-2" href="#" @click.prevent="handleLogout">
                                                <i class="bi bi-box-arrow-left me-2"></i>Esci
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

    <!-- MODALE LOGIN / REGISTRAZIONE -->
    <div class="modal fade" id="authModal" tabindex="-1" aria-labelledby="authModalLabel" aria-hidden="true"> 
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content shadow-lg border-0">

                <div class="modal-header text-white" :class="isLoginMode ? 'bg-success' : 'bg-primary'">
                    <h5 class="modal-title fw-bold" id="authModalLabel">
                        {{ isLoginMode ? 'Bentornato su TOPKICK' : 'Crea un nuovo account' }}       
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
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
</template>

<style scoped>
    /* Effetto vetro smerigliato per lo sfondo della modale */
    :deep(.modal-backdrop) {
        backdrop-filter: blur(5px);
        background-color: rgba(0, 0, 0, 0.6);
    }
    :deep(.modal-backdrop.show) {
        opacity: 1;
    }
</style>