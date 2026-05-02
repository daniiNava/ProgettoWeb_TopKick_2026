<script setup>
import {ref, onMounted, watch} from 'vue'
import {useRoute} from 'vue-router'

const route=useRoute()
const risultati= ref({squadre: [], giocatori: [], competizioni: [], notizie: [] })
const caricamento=ref(false)

const fetchRisultati=async() => {
    const query= route.query.q 
    const tipo= route.query.tipo || 'tutto'
    if(!query) return 
    caricamento.value=true 

    try {
        const response = await fetch (`/api/ricerca?q=${query}&tipo=${tipo}`)
        if (response.ok) {
            risultati.value= await response.json() 

        }
    } catch (error) {
        console.error("Errore ricerca:", error)
    } finally {
        caricamento.value=false
    } 
}

onMounted(()=> {
    fetchRisultati()
})

//ricarica i dati se l'utente fa una nuova ricerca mentre è in questa pagina
watch(() => route.query, () => {
    fetchRisultati()
})
</script>

<template>
    <div class="container my-5">
        <h2 class="fw-bold mb-4">
            Risultati per: <span class="text-success">"{{ route.query.q }}"</span>
        </h2>

        <div v-if="caricamento" class="text-center my-5">
            <div class="spinner-border text-success" role="status"></div>
        </div>

        <div v-else>
            <!--risultati squadre-->
            <div v-if="risultati.squadre && risultati.squadre.length>0" class="mb-5">
                <h4 class="border-bottom pb-2"> Squadre</h4>
                <ul class="list-group shadow-sm">
                    <li v-for="squadra in risultati.squadre" :key="squadra.id" class="list.group-item d-flex align-items-center">
                        <img :src="squadra.logo_url || 'https://via.placeholder.com/40'" class="rounded-circle me-3" style="width: 40px; height: 40px; object-fit: cover";>
                        <span class="fs-5 fw-semibold">{{ squadra.nome }}</span>
                    </li>
                </ul>
            </div>

            <!--risultati giocatori-->
            <div v-if="risultati.giocatori && risultati.giocatori.length>0" class="mb-5">
                <h4 class="border-bottom pb-2"> Giocatori</h4>
                <ul class="list-group shadow-sm">
                    <li v-for="squadra in risultati.giocatori" :key="giocatori.id" class="list.group-item d-flex  justify-content-between align-items-center">
                        <div>
                            <span class="fs-5 fw-semibold d-block">{{ giocatore.nome_cognome }}</span>
                            <small class="text-muted">{{ giocatore.ruolo }}</small>
                        </div>
                        <span v-if="giocatore.squadre" class="badge bg-primary">{{ giocatore.squadra.nome }}</span>
                    </li>
                </ul>
            </div>

            <!--risultati competizioni-->
            <div v-if="risultati.competizioni && risultati.competizioni.length>0" class="mb-5">
                <h4 class="border-bottom pb-2"> Competizioni</h4>
                <ul class="list-group shadow-sm">
                    <li v-for="comp in risultati.competizioni" :key="comp.id" class="list.group-item d-flex align-items-center">
                        <img :src="comp.logo_url || 'https://via.placeholder.com/40'" class="rounded me-3" style="width: 40px; height: 40px; object-fit: cover";>
                        <span class="fs-5 fw-semibold">{{ comp.nome }}</span>
                    </li>
                </ul>
            </div>

            <!--risultati notizie-->
            <div v-if="risultati.notizie && risultati.notizie.length>0" class="mb-5">
                <h4 class="border-bottom pb-2"> Notizie</h4>
                <ul class="list-group shadow-sm">
                    <li v-for="notizia in risultati.notizie" :key="notizia.id" class="list.group-item">
                        <span class="fs-5 fw-semibold d-block">{{ notizia.titolo }}</span>
                        <small class="text-muted">Pubblicato il: {{ new Date(notizia.data_pubblicazione).toLocaleDateString('it-IT') }}</small>
                    </li>
                </ul>
            </div>

            <!--nessun risultato-->
            <div v-if="(!risultati.squadre || !risultati.squadre.length===0) && (!risultati.giocatori || !risultati.giocatori.length===0) && (!risultati.competizioni || !risultati.competizioni.length===0) && (!risultati.notizie || !risultati.notizie.length===0) " class="alert alert-warning text-center fs-5">
                Nessun risultato trovato per la tua ricerca. Prova con termini diversi 
            </div>      
        </div>
    </div>
</template>