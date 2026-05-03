<script setup>
import { ref, onMounted, computed } from 'vue'
// ref          per instanziare una variabile reattiva
// onMounted    per intercettare un momento preciso del ciclo di vita del componente
// computed     per generare una proprietà reattiva derivata

// Variabili reattive per salvare i dati presi dal database
const notizie = ref([])
const partite = ref([])

// Impostazione della data odierna (YYYY-MM-DD)
const dataSelezionata = ref(new Date().toISOString().split('T')[0])

// ACQUISIZIONE DATI
// Funzione per prendere le notizie dal backend
const fetchNotizie = async() => {   // Instaura una comunicazione di rete con l'endpoint del backend (index.js)
    try{
        const response = await fetch('/api/notizie/recenti')
        if(response.ok) notizie.value = await response.json()       // corpo della risposta converitito da formato JSON a oggetto JavaScript
    } catch(error) {
        console.error("Errore nel caricamento delle notizie:", error)
    }
}

// Funzione per prendere le partite (a seconda del giorno) dal backend
const fetchPartite = async() => {
    try{
        const response = await fetch(`/api/partite?data=${dataSelezionata.value}`)
        if(response.ok) partite.value = await response.json()
    } catch(error) {
        console.error("Errore nel caricamento delle partite:", error)
    }
}

// ELABORAZIONE DATI
// Usiamo 'computed' per raggruppare le partite per campionato (Si passa da array piato a Oggetto/Dizionario(Mappa))
const partiteRaggruppate = computed(() => {     // si itera nell'array partita.value allocando ogni singolo oggetto all'interno di un dizionario (gruppi), 
    const gruppi = {}                           // usando il nomeCompetizione come dato di aggregazione
    partite.value.forEach(partita => {
        const nomeCampionato = partita.competizioni?.nome || 'Altre Competizioni'
        if (!gruppi[nomeCampionato]) gruppi[nomeCampionato] = []
        gruppi[nomeCampionato].push(partita)
    })
    return gruppi
})

// Quando la pagina si carica, vengono effettuate le chiamate API
onMounted(() => {
    fetchNotizie()
    fetchPartite()
})
</script>


<template>
    <div class="container my-4">

        <!-- SEZIONE 1: CAROSELLO NOTIZIE-->
        <section class="mb-5">
            <h2 class="fw-bold mb-3">Ultime Notizie</h2>  <!-- fw-bold grassetto-->
            
            <!--Controllo per migliorare la User Experience-->
            <div v-if="notizie.length > 0" id="newsCarosello" class="carousel slide" data-bs-ride="carousel"> <!--se ci sono notizie, il framework inserisce il blocco del carosello nel DOM-->
                <div class="carousel-inner rounded-4 shadow-sm">
                <!--carousel-inner  fa da contenitore del carosello (regola anche la visibilità durante le transizioni animate)-->
                <!--rounded-4       smussa gli angoli del rettangolo-->
                <!--shadow-sm       per applicare un'ombreggiatura esterna (profondità ottica)-->
                    <!--Ciclo sulle notizie. La prima (index === 0) deve avere la classe 'active'-->
                    <div v-for="(notizia, index) in notizie" :key="notizia.id" :class="['carousel-item', { active: index === 0 }]">
                    <!--ad ogni iterazione, genera un nodo DOM assegnando l'oggetto corrente alla variabile 'notizia' e la sua posizione nell'array alla variabile 'index'. key fornisce un identificativo univoco-->
                    <!--la classe 'active' viene applicata esclusivamente se la condizione 'index===0' è vera (solo al primo elemento generato)-->    
                        <!--Immagine segnaposto se non c'è img_url-->
                        <RouterLink :to="'/notizie/'+ notizia.id" class="text-decoration-none text-white">
                            <img :src="notizia.img_url || 'https://via.placeholder.com/1200x400?text=TOPKICK+News'" class="d-block w-100" style="height: 400px; object-fit: cover;" alt="News Image"> <!--con l'OR viene fatto un ripiego se img_url è assente, con l'url di un immagine generata dinamicamente a runtime-->
                            <div class="carousel-caption d-none d-md-block bg-dark bg-opacity-75 rounded p-3"> <!--d-none  classe per nascondere un elemento. rounded per arrotondare i bordi-->
                                <h5>{{  notizia.titolo  }}</h5>     <!-- {testo} serve per inserire il valore testuale di una variabile JS in HTML (interpolazione) -->
                                <p class="text-truncate">{{  notizia.contenuto  }}</p>
                            </div>
                        </RouterLink>    
                    </div>
                </div>
                <button class="carousel-control-prev" type="button" data-bs-target="#newsCarosello" data-bs-slide="prev">
                    <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#newsCarosello" data-bs-slide="next">
                    <span class="carousel-control-next-icon" aria-hidden="true"></span>
                </button>
            </div>
            <div v-else class="alert alert-info">Nessuna notizia disponibile al momento</div>
         </section>

         <!-- SEZIONE 2: PARTITE E CALENDARIO-->
          <section>
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h2 class="fw-bold">Partite</h2>
                <!-- Dati di Input: quando cambia (@change) (event listener), richiama fetchPartite (chiamata asincrona)-->
                <input type="date" class="form-control w-auto" v-model="dataSelezionata" @change="fetchPartite">
                <!--qui, giustamente, si usa la var. reattiva dataSelezionata-->
            </div>

            <div v-if="Object.keys(partiteRaggruppate).length > 0">
                <!--Ciclo sui campionati-->
                <div v-for="(listaPartite, campionato) in partiteRaggruppate" :key="campionato" class="mb-4"> <!--qui itera sulle proprieta di un oggetto JS; invece campionato è la chiave-->
                    <h4 class="bg-success text-white p-2 rounded-top mb-0">{{  campionato  }}</h4>
                    <ul class="list-group list-group-flush shadow-sm">
                        <!--Ciclo sulle partite di uno specifico campionato-->
                        <li v-for="partita in listaPartite" :key="partita.id" class="list-group-item d-flex justify-content-between align-items-center">
                            <span class="fw-semibold w-25 text-end">{{  partita.squadra_casa?.nome  }}</span> <!-- se partita.squadra_casa esiste, viene preso il nome (significato di '?')-->
                            <span class="badge bg-dark fs-6 mx-3">
                                {{  partita.stato === 'programmata' ? 'VS' : `${partita.gol_casa} - ${partita.gol_trasferta}`  }}
                                <!--se la partita è 'programmata' si inserisce solo 'VS'-->
                            </span>
                            <span class="fw-semibold w-25 text-start">{{  partita.squadra_trasferta?.nome  }}</span>
                        </li>
                    </ul>
                </div>
            </div>
            <div v-else class="alert alert-warning text-center">
                Nessuna partita in programma per il {{  dataSelezionata  }}
            </div>
        </section>
    </div>
</template>



