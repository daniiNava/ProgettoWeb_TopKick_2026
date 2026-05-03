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
})

</script>

<template>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark sticky-top"> 
        <!--navbar      inizializza il componente-->
        <!--navbar-expand-lg    definisce il comportamento responsive. La barra rimane compressa (hamburger menu) sui mobile e si espande orizz. dopo la L (992 px)-->
        <!--navbar-dark bg-dark     applica una combinazione cromatica predefinita. Colore nero(2°), con il colore del carattere e dei simboli invertiti (1°) -->
        <!--sticky-top      proprietà CSS "position: sticky", ovvero la barra scorre in basso con il documento finchè non rimane fissa in alto-->
        <div class="container">
            <!-- LOGO-->
            <RouterLink class="navbar-brand fw-bold fs-3 text-success" to="/">TOPKICK</RouterLink> <!--Componente nativo della libreria Vue Router-->
            <!--<RouterLink>    a diff. di un tag tradizionale di ancoraggio (<a href>), intercetta l'evento clic e aggiorna l'URL e la vista dell'app. senza innescare chiamate HTTP e aggiornare la pag.-->
            <!--to="/"          def. il percorso di destinazione (la radice /) (se lo premi ritorni nella homepage)-->
            <!--fw-bold fs-3 text-success       (tipografia) 1°->grassetto | 2°-> dim. del carattere incrementata | 3° -> colore verde semantico |-->    

            <!-- Bottone Hamburger per il mobile -->
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <!--navbar-toggler  per creare il bottone hamburger-->
            <!--data-bs-toggle="collapse" data-bs-target="#navbarNav        attributi HTML per interfaccia il markup con il codice JS integrato in Bootstrap-->
            <!-- 1° Assegna al nottone la funzionalità di att/disattivazione di un elemento collassabile-->
            <!-- 2° Crea un collegamento univoco tramite selettore ID -->
                <span class="navbar-toggler-icon"></span> 
            </button>

            <!--Allineamento e Form di Ricerca-->
            <div class="collapse navbar-collapse" id="navbarNav">
                <!-- LINK CENTRALI-->
                <ul class="navbar-nav me-auto mb-2 mb-lg-0 ms-4"> <!-- allineamnto dei collegamenti centrali utilizzando le classi di spaziatura-->
                <!--me-auto         spinge tutti gli elementi successivi verso il margine dx-->    
                <!--mb-2 mb-lg-0    applica un margine inferiore di scala valore 2 tra gli elementi, azzerandolo quando la barra si espande su schermi grandi-->    
                <!--ms-4            applica un margine sinistro di scala valore 4 (distanzia il link dal logo)-->   
                    <li class="nav-item">
                        <RouterLink class="nav-link" to="/notizie">Notizie</RouterLink>
                    </li>
                    <li class="nav-item">
                        <RouterLink class="nav-link" to="/competizioni">Competizioni</RouterLink>
                    </li>
                </ul>

                <!-- BARRA DI RICERCA -->
                <form class="d-flex me-3 position-relative" role="search" @submit.prevent="eseguiRicerca"> 
                <!-- @submit.prevent blocca il refresh della pagina e lancia la nostra funzione di ricerca-->
                <!--d-flex  forza l'elemento ad adottare il modello di layout Flexbox allineando l'input di resto e il pulsante di ricerca-->
                <!--role="search"   fornisce contesto semantico per le tecnologie assistive--> 
                    <!--costruiamo la tendina per selezionare la categoria di ricerca, collegata a tipoRicerca-->
                    <select class="form-select me-2 w-auto bg-dark text-white border-secondary" v-model="tipoRicerca" @change="cercaLive"> <!-- v model permette di fare un collegamento a doppio senso, ovvero collega in tempo reale la scelta dell'utente ad una variabile javaScript detta tipoRicerca, se l'utente clicca su squadre, giocatori, ...la variabile si aggiorna all istante-->
                        <option value="tutto">Tutto</option>
                        <option value="squadre">Squadre</option>
                        <option value="giocatori">Giocatori </option>
                        <option value="competizioni">Competizioni</option>
                        <option value="notizie">Notizie</option>
                    </select>

                    <div class="position-relative w-100">
                        <input class="form-control me-2 w-100" type="search" placeholder="Cerca..." aria-label="Search" v-model="testoRicerca" @input="cercaLive" required autocomplete="off">
                        <ul v-if="suggerimenti && (suggerimenti.squadre.length>0 || suggerimenti.giocatori.length>0)" class="dropdown-menu show position-absolute w-100 mt-1 shadow-lg" style="z-index: 1050; max-height: 300px; overflow-y: auto;">
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
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <a class="dropdown-item text-center text-muted small" href="#" @click.prevent="eseguiRicerca">Vedi tutti i risultati...</a>
                            </li>
                        </ul>
                    </div>


                    <!--il type=search dice al browser che questo non è un campo di testo normale, ma una ricerca apparirà duqneu sullo tastiera dello smartphone una lente d'ingrandimento -->
                    <!-- placeholder= cerca-> testo fantasma che suggerisce all'utente cosa fare prima che inizi a scrivere-->
                    <!--v-model=testoRicerca, come per la tendina ogni singola lettera che l'utente digita viene salvata istantaneamente-->
                    <!-- required -> se l'utente lascia il campo vuoto, il browser lo bloccherà e apparira in un fumetto rosso con scritto compila questo campo-->
                    <button class="btn btn-outline-success ms-2" type="submit">Cerca</button>
                </form>

                <!-- IMPORTAZIONE (Tema) e PROFILO -->
                 <div class="d-flex align-items-center">
                    <button class="btn btn-secondary me-3" title="Cambia Tema">☀️/🌙</button>

                    <!-- Gestione Profilo tramite approccio Vue.js NATIVO-->
                    <div class="nav-item dropdown">
                        <button class="nav-link dropdown-toggle text-white border-0 bg-transparent" type="button" @click="toggleDropdown"> <!-- (ultimo) event listener sul click, richiamando la funzione che cambia lo stato del menu a tendina-->
                            <span v-if="utenteLoggato">                                         <!-- parte aggiunta successivamente  ----- FASE 5 -----   -->
                                👤 Ciao, {{ utenteLoggato.username }}
                                <span v-if="utenteLoggato.ruolo === 'premium'">⭐</span>  <!--se l'utente si è loggato aggiungo un messaggio e se è ache premium aggiungo la stellina-->
                            </span>
                            <span v-else>👤 Profilo</span>                                      <!-- fine modifica fase 5-->
                        </button>

                        <ul class="dropdown-menu dropdown-menu-end" :class="{ 'show': isDropdownOpen }"> <!-- ("Menu ancora a destra") Non fa fuoriuscire il menu a tendina dallo schermo a dx, provando uno scorrimento laterale della pagina -->
                                                                    <!--Permerro al Virtual DOM di Vue a Far mostrare il popup tramite la classe CSS show, questo solo se la variabile isDr... è true-->
                            <!--SE NON LOGGATO: Aprire il popup-->  
                            <template v-if="!utenteLoggato">            <!-- ----- FASE 5 ----- -->
                                <li>
                                    <a class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#authModal" @click="isLoginMode = true; isDropdownOpen = false"> <!-- data-bs-... tutti e due servono per delegare JS per l'apertura della finestra modale-->
                                        Accedi / Registrati                 <!-- @click... è un event listening che forza lo stato true alla variabile e fa aprire il modale con il form di Login e con "=false" fa chiudere poi il menu a tendina prima di aprire il popup-->
                                    </a>
                                </li>
                            </template>

                            <!--SE LOGGATO: Mostrare il menu utente-->
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

    <!--    ---- FASE 5 ----    -->
    <!-- POPUP (modal) LOGIN / REGISTRAZIONE-->
    <div class="modal fade" id="authModal" tabindex="-1" aria-labelledby="authModalLabel" aria-hidden="true"> 
        <!-- modal fade: definisce il contenitore e applica una transizione CSS per l'apparizione graduale-->
         <!--tabIndex e aria...: Attributi di accessibilità per screen reader e navigazione da tastiera, rimuovendo il div dal flusso del tasto Tab-->
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content shadow-lg border-0">

                <!-- Header (Dinamico) del Popup-->
                <div class="modal-header text-white" :class="isLoginMode ? 'bg-success' : 'bg-primary'">
                <!--Permette a Vue di valutare l'espress. JS e utilizza un operat. ternario per applicare la classe di background verde per login e blu per registr.-->
                    <h5 class="modal-title fw-bold" id="authModalLabel">
                        {{ isLoginMode ? 'Bentornato su TOPKICK' : 'Crea un nuovo account' }}       <!--Varia dinamicamente anche il testo del titolo-->
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>

                <!-- Body del Popup-->
                <div class="modal-body p-4">

                    <!-- GESTIONE ERRORI: Alert Reattivo-->
                    <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show" role="alert"> <!--se la stringa è vuota, l'avviso non viene montato nel DOM-->
                    <!-- alert-danger   classe bootstrap per creare un riquadro rosso ad alta visibilità semantica-->    
                        <strong>Attenzione!</strong> {{ errorMessage }}
                        <button type="button" class="btn-close" @click="errorMessage = ''" aria-label="Close"></button>
                        <!-- @click...  assegna al tastino "X" la funzione di svuotare la variabile, nascondendo l'avviso di errore, senza ricarca la pag.-->
                    </div>

                    <!-- Form di Login-->
                    <form v-if="isLoginMode" @submit.prevent="handleLogin">  <!--Intercetta l'evento di invio del form. Il .preventi blocca il comportamento predefinito del browser (ricaricamento della pag.) ed esegue la funzione-->
                        <div class="mb-3">
                            <label class="form-label fw-semibold">Email</label>
                            <input type="email" class="form-control" v-model="loginEmail" required> <!--Con v-model si crea il collegamento bidirezionale già spiegato, dove l'utente aggiorna istantaneamente la variabile-->
                        </div>
                        <div class="mb-4">
                            <label class="form-label fw-semibold">Password</label>
                            <input type="password" class="form-control" v-model="loginPassword" required>
                        </div>
                        <button type="submit" class="btn btn-success w-100 fw-bold">Accedi</button>
                    </form>

                    <!-- Form di Registrazione-->
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

                <!-- Footer del Popup (Switch tra Reg e Login (Commutazione della vista)) -->
                 <div class="modal-footer justify-content-center bg-light">
                    <p class="mb-0" v-if="isLoginMode">
                        Non hai un account?
                        <a href="#" class="text-primary fw-bold text-decoration-none" @click.prevent="isLoginMode = false"> 
                        <!--Il click sul link modifica la var. di stato, facendo switchare i colori e testi del popup (tramite la rivalutazione dei v-if)-->
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
    /* Stile sfocato quando si apre il popup      ---- FASE 5 ---- */
    .modal-backdrop {
        backdrop-filter: blur(5px);
        background-color: rgba(0, 0, 0, 0.6);
    }
    .modal-backdrop.show {
        opacity: 1;
    }
</style>