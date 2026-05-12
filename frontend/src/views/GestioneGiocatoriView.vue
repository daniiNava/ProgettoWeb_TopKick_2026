<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router';
import { showToast } from '@/utils/toastStore';

const route = useRoute()
const router = useRouter()
const idSquadra = route.params.id 

const squadra = ref(null)
const giocatori = ref([])
const caricamento = ref(true)
const errorMessage = ref('')

// Regole per la composizione della rosa
const LIMITI = {
    'Portiere': 3,
    'Difensore': 6,
    'Centrocampista': 6,
    'Attaccante': 4,
}

const nuovoNome = ref('')
const nuovoRuolo = ref('')
const nuovaDataNascita = ref('')
const nuovoPiede = ref('')

const fetchDati = async () => {
    try {
        const response = await fetch(`/api/squadre/${idSquadra}/giocatori`)

        if (response.status === 401 || response.status === 403) {
            showToast("Accesso negato. Devi essere un utente Premium.", 'danger');
            router.push('/');
            return;
        }
        if (response.ok) {
            const data = await response.json()
            squadra.value = data.squadra
            giocatori.value = data.giocatori
        }
    } catch (error){
        console.error("Errore fetch giocatori:", error)
    } finally {
        caricamento.value = false
    }
}

// Raggruppo i giocatori per stamparli divisi per ruolo
const giocatoriPerRuolo = computed(() => {
    const gruppi = { 'Portiere': [], 'Difensore': [], 'Centrocampista': [], 'Attaccante': [] }
    giocatori.value.forEach(g => {
        if(gruppi[g.ruolo]) gruppi[g.ruolo].push(g)
    })
    return gruppi
});

// Conto quanti giocatori ci sono per ruolo per disabilitare la select se si supera il limite
const conteggioRuoli = computed(() => {
    const conteggio = { 'Portiere': 0, 'Difensore': 0, 'Centrocampista': 0, 'Attaccante': 0 }
    giocatori.value.forEach(g => {
        if(conteggio[g.ruolo] !== undefined) conteggio[g.ruolo]++ 
    })
    return conteggio
})

const aggiungiGiocatore = async () => {
    try {
        const response = await fetch(`/api/squadre/${idSquadra}/giocatori`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({
                nome_cognome: nuovoNome.value,
                ruolo: nuovoRuolo.value,
                data_nascita: nuovaDataNascita.value,
                piede_preferito: nuovoPiede.value
            })
        })

        const data = await response.json()

        if(response.ok){
            giocatori.value.push(data.giocatore)
            
            nuovoNome.value = ''
            nuovoRuolo.value = ''
            nuovaDataNascita.value = ''
            nuovoPiede.value = ''
            errorMessage.value = ''
            
            showToast("Giocatore ingaggiato!", "success")
        } else {
            errorMessage.value = data.error
        }

    } catch (error){
        console.error("Errore inserimento giocatore: ", error)
        errorMessage.value = "Errore di connessione al server"  
    }
}

const eliminaGiocatore = async (id) => {
    if(!confirm("Sei sicuro di voler svincolare questo giocatore?")) return;
    
    try {
        const response = await fetch(`/api/giocatori/${id}`, { method: 'DELETE' })

        if(response.ok){
            giocatori.value = giocatori.value.filter(g => g.id !== id)
            showToast("Giocatore svincolato con successo!", 'success');
        } else {
            showToast("Errore durante lo svincolo", 'danger');
        }
    } catch (error){
        console.error("Errore eliminazione: ", error)
    }
}

onMounted(() => {
    fetchDati()
})
</script>


<template>
    <div class="container py-5">

        <div v-if="caricamento" class="text-center mt-5">
            <div class="spinner-border text-primary" role="status"></div>
        </div>

        <div v-else-if="squadra">
            <div class="d-flex align-items-center mb-4 border-bottom pb-3 border-dark">
                <img :src="squadra.logo_url || 'https://via.placeholder.com/80'" class="rounded-circle me-4 shadow" style="width: 80px; height: 80px; object-fit: cover; background: white;">
                <div>
                    <RouterLink :to="`/mie-competizioni/${squadra.id_competizione}/squadre`" class="btn btn-sm btn-outline-secondary mb-2">⬅ Torna alle Squadre</RouterLink>
                    <h1 class="fw-bold mb-0">Rosa: {{ squadra.nome }}</h1>
                    <p class="text-muted mb-0">
                        Totale giocatori: <strong>{{ giocatori.length }} / 19</strong>
                    </p>
                </div>
            </div>

            <div class="row g-4">
                <div class="col-lg-4">
                    <div class="card shadow-sm border-dark sticky-top" style="top: 100px; z-index: 1;">
                        <div class="card-header bg-dark text-white fw-bold">
                            ➕ Ingaggia un nuovo Giocatore
                        </div>
                        <div class="card-body">
                            <div v-if="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>

                            <form v-else @submit.prevent="aggiungiGiocatore">
                                <div class="mb-3">
                                    <label class="form-label fw-semibold">Nome e Cognome *</label>
                                    <input type="text" class="form-control" v-model="nuovoNome" required placeholder="Es. Paulo Dybala">
                                </div>

                                <div class="mb-3">
                                    <label class="form-label fw-semibold">Ruolo *</label>
                                    <select class="form-select" v-model="nuovoRuolo" required>
                                        <option value="" disabled>Seleziona il ruolo</option>
                                        <option value="Portiere" :disabled="conteggioRuoli['Portiere'] >= LIMITI['Portiere']">
                                            Portiere ({{ conteggioRuoli['Portiere'] }}/{{ LIMITI['Portiere'] }})
                                        </option>
                                        <option value="Difensore" :disabled="conteggioRuoli['Difensore'] >= LIMITI['Difensore']">
                                            Difensore ({{ conteggioRuoli['Difensore'] }}/{{ LIMITI['Difensore'] }})
                                        </option>
                                        <option value="Centrocampista" :disabled="conteggioRuoli['Centrocampista'] >= LIMITI['Centrocampista']">
                                            Centrocampista ({{ conteggioRuoli['Centrocampista'] }}/{{ LIMITI['Centrocampista'] }})
                                        </option>
                                        <option value="Attaccante" :disabled="conteggioRuoli['Attaccante'] >= LIMITI['Attaccante']">
                                            Attaccante ({{ conteggioRuoli['Attaccante'] }}/{{ LIMITI['Attaccante'] }})
                                        </option>
                                    </select>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label fw-semibold">Data di Nascita</label>
                                    <input type="date" class="form-control" v-model="nuovaDataNascita">
                                </div>
                                
                                <div class="mb-4">
                                    <label class="form-label fw-semibold">Piede Preferito</label>
                                    <select class="form-select" v-model="nuovoPiede">
                                        <option value="">Non specificato</option>
                                        <option value="Destro">Destro</option>
                                        <option value="Sinistro">Sinistro</option>
                                        <option value="Ambidestro">Ambidestro</option>
                                    </select>
                                </div>

                                <button type="submit" class="btn btn-success w-100 fw-bold" :disabled="giocatori.length >= 19">
                                    Ingaggia
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="col-lg-8">
                    <div v-if="giocatori.length === 0" class="alert alert-info text-center">
                        La rosa è vuota. Inizia ad acquistare giocatori!
                    </div>

                    <div v-else>
                        <div v-for="(lista, ruolo) in giocatoriPerRuolo" :key="ruolo" class="mb-4">
                            <h4 class="border-bottom pb-2" :class="{
                                'text-warning': ruolo === 'Portiere',
                                'text-success': ruolo === 'Difensore',
                                'text-primary': ruolo === 'Centrocampista',
                                'text-danger': ruolo === 'Attaccante',
                            }">
                                {{ ruolo }} ({{ lista.length }}/{{ LIMITI[ruolo] }})
                            </h4>

                            <ul class="list-group shadow-sm">
                                <li v-if="lista.length === 0" class="list-group-item text-muted fst-italic">
                                    Nessun giocatore in questo ruolo.
                                </li>
                                <li v-for="giocatore in lista" :key="giocatore.id" class="list-group-item d-flex justify-content-between align-items-center">
                                    <div>
                                        <span class="fs-5 fw-semibold d-block">{{ giocatore.nome_cognome }}</span>
                                        <small class="text-muted">
                                            <span v-if="giocatore.data_nascita">🎂 {{ new Date(giocatore.data_nascita).toLocaleDateString('it-IT') }}</span>
                                            <span v-if="giocatore.piede_preferito" class="ms-3">👟 {{ giocatore.piede_preferito }}</span>
                                        </small>
                                    </div>
                                    <button @click="eliminaGiocatore(giocatore.id)" class="btn btn-outline-danger btn-sm" title="Svincola">
                                        Svincola giocatore
                                    </button>
                                </li>
                            </ul>                        
                        </div>
                    </div>
                </div>

            </div>
        </div>

    </div>
</template>