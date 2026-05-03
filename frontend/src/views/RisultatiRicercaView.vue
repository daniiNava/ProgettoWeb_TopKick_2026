<script setup>
import {ref, onMounted, watch} from 'vue' //ref-> crea variabili reattive -> cambia la pagina e si aggiornano da sole
//onMounted-> funzione che viene eseguita automaticamente non appena la pagina viene caricata nello schermo
//watch -> sentinella che tiene d'occhio una variabile e fa scattare un'azione se tale variabile cambia 
import {useRoute} from 'vue-router'
//strumento per leggere l'URL attuale

const route=useRoute()
const risultati= ref({squadre: [], giocatori: [], competizioni: [], notizie: [] }) //scatola vuota dove salveremo i dati in arrivo dal server 
const caricamento=ref(false) //variabile interruttore, se è ture mostrerà l'icona di caricamento che gira


//funzione che scaricherà i dati (async perchè deve aspettare il server)
const fetchRisultati=async() => {
    const query= route.query.q //legge dall'url cosa ha cercato l'utente, ovvero estrae la prola dopo ?q=
    const tipo= route.query.tipo || 'tutto' //legge se l'utente ha filtrato per qualche tipo es solo squadre, se non c'è imposta il valore predefinito a tutto
    if(!query) return //se l'utente arriva su questa pagina senza cercare nulla, blocca tutto e non fa richiesta al server
    caricamento.value=true 

    try {
        const response = await fetch (`/api/ricerca?q=${query}&tipo=${tipo}`) //chiamata HTTP l sever (al percorso /api/ricerca) passandogli la parola cercata e il tipo
        if (response.ok) {
            risultati.value= await response.json() 

        }
    } catch (error) {
        console.error("Errore ricerca:", error)
    } finally {
        caricamento.value=false
    } 
}

//lanciamo subito la funzione per scaricare i risultati, appena l'utente apre la pagina
onMounted(()=> {
    fetchRisultati() 
})

//ricarica i dati se l'utente fa una nuova ricerca mentre è in questa pagina, senza bisogno di riscaricare tutta la pagina web 
watch(() => route.query, () => {
    fetchRisultati()
})
</script>

<template>
    <div class="container my-5">
        <h2 class="fw-bold mb-4">
            Risultati per: <span class="text-success">"{{ route.query.q }}"</span> <!-- stampiamo la parola esatta che ha cercato l'utente, prendendola dall'url-->
        </h2>

        <!--se cricamento è true mostriamo la classica rotellina che gira -->
        <div v-if="caricamento" class="text-center my-5">
            <div class="spinner-border text-success" role="status"></div>
        </div>

        <!--appena finisce il caricamento entriamo nel v-else-->
        <div v-else>
            <!--risultati squadre, mostriamo tale blocco solo se la lista delle squadre esiste e ha almeno un elemento, eseguiamo un ciclo v-for, dove per ogni squadra trovata clona il <li> che sarebbe la riga della lista, infine assegniamo una key univoca ad ogni elemento per tenerne traccia correttamente -->
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
                    <li v-for="giocaotori in risultati.giocatori" :key="giocatori.id" class="list-group-item d-flex  justify-content-between align-items-center">
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
                        <RouterLink :to="'/notizie/'+ notizia.id" class="text-decoration-none text-dark">
                            <span class="fs-5 fw-semibold d-block">{{ notizia.titolo }}</span>
                            <small class="text-muted">Pubblicato il: {{ new Date(notizia.data_pubblicazione).toLocaleDateString('it-IT') }}</small>
                        </RouterLink>
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