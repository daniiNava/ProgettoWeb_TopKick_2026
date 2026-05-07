<script setup> 
import { ref, onMounted, computed } from 'vue'

// Variabili reattive per salvare i dati
const notizie = ref([])
const partite = ref([])

// Impostazione della data odierna
const dataSelezionata = ref(new Date().toISOString().split('T')[0])
const offsetGiorni = ref(0) 

// --- LOGICA CAROSELLO NOTIZIE 3D ---
const indiceNewsAttiva = ref(0)

const getIndex = (offset) => {
    if (notizie.value.length === 0) return 0
    let newIndex = (indiceNewsAttiva.value + offset) % notizie.value.length
    if (newIndex < 0) newIndex += notizie.value.length
    return newIndex
}

const vaiANews = (index) => {
    if (index === indiceNewsAttiva.value) return 
    indiceNewsAttiva.value = index
}

// --- LOGICA CALENDARIO PARTITE ---
const dateList = computed(() => {
    const list = []
    const today = new Date()
    
    for (let i = -3; i <= 3; i++) {
        const d = new Date()
        const diffDaOggi = i + offsetGiorni.value
        d.setDate(today.getDate() + diffDaOggi)
        
        const isoDate = d.toISOString().split('T')[0]
        
        let label = ''
        if (diffDaOggi === -1) label = 'Ieri'
        else if (diffDaOggi === 0) label = 'Oggi'
        else if (diffDaOggi === 1) label = 'Domani'
        else {
            label = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
        }
        
        list.push({ value: isoDate, label: label })
    }
    return list
})

const scorriDate = (direzione) => {
    offsetGiorni.value += direzione
}

const selezionaDataRapida = (nuovaData) => {
    dataSelezionata.value = nuovaData
    fetchPartite()
}

const gestisciCambioCalendario = () => {
    const oggi = new Date().setHours(0,0,0,0)
    const scelta = new Date(dataSelezionata.value).setHours(0,0,0,0)
    const differenza = Math.round((scelta - oggi) / (1000 * 60 * 60 * 24))
    offsetGiorni.value = differenza 
    fetchPartite()
}

// --- ACQUISIZIONE DATI ---
const fetchNotizie = async() => {   
    try{
        const response = await fetch('/api/notizie/recenti')
        if(response.ok) notizie.value = await response.json()       
    } catch(error) {
        console.error("Errore nel caricamento delle notizie:", error)
    }
}

const fetchPartite = async() => {
    try{
        const response = await fetch(`/api/partite?data=${dataSelezionata.value}`)
        if(response.ok) partite.value = await response.json()
    } catch(error) {
        console.error("Errore nel caricamento delle partite:", error)
    }
}

// --- RAGGRUPPAMENTO PARTITE ---
const partiteRaggruppate = computed(() => {     
    const gruppi = {}                           
    partite.value.forEach(partita => {
        const nomeCampionato = partita.competizioni?.nome || partita.competizione?.nome || 'Altre Competizioni'
        if (!gruppi[nomeCampionato]) gruppi[nomeCampionato] = []
        gruppi[nomeCampionato].push(partita)
    })
    return gruppi
})

onMounted(() => {
    fetchNotizie()
    fetchPartite()
})
</script>

<template>
    <div class="container py-4">

        <section class="mb-5">
            <div class="d-flex justify-content-between align-items-end mb-4 border-start border-4 border-success ps-3">
                <h2 class="fw-bold mb-0">Ultime Notizie</h2>
            </div>
            
            <div v-if="notizie.length > 0" class="coverflow-container my-4">
                <div v-for="(notizia, index) in notizie" :key="'news'+notizia.id"
                     class="coverflow-item shadow-lg"
                     :class="{
                         'active': index === indiceNewsAttiva,
                         'prev': index === getIndex(-1),
                         'next': index === getIndex(1),
                         'hidden': index !== indiceNewsAttiva && index !== getIndex(-1) && index !== getIndex(1)
                     }"
                     @click="vaiANews(index)">
                    
                    <RouterLink v-if="index === indiceNewsAttiva" :to="'/notizie/'+ notizia.id" class="text-decoration-none h-100 w-100 d-block position-relative">
                        <img :src="notizia.img_url || 'https://images.unsplash.com/photo-1518605368461-1e1e38dd1ba7?auto=format&fit=crop&q=80&w=1200'" class="w-100 h-100 object-fit-cover">
                        <div class="position-absolute top-0 start-0 w-100 h-100 gradient-overlay"></div>
                        <div class="position-absolute bottom-0 start-0 p-4 w-100 text-white text-start">
                            <span class="badge bg-success mb-2 px-2 py-1 shadow-sm">In Evidenza</span>
                            <h3 class="fw-bold text-shadow mb-1">{{ notizia.titolo }}</h3>
                        </div>
                    </RouterLink>

                    <div v-else class="h-100 w-100 position-relative">
                        <img :src="notizia.img_url || 'https://images.unsplash.com/photo-1518605368461-1e1e38dd1ba7?auto=format&fit=crop&q=80&w=1200'" class="w-100 h-100 object-fit-cover">
                        <div class="position-absolute top-0 start-0 w-100 h-100 gradient-overlay"></div>
                        <div class="position-absolute bottom-0 start-0 p-3 w-100 text-white text-start">
                            <h5 class="fw-bold text-shadow mb-0 text-truncate">{{ notizia.titolo }}</h5>
                        </div>
                    </div>

                </div>
            </div>
            <div v-else class="alert alert-info">Nessuna notizia disponibile al momento</div>
        </section>

         <section>
            <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                <h2 class="fw-bold mb-0 border-start border-4 border-success ps-3">Partite</h2>
                
                <div class="d-flex align-items-center bg-light p-1 rounded-pill shadow-sm w-auto">
                    
                    <button @click="scorriDate(-1)" class="btn rounded-circle btn-light border d-flex align-items-center justify-content-center text-secondary transition-all hover-bg-gray ms-1" style="width: 38px; height: 38px; z-index: 2;">
                        <span class="fw-bold fs-5">‹</span>
                    </button>

                    <div class="d-flex overflow-auto custom-scrollbar flex-nowrap mx-2" style="max-width: 60vw;">
                        <button 
                            v-for="giorno in dateList" 
                            :key="giorno.value"
                            @click="selezionaDataRapida(giorno.value)"
                            :class="['btn rounded-pill px-3 px-md-4 py-2 flex-shrink-0 transition-all mx-1', dataSelezionata === giorno.value ? 'btn-success fw-bold text-white shadow' : 'btn-transparent text-secondary border-0 hover-bg-gray']"
                        >
                            {{ giorno.label }}
                        </button>
                    </div>

                    <button @click="scorriDate(1)" class="btn rounded-circle btn-light border d-flex align-items-center justify-content-center text-secondary transition-all hover-bg-gray me-1" style="width: 38px; height: 38px; z-index: 2;">
                        <span class="fw-bold fs-5">›</span>
                    </button>
                    
                    <div class="ms-1 position-relative border-start ps-2 border-2 d-none d-sm-block">
                        <input type="date" class="form-control rounded-pill border-0 bg-transparent text-secondary shadow-none cursor-pointer" v-model="dataSelezionata" @change="gestisciCambioCalendario" style="width: 40px; color: transparent;">
                        <i class="position-absolute top-50 start-50 translate-middle pointer-events-none fs-5">📅</i>
                    </div>
                </div>
            </div>

            <div v-if="Object.keys(partiteRaggruppate).length > 0">
                <div v-for="(listaPartite, campionato) in partiteRaggruppate" :key="campionato" class="mb-5"> 
                    
                    <div class="bg-dark text-white px-3 py-2 rounded-top d-flex align-items-center">
                        <span class="fs-5">🏆</span>
                        <h5 class="mb-0 ms-2 fw-semibold">{{ campionato }}</h5>
                    </div>

                    <ul class="list-group list-group-flush shadow-sm rounded-bottom border border-top-0">
                        <li v-for="partita in listaPartite" :key="partita.id" class="list-group-item d-flex justify-content-between align-items-center py-3 match-row transition-all">
                            
                            <!-- SQUADRA CASA (Cliccabile) -->
                            <RouterLink :to="'/squadre/' + partita.squadra_casa?.id" class="d-flex align-items-center justify-content-end text-decoration-none text-dark team-hover" style="flex: 1;">
                                <span class="fw-semibold me-3 text-end d-none d-sm-block">{{ partita.squadra_casa?.nome }}</span>
                                <span class="fw-semibold me-2 text-end d-block d-sm-none">{{ partita.squadra_casa?.nome?.substring(0,3).toUpperCase() }}</span>
                                <img :src="partita.squadra_casa?.logo_url || 'https://via.placeholder.com/50?text=Logo'" alt="Casa" class="object-fit-contain logo-squadra" style="width: 40px; height: 40px;">
                            </RouterLink>

                            <div class="d-flex justify-content-center align-items-center mx-2 mx-md-4" style="min-width: 80px;">
                                <span v-if="partita.stato === 'programmata'" class="badge bg-secondary px-3 py-2 rounded-pill fs-6 text-white-50">VS</span>
                                <span v-else class="badge bg-black text-success px-3 py-2 rounded-pill fs-5 shadow-sm border border-success">
                                    {{ partita.gol_casa }} - {{ partita.gol_trasferta }}
                                </span>
                            </div>

                            <!-- SQUADRA TRASFERTA (Cliccabile) -->
                            <RouterLink :to="'/squadre/' + partita.squadra_trasferta?.id" class="d-flex align-items-center justify-content-start text-decoration-none text-dark team-hover" style="flex: 1;">
                                <img :src="partita.squadra_trasferta?.logo_url || 'https://via.placeholder.com/50?text=Logo'" alt="Trasferta" class="object-fit-contain logo-squadra" style="width: 40px; height: 40px;">
                                <span class="fw-semibold ms-3 text-start d-none d-sm-block">{{ partita.squadra_trasferta?.nome }}</span>
                                <span class="fw-semibold ms-2 text-start d-block d-sm-none">{{ partita.squadra_trasferta?.nome?.substring(0,3).toUpperCase() }}</span>
                            </RouterLink>
                            
                        </li>
                    </ul>
                </div>
            </div>
            
            <div v-else class="text-center py-5 bg-light rounded-4 border shadow-sm mt-3">
                <span class="fs-1 d-block mb-3">🏟️</span>
                <h4 class="fw-bold text-secondary">Nessuna partita in programma</h4>
                <p class="text-muted">Non ci sono match registrati per il giorno selezionato.</p>
            </div>
        </section>
    </div>
</template>

<style scoped>
.transition-all {
    transition: all 0.2s ease-in-out;
}

/* Effetto hover per le squadre cliccabili */
.team-hover:hover .fw-semibold {
    color: #198754;
}
.team-hover:hover .logo-squadra {
    transform: scale(1.1);
}

/* ----------------------------------------- */
/* CAROSELLO 3D COVER FLOW                   */
/* ----------------------------------------- */
.coverflow-container {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    height: 380px;
    width: 100%;
    perspective: 1200px; 
}
.coverflow-item {
    position: absolute;
    width: 60%;
    max-width: 600px;
    height: 100%;
    border-radius: 1rem;
    overflow: hidden;
    transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
    background-color: #000;
}
.gradient-overlay {
    background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%);
}
.object-fit-cover {
    object-fit: cover;
}

/* Stati animazione carosello */
.coverflow-item.active {
    z-index: 3;
    transform: scale(1) translateZ(0);
    opacity: 1;
}
.coverflow-item.prev {
    z-index: 2;
    transform: translateX(-50%) scale(0.85) translateZ(-100px);
    opacity: 0.5;
    filter: blur(2px);
    cursor: pointer;
}
.coverflow-item.next {
    z-index: 2;
    transform: translateX(50%) scale(0.85) translateZ(-100px);
    opacity: 0.5;
    filter: blur(2px);
    cursor: pointer;
}
.coverflow-item.hidden {
    z-index: 1;
    transform: scale(0.5) translateZ(-200px);
    opacity: 0;
    pointer-events: none;
}
.coverflow-item.prev:hover, .coverflow-item.next:hover {
    opacity: 0.8;
    filter: blur(0px);
}


/* ----------------------------------------- */
/* TABELLONE PARTITE MINIMALISTA             */
/* ----------------------------------------- */
.match-row:hover {
    background-color: #f8f9fa;
    transform: scale(1.01);
    z-index: 1;
    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    border-radius: 8px;
}

/* Ombra sagomata sul logo libero */
.logo-squadra {
    filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.15));
    transition: transform 0.2s ease-in-out;
}

.custom-scrollbar::-webkit-scrollbar { display: none; }
.custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.hover-bg-gray:hover { background-color: #e9ecef !important; }
.cursor-pointer { cursor: pointer; }
</style>