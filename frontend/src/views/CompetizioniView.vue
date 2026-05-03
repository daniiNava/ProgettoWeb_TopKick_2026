<script setup>
import {ref, onMounted} from 'vue'

const competizioni=ref([])
const caricamento=ref(true)
const errore= ref('')

const fetchCompetizioni= async () => {
    try {
        const response= await fetch('/api/competizioni')
        if(!response.ok) throw new Error('Errore nel caricamento delle competizioni')
        competizioni.value=await response.json()
    } catch (err) {
        errore.value=err.message
    } finally {
        caricamento.value=false
    }
}

onMounted(() => {
    fetchCompetizioni()
})

</script>

<template>
    <!--container my-5 centra tutto nella pagina dando spazio sopra e sotto-->
    <div class="container my-5">
        
        <h1 class="fw-bold mb-4 border-bottom pb-2 border-success">Competizioni e Squadre</h1>
        <div v-if="caricamento" class="text-center my-5">
            <div class="spinner-border text-success" role="status"></div>
            <p class="mt-2">Caricamento in corso...</p>
        </div>
        <div v-else-if="errore" class="alert alert-danger">{{ errore }}</div>
        <!-- g-4 imposta una spaziatura uniforme tra tutte le card in modo che non si tocchino-->
        <div v-else class="row g-4">
            <!--ciclo sulle competizion, dove per ogni competizione creiamo una colonna, piu utilizzo responsive design-->
            <div v-for="comp in competizioni" :key="comp.id" class="col-12 col-md-6 col-lg-4">
                <!--card h-100, crea il riquadro h-100 forza tutte le card ad avere stessa altezza anche se alcune hanno piu squadre-->
                <div class="card h-100 shadow-sm border-0">
                    <div class="card-header bg-dark text-white d-flex align-items-center py-3">
                        <img :src="comp.logo_url || 'https://via.placeholder.com/50'" class="rounded bg-white p-1 me-3" style="width: 50px; height: 50px; object-fit: contain;">
                        <div>
                            <h5 class="mb-0 fw-bold">{{ comp.nome }}</h5>
                            <small class="text-light">{{ comp.nazione || 'Internazionale' }}</small>

                        </div>
                    </div>

                    <div class="card-body p-0">
                        <ul class="list-group list-group-flush">
                            <!-- mentre cicliamo per le competiioni facciamo anche un sottociclo per le squadre, dove creiamo una riga per ogni squadra (li) e ne stampiamo il logo rotondo (rounded circle) e il nome-->
                            <li v-for="squadra in comp.squadre" :key="squadra.id" class="list-group-item d-flex align-items-center">
                                <img :src="squadra.logo_url || 'https://via.placeholder.com/30'" class="rounded-circle me-3" style="width: 30px; height: 30px; object-fit: cover;">
                                <span class="fw-semibold">{{ squadra.nome }}</span>
                            </li>
                            <li v-if="!comp.squadre || comp.squadre.length===0" class="list-group-item text-muted text-center fst-italic">
                                Nessuna squadra registrata
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        <div v-if="!caricamento && !errore && competizioni.length===0" class="alert alert-info text-center">
            Nessuna competizione presente nel database.
        </div>
    </div>

</template>