<script setup>
import { ref, onMounted, computed } from 'vue'

const notizie = ref([])
const caricamento = ref(true)
const errore = ref('')
const ricerca = ref('') 
const filtroCompetizione = ref('Tutte') 

const fetchTutteLeNotizie = async () => {
    try {
        const response = await fetch('/api/notizie')
        if (!response.ok) throw new Error('Errore nel caricamento dei dati')
        notizie.value = await response.json()
    } catch (err) {
        errore.value = err.message
    } finally {
        caricamento.value = false
    }
}

const formattaData = (dataStringa) => {
    const opzioni = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    return new Date(dataStringa).toLocaleDateString('it-IT', opzioni)
}

const notizieFiltrate = computed(() => {
    return notizie.value.filter(notizia => {
        const matchRicerca = notizia.titolo.toLowerCase().includes(ricerca.value.toLowerCase()) || 
                             notizia.contenuto.toLowerCase().includes(ricerca.value.toLowerCase())
        
        const nomeCompetizione = notizia.competizioni?.nome || 'Generale'
        const matchCompetizione = filtroCompetizione.value === 'Tutte' || nomeCompetizione === filtroCompetizione.value
        
        return matchRicerca && matchCompetizione
    })
})

const categorieUniche = computed(() => {
    const categorie = notizie.value.map(n => n.competizioni?.nome || 'Generale')
    return ['Tutte', ...new Set(categorie)]
})

onMounted(() => {
    fetchTutteLeNotizie()
})
</script>

<template>
    <div class="container py-5">
        <!-- Header -->
        <div class="row align-items-center mb-5 border-bottom pb-4 border-success">
            <div class="col-lg-6">
                <h1 class="fw-bold text-success mb-0">TOPKICK News</h1>
                <p class="text-muted">Resta aggiornato sul mondo dello sport</p>
            </div>
            
            <div class="col-lg-6">
                <div class="row g-2">
                    <div class="col-md-7">
                        <input v-model="ricerca" type="text" class="form-control border-success" placeholder="Cerca notizie...">
                    </div>
                    <div class="col-md-5">
                        <select v-model="filtroCompetizione" class="form-select border-success">
                            <option v-for="cat in categorieUniche" :key="cat" :value="cat">{{ cat }}</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="caricamento" class="text-center my-5 py-5">
            <div class="spinner-border text-success" role="status"></div>
        </div>
        
        <!-- Errore -->
        <div v-else-if="errore" class="alert alert-danger">{{ errore }}</div>

        <!-- Griglia Notizie -->
        <div v-else-if="notizieFiltrate.length > 0" class="row g-4">
            <div v-for="notizia in notizieFiltrate" :key="notizia.id" class="col-12 col-md-6 col-lg-4">
                
                <!-- Aggiunta classe position-relative e news-card per gestire il click su tutta la card -->
                <div class="card h-100 shadow-sm border-0 news-card position-relative">
                    
                    <div class="overflow-hidden border-bottom">
                        <img 
                            :src="notizia.img_url || 'https://via.placeholder.com/600x400?text=TOPKICK+News'"
                            class="card-img-top news-img"
                            alt="Immagine notizia"
                        >
                    </div>

                    <div class="card-body d-flex flex-column">
                        <div class="mb-2">
                            <span class="badge rounded-pill" :class="notizia.competizioni ? 'bg-success' : 'bg-secondary'">
                                {{ notizia.competizioni?.nome || 'Generale' }}
                            </span>
                        </div>

                        <h5 class="card-title fw-bold">{{ notizia.titolo }}</h5>

                        <p class="card-text text-muted flex-grow-1">
                            {{ notizia.contenuto.substring(0, 110) }}...
                        </p>

                        <div class="d-flex justify-content-between align-items-center mt-3">
                            <small class="text-muted">
                                🕒 {{ formattaData(notizia.data_pubblicazione) }}
                            </small>
                            
                            <!-- La classe 'stretched-link' rende TUTTA la card cliccabile -->
                            <RouterLink 
                                :to="'/notizie/'+ notizia.id" 
                                class="btn btn-outline-success btn-sm rounded-pill px-3 stretched-link"
                            >
                                Leggi di più
                            </RouterLink>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- No risultati -->
        <div v-else class="text-center my-5 py-5 border rounded bg-light">
            <h4 class="text-muted">Nessuna notizia trovata</h4>
            <button @click="ricerca = ''; filtroCompetizione = 'Tutte'" class="btn btn-success mt-3">Resetta</button>
        </div>
    </div>
</template>

<style scoped>
/* Rende l'intera card un elemento interattivo visivamente */
.news-card {
    transition: all 0.3s ease;
    cursor: pointer; /* Fa apparire la manina su tutta la card */
}

.news-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0,0,0,0.15) !important;
}

/* Effetto zoom sull'immagine quando passi sopra la card */
.news-img {
    height: 220px;
    object-fit: cover;
    transition: transform 0.5s ease;
}

.news-card:hover .news-img {
    transform: scale(1.05);
}

/* Assicura che il pulsante sembri attivo al passaggio del mouse sulla card */
.news-card:hover .btn-outline-success {
    background-color: #198754;
    color: white;
}
</style>