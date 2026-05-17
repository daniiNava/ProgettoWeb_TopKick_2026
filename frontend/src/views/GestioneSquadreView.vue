<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router';           // Qui, a diff. di MieCompetizioni, importo anche UseRoute
import { showToast } from '@/utils/toastStore';

const route = useRoute()                                    // Contiene le informazioni sull'URL ATTUALE
const router = useRouter()

// Estrazione dell'ID della competizione dall'URL
const idCompetizione = route.params.id 

const competizione = ref(null)
const squadre = ref([])
const caricamento = ref(true)
const errorMessage = ref('')

const nuovoNome = ref('')
const nuovoLogoFile = ref(null)
const fileInputRef = ref(null)

// Funzione triggerata dall'evento @change sull'input file
const handleFileChange = (event) => {
    nuovoLogoFile.value = event.target.files[0]
}

const fetchDati = async () => {
    try {
        // Prendo le squadre della competizione con ID che ho recuperato dall'URL
        const response = await fetch(`/api/mie-competizioni/${idCompetizione}/squadre`)

        // Controllo (se il server ci respinge, errore)
        if (response.status === 401 || response.status === 403) {
            showToast("Accesso negato. Devi essere un utente Premium.", 'danger');
            router.push('/');
            return;
        }

        if (response.ok) {
            const data = await response.json()
            competizione.value = data.competizione
            squadre.value = data.squadre
        }
    } catch (error){
        console.error("Errore fetch squadre:", error)
    } finally {
        caricamento.value = false
    }
}

const aggiungiSquadra = async () => {           // Anche qui uso Form Data (per l'inserimento del logo della squadra)
    try {
    
        const formData = new FormData()
        
        // Aggiunta nome squadra e logo
        formData.append('nome', nuovoNome.value)

        if(nuovoLogoFile.value){
            formData.append('logo', nuovoLogoFile.value)
        }

        const response = await fetch(`/api/mie-competizioni/${idCompetizione}/squadre`, {
            method: 'POST', 
            body: formData 
        })

        const data = await response.json()

        if(response.ok){
            // Aggiunta della squadra in cima all'array reattivo (aggiornamento tramite reattività Vue)
            squadre.value.unshift(data.squadra)
            
            // Reset form
            nuovoNome.value = ''
            nuovoLogoFile.value = null
            // Svuoto fisicamente l'input file
            if(fileInputRef.value) fileInputRef.value.value = ''

            errorMessage.value = ''
            showToast("Squadra aggiunta!", "success")
        } else {
            errorMessage.value = data.error
        }
    } catch (error){
        errorMessage.value = "Errore di connessione al server" 
    }
}

// LOGICA PER L'ELIMINAZIONE (ora la funzione viene richiamata dall'elemento Vue Confirmation Modal)

// Variabile reattiva di stato per memorizzare temporaneamente l'ID (della squadra che l'utente vuole eliminare)
const idSquadraDaEliminare = ref(null)

// Funzione preparatoria (innescata dal click sul cestino)
const preparaEliminazione = (id) => {
    idSquadraDaEliminare.value = id;
}

// Funzione esecutiva
const eseguiEliminazione = async () => {
    const id = idSquadraDaEliminare.value;
    if(!id) return; // Controllo di sicurezza

    try {
        const response = await fetch(`/api/squadre/${id}`, { method: 'DELETE' })

        if(response.ok) {
            // Aggiornamento reattivo DOM
            squadre.value = squadre.value.filter(c => c.id !== id)            // Tengo tutte le squadre tranne quella eliminata
            showToast("Squadra eliminata con successo", "info")
        } else {
            showToast("Errore durante l'eliminazione della squadra", 'danger')
        }
    } catch (error) {
        console.error("Errore di connessione al server: ", error)
    } finally {
        // Pulizia dello stato temporaneo (a prescindere dall'esito)
        idSquadraDaEliminare.value = null;
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

        <div v-else-if="competizione">
            <div class="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2 border-dark">
                <div>
                    <!-- Sezione per tornare indietro (MieCompetizioni)-->
                    <RouterLink to="/mie-competizioni" class="btn btn-sm btn-outline-secondary mb-2">
                        <div class="my-1 text-center d-flex"> 
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-arrow-left-circle-fill text-primary mt-0 mb-0 me-2" viewBox="0 0 16 16">
                                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0m3.5 7.5a.5.5 0 0 1 0 1H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5z"/>
                            </svg>
                            Torna indietro
                        </div>
                    </RouterLink>
                    <h1 class="fw-semibold"><label class="text-primary fw-bold">{{ competizione.nome }}</label>: Squadre</h1>
                    <p class="text-muted mb-0">
                        Squadre iscritte: <strong><span class="text-primary">{{ squadre.length }}</span> / {{ competizione.numero_squadre }}</strong>
                    </p>
                </div>
            </div>

            <!-- Colonna sx: Form di creazione-->
            <div class="row g-4">   <!--Occupa 1/3 della larghezza il form-->
                <div class="col-lg-4">
                    <div class="card shadow-sm border-primary">
                        <div class="card-header bg-primary text-white fw-bold">
                            <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" fill="currentColor" class="bi bi-plus mb-1" viewBox="0 0 16 16">
                                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
                            </svg> Aggiungi Squadra
                        </div>
                        <div class="card-body">
                            <div v-if="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>
                            
                            <div v-if="squadre.length >= competizione.numero_squadre" class="alert alert-warning">
                                Hai raggiunto il limite di squadre che si possono aggiungere a questa competizione.
                            </div>

                            <form v-else @submit.prevent="aggiungiSquadra" enctype="multipart/form-data">
                                <div class="mb-3">
                                    <label class="form-label fw-semibold">
                                        Nome Squadra 
                                        <span class="text-danger">*</span>
                                    </label>
                                    <input type="text" class="form-control" v-model="nuovoNome" required placeholder="Es. Barcellona">
                                </div>
                                
                                <div class="mb-4">
                                    <label class="form-label fw-semibold">Logo della Squadra (Opzionale)</label>
                                    <input type="file" ref="fileInputRef" id="fileInputLogo" class="form-control" accept="image/*" @change="handleFileChange">
                                    <div class="form-text">Formati accettati: jpg, png, webp</div>
                                </div>
                                <button type="submit" class="btn btn-success w-100 fw-bold">Aggiungi Squadra</button>
                            </form>
                        </div>
                    </div>
                </div>

                <!-- Colonna dx: Lista Squadre-->
                <div class="col-lg-8">
                    <div v-if="squadre.length === 0" class="alert alert-info text-center">
                        Nessuna squadra iscritta a questa competizione. Aggiungi la prima!
                    </div>

                    <div v-else class="row g-3">
                        <div v-for="squadra in squadre" :key="squadra.id" class="col-md-6">
                            <div class="card h-100 shadow-sm border-0 bg-light hover-card">
                                <div class="card-body d-flex flex-column">
                                    <div class="d-flex align-items-center mb-3">
                                        <img :src="squadra.logo_url || 'https://via.placeholder.com/50'" class="rounded-circle me-3 shadow-sm" style="width: 50px; height: 50px; object-fit: cover; background: white;">
                                        <h4 class="card-title fw-bold mb-0">{{ squadra.nome }}</h4>
                                    </div>

                                    <div class="mt-auto d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
                                        <RouterLink :to="`/squadre/${squadra.id}/giocatori`" class="btn btn-dark btn-sm fw-bold">
                                            Gestisci Giocatori
                                        </RouterLink>
                                        <button @click="preparaEliminazione(squadra.id)" class="btn btn-outline-danger btn-sm align-self-end align-self-sm-auto" title="Elimina" data-bs-toggle="modal" data-bs-target="#deleteSquadraModal">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3" viewBox="0 0 16 16">
                                                <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!--Modale (Conferma eliminazione della SQUADRA)-->
    <div class="modal fade" id="deleteSquadraModal" tabindex="-1" aria-labelledby="deleteSquadraModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg rounded-4">
                <!--Header del modal-->
                <div class="modal-header bg-danger text-white border-0 rounded-top-4">
                    <h5 class="modal-title fw-bold" id="deleteSquadraModalLabel">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-exclamation-triangle-fill me-2 mb-2" viewBox="0 0 16 16">
                            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                        </svg>
                        Conferma Eliminazione
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close" @click="idSquadraDaEliminare = null"></button>
                </div>

                <!--Body del modal-->
                <div class="modal-body py-4 text-center">
                    <h4 class="fw-bold text-dark mb-3">
                        Sei sicuro di voler procedere?
                    </h4>
                    <p class="text-muted">
                        L'eliminazione di questa squadra comporterà la rimozione a cascata di tutti i <strong>giocatori</strong> ad essa associati e delle <strong>partite</strong> in cui è coinvolta.
                    </p>
                    <br>
                    <div class="alert alert-warning py-2 mb-0 mt-3" role="alert">
                        Questa operazione è irreversibile.
                    </div>
                </div>

                <div class="modal-footer border-0 justify-content-center bg-light rounded-bottom-4">
                    <button type="button" class="btn btn-secondary px-4 fw-bold" data-bs-dismiss="modal" @click="idSquadraDaEliminare = null">
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