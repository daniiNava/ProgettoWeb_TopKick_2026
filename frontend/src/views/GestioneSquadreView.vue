<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router';
import { showToast } from '@/utils/toastStore';

const route = useRoute()
const router = useRouter()
const idCompetizione = route.params.id 

const competizione = ref(null)
const squadre = ref([])
const caricamento = ref(true)
const errorMessage = ref('')

const nuovoNome = ref('')
const nuovoLogoFile = ref(null)
const fileInputRef = ref(null)

const handleFileChange = (event) => {
    nuovoLogoFile.value = event.target.files[0]
}

const fetchDati = async () => {
    try {
        const response = await fetch(`/api/mie-competizioni/${idCompetizione}/squadre`)

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

const aggiungiSquadra = async () => {
    try {
        const formData = new FormData()
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
            squadre.value.unshift(data.squadra)
            
            nuovoNome.value = ''
            nuovoLogoFile.value = null
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

const eliminaSquadra = async (id) => {
    if(!confirm("Sei sicuro di voler eliminare questa squadra?")) return;
    
    try {
        // Chiamata corretta all'API delle squadre
        const response = await fetch(`/api/squadre/${id}`, { method: 'DELETE' })

        if(response.ok){
            squadre.value = squadre.value.filter(c => c.id !== id)
            showToast("Squadra eliminata", "info")
        } else {
            showToast("Errore durante l'eliminazione", 'danger');
        }
    } catch (error){
        console.error("Errore eliminazione squadra: ", error)
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
            <div class="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2 border-primary">
                <div>
                    <RouterLink to="/mie-competizioni" class="btn btn-sm btn-outline-secondary mb-2">⬅ Torna indietro</RouterLink>
                    <h1 class="fw-bold text-primary"> Squadre: {{ competizione.nome }}</h1>
                    <p class="text-muted mb-0">
                        Squadre iscritte: <strong>{{ squadre.length }} / {{ competizione.numero_squadre }}</strong>
                    </p>
                </div>
            </div>

            <div class="row g-4">
                <div class="col-lg-4">
                    <div class="card shadow-sm border-primary">
                        <div class="card-header bg-primary text-white fw-bold">
                            ➕ Aggiungi Squadra
                        </div>
                        <div class="card-body">
                            <div v-if="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>
                            
                            <div v-if="squadre.length >= competizione.numero_squadre" class="alert alert-warning">
                                Hai raggiunto il limite di squadre che si possono aggiungere a questa competizione.
                            </div>

                            <form v-else @submit.prevent="aggiungiSquadra" enctype="multipart/form-data">
                                <div class="mb-3">
                                    <label class="form-label fw-semibold">Nome Squadra *</label>
                                    <input type="text" class="form-control" v-model="nuovoNome" required placeholder="Es. Barcellona">
                                </div>
                                
                                <div class="mb-4">
                                    <label class="form-label fw-semibold">Logo della Squadra (Opzionale)</label>
                                    <input type="file" ref="fileInputRef" id="fileInputLogo" class="form-control" accept="image/*" @change="handleFileChange">
                                    <div class="form-text">Formati accettati: JPG, PNG, WEBP</div>
                                </div>

                                <button type="submit" class="btn btn-success w-100 fw-bold">Aggiungi Squadra</button>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="col-lg-8">
                    <div v-if="squadre.length === 0" class="alert alert-info text-center">
                        Nessuna squadra iscritta a questa competizione. Aggiungi la prima!
                    </div>

                    <div v-else class="row g-3">
                        <div v-for="squadra in squadre" :key="squadra.id" class="col-md-6">
                            <div class="card h-100 shadow-sm border-0 bg-light">
                                <div class="card-body d-flex flex-column">
                                    <div class="d-flex align-items-center mb-3">
                                        <img :src="squadra.logo_url || 'https://via.placeholder.com/50'" class="rounded-circle me-3 shadow-sm" style="width: 50px; height: 50px; object-fit: cover; background: white;">
                                        <h5 class="card-title fw-bold mb-0">{{ squadra.nome }}</h5>
                                    </div>

                                    <div class="mt-auto d-flex justify-content-between">
                                        <RouterLink :to="`/squadre/${squadra.id}/giocatori`" class="btn btn-dark btn-sm fw-bold">
                                            Gestisci Giocatori
                                        </RouterLink>
                                        <button @click="eliminaSquadra(squadra.id)" class="btn btn-outline-danger btn-sm" title="Elimina">🗑️</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>