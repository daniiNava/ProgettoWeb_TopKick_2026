<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router';
import { showToast } from '@/utils/toastStore';

const route = useRoute()            // Prendo i dati che mi servono direttamente dall'URL
const router = useRouter()

const idSquadra = route.params.id 

const squadra = ref(null)
const giocatori = ref([])
const caricamento = ref(true)
const errorMessage = ref('')

// Regole per la composizione della rosa
const LIMITI = {
    'Portiere': 3,
    'Difensore': 6,
    'Centrocampista': 6,
    'Attaccante': 4,
}

const nuovoNome = ref('')
const nuovoRuolo = ref('')
const nuovaDataNascita = ref('')
const nuovoPiede = ref('')

const fetchDati = async () => {
    try {
        // Prendo i giocatori della squadra presa tramite id dell'URL
        const response = await fetch(`/api/squadre/${idSquadra}/giocatori`)

        // Controllo tramite server (se ci respinge, errore)
        if (response.status === 401 || response.status === 403) {
            showToast("Accesso negato. Devi essere un utente Premium.", 'danger');
            router.push('/');
            return;
        }
        if (response.ok) {
            const data = await response.json()
            squadra.value = data.squadra
            giocatori.value = data.giocatori
        }
    } catch (error){
        console.error("Errore fetch giocatori:", error)
    } finally {
        caricamento.value = false
    }
}

// Raggruppo i giocatori per stamparli divisi per ruolo
const giocatoriPerRuolo = computed(() => {
    const gruppi = { 'Portiere': [], 'Difensore': [], 'Centrocampista': [], 'Attaccante': [] }
    giocatori.value.forEach(g => {
        if(gruppi[g.ruolo]) gruppi[g.ruolo].push(g)
    })
    return gruppi
});

// Conto quanti giocatori ci sono per ruolo per disabilitare la select se si supera il limite
const conteggioRuoli = computed(() => {
    const conteggio = { 'Portiere': 0, 'Difensore': 0, 'Centrocampista': 0, 'Attaccante': 0 }
    giocatori.value.forEach(g => {
        if(conteggio[g.ruolo] !== undefined) conteggio[g.ruolo]++ 
    })
    return conteggio
})

const aggiungiGiocatore = async () => {
    try {
        // Aggiunta diversa (a diff. di Competizione e Squadra dove serviva il form-data)
        // Qui l'inserimento (di sole stringhe) è supportato da JSON
        const response = await fetch(`/api/squadre/${idSquadra}/giocatori`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({
                nome_cognome: nuovoNome.value,
                ruolo: nuovoRuolo.value,
                data_nascita: nuovaDataNascita.value,
                piede_preferito: nuovoPiede.value
            })
        })

        const data = await response.json()

        if(response.ok){
            // Aggiunta del giocatore
            giocatori.value.push(data.giocatore)
            
            // Reset form
            nuovoNome.value = ''
            nuovoRuolo.value = ''
            nuovaDataNascita.value = ''
            nuovoPiede.value = ''
            errorMessage.value = ''
            
            showToast("Giocatore ingaggiato!", "success")
        } else {
            errorMessage.value = data.error
        }

    } catch (error){
        console.error("Errore inserimento giocatore: ", error)
        errorMessage.value = "Errore di connessione al server"  
    }
}

// LOGICA PER L'ELIMINAZIONE (ora la funzione viene richiamata dall'elemento Vue Confirmation Modal)

// Variabile reattiva di stato per memorizzare temporaneamente l'ID (del giocatore che l'utente vuole eliminare)
const idGiocatoreDaEliminare = ref(null)

// Funzione preparatoria (innescata dal click sul cestino)
const preparaEliminazione = (id) => {
    idGiocatoreDaEliminare.value = id;
}

// Funzione esecutiva
const eseguiEliminazione = async () => {
    const id = idGiocatoreDaEliminare.value;
    if(!id) return; // Controllo di sicurezza

    try {
        const response = await fetch(`/api/giocatori/${id}`, { method: 'DELETE' })

        if(response.ok) {
            // Aggiornamento reattivo DOM
            giocatori.value = giocatori.value.filter(c => c.id !== id)            // Tengo tutti i giocatori tranne quello eliminato
            showToast("Giocatore eliminato con successo", "info")
        } else {
            showToast("Errore durante lo svincolo", 'danger')
        }
    } catch (error) {
        console.error("Errore di connessione al server: ", error)
    } finally {
        // Pulizia dello stato temporaneo (a prescindere dall'esito)
        idGiocatoreDaEliminare.value = null;
    }
}

onMounted(() => {
    fetchDati()
})
</script>


<template>
    <div class="container py-5">

        <div v-if="caricamento" class="text-center mt-5">
            <div class="spinner-border text-primary" role="status"></div>
        </div>

        <div v-else-if="squadra">
            <div class="mb-4 border-bottom pb-3 border-dark">
                <div class="mb=3">
                    <!-- Sezione per tornare indietro (MieCompetizioni)-->
                    <RouterLink :to="`/mie-competizioni/${squadra.id_competizione}/squadre`" class="btn btn-sm btn-outline-secondary mb-2">
                        <div class="my-1 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-arrow-left-circle-fill text-primary mt-0 mb-0 me-2" viewBox="0 0 16 16">
                                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0m3.5 7.5a.5.5 0 0 1 0 1H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5z"/>
                            </svg> Torna alle Squadre
                        </div>
                    </RouterLink>
                </div>
                
                <div class="d-flex align-items-center">
                    <img :src="squadra.logo_url || 'https://via.placeholder.com/80'" class="rounded-circle me-4 shadow my-2" style="width: 80px; height: 80px; object-fit: cover; background: white;">
                    <div>
                        <h1 class="fw-semibold">
                            <span class="text-primary fw-bold">Gestione Rosa</span>:  {{ squadra.nome }}
                        </h1>
                        <p class="text-muted mb-0">
                            Totale giocatori: <strong>{{ giocatori.length }} / 19</strong>
                        </p>
                    </div>
                </div>
            </div>

            <div class="row g-4">
                <div class="col-lg-4">
                    <div class="card shadow-sm border-dark sticky-top" style="top: 100px; z-index: 1;"> 
                        <div class="card-header bg-dark text-white fw-bold">
                            <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" fill="currentColor" class="bi bi-plus mb-1" viewBox="0 0 16 16">
                                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
                            </svg> Ingaggia un nuovo Giocatore
                        </div>
                        <div class="card-body">
                            <div v-if="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>

                            <form v-else @submit.prevent="aggiungiGiocatore">
                                <div class="mb-3">
                                    <label class="form-label fw-semibold">
                                        Nome e Cognome 
                                        <span class="text-danger">*</span>
                                    </label>
                                    <input type="text" class="form-control" v-model="nuovoNome" required placeholder="Es. Paulo Dybala">
                                </div>

                                <div class="mb-3">
                                    <label class="form-label fw-semibold">
                                        Ruolo 
                                        <span class="text-danger">*</span>
                                    </label>
                                    <select class="form-select" v-model="nuovoRuolo" required>
                                        <option value="" disabled>Seleziona il ruolo</option>
                                        <option value="Portiere" :disabled="conteggioRuoli['Portiere'] >= LIMITI['Portiere']">
                                            Portiere ({{ conteggioRuoli['Portiere'] }}/{{ LIMITI['Portiere'] }})
                                        </option>
                                        <option value="Difensore" :disabled="conteggioRuoli['Difensore'] >= LIMITI['Difensore']">
                                            Difensore ({{ conteggioRuoli['Difensore'] }}/{{ LIMITI['Difensore'] }})
                                        </option>
                                        <option value="Centrocampista" :disabled="conteggioRuoli['Centrocampista'] >= LIMITI['Centrocampista']">
                                            Centrocampista ({{ conteggioRuoli['Centrocampista'] }}/{{ LIMITI['Centrocampista'] }})
                                        </option>
                                        <option value="Attaccante" :disabled="conteggioRuoli['Attaccante'] >= LIMITI['Attaccante']">
                                            Attaccante ({{ conteggioRuoli['Attaccante'] }}/{{ LIMITI['Attaccante'] }})
                                        </option>
                                    </select>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label fw-semibold">Data di Nascita</label>
                                    <input type="date" class="form-control" v-model="nuovaDataNascita">
                                </div>
                                
                                <div class="mb-4">
                                    <label class="form-label fw-semibold">Piede Preferito</label>
                                    <select class="form-select" v-model="nuovoPiede">
                                        <option value="">Non specificato</option>
                                        <option value="Destro">Destro</option>
                                        <option value="Sinistro">Sinistro</option>
                                        <option value="Ambidestro">Ambidestro</option>
                                    </select>
                                </div>

                                <button type="submit" class="btn btn-success w-100 fw-bold" :disabled="giocatori.length >= 19">
                                    Ingaggia
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="col-lg-8">
                    <div v-if="giocatori.length === 0" class="alert alert-info text-center">
                        La rosa è vuota. Inizia ad acquistare giocatori!
                    </div>

                    <div v-else>
                        <div v-for="(lista, ruolo) in giocatoriPerRuolo" :key="ruolo" class="mb-4">
                            <h4 class="border-bottom pb-2" :class="{
                                'text-warning': ruolo === 'Portiere',
                                'text-success': ruolo === 'Difensore',
                                'text-primary': ruolo === 'Centrocampista',
                                'text-danger': ruolo === 'Attaccante',
                            }">
                                {{ ruolo }} ({{ lista.length }}/{{ LIMITI[ruolo] }})
                            </h4>

                            <ul class="list-group shadow-sm">
                                <li v-if="lista.length === 0" class="list-group-item text-muted fst-italic">
                                    Nessun giocatore in questo ruolo.
                                </li>
                                <li v-for="giocatore in lista" :key="giocatore.id" class="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 py-3">
                                    <div style="min-width: 0;">
                                        <span class="fs-5 fw-semibold d-block text-truncate">{{ giocatore.nome_cognome }}</span>
                                        <small class="text-muted d-block mt-1">
                                            <span v-if="giocatore.data_nascita">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-cake2-fill mb-1" viewBox="0 0 16 16">
                                                    <path d="m2.899.804.595-.792.598.79A.747.747 0 0 1 4 1.806v4.886q-.532-.09-1-.201V1.813a.747.747 0 0 1-.1-1.01ZM13 1.806v4.685a15 15 0 0 1-1 .201v-4.88a.747.747 0 0 1-.1-1.007l.595-.792.598.79A.746.746 0 0 1 13 1.806m-3 0a.746.746 0 0 0 .092-1.004l-.598-.79-.595.792A.747.747 0 0 0 9 1.813v5.17q.512-.02 1-.055zm-3 0v5.176q-.512-.018-1-.054V1.813a.747.747 0 0 1-.1-1.01l.595-.79.598.789A.747.747 0 0 1 7 1.806"/>
                                                    <path d="M4.5 6.988V4.226a23 23 0 0 1 1-.114V7.16c0 .131.101.24.232.25l.231.017q.498.037 1.02.055l.258.01a.25.25 0 0 0 .26-.25V4.003a29 29 0 0 1 1 0V7.24a.25.25 0 0 0 .258.25l.259-.009q.52-.018 1.019-.055l.231-.017a.25.25 0 0 0 .232-.25V4.112q.518.047 1 .114v2.762a.25.25 0 0 0 .292.246l.291-.049q.547-.091 1.033-.208l.192-.046a.25.25 0 0 0 .192-.243V4.621c.672.184 1.251.409 1.677.678.415.261.823.655.823 1.2V13.5c0 .546-.408.94-.823 1.201-.44.278-1.043.51-1.745.696-1.41.376-3.33.603-5.432.603s-4.022-.227-5.432-.603c-.702-.187-1.305-.418-1.745-.696C.408 14.44 0 14.046 0 13.5v-7c0-.546.408-.94.823-1.201.426-.269 1.005-.494 1.677-.678v2.067c0 .116.08.216.192.243l.192.046q.486.116 1.033.208l.292.05a.25.25 0 0 0 .291-.247M1 8.82v1.659a1.935 1.935 0 0 0 2.298.43.935.935 0 0 1 1.08.175l.348.349a2 2 0 0 0 2.615.185l.059-.044a1 1 0 0 1 1.2 0l.06.044a2 2 0 0 0 2.613-.185l.348-.348a.94.94 0 0 1 1.082-.175c.781.39 1.718.208 2.297-.426V8.833l-.68.907a.94.94 0 0 1-1.17.276 1.94 1.94 0 0 0-2.236.363l-.348.348a1 1 0 0 1-1.307.092l-.06-.044a2 2 0 0 0-2.399 0l-.06.044a1 1 0 0 1-1.306-.092l-.35-.35a1.935 1.935 0 0 0-2.233-.362.935.935 0 0 1-1.168-.277z"/>
                                            </svg> 
                                            {{ new Date(giocatore.data_nascita).toLocaleDateString('it-IT') }}</span>
                                            <span v-if="giocatore.piede_preferito" class="ms-3">👟 {{ giocatore.piede_preferito }}</span>
                                        </small>
                                    </div>
                                    <button @click="preparaEliminazione(giocatore.id)" class="btn btn-outline-danger btn-sm align-self-end align-self-sm-auto flex-shrink-0" title="Svincola" data-bs-toggle="modal" data-bs-target="#deleteGiocatoreModal">
                                        Svincola giocatore
                                    </button>
                                </li>
                            </ul>                        
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>

    <!--Modale (Conferma eliminazione del GIOCATORE)-->
    <div class="modal fade" id="deleteGiocatoreModal" tabindex="-1" aria-labelledby="deleteGiocatoreModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg rounded-4">
                <!--Header del modal-->
                <div class="modal-header bg-danger text-white border-0 rounded-top-4">
                    <h5 class="modal-title fw-bold" id="deleteGiocatoreModalLabel">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-exclamation-triangle-fill me-2 mb-2" viewBox="0 0 16 16">
                            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                        </svg>
                        Conferma Eliminazione
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close" @click="idGiocatoreDaEliminare = null"></button>
                </div>

                <!--Body del modal-->
                <div class="modal-body py-4 text-center">
                    <h4 class="fw-bold text-dark mb-3">
                        Sei sicuro di voler procedere?
                    </h4>
                    <p class="text-muted">
                        Svincolando questo giocatore, verrà rimosso definitivamente dalla rosa della squadra attuale e comporterà la rimozione a cascata di tutti i suoi <strong>dati</strong> 
                    </p>
                    <br>
                    <div class="alert alert-warning py-2 mb-0 mt-3" role="alert">
                        Questa operazione è irreversibile.
                    </div>
                </div>

                <div class="modal-footer border-0 justify-content-center bg-light rounded-bottom-4">
                    <button type="button" class="btn btn-secondary px-4 fw-bold" data-bs-dismiss="modal" @click="idGiocatoreDaEliminare = null">
                        Annulla
                    </button>
                    <button type="button" class="btn btn-danger px-4 fw-bold" data-bs-dismiss="modal" @click="eseguiEliminazione">
                        Elimina
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>