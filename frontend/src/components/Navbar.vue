<script setup> // Utilizzo di Vue 3, con all'interno variabili, funzioni e/o importazioni asposte in <tamplate>
// Per ora la Navbar è statica. In futuro qui gestiremo il tema scuro/chiaro e il login
import { ref, onMounted } from 'vue'
import { Modal } from 'bootstrap'   // Importa Modal da bootstrap per chiuderlo via JS
import {useRouter} from 'vue-router'
// Variabile per la gestione degli errori
const errorMessage = ref('')

const utenteLoggato = ref(null)  

const isLoginMode = ref(true)   // Variabile per scambiare la vista del popup tra "Registrazione" e "Login"

const isDropdownOpen = ref(false)   // Var. per il controllo del menu a tendina

const isDarkMode = ref(false) // Variabile reattiva per sapere in che tema siamo

// Funzione per inizializzare il tema quando si apre il sito
const initTheme = () => {
  // Leggiamo dal localStorage se l'utente aveva già scelto un tema in passato
  const savedTheme = localStorage.getItem('theme')
  
  if (savedTheme === 'dark') {
    isDarkMode.value = true
    document.documentElement.setAttribute('data-bs-theme', 'dark') // Applica il tema scuro di Bootstrap
  } else {
    isDarkMode.value = false
    document.documentElement.setAttribute('data-bs-theme', 'light') // Applica il tema chiaro
  }
}

// Funzione che scatta quando si clicca il bottone Sole/Luna
const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value // Inverte il valore (da true a false o viceversa)
  
  const newTheme = isDarkMode.value ? 'dark' : 'light'
  document.documentElement.setAttribute('data-bs-theme', newTheme) // Aggiorna l'HTML
  localStorage.setItem('theme', newTheme) // Salva la scelta nel browser
}

const router=useRouter()
// Variabili per i form (stringhe reattive: vengono modificate sia dall'utente che scrive sia se il codice svuota la variabile)
const loginEmail    = ref('')
const loginPassword = ref('')
const regUsername   = ref('')
const regEmail      = ref('')
const regPassword   = ref('')

// Variabili reattive per la barra di ricerca
const testoRicerca=ref('')
const tipoRicerca=ref('tutto')
const suggerimenti=ref(null) // conterrà i risultati in tempo reale, della ricerca
let timeoutRicerca=null // serve per il debouncing -> tecnica che coinsiste nell'aspettare che l'utente smetta di digitare per 100ms prima di far partire la chiamata al server senza intasarlo 


// 1. Funzione che controlla se è presente una SESSIONE ATTIVA
const checkSession = async () => {
    try {
        const response = await fetch('/api/me')     // Viene interrogata la rotta. Se il server dà 200, ... 
        if(response.ok){                            // ... l'oggetto JSON restituito viene assegnato a utenteLoggato.value
            utenteLoggato.value = await response.json()
        } else{
            utenteLoggato.value = null
        }
    } catch(error){
        console.error("Errore controllo della sessione:", error)
    }
}

// Funzione secondaria per chiudere il popup
const chiudiPopup = () => {     // Serve perchè l'invio tramite fetch del form non fa anche ricaricare la pagina
    const modalElement = document.getElementById('authModal')       // viene recuperato l'elemento HTML attraverso il suo ID testuale
    if(modalElement){
        const modalInstance = Modal.getInstance(modalElement)     // tramite le API native di Bootstrap ottiene l'oggetto logico 
        if(modalInstance){
            modalInstance.hide()     // scomparsa immediata dell'istanza                            // associato a quell'elemento a invoca il metodo .hide()
        }
    }
    
    // Sanificazione del DOM (rimozione artefatti visivi)
    // Rimozione del blocco dello scorrimento imposto da Bootstrap
    document.body.classList.remove('modal-open')        // Riammessa la possbilità di scrollare la pagina (prima bloccata per il popup)
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''

    // Individuazione ed eliminazione fisica di eventuali sfondi rimasti appesi nel DOM
    const backdrops = document.querySelectorAll('.modal-backdrop')  // Query sul DOM per trovare tutti i div di oscuramento 
    backdrops.forEach(backdrop => backdrop.remove())                // Se li trova li distrugge
}

// 2. Funzione di LOGIN
const handleLogin = async () => {
    try {                                               // richiesta HTTP Post formattata come JSON contenente payload estratti dalle variab. reattive
        const response = await fetch('/api/login', {    // idem la funzione di registrazione
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: loginEmail.value, password: loginPassword.value })
        })
        const data = await response.json()

        if(response.ok) {       // Se la richiesta ha esito positivo
            await checkSession()    // Aggiornamento (dello stato globale) della Navbar in modo istantaneo
            chiudiPopup()           // Chiamata a funzione secondaria (chiusura modale)
            // Pulizia campi        // deallocazione dei dati in memoria
            loginEmail.value = ''
            loginPassword.value = ''
            // Azzeramento eventuali errori precedenti
            errorMessage.value = ''
        } else{
            errorMessage.value = data.error
        }

    } catch(err) {
        errorMessage.value = "Errore di connessione al server"
    }
}

// 3. Funzione di REGISTRAZIONE
const handleRegister = async () => {            // Stesse spiegazioni della funzione di login
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: regUsername.value, email: regEmail.value, password: regPassword.value })
        })
        const data = await response.json()

        
        if(response.ok) {
            await checkSession()    // Aggiornamento della Navbar in modo istantaneo
            chiudiPopup()           // Chiamata a funzione secondaria
            // Pulizia campi
            regUsername.value = ''
            regEmail.value = ''
            regPassword.value = ''
        } else{
            errorMessage.value = data.error
        }

    } catch(error){
        errorMessage.value = "Errore di connessione al server"
    }
}

// 4. Funzione di LOGOUT
const handleLogout = async () => {
    try {
        await fetch('/api/logout', { method: 'POST' })
        utenteLoggato.value = null      // Aggiornamento in modo istantaneo della Navbar
        isDropdownOpen.value = false    // Forza la chiusura del menu a tendina in caso di logout
    } catch(error){
        console.error("Errore logout:", error)
    }
}

// Funzione di commutazione per il menu a tendina
const toggleDropdown = () => {
    isDropdownOpen.value = !isDropdownOpen.value
}

// BARRA DI RICERCA
const cercaLive= () => {
    clearTimeout(timeoutRicerca) // cancella il timer precedente se l'utente sta ancora scrivendo 

    // se ha scritto meno di due caratteri nascondiamo la tendina 
    if(testoRicerca.value.trim().length<2) {
        suggerimenti.value=null 
        return 
    }

    timeoutRicerca=setTimeout(async() => {
        try {
            const response= await fetch(`/api/ricerca?q=${testoRicerca.value}&tipo=${tipoRicerca.value}`)
            if (response.ok) {
                suggerimenti.value=await response.json()
            }
        } catch(error) {
            console.error("Errore live search:", error)
        }
    }, 100)

}

// Funzione di ricerca 
const eseguiRicerca=()=> {
    if(testoRicerca.value.trim()!=='') {
        router.push({
            path:'/ricerca',
            query: {q: testoRicerca.value, tipo: tipoRicerca.value}
        })
        testoRicerca.value='' //svuota la barra dopo la ricerca 
        suggerimenti.value=null //chiude la tendina dei suggerimenti 
        isDropdownOpen.value=false // chiude la tendina del profilo se era aperta 
    }
}

// 2a Funzione secondaria per la barra di ricerca 
const selezionaSuggerimento = (testo) => {
  testoRicerca.value = testo
  eseguiRicerca()
}


// Ciclo di vita
onMounted(() => {       // Istruisce il frameqork Vue ad eseguire la funzione checkSession nel momento esatto in cui il componente
    checkSession()      // Navbar viene inserito nell'albero DOM dek browser, garantendo che lo stato dell'utente venga verificato subito
    initTheme()         // Controlla il tipo di tema selezionato nell ultimo accesso e lo inizializza
})

</script>

<template>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark sticky-top py-2"> 
        <div class="container-fluid px-4 d-flex align-items-center">
            
            <RouterLink class="navbar-brand d-flex align-items-center" to="/">
                <img 
                    src="/logo.png" 
                    alt="Logo TopKick" 
                    class="me-2" 
                    style="height: 80px; width: auto; object-fit: contain; mix-blend-mode: screen;"
                >
            </RouterLink>

            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span> 
            </button>

            <div class="collapse navbar-collapse align-items-center" id="navbarNav">
                <ul class="navbar-nav me-auto mb-2 mb-lg-0 ms-4 align-items-lg-center"> 
                    <li class="nav-item">
                        <RouterLink class="nav-link fs-5" to="/notizie">Notizie</RouterLink>
                    </li>
                    <li class="nav-item">
                        <RouterLink class="nav-link fs-5 ms-lg-3" to="/competizioni">Competizioni</RouterLink>
                    </li>
                </ul>

                <form class="d-flex align-items-center me-3 position-relative" role="search" @submit.prevent="eseguiRicerca"> 
                    <select class="form-select me-2 w-auto bg-dark text-white border-secondary" v-model="tipoRicerca" @change="cercaLive"> 
                        <option value="tutto">Tutto</option>
                        <option value="squadre">Squadre</option>
                        <option value="giocatori">Giocatori </option>
                        <option value="competizioni">Competizioni</option>
                        <option value="notizie">Notizie</option>
                    </select>

                    <div class="position-relative w-100">
                        <input class="form-control me-2 w-100" type="search" placeholder="Cerca..." aria-label="Search" v-model="testoRicerca" @input="cercaLive" required autocomplete="off">
                        <ul v-if="suggerimenti && (suggerimenti.squadre.length>0 || suggerimenti.giocatori.length>0 || suggerimenti.competizioni.length>0 || suggerimenti.notizie.length>0 )" class="dropdown-menu show position-absolute w-100 mt-1 shadow-lg" style="z-index: 1050; max-height: 300px; overflow-y: auto;">
                            <li v-if="suggerimenti.squadre.length>0">
                                <h6 class="dropdown-header text-success">Squadre</h6>
                            </li>
                            <li v-for="sq in suggerimenti.squadre.slice(0, 3)" :key="'sq'+sq.id">
                                <a class="dropdown-item" href="#" @click.prevent="selezionaSuggerimento(sq.nome)"> {{ sq.nome }}</a>
                            </li>

                            <li v-if="suggerimenti.giocatori.length>0">
                                <h6 class="dropdown-header text-primary">Giocatori</h6>
                            </li>
                            <li v-for="gio in suggerimenti.giocatori.slice(0, 3)" :key="'gio'+gio.id">
                                <a class="dropdown-item" href="#" @click.prevent="selezionaSuggerimento(gio.nome_cognome)"> {{ gio.nome_cognome }}</a>
                            </li>

                            <li v-if="suggerimenti.competizioni.length>0">
                                <h6 class="dropdown-header text-primary">Competizioni</h6>
                            </li>
                            <li v-for="comp in suggerimenti.competizioni.slice(0, 3)" :key="'comp'+comp.id">
                                <a class="dropdown-item" href="#" @click.prevent="selezionaSuggerimento(comp.nome)"> {{ comp.nome }}</a>
                            </li>

                            <li v-if="suggerimenti.notizie.length>0">
                                <h6 class="dropdown-header text-primary">Notizie</h6>
                            </li>
                            <li v-for="notizia in suggerimenti.notizie.slice(0, 3)" :key="'not'+notizia.id">
                                <a class="dropdown-item text-truncate" href="#" @click.prevent="selezionaSuggerimento(notizia.titolo)"> {{ notizia.titolo }}</a>
                            </li>

                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <a class="dropdown-item text-center text-muted small" href="#" @click.prevent="eseguiRicerca">Vedi tutti i risultati...</a>
                            </li>
                        </ul>
                    </div>

                    <button class="btn btn-outline-success ms-2" type="submit">Cerca</button>
                </form>

                <div class="d-flex align-items-center">
                    

                    <div class="nav-item dropdown">
                        <button class="nav-link dropdown-toggle text-white border-0 bg-transparent d-flex align-items-center" type="button" @click="toggleDropdown"> 
                            <span v-if="utenteLoggato">                                         
                                👤 Ciao, {{ utenteLoggato.username }}
                                <span v-if="utenteLoggato.ruolo === 'premium'" class="ms-1">⭐</span>  
                            </span>
                            <span v-else>👤 Profilo</span>                                      
                        </button>

                        <ul class="dropdown-menu dropdown-menu-end" :class="{ 'show': isDropdownOpen }"> 
                            <template v-if="!utenteLoggato">            
                                <li>
                                    <a class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#authModal" @click="isLoginMode = true; isDropdownOpen = false"> 
                                        Accedi / Registrati                 
                                    </a>
                                </li>
                            </template>

                            <template v-else>
                                <li><RouterLink class="dropdown-item" to="/profilo" @click="isDropdownOpen = false">Il mio Profilo</RouterLink></li>
                                <li v-if="utenteLoggato.ruolo === 'premium'">
                                    <RouterLink class="dropdown-item" to="/mie-competizioni" @click="isDropdownOpen = false">
                                        Le mie Competizioni
                                    </RouterLink>
                                </li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#" @click.prevent="handleLogout">Esci</a></li>
                            </template>
                        </ul>
                    </div>
                 </div>
            </div>
        </div>
    </nav>

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

                    <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show" role="alert"> 
                        <strong>Attenzione!</strong> {{ errorMessage }}
                        <button type="button" class="btn-close" @click="errorMessage = ''" aria-label="Close"></button>
                    </div>

                    <form v-if="isLoginMode" @submit.prevent="handleLogin">  
                        <div class="mb-3">
                            <label class="form-label fw-semibold">Email</label>
                            <input type="email" class="form-control" v-model="loginEmail" required> 
                        </div>
                        <div class="mb-4">
                            <label class="form-label fw-semibold">Password</label>
                            <input type="password" class="form-control" v-model="loginPassword" required>
                        </div>
                        <button type="submit" class="btn btn-success w-100 fw-bold">Accedi</button>
                    </form>

                    <form v-else @submit.prevent="handleRegister">
                        <div class="mb-3">
                            <label class="form-label fw-semibold">Username</label>
                            <input type="text" class="form-control" v-model="regUsername" required>
                        </div>
                        <div>
                            <label class="form-label fw-semibold">Email</label>
                            <input type="email" class="form-control" v-model="regEmail" required>
                        </div>
                        <div>
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

<style>
    /* Stile sfocato quando si apre il popup */
    .modal-backdrop {
        backdrop-filter: blur(5px);
        background-color: rgba(0, 0, 0, 0.6);
    }
    .modal-backdrop.show {
        opacity: 1;
    }
</style>