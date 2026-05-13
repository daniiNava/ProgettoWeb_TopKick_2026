<script setup>
import { showToast } from '@/utils/toastStore'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const competizioni = ref([])
const caricamento = ref(true)
const errorMessage = ref('')

// Variabili per il form
const nuovoNome = ref('')
const nuovoLogoFile = ref(null)
const nuovoNumeroSquadre = ref(20)

// Ref per resettare l'input file dopo l'upload
const fileInputRef = ref(null)

const handleFileChange = (event) => {
    nuovoLogoFile.value = event.target.files[0]
}

const fetchMieCompetizioni = async () => {
    try {
        const response = await fetch('/api/mie-competizioni')
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
        // Usiamo FormData perché dobbiamo inviare un file binario (il logo)
        const formData = new FormData()
        formData.append('nome', nuovoNome.value)
        formData.append('numero_squadre', nuovoNumeroSquadre.value)

        if(nuovoLogoFile.value){
            formData.append('logo', nuovoLogoFile.value)
        }

        const response = await fetch('/api/mie-competizioni', {
            method: 'POST', 
            body: formData
        })

        const data = await response.json()

        if(response.ok){
            // Aggiungo la nuova competizione in cima alla lista (reattività di Vue)
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

const eliminaCompetizione = async (id) => {
    if(!confirm("Sei sicuro? Verranno eliminate a cascata anche tutte le squadre e le partite associate!")) return;
    
    try {
        const response = await fetch(`/api/mie-competizioni/${id}`, { method: 'DELETE' })

        if(response.ok){
            competizioni.value = competizioni.value.filter(c => c.id !== id)
            showToast("Competizione eliminata", "info")
        } else {
            showToast("Errore durante l'eliminazione", 'danger')
        }
    } catch (error){
        console.error("Errore eliminazione: ", error)
    }
}

onMounted(() => {
    fetchMieCompetizioni()
})
</script>


<template>
    <div class="container py-5">
        <div class="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2 border-dark">
            <h1 class="fw-bold">
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="currentColor" class="bi bi-star-fill text-warning ms-2 mb-2" viewBox="0 0 16 16">
                    <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
                </svg> Le Mie Competizioni
            </h1>
        </div>

        <div class="row g-4">

            <!-- Colonna sx: Form di creazione-->
            <div class="col-lg-4">
                <div class="card shadow-sm border-success">
                    <div class="card-header bg-success text-white fw-bold">
                        <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" fill="currentColor" class="bi bi-plus mb-1" viewBox="0 0 16 16">
                            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
                        </svg> Crea Nuova Competizione
                    </div>
                    <div class="card-body">
                        <div v-if="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>

                        <form @submit.prevent="creaCompetizione" enctype="multipart/form-data">
                            <div class="mb-3">
                                <label class="form-label fw-semibold">Nome Competizione <label class="text-danger">*</label></label>
                                <input type="text" class="form-control" v-model="nuovoNome" required placeholder="Es. Torneo della Sapienza">
                            </div>

                            <div class="mb-3">
                                <label class="form-label fw-semibold">Logo della Competizione (Opzionale)</label>
                                <input type="file" ref="fileInputRef" id="fileInputLogo" class="form-control" accept="image/*" @change="handleFileChange">
                                <div class="form-text">Formati accettati: JPG, PNG, WEBP</div>
                            </div>

                            <div class="mb-4">
                                <label class="form-label fw-semibold">Numero Squadre <label class="text-danger">*</label></label>
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

                <div v-else-if="competizioni.length === 0" class="alert alert-info text-center">
                    Non hai creato nessuna competizione. Cosa aspetti, usa il form qui a fianco per iniziare!
                </div>

                <div v-else class="row g-3">
                    <div v-for="comp in competizioni" :key="comp.id" class="col-md-6">
                        <div class="card h-100 shadow-sm border-0 bg-light">
                            <div class="card-body d-flex flex-column">
                                <div class="d-flex align-items-center mb-3">
                                    <img :src="comp.logo_url || 'https://via.placeholder.com/50'" class="rounded me-3" style="width: 50px; height: 50px; object-fit: cover;">
                                    <h5 class="card-title fw-bold mb-0">{{ comp.nome }}</h5>
                                </div>
                                <p class="text-muted mb-4">Dimensione: <strong>{{ comp.numero_squadre }} squadre</strong></p>

                                <div class="mt-auto d-flex justify-content-between">
                                    <div>
                                        <RouterLink :to="`/mie-competizioni/${comp.id}/squadre`" class="btn btn-primary btn-sm fw-bold me-2">
                                            Gestisci Squadre
                                        </RouterLink>
                                        <RouterLink :to="`/mie-competizioni/${comp.id}/calendario`" class="btn btn-warning btn-sm fw-bold text-dark">
                                            Gestisci calendario
                                        </RouterLink>
                                    </div>
                                    <button @click="eliminaCompetizione(comp.id)" class="btn btn-outline-danger btn-sm" title="Elimina">
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
</template>