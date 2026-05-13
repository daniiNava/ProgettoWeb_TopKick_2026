<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router';
import { showToast } from '@/utils/toastStore';     // Gestione errori (senza l'uso dell'alert)

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
        const response = await fetch(`/api/preferiti/competizioni/${id}`, { method: 'DELETE' })

        if(response.ok){
            // Rimozione dell'elemento dall'array reattivo
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
            ★ I Miei Preferiti
        </h1>

        <div v-if="caricamento" class="text-center my-5">
            <div class="spinner-border text-warning" role="status"></div>
        </div>

        <div v-else>
            <!--STATO VUOTO-->
            <div v-if="competizioni.length === 0 && squadre.length === 0" class="alert alert-light border text-center py-5 shadow-sm rounded-4">
                <h3 class="text-muted mb-3">Non hai ancora aggiunto nessun preferito.</h3>
                <p class="text-muted">Esplora le competizioni e le squadre e clicca sulla stellina per aggiungerle qui!</p>
                <RouterLink to="/competizioni" class="btn btn-warning fw-bold mt-2">Esplora Competizioni</RouterLink>
            </div>

            <!--SEZIONE COMPETIZIONI-->
            <div v-if="competizioni.length > 0" class="mb-5">
                <h3 class="fw-bold mb-3 text-secondary">Competizioni</h3>
                <div class="row g-3">
                    <div v-for="comp in competizioni" :key="comp.id" class="col-auto">
                        <div class="card h-100 shadow-sm border-0 hover-card">
                            <div class="card-body d-flex align-items-center justify-content-between">
                                <!-- Cliccando l'area sinistra si va al dettaglio -->
                                <div class="d-flex align-items-center flex-grow-1" style="cursor: pointer;" @click="router.push(`/competizioni/${comp.id}`)">
                                <img :src="comp.logo_url || 'https://via.placeholder.com/100'" class="me-md-4 img-fluid" style="max-height: 80px; width: auto; object-fit: contain;">
                                    <h3 class="card-title fw-bold mb-0 text-truncate">{{ comp.nome }}</h3>
                                </div>
                                <!-- Bottone per rimuovere -->
                                <button @click.stop="rimuoviCompetizione(comp.id)" class="btn text-warning fs-4 p-0 ms-2" title="Rimuovi dai preferiti"> <!--".stop" per evitare l'effetto bubbling (ovvero evitare che cliccando la stellina si attivi anche il click della card che porta alla pagina di dettaglio)-->
                                    ★
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SEZIONE SQUADRE -->
            <div v-if="squadre.length > 0">
                <h3 class="fw-bold mb-3 text-secondary">Squadre</h3>
                <div class="row g-3">
                    <div v-for="squadra in squadre" :key="squadra.id" class="col-auto">
                        <div class="card h-100 shadow-sm border-0 hover-card">
                            <div class="card-body d-flex align-items-center justify-content-between">
                                <div class="d-flex align-items-center flex-grow-1" style="cursor: pointer;" @click="router.push(`/squadre/${squadra.id}`)">
                                <img :src="squadra.logo_url || 'https://via.placeholder.com/100'" class="me-md-4 img-fluid rounded" style="width: 80px; height: 80px; object-fit: contain;">                                    
                                <h3 class="card-title fw-bold mb-0 text-truncate">{{ squadra.nome }}</h3>
                                </div>
                                <button @click.stop="rimuoviSquadra(squadra.id)" class="btn text-warning fs-4 p-0 ms-2" title="Rimuovi dai preferiti">
                                    ★
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>                
        </div>
    </div>
</template>

<style scoped>
.hover-card {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 .5rem 1rem rgba(0, 0, 0, .15)!important;
}
</style>