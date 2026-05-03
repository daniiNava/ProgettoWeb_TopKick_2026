<script setup>
import {ref, onMounted} from 'vue'
import {useRoute, useRouter} from 'vue-router'

const route=useRoute() //legge i parametri dall'url, come l'id ad esempio
const router=useRouter() //serve per navigare

const notizia=ref(null)
const caricamento=ref(true)
const errore=ref('')

const fetchNotizia= async () => {
    try{
        const response= await fetch(`/api/notizie/${route.params.id}`)
        if(!response.ok) {
            if(response.status===404) throw new Error ('Notizia non torovata')
            throw new Error('Errore nel caricamento della notizia')
        }
        notizia.value= await response.json()
    } catch (err) {
        errore.value=err.message
    } finally {
        caricamento.value=false
    }
}

const formattaData=(dataStringa) => {
    const opzioni = {year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'}
    return new Date(dataStringa).toLocaleDateString('it-IT', opzioni)

}
onMounted(() => {
    fetchNotizia()
})
</script>

<template>
    <div class="container my-5">
        <!--pulsante per tornare indietro-->
        <button @click="router.back()" class="btn btn-outline-secondary mb-4">
            &larr; Torna alle notizie
        </button>
        <div v-if="caricamento" class="text-center my-5">
            <div class="spinner-border text-success" role="status">
            </div>
        </div>
        <div v-else-if="errore" class="alert alert-danger text-center">{{ errore }}</div>
        <!--contenuto della notizia-->
        <div v-else-if="notizia" class="row justify-content-center">
            <div class="col-lg-10">
                <!--intestazione-->
                <div class="mb-4 text-center">
                    <span v-if="notizia.competizioni" class="badge bg-success mb-2 fs-6">
                        {{ notizia.competizioni.nome }}
                    </span>
                    <span v-else class="badge bg-secondary mb-2 fs-6">Generale</span>
                    <h1 class="fw-bold display-4">{{ notizia.titolo }}</h1>
                    <p class="text-muted">Pubblicato il {{ formattaData(notizia.data_pubblicazione) }}</p>
                </div>
                <!--immagine-->
                <img :src="notizia.img_url || 'https://via.placeholder.com/1200x600?text=TOPKICK+News'" class="img-fluid rounded-4 shadow mb-5 w-100" alt="Immagine Notizia" style="max-height: 500px; object-fit: cover;">
                <!--testo dell'articolo-->
                <div class="fs-5" style="line-height: 1.8; white-space: pre-wrap;">
                    {{ notizia.contenuto }}
                </div>
            </div>
        </div>
    </div>
</template>