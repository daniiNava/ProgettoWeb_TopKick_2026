<script setup>
import {ref, onMounted} from 'vue' //importiamo le Composition API fondamentali di Vue, ref serve per creare variabile reattive (ovvero che se vengono modificate viene modificata l'interfaccia) e onMounted è l hook del ciclo di vito


const notizie=ref([]) //array vuoto che conterra i dati del server
const caricamento= ref(true) // flag booleano, che indica se posto uguale a true che stiamo asepttando i dati
const errore=ref('')

//chiamiamo l'API
const fetchTutteLeNotizie= async() => {
    try {
        const response=await fetch('/api/notizie') //interroghiamo la rotta /api/notizie
        if(!response.ok) throw new Error('Errore nel caricamento')
        notizie.value=await response.json()
    } catch(err) {
        errore.value=err.message
    } finally {
        caricamento.value=false
    }
}

const formattaData= (dataStringa) => {
    const opzioni= {year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'}
    return new Date(dataStringa).toLocaleDateString('it-IT', opzioni)
}

onMounted(()=> {
    fetchTutteLeNotizie()
}) //appena viene inserita la componente nel DOM del browser, fa partire la chiamta fetchtuttele...
</script>

<template>
    <div class="container py-5">
        <h1 class="fw-bold mb-4 border-bottom pb-2 border-success">Tutte le Notizie</h1>
        <!--mostra questo blocco del v-if finchè l'api non è terminata-->
        <div v-if="caricamento" class="text-center my-5">
            <p class="mt-2">Caricamento notizie in corso...</p>
        </div>
        
        <div v-else-if="errore" class="alert alert-danger"> {{ errore }}</div> <!--caricamento finito ma la variabile errore contiene del testo-->

        <!--griglia notizie-->
        <div v-else class="row g-4">
            <!--ciclo for, dove per ogni oggetto nell'array notizie, vue clonera il div con la classe class, key è 
            dà un id univoco a ogni elemento clonato, permettendo al DOM di vue di essere veloce negli aggiornamenti successivi-->
            <div v-for="notizia in notizie" :key="notizia.id" class="col-12 col-md-6 col-lg-4">
                <div class="card h-100 shadow-sm border-0">
                    <!-- operatore or in src -> se lòa notizia nel database nopn ha un immagine, il browser caricherà 
                     l'immagine di default evitando che si rompa il layout
                     mentre nel campo style forziamo tutte le immagini alla stessa altezza
                     e object-fit:cover funziona come il background del desktop, ovvero l'immagine riempe il blocco ritagliando l'eccesso ma senza deformarsi-->
                    <img 
                        :src="notizia.img_url || 'https://via.placeholder.com/600x400?text=TOPKICK+News'"
                        class="card-img-top"
                        alt="Immagine notizia"
                        style="height: 200px; object-fit: cover;"
                    >
                    <div class="card-body d-flex flex-column">
                        <div class="mb-2">
                            <!--se la query sql ha trovato una corrispondenza tampa il nome della competizione in un badge verde
                            altrimenti usa un badge grigio con scritto generale-->
                            <span v-if="notizia.competizioni" class="badge bg-success">
                                {{ notizia.competizioni.nome }}
                            </span>
                            <span v-else class="badge bg-secondary">Generale</span>
                        </div>
                        <h5 class="card-title fw-bold">{{ notizia.titolo }}</h5>

                        <!--mostriamo solo i primi 100 caratteri, ùcreando cosi un riassunto perfetto per la card-->
                        <p class="card-text text-muted flex-grow-1">
                            {{ notizia.contenuto.substring(0, 100) }}...
                        </p>

                        <p class="card-text">
                            <small class="text-muted">🕒 {{ formattaData(notizia.data_pubblicazione) }}</small>
                        </p>

                        <!--bottone che aprira la notiza, mt auto garantisce che il pulsante si trovi in fondo alla pagina
                        e garantisce che tutti i pulsanti della riga siano allineati, indipendentemente dalla lunghezza del titolo-->
                        <RouterLink :to="'/notizie/'+ notizia.id" class="btn btn-outline-success mt-auto">
                            Leggi di più
                        </RouterLink>

                    </div>
                    
                </div>
            </div>
        </div>

        <!--qualora non vi fossero piu notizie, invece di mostrare una pagina bianca mostriamo un messaggio informativo-->
        <div v-if="!caricamento && !errore && notizie.length===0" class="alert alert-info text-center">
            Nessuna notizia presente nel database
        </div>
    </div>
</template>