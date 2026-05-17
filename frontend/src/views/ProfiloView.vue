<script setup>
import { showToast } from '@/utils/toastStore';
import { ref, onMounted } from 'vue' 
import { useRouter } from 'vue-router'; 
import { Modal } from 'bootstrap';                                      // Importazione per manipolare le modali di Bootstrap via JS

const router = useRouter()
const utente = ref(null)                                                // (ref=) Variabile reattiva: var. che quando cambia fa ricaricare il componente mostrando il nuovo valore di quella var.
const caricamento = ref(true)

// Variabili per la simulazione del pagamento
const isProcessingPayment = ref(false)                                  // Stato del processo
const fakeCardNome = ref('')                                            // Variabili che conterrano i dati del form
const fakeCardNumero = ref('')
const fakeCardScadenza = ref('')
const fakeCardCvv = ref('')

// Recupero i dati dell'utente loggato
const fetchProfilo = async () => {
    try {
        const response = await fetch('/api/me')                         // Chiamata API per controllare se c'è una sessione

        if(response.ok){
            utente.value = await response.json()                        // Popolamento dell'interfaccia
        } else {
            // Se il server risponde 401, la sessione è scaduta o inesistente
            showToast("Devi effettuare l'accesso per vedere questa pagina.", 'danger')
            router.push('/')                                            // Reinderizzamento alla Homepage se non loggato
        }
    } catch(error) {
        console.error("Errore nel caricamento del profilo:", error)
        router.push('/')
    } finally {
        caricamento.value = false;                                      // In ogni caso viene nascosto lo spinner
    }
}

// Funzione che simula il pagamento ed effettua l'Upgrade
const simulaPagamento = async () => {
    // 1. Viene mostrato (lo spinner) il caricamento (della fittizia transazione da una banca all'altra) nel bottone
    isProcessingPayment.value = true;
    setTimeout(async () => {
        try {
            // 2. Chiamata API per aggiornare il DB e la Sessione (backend/routes/auths)
            const response = await fetch('/api/upgrade', { method: 'POST' })
            const data = await response.json();

            if (response.ok) {
                // 3. Aggiornamento dell'interfaccia (UI) istantaneamente
                utente.value.ruolo = 'premium';

                // 4. Chiusura modale programmaticamente
                const modalElement = document.getElementById('paymentModal');       // Prendo l'elemento
                const modalInstance = Modal.getInstance(modalElement);              // Prendo l'istanza dell'elemento
                if (modalInstance) modalInstance.hide();                            // Chiusura

                // 5. Lancia un evento GLOBALE (con payload) per avvisare la Navbar di aggiornarsi (checkSession())
                const updateEvent = new CustomEvent('session-updated', { 
                    detail: { nuovoRuolo: 'premium' } 
                });
                window.dispatchEvent(updateEvent);

                // Pulizia DOM (come fatto nella Navbar per il popup)
                document.body.classList.remove('modal-open');                       // Viene ripristinato il blocco di scorrere la pagina
                document.body.style.overflow = '';                                  // Assicura ulteriormente lo sblocco dello scorrimento
                document.body.style.paddingRight = '';                              // Viene calcolato un padding a dx di spazio che prima veniva occupato dalla barra di scorrimento laterale del browser, per lasciare la pagina ferma e non farla spostare a dx
                const backdrops = document.querySelectorAll('.modal-backdrop');     // Mi prendo tutti i contenitori che danno l'effetto di trasparenza (i nodi che soddisfano la condizione)
                backdrops.forEach(b => b.remove());                                 // Itera sulla NodeList rimuovendo i tag HTML individuati

                // 6. Toast di successo
                showToast("Pagamento confermato! Benvenuto nel Piano Premium ⭐", "success");
            } else {
                showToast(data.error, "danger");
            }
        } catch (error) {
            showToast("Errore di connessione durante il pagamento", "danger");
        } finally {
            // Finito il processo, rimozione del caricamento
            isProcessingPayment.value = false;
        }
    }, 1500);       // 1.5 secondi
}

onMounted(() => {
    fetchProfilo()                                                                  // Appena la pagina viene caricata, scarico i dati
})
</script>

<template>
    <div class="container py-5">                                                            <!--margine verticale massimo-->
        <div class="row justify-content-center">                                            <!--row: riga che funge da contenitore | allinea i figli al centro esatto dell'asse principale orizz-->
            <div class="col-md-8">                                                          <!--8/12 colonne riempite (66%)-->

                <!--Rotellina di caricamento-->
                <div v-if="caricamento" class="text-center">
                    <div class="spinner-border text-success" role="status"></div>
                    <p class="mt-2">Caricamento profilo...</p>
                </div>

                <!--UI nel caso in cui utente sia true (ovvero se l'utente è loggato)-->
                <div v-else-if="utente" class="card shadow border-0 rounded-4">
                    <div class="card-header bg-dark text-white text-center py-4 rounded-top-4">
                        <h2 class="mb-0">
                            <!--Icona del profilo-->
                            <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" fill="currentColor" class="bi bi-person me-2 mb-2" viewBox="0 0 16 16">
                                <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/>
                            </svg> Profilo di {{ utente.username }}
                            <span v-if="utente.ruolo === 'premium'" title="Utente Premium">
                            <!--Icona stellina Premium-->
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-star-fill text-warning ms-2 mb-2" viewBox="0 0 16 16"><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
                                </svg>
                            </span>
                        </h2>
                    </div>

                    <!--Body della pagina-->
                    <div class="card-body p-5">
                        <div class="row mb-4">
                            <div class="col-sm-4 fw-bold text-muted">Email:</div>
                            <div class="col-sm-8 fs-5">{{ utente.email }}</div>
                        </div>

                        <div class="row mb-4">
                            <div class="col-sm-4 fw-bold text-muted">Ruolo:</div>
                            <div class="col-sm-8 fs-5">
                                <span v-if="utente.ruolo === 'premium'" class="badge bg-warning text-dark fs-5 pt-1">Premium</span>
                                <span v-else class="badge bg-secondary fs-5">Utente Base</span>
                            </div>
                        </div>

                        <hr class="my-4">

                        <!-- Sezione Upgrade (solo per utenti base) -->
                        <div v-if="utente.ruolo === 'base'" class="text-center bg-light p-4 rounded-3 border border-warning shadow-sm">
                            <h4 class="text-warning fw-bold">
                                Passa a Premium! <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-star-fill text-warning ms-2 mb-2" viewBox="0 0 16 16"><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
                                </svg>
                            </h4>
                            <p class="mb-4">
                                Diventa un utente premium e sblocca il pieno potenziale di TOPKICK. Crea le tue competizioni, gestisci le tue squadre, aggiungi giocatori e aggiorna i risultati in tempo reale!
                            </p>
                            <!--Bottone che apre il Modal di Pagamento-->
                            <button class="btn btn-warning btn-lg fw-bold text-dark px-6 rounded-pill shadow-sm" data-bs-toggle="modal" data-bs-target="#paymentModal">
                                Fai l'Upgrade a soli 2.99€/mese
                            </button>
                        </div>

                        <!-- Sezione Gestione (solo per utenti premium) -->
                        <div v-if="utente.ruolo === 'premium'" class="text-center bg-light p-4 rounded-3 border border-primary">
                            <h4 class="text-primary fw-bold">Area Gestione</h4>
                            <p >Sei un Utente Premium! Hai accesso all'area di gestione delle tue competizioni.</p>
                            <RouterLink to="/mie-competizioni" class="btn btn-success fw-bold fs-6">Vai a "Le mie Competizioni"</RouterLink>
                        </div>

                    </div>
                </div>

            </div>
        </div>

        <!--MODAL MOCK (Simulatore Pagamento)-->
        <div class="modal fade" id="paymentModal" tabindex="-1" aria-labelledby="paymentModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg rounded-4">

                    <div class="modal-header bg-primary text-white border-0 rounded-top-4">
                        <h5 class="modal-title fw-bold" id="paymentModalLabel">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-credit-card-fill ms-1 me-3 mb-2" viewBox="0 0 16 16">
                                <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1H0zm0 3v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7zm3 2h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1"/>
                            </svg>
                            Checkout Sicuro
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close" :disabled="isProcessingPayment"></button>
                    </div>
                    <div class="modal-body py-4">
                        <div class="text-center mb-4">
                            <h3 class="fw-bold text-dark">Abbonamento Premium</h3>
                            <h2 class="text-primary fw-black">
                                2.99 €
                                <span class="fs-6 text-muted fw-normal">
                                    / mese
                                </span>
                            </h2>
                        </div>

                        <!-- Form dove inserire la finta carta di Credito-->
                         <form  @submit.prevent="simulaPagamento">
                            <div class="mb-3">
                                <label class="form-label fw-semibold small text-muted">Titolare Carta</label>
                                <input type="text" class="form-control" v-model="fakeCardNome" placeholder="Daniele Nava" required :disabled="isProcessingPayment">
                            </div>

                            <div class="mb-3">
                                <label class="form-label fw-semibold small text-muted">Numero Carta</label>
                                <div class="input-group">
                                    <span class="input-group-text bg-light">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-credit-card-fill" viewBox="0 0 16 16">
                                            <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1H0zm0 3v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7zm3 2h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1"/>
                                        </svg>
                                    </span>
                                    <input type="text" class="form-control" v-model="fakeCardNumero" placeholder="0000 0000 0000 0000" required maxlength="19" :disabled="isProcessingPayment">
                                </div>
                            </div>

                            <div class="row mb-4">
                                <!--Divido le colonne per due label-->
                                <div class="col-6"> 
                                    <label class="form-label fw-semibold small text-muted">Scadenza Carta</label>
                                    <input type="text" class="form-control" v-model="fakeCardScadenza" placeholder="MM/AA" required maxlength="5" :disabled="isProcessingPayment">
                                </div>
                                <div class="col-6">
                                    <label class="form-label fw-semibold small text-muted">CVV</label>
                                    <input type="text" class="form-control" v-model="fakeCardCvv" placeholder="123" required maxlength="3" :disabled="isProcessingPayment">
                                </div>
                            </div>

                            <button type="submit" class="btn btn-warning w-100 fw-bold py-2 fs-5 text-dark" :disabled="isProcessingPayment">
                                <span v-if="!isProcessingPayment">Paga e Attiva Premium</span>
                                <span v-else>
                                    <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Elaborazione in corso...
                                </span>
                            </button>
                         </form>

                         <div class="text-center mt-3">
                            <small class="text-muted">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-lock-fill ms-1 me-2 mb-1" viewBox="0 0 16 16">
                                    <path fill-rule="evenodd" d="M8 0a4 4 0 0 1 4 4v2.05a2.5 2.5 0 0 1 2 2.45v5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 13.5v-5a2.5 2.5 0 0 1 2-2.45V4a4 4 0 0 1 4-4m0 1a3 3 0 0 0-3 3v2h6V4a3 3 0 0 0-3-3"/>
                                </svg> 
                                Pagamento simulato per fini didattici.
                            </small>
                         </div>
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>