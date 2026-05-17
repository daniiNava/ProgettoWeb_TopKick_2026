<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router';
import { showToast } from '@/utils/toastStore';

const router = useRouter()
const competizioni = ref([])
const squadre = ref([])
const caricamento = ref(true)

const fetchPreferiti = async () => {
    try {
        const response = await fetch('/api/preferiti')

        if (response.status === 401) {
            showToast("Devi effettuare l'accesso per vedere i preferiti", 'warning');
            router.push('/');
            return;
        }

        if (response.ok) {
            const data = await response.json()
            competizioni.value = data.competizioni
            squadre.value = data.squadre
        }
    } catch (error){
        console.error("Errore:", error)
    } finally {
        caricamento.value = false
    }
}

const rimuoviCompetizione = async (id) => {
    try {
        // GET: Prendo le competizioni preferite dell'utente
        const response = await fetch(`/api/preferiti/competizioni/${id}`, { method: 'DELETE' })

        if(response.ok){
            // Rimozione dell'elemento dall'array reattivo (Viene filtrato tenendo tutti gli elementi con ID !== da quello da eliminare)
            // Senza che viene fatta una nuova fetch, aggiorno l'array locale in RAM
            competizioni.value = competizioni.value.filter(c => c.id !== id)
            showToast("Competizione rimossa dai preferiti", 'danger');
        } else {
            showToast("Errore di rete durante l'eliminazione", 'danger')
        }
    } catch (error){
        console.error("Errore: ", error)
    }
}

const rimuoviSquadra = async (id) => {
    
    try {
        const response = await fetch(`/api/preferiti/squadre/${id}`, { method: 'DELETE' })

        if(response.ok){
            // Rimozione dell'elemento dall'array reattivo
            squadre.value = squadre.value.filter(s => s.id !== id)
            showToast("Squadra rimossa dai preferiti", 'danger');
        } else {
            showToast("Errore di rete durante l'eliminazione", 'danger')
        }
    } catch (error){
        console.error("Errore: ", error)
    }
}

// Inizializzazione automatica al rendering del componente
onMounted(() => {
    fetchPreferiti()
})


</script>


<template>
    <div class="container py-5">

        <h1 class="fw-bold mb-4 border-bottom pb-2 border-warning">
            <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"  class="bi bi-star-fill text-primary ms-2 mb-4" fill="currentColor" viewBox="0 0 16 16">
                <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
            </svg>
            I Miei Preferiti
        </h1>

        <div v-if="caricamento" class="text-center my-5">
            <div class="spinner-border text-warning" role="status"></div>
        </div>

        <div v-else>
            <!--CASO IN CUI NON C'E' NULLA TRA I PREFERITI-->
            <div v-if="competizioni.length === 0 && squadre.length === 0" class="alert alert-light border text-center py-5 shadow-sm rounded-4">
                <h3 class="text-muted mb-3">Non hai ancora aggiunto nessun preferito.</h3>
                <p class="text-muted">Esplora le competizioni e le squadre e clicca sulla stellina per aggiungerle qui!</p>
                <RouterLink to="/competizioni" class="btn btn-warning fw-bold mt-2">Esplora Competizioni</RouterLink>
            </div>

            <!--SEZIONE COMPETIZIONI (PREFERITE)-->
            <div v-if="competizioni.length > 0" class="mb-5">
                <h3 class="fw-bold mb-3 text-secondary">Competizioni</h3>
                <div class="row g-3">
                    <div v-for="comp in competizioni" :key="comp.id" class="col-12 col-md-6 col-lg-4">  <!--PC: 3xriga | IPHONE: 1xriga | IPAD: 2xriga-->
                        <div class="card h-100 shadow-sm border-0 hover-card">  <!--hover card: se passi con il mouse  ==> animazione -->
                            <div class="card-body d-flex align-items-center justify-content-between">
                                <!-- Cliccando l'area sinistra si va al dettaglio -->
                                <div class="d-flex align-items-center flex-grow-1" style="cursor: pointer;" @click="router.push(`/competizioni/${comp.id}`)">
                                    <img :src="comp.logo_url || 'https://via.placeholder.com/100'" class="me-3 me-md-4 img-fluid" style="max-height: 70px; width: auto; object-fit: contain;">
                                    <h3 class="card-title fw-bold mb-0">{{ comp.nome }}</h3>
                                </div>
                                <!-- Bottone per rimuovere (stellina) -->
                                <button @click.stop="rimuoviCompetizione(comp.id)" class="btn text-warning fs-4 p-0 ms-2 flex-shrink-0" title="Rimuovi dai preferiti"> <!--".stop" per evitare l'effetto bubbling (ovvero evitare che cliccando la stellina si attivi anche il click della card che porta alla pagina di dettaglio)-->
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"  class="bi bi-star-fill text-primary ms-2 mb-0" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SEZIONE SQUADRE (PREFERITE) -->
            <div v-if="squadre.length > 0">
                <h3 class="fw-bold mb-3 text-secondary">Squadre</h3>
                <div class="row g-3">
                    <div v-for="squadra in squadre" :key="squadra.id" class="col-12 col-md-6 col-lg-4">     <!--col-12: 100% nei dispositivi mobili (1 competizione per riga) | col-md-6: 50% nei TABLET (2 competizioni per riga) -->
                        <div class="card h-100 shadow-sm border-0 hover-card">
                            <div class="card-body d-flex align-items-center justify-content-between">
                                <!--Click ==> DettaglioCompetizione -->
                                <div class="d-flex align-items-center flex-grow-1" style="cursor: pointer;" @click="router.push(`/squadre/${squadra.id}`)">
                                <img :src="squadra.logo_url || 'https://via.placeholder.com/100'" class="me-3 me-md-4 img-fluid rounded" style="width: 70px; height: 80px; object-fit: contain;">                                    
                                <h3 class="card-title fw-bold mb-0 text-truncate">{{ squadra.nome }}</h3>
                                </div>
                                <button @click.stop="rimuoviSquadra(squadra.id)" class="btn text-warning fs-4 p-0 ms-2 flex-shrink-0" title="Rimuovi dai preferiti">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"  class="bi bi-star-fill text-primary ms-2 mb-0" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>                
        </div>
    </div>
</template>