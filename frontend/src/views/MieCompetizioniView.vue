<script setup>
import { showToast } from '@/utils/toastStore'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const competizioni = ref([])                                                    // Array reattivo che conterrà i dati del DB
const caricamento = ref(true)
const errorMessage = ref('')

// Variabili reattive collegate agli input del form tramite v-model
const nuovoNome = ref('')
const nuovoLogoFile = ref(null)                                                 // Inizializzo a null (perche non conterrà una stringa ma un file)
const nuovoNumeroSquadre = ref(20)

// Ref per resettare l'input file dopo l'upload (riferimento diretto all'elemento HTML <input type="file"> nel DOM)
const fileInputRef = ref(null)

// Funzione triggerata dall'evento @change sull'input file
const handleFileChange = (event) => {
    nuovoLogoFile.value = event.target.files[0]                                 // Catturo il file fisico selezionato dall'utente
}

const fetchMieCompetizioni = async () => {
    try {
        const response = await fetch('/api/mie-competizioni')
        // Controllo ruolo utente lato frontend
        if(response.status === 401 || response.status === 403) {
            showToast("Accesso negato. Devi essere un utente Premium.", 'danger');
            router.push('/')
            return
        }
        if (response.ok) {
            competizioni.value = await response.json()
        }
    } catch (error){
        console.error("Errore fetch competizioni:", error)
    } finally {
        caricamento.value = false
    }
}

const creaCompetizione = async () => {
    try {
        // Usiamo FormData (invece che JSON.stringify) perché dobbiamo inviare un file binario (il logo)
        const formData = new FormData()

        // Inserimento primi due dati del form
        formData.append('nome', nuovoNome.value)
        formData.append('numero_squadre', nuovoNumeroSquadre.value)

        // Inserimento logo (binario)
        if(nuovoLogoFile.value){
            formData.append('logo', nuovoLogoFile.value)
        }

        const response = await fetch('/api/mie-competizioni', {
            method: 'POST', 
            body: formData      // Non bisogna specificare 'Content-type', il browser imposta in automatico 'multipart/form-data'
        })

        const data = await response.json()

        if(response.ok){
            // Aggiungo la nuova competizione in cima alla lista (all'array locale) (reattività di Vue: aggiornamento delle competizioni senza dover aggiornare la pagina)
            competizioni.value.unshift(data.competizione)
            
            // Reset form
            nuovoNome.value = ''
            nuovoLogoFile.value = null
            nuovoNumeroSquadre.value = 20
            
            // Svuoto fisicamente l'input file
            if(fileInputRef.value) fileInputRef.value.value = ''

            errorMessage.value = ''
            showToast("Competizione creata con successo!", "success")
        } else {
            errorMessage.value = data.error 
        }

    } catch (error){
        errorMessage.value = "Errore di connessione al server" 
    }
}

// LOGICA PER L'ELIMINAZIONE (ora la funzione viene richiamata dall'elemento Vue Confirmation Modal)

// Variabile reattiva di stato per memorizzare temporaneamente l'ID (della competizione che l'utente vuole eliminare)
const idCompetizioneDaEliminare = ref(null)

// Funzione preparatoria (innescata dal click sul cestino)
const preparaEliminazione = (id) => {
    idCompetizioneDaEliminare.value = id;
}

// Funzione esecutiva
const eseguiEliminazione = async () => {
    const id = idCompetizioneDaEliminare.value;
    if(!id) return; // Controllo di sicurezza

    try {
        const response = await fetch(`/api/mie-competizioni/${id}`, { method: 'DELETE' })

        if(response.ok) {
            // Aggiornamento reattivo DOM
            competizioni.value = competizioni.value.filter(c => c.id !== id)            // Tengo tutte le competizioni tranne quella eliminata
            showToast("Competizione eliminata con successo", "info")
        } else {
            showToast("Errore durante l'eliminazione della competizione", 'danger')
        }
    } catch (error) {
        console.error("Errore di connessione al server: ", error)
    } finally {
        // Pulizia dello stato temporaneo (a prescindere dall'esito)
        idCompetizioneDaEliminare.value = null;
    }
}

onMounted(() => {
    fetchMieCompetizioni()
})
</script>


<template>
    <div class="container py-5">
        <div class="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2 border-warning">
            <h1 class="fw-bold">
                <!--Stella-->
                <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" fill="currentColor" class="bi bi-star-fill text-warning mx-2 mb-4" viewBox="0 0 16 16">
                    <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
                </svg> Le Mie Competizioni
            </h1>
        </div>

        <div class="row g-4">

            <!-- Colonna sx: Form di creazione-->
            <div class="col-lg-4">
                <div class="card shadow-sm border-primary">
                    <div class="card-header bg-primary text-white fw-bold">
                        <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" fill="currentColor" class="bi bi-plus mb-1" viewBox="0 0 16 16">
                            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
                        </svg> Crea Nuova Competizione
                    </div>
                    <div class="card-body">
                        <div v-if="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>

                        <form @submit.prevent="creaCompetizione" enctype="multipart/form-data">
                            <div class="mb-3">
                                <label class="form-label fw-semibold">
                                    Nome Competizione 
                                    <span class="text-danger">*</span>
                                </label>
                                <input type="text" class="form-control" v-model="nuovoNome" required placeholder="Torneo della Sapienza">
                            </div>

                            <div class="mb-3">
                                <label class="form-label fw-semibold">Logo della Competizione (Opzionale)</label>
                                <input type="file" ref="fileInputRef" id="fileInputLogo" class="form-control" accept="image/*" @change="handleFileChange">
                                <div class="form-text">Formati accettati: jpg, png, webp</div>
                            </div>

                            <div class="mb-4">
                                <label class="form-label fw-semibold">
                                    Numero Squadre 
                                    <span class="text-danger">*</span>
                                </label>
                                <input type="number" class="form-control" v-model="nuovoNumeroSquadre" min="2" max="20" required >
                            </div>
                            <button type="submit" class="btn btn-success w-100 fw-bold">Crea la tua nuova Competizione</button>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Colonna dx: Lista competizioni-->
            <div class="col-lg-8">
                <div v-if="caricamento" class="text-center mt-5">
                    <div class="spinner-border text-success" role="status"></div>
                </div>

                <div v-else-if="competizioni.length === 0" class="alert alert-info text-center fw-semibold">
                    Non hai creato nessuna competizione. Cosa aspetti, usa il form qui a fianco per iniziare!
                </div>

                <div v-else class="row g-3">
                    <div v-for="comp in competizioni" :key="comp.id" class="col-md-6">
                        <div class="card h-100 shadow-sm border-0 bg-light hover-card">      <!--hover card: se passi con il mouse  ==> animazione -->
                            <div class="card-body d-flex flex-column">
                                <div class="d-flex align-items-center mb-3">
                                    <img :src="comp.logo_url || 'https://via.placeholder.com/50'" class="rounded me-3" style="width: 55px; height: 55px; object-fit: cover;">
                                    <h5 class="card-title fw-bold mb-0">{{ comp.nome }}</h5>
                                </div>
                                <p class="text-muted mb-4">Dimensione: <strong>{{ comp.numero_squadre }} squadre</strong></p>

                                <div class="mt-auto d-flex flex-column flex-xl-row justify-content-between align-items-xl-center gap-2">
                                    <div class="d-flex flex-column flex-sm-row gap-2">
                                        <RouterLink :to="`/mie-competizioni/${comp.id}/squadre`" class="btn btn-success btn-sm fw-bold">
                                            Gestisci Squadre
                                        </RouterLink>
                                        <RouterLink :to="`/mie-competizioni/${comp.id}/calendario`" class="btn btn-warning btn-sm fw-bold text-dark">
                                            Gestisci calendario
                                        </RouterLink>
                                    </div>
                                    <button @click="preparaEliminazione(comp.id)" class="btn btn-outline-danger btn-sm align-self-end align-self-xl-auto" title="Elimina Competizione" data-bs-toggle="modal" data-bs-target="#deleteConfirmModal">
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

    <!--Modale (Conferma eliminazione della competizione)-->
    <div class="modal fade" id="deleteConfirmModal" tabindex="-1" aria-labelledby="deleteConfirmModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg rounded-4">
                <!--Header del modal-->
                <div class="modal-header bg-danger text-white border-0 rounded-top-4">
                    <h5 class="modal-title fw-bold" id="deleteConfirmModalLabel">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-exclamation-triangle-fill me-2 mb-2" viewBox="0 0 16 16">
                            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                        </svg>
                        Conferma Eliminazione
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close" @click="idCompetizioneDaEliminare = null"></button>
                </div>

                <!--Body del modal-->
                <div class="modal-body py-4 text-center">
                    <h4 class="fw-bold text-dark mb-3">
                        Sei sicuro di voler procedere?
                    </h4>
                    <p class="text-muted">
                        L'eliminazione di questa competizione comporterà la rimozione a cascata di tutte le <strong>squadre</strong> e le <strong>partite</strong> ad essa associate.
                    </p>
                    <br>
                    <div class="alert alert-warning py-2 mb-0 mt-3" role="alert">
                        Questa operazione è irreversibile.
                    </div>
                </div>

                <div class="modal-footer border-0 justify-content-center bg-light rounded-bottom-4">
                    <button type="button" class="btn btn-secondary px-4 fw-bold" data-bs-dismiss="modal" @click="idCompetizioneDaEliminare = null">
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