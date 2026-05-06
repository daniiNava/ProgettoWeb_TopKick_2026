<script setup>
import {ref, onMounted} from 'vue'
import {useRouter} from 'vue-router'

const router = useRouter()
const competizioni = ref([])
const caricamento = ref(true)
const errorMessage = ref('')

// Variabili per il form
const nuovoNome = ref('')
const nuovoLogoFile = ref(null)
const nuovoNumeroSquadre = ref(20)

// Reference nativa di Vue per l'elemento di input del file (immagine logo competizione) (che sostituisce document.getElementById)
const fileInputRef = ref(null)

// Funzione per prendere il file quando l'utente Premium lo seleziona
const handleFileChange = (event) => {
    nuovoLogoFile.value = event.target.files[0]
}

// 1. Caricamento delle competizioni dell'utente premium
const fetchMieCompetizioni = async () => {
    try {
        const response = await fetch('/api/mie-competizioni')
        if(response.status === 401 || response.status === 403) {
            alert("Accesso negato. Devi essere un utente Premium.")
            router.push('/')
            return
        }
        if (response.ok) {
            competizioni.value = await response.json()
        }
    } catch (error){
        console.error("Errore:", error)
    } finally {
        caricamento.value = false
    }
}

// 2. Creazione di una nuova competizione (Con Form-Data per far scegliere all'utente un file scaricato nel dispositivo)
const creaCompetizione = async () => {
    try {
        // Creazione di un oggetto FormData (per l'invio di file binari)
        const formData = new FormData()
        formData.append('nome', nuovoNome.value)
        formData.append('numero_squadre', nuovoNumeroSquadre.value)

        // Se l'utente ha selezionato un file, lo aggiungiamo col nome 'logo' (lo stesso che aspetta multer)
        if(nuovoLogoFile.value){
            formData.append('logo', nuovoLogoFile.value)
        }

        const response = await fetch('/api/mie-competizioni', {
            method: 'POST', 
            // Non serve il codice seguente: headers: { 'Content-Type': 'application/json' }, perchè lo fa il browser da solo per i FormData
            body: formData
        })

        const data = await response.json()

        if(response.ok){
            // Aggiunta della nuova competizione in cima alla lista senza dover ricaricare la pagina
            competizioni.value.unshift(data.competizione)
            
            // Pulizia della form
            nuovoNome.value = ''
            nuovoLogoFile.value = null
            nuovoNumeroSquadre.value = 20
            
            // Reset fisico dell'input file html (tramite virtual DOM)
            // Si evita di usare: document.getElementById('fileInputLogo').value = ''
            if(fileInputRef.value) fileInputRef.value.value = ''

            errorMessage.value=''
        } else {
            errorMessage.value = data.error     // Errore se viene superato il numero di squadre
        }

    } catch (error){
        errorMessage.value = "Errore di connessione" 
    }
}

// 3. Elimina competizione
const eliminaCompetizione = async (id) => {
    if(!confirm("Sei sicuro di voler eliminare questa tua competizione? Verranno eliminati anche tutti i suoi dati associati (squadre, partite, ...)")) return;
    
    try {
        const response = await fetch(`/api/mie-competizioni/${id}`, { method: 'DELETE' })

        if(response.ok){
            // Rimozione dell'elemento dall'array reattivo
            competizioni.value = competizioni.value.filter(c => c.id !== id)
        } else {
            alert("Errore durante l'eliminazione")
        }
    } catch (error){
        console.error("Errore: ", error)
    }
}

// Inizializzazione automatica al rendering del componente
onMounted(() => {
    fetchMieCompetizioni()
})

</script>


<template>
    <div class="container py-5">
        <div class="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2 border-success">
            <h1 class="fw-bold">⭐ Le Mie Competizioni</h1>
        </div>

        <div class="row g-4">

            <!-- Colonna sx: Form di creazione-->
            <div class="col-lg-4">
                <div class="card shadow-sm border-success">
                    <div class="card-header bg-success text-white fw-bold">
                        ➕ Crea Nuova Competizione
                    </div>
                    <div class="card-body">
                        <div v-if="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>

                        <form @submit.prevent="creaCompetizione" enctype="multipart/form-data"> <!--In questo modo viene usato form-data-->
                            <div class="mb-3">
                                <label class="form-label fw-semibold">Nome Competizione *</label>
                                <input type="text" class="form-control" v-model="nuovoNome" required placeholder="Es. Torneo della Sapienza">
                            </div>

                            <div class="mb-3">
                                <label class="form-label fw-semibold">Logo della Competizione (Opzionale)</label>
                                <input type="file" ref="fileInputRef" id="fileInputLogo" class="form-control" accept="image/*" @change="handleFileChange">
                                <div class="form-text">Formati accettati: JPG, PNG, WEBP</div>
                            </div>

                            <div class="mb-4">
                                <label class="form-label fw-semibold">Numero Squadre *</label>
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
                    <!-- Card per ogni competizione-->
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
                                    <button @click="eliminaCompetizione(comp.id)" class="btn btn-outline-danger btn-sm" title="Elimina">🗑️</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
             </div>
        </div>
    </div>
</template>
