<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const risultati = ref({ squadre: [], giocatori: [], competizioni: [], notizie: [] })
const caricamento = ref(false)

// Aggiunta la variabile per l'annata di default, altrimenti il RouterLink va in errore!
const annataSelezionata = ref('25/26')

const fetchRisultati = async () => {
    const query = route.query.q 
    const tipo = route.query.tipo || 'tutto' 
    
    if (!query) return 
    
    caricamento.value = true 

    try {
        const response = await fetch (`/api/ricerca?q=${query}&tipo=${tipo}`) 
        if (response.ok) {
            risultati.value = await response.json() 
        }
    } catch (error) {
        console.error("Errore ricerca:", error)
    } finally {
        caricamento.value = false
    } 
}

onMounted(() => {
    fetchRisultati() 
})

watch(() => route.query, () => {
    fetchRisultati()
})
</script>

<template>
    <div class="container py-5">
        <h2 class="fw-bold mb-4">
            Risultati per: <span class="text-success">"{{ route.query.q }}"</span>
        </h2>

        <div v-if="caricamento" class="text-center my-5">
            <div class="spinner-border text-success" role="status"></div>
        </div>

        <div v-else>
            
            <div v-if="risultati.squadre && risultati.squadre.length > 0" class="mb-5">
                <h4 class="border-bottom pb-2">Squadre</h4>
                <div class="list-group shadow-sm">
                    <RouterLink 
                        v-for="squadra in risultati.squadre" 
                        :key="squadra.id" 
                        :to="`/squadre/${squadra.id}`"
                        class="list-group-item list-group-item-action d-flex align-items-center text-decoration-none"
                    >
                        <img :src="squadra.logo_url || 'https://via.placeholder.com/40'" class="rounded-circle me-3" style="width: 40px; height: 40px; object-fit: cover;">
                        <span class="fs-5 fw-semibold text-dark">{{ squadra.nome }}</span>
                    </RouterLink>
                </div>
            </div>
            
            <div v-if="risultati.giocatori && risultati.giocatori.length > 0" class="mb-5">
                <h4 class="border-bottom pb-2">Giocatori</h4>
                <div class="list-group shadow-sm">
                    <RouterLink 
                        v-for="giocatore in risultati.giocatori" 
                        :key="giocatore.id" 
                        :to="`/giocatori/${giocatore.id}`" 
                        class="list-group-item list-group-item-action d-flex justify-content-between align-items-center text-decoration-none"
                    >
                        <div>
                            <span class="fs-5 fw-semibold d-block text-dark">{{ giocatore.nome_cognome }}</span>
                            <small class="text-muted">{{ giocatore.ruolo }}</small>
                        </div>
                        <span v-if="giocatore.squadra" class="badge bg-success">{{ giocatore.squadra.nome }}</span>
                    </RouterLink>
                </div>
            </div>

            <div v-if="risultati.competizioni && risultati.competizioni.length > 0" class="mb-5">
                <h4 class="border-bottom pb-2">Competizioni</h4>
                <div class="list-group shadow-sm">
                    <RouterLink 
                        v-for="comp in risultati.competizioni" 
                        :key="comp.id" 
                        :to="{ path: `/competizioni/${comp.id}`, query: { annata: annataSelezionata } }"
                        class="list-group-item list-group-item-action d-flex align-items-center text-decoration-none"
                    >
                        <img :src="comp.logo_url || 'https://via.placeholder.com/40'" class="rounded me-3" style="width: 40px; height: 40px; object-fit: cover;">
                        <span class="fs-5 fw-semibold text-dark">{{ comp.nome }}</span>
                    </RouterLink>
                </div>
            </div>

            <div v-if="risultati.notizie && risultati.notizie.length > 0" class="mb-5">
                <h4 class="border-bottom pb-2">Notizie</h4>
                <div class="list-group shadow-sm">
                    <RouterLink 
                        v-for="notizia in risultati.notizie" 
                        :key="notizia.id" 
                        :to="`/notizie/${notizia.id}`" 
                        class="list-group-item list-group-item-action text-decoration-none text-dark"
                    >
                        <span class="fs-5 fw-semibold d-block">{{ notizia.titolo }}</span>
                        <small class="text-muted">Pubblicato il: {{ new Date(notizia.data_pubblicazione).toLocaleDateString('it-IT') }}</small>
                    </RouterLink>
                </div>
            </div>

            <div v-if="risultati.squadre?.length === 0 && risultati.giocatori?.length === 0 && risultati.competizioni?.length === 0 && risultati.notizie?.length === 0" class="alert alert-warning text-center fs-5 shadow-sm rounded-4">
                Nessun risultato trovato per la tua ricerca. Prova con termini diversi.
            </div>      
        </div>
    </div>
</template>