<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router';
import { showToast } from '@/utils/toastStore';

const route = useRoute()
const router = useRouter()
const idCompetizione = route.params.id

const competizione = ref(null)
const squadre = ref([])
const partite = ref([])
const caricamento = ref(true)
const errorMessage = ref('')

// Variabili per il form Creazione-Partita
const nuovaGiornata = ref(1)
const nuovaSquadraCasa = ref('')
const nuovaSquadraTrasferta = ref('')
const nuovaDataOra = ref('')

const fetchDati = async () => {
    try {
        const response = await fetch(`/api/mie-competizioni/${idCompetizione}/calendario`)

        if (response.status === 401 || response.status === 403) {
            showToast("Accesso negato. Reindirizzamento...", 'danger');
            router.push('/');
            return;
        }

        if (response.ok) {
            const data = await response.json()
            competizione.value = data.competizione
            squadre.value = data.squadre
            
            // Aggiungo proprietà reattive locali per gestire l'editing inline di ogni singola partita
            partite.value = data.partite.map(p => ({ 
                ...p, 
                isEditing: false,
                giocatoriDisponibili: [],     
                marcatoriTemp: [],            
                marcatoreSelezionato: '',     
                golSelezionati: 1             
            }))
        }
    } catch (error){
        console.error("Errore fetch calendario:", error)
    } finally {
        caricamento.value = false
    }
}

// Raggruppa le partite per Giornata per stamparle a blocchi
const partitePerGiornata = computed(() => {
    const gruppi = {}
    partite.value.forEach(p => {
        if(!gruppi[p.giornata]) gruppi[p.giornata] = [] 
        gruppi[p.giornata].push(p)
    })
    return gruppi
})

const aggiungiPartita = async () => {
    // Controllo logico frontend
    if (nuovaSquadraCasa.value === nuovaSquadraTrasferta.value){
        showToast("Una squadra non può giocare contro se stessa!", 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/mie-competizioni/${idCompetizione}/partite`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({
                id_squadra_casa: nuovaSquadraCasa.value,
                id_squadra_trasferta: nuovaSquadraTrasferta.value,
                data_ora: nuovaDataOra.value,
                giornata: nuovaGiornata.value
            })
        })

        const data = await response.json()

        if(response.ok){
            // Aggiungo la nuova partita all'array reattivo inizializzando i campi per l'editing
            partite.value.push({ ...data.partita, isEditing: false, giocatoriDisponibili: [], marcatoriTemp: [] })
            
            nuovaSquadraCasa.value = ''
            nuovaSquadraTrasferta.value = ''
            nuovaDataOra.value = ''
            errorMessage.value = ''

            showToast("Partita programmata con successo!", 'success');
        } else {
            showToast(data.error || "Errore durante il salvataggio", 'danger');
        }

    } catch (error){
        errorMessage.value = "Errore di connessione al server" 
    }
}

const eliminaPartita = async (id) => {
    if(!confirm("Sei sicuro di voler eliminare questa partita?")) return;
    
    try {
        const response = await fetch(`/api/partite/${id}`, { method: 'DELETE' })

        if(response.ok){
            partite.value = partite.value.filter(p => p.id !== id)
            showToast("Eliminazione corretta della partita.", 'info');
        } else {
            showToast("Errore di rete durante l'eliminazione", 'danger')
        }
    } catch (error){
        console.error("Errore eliminazione partita: ", error)
    }
}


// LOGICA MARCATORI (EDITING INLINE)

const apriModifica = async (partita) => {
    partita.isEditing = true
    partita.marcatoreSelezionato = '';      
    partita.minutoSelezionato = ''
    partita.tipoGolSelezionato = ''
    partita.assistmanSelezionato = ''

    // Copio i marcatori già presenti nel DB in un array temporaneo per permettere all'utente di modificarli/cancellarli
    partita.marcatoriTemp = partita.marcatori ? partita.marcatori.map(m => ({
        id_giocatore: m.id_giocatore,
        nome_cognome: m.giocatore.nome_cognome,
        id_squadra: m.giocatore.id_squadra,
        gol: m.gol,
        minuto: m.minuto,
        tipo_gol: m.tipo_gol,
        id_assistman: m.id_assistman,
        nome_assistman: m.assistman?.nome_cognome
    })) : []

    // Scarico i giocatori delle due squadre per popolare le select
    try {
        const response = await fetch(`/api/partite/${partita.id}/giocatori-disponibili`)
        if(response.ok) {
            partita.giocatoriDisponibili = await response.json()
        }
    }  catch (error) {
        console.error("Errore recupero giocatori disponibili: ", error)
    }
}

const aggiungiMarcatoreTemp = (partita) => {
    const idGiocatore = partita.marcatoreSelezionato;
    const minuto = partita.minutoSelezionato;
    const tipoGol = partita.tipoGolSelezionato;
    const idAssistman = partita.assistmanSelezionato || null;

    if(!idGiocatore || !minuto) return;

    if(idAssistman && idGiocatore === idAssistman){
        // BUG FIX: Era showTest invece di showToast
        showToast("Errore logico: Il marcatore e l'autore dell'assist non possono coincidere.", 'warning');
        return;
    }

    const giocatore = partita.giocatoriDisponibili.find(g => g.id === idGiocatore);
    if(!giocatore) return;

    // Validazione cardinalità: non posso inserire più marcatori dei gol effettivamente segnati
    let maxGolConsentiti = 0;
    if(giocatore.id_squadra === partita.id_squadra_casa) {
        maxGolConsentiti = parseInt(partita.gol_casa) || 0;
    } else if(giocatore.id_squadra === partita.id_squadra_trasferta) {
        maxGolConsentiti = parseInt(partita.gol_trasferta) || 0;
    }
    
    const golGiaInseriti = partita.marcatoriTemp.filter(m => m.id_squadra === giocatore.id_squadra).length;
    
    if (golGiaInseriti >= maxGolConsentiti){
        showToast(`Errore: Impossibile inserire ulteriori marcatori. Il risultato prevede un massimo di ${maxGolConsentiti} reti per questa squadra.`, 'warning');
        return;
    }

    let assistmanNome = null;
    if(idAssistman){
        const assistmanObj = partita.giocatoriDisponibili.find(g => g.id === idAssistman);
        assistmanNome = assistmanObj ? assistmanObj.nome_cognome : null;
    }

    partita.marcatoriTemp.push({
        id_giocatore: giocatore.id,
        nome_cognome: giocatore?.nome_cognome,
        id_squadra: giocatore?.id_squadra,
        gol: 1,         
        minuto: parseInt(minuto),
        tipo_gol: tipoGol,
        id_assistman: idAssistman,
        nome_assistman: assistmanNome    
    });
    
    // Reset campi form inline
    partita.marcatoreSelezionato = '';
    partita.minutoSelezionato = '';
    partita.tipoGolSelezionato = '';
    partita.assistmanSelezionato = ''; 
}

const rimuoviMarcatoreTemp = (partita, index) => {
    partita.marcatoriTemp.splice(index, 1)
}

// Salva definitivamente il risultato e i marcatori nel DB
const aggiornaRisultato = async (partita) => {
    try {
        const response = await fetch(`/api/partite/${partita.id}`, {
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({
                gol_casa: partita.gol_casa,
                gol_trasferta: partita.gol_trasferta,
                stato: partita.stato,
                lista_marcatori: partita.marcatoriTemp      
            })
        })

        if(response.ok){
            const data = await response.json()

            // Aggiorno la partita locale con i dati freschi dal DB e chiudo l'editing
            const index = partite.value.findIndex(p => p.id === partita.id)
            partite.value[index] = { ...data.partita, isEditing: false, giocatoriDisponibili: [], marcatoriTemp: [] }
            showToast("Risultato aggiornato!", "success")
        } else {
            showToast("Errore nell'aggiornamento del risultato", "danger")
        }

    } catch (error){
        console.error("Errore aggiornamento risultato: ", error)
    }
}

const formattaData = (dataStringa) => {
    const opzioni = {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
    return new Date(dataStringa).toLocaleString('it-IT', opzioni)
}

onMounted(() => {
    fetchDati()
})
</script>


<template>
    <div class="container py-5">

        <div v-if="caricamento" class="text-center mt-5">
            <div class="spinner-border text-warning" role="status"></div>
        </div>

        <div v-else-if="competizione">
            <div class="mb-4 border-bottom pb-2 border-warning">
                <RouterLink to="/mie-competizioni" class="btn btn-sm btn-outline-secondary mb-2">⬅ Torna alle Competizioni</RouterLink>
                <h1 class="fw-bold text-warning">📅 Calendario: {{ competizione.nome }}</h1>
            </div>

            <div class="row g-4">
                <div class="col-lg-4">
                    <div class="card shadow-sm border-warning sticky-top" style="top: 100px; z-index: 1;">
                        <div class="card-header bg-warning text-dark fw-bold">
                            ➕ Programma Partita
                        </div>
                        <div class="card-body">
                            <div v-if="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>

                            <div v-if="squadre.length < 2" class="alert alert-info">
                                Devi aggiungere almeno 2 squadre per creare una partita.
                            </div>

                            <form v-else @submit.prevent="aggiungiPartita">
                                <div class="mb-3">
                                    <label class="form-label fw-semibold">Giornata</label>
                                    <input type="number" class="form-control" v-model="nuovaGiornata" min="1" required>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label fw-semibold">Squadra in Casa</label>
                                    <select class="form-select" v-model="nuovaSquadraCasa" required>
                                        <option value="" disabled>Seleziona...</option>
                                        <option v-for="sq in squadre" :key="sq.id" :value="sq.id">{{ sq.nome }}</option>
                                    </select>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label fw-semibold">Squadra in Trasferta</label>
                                    <select class="form-select" v-model="nuovaSquadraTrasferta" required>
                                        <option value="" disabled>Seleziona...</option>
                                        <option v-for="sq in squadre" :key="sq.id" :value="sq.id">{{ sq.nome }}</option>
                                    </select>
                                </div>
                                
                                <div class="mb-4">
                                    <label class="form-label fw-semibold">Data e Ora</label>
                                    <input type="datetime-local" class="form-control" v-model="nuovaDataOra" required>
                                </div>

                                <button type="submit" class="btn btn-warning w-100 fw-bold text-dark">Aggiungi al Calendario</button>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="col-lg-8">
                    <div v-if="partite.length === 0" class="alert alert-info text-center">
                        Il calendario è vuoto. Programma la prima partita della competizione!
                    </div>

                    <div v-else>
                        <div v-for="(lista, giornata) in partitePerGiornata" :key="giornata" class="mb-5">
                            <h4 class="bg-dark text-white p-2 rounded-top mb-0 text-center">Giornata {{ giornata }}</h4>

                            <ul class="list-group list-group-flush shadow-sm border">
                                <li v-for="partita in lista" :key="partita.id" class="list-group-item p-3">

                                    <div v-if="!partita.isEditing">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <div class="text-muted small w-25">
                                                🕑 {{ formattaData(partita.data_ora) }} <br>
                                                <span :class="{'text-success': partita.stato === 'finita', 'text-danger': partita.stato === 'in_corso', 'text-secondary': partita.stato === 'programmata'}">
                                                    {{ partita.stato.toUpperCase() }}
                                                </span>
                                            </div>

                                            <div class="d-flex align-items-center justify-content-center w-50">
                                                <span class="fw-bold fs-5 text-end w-50">{{ partita.squadra_casa?.nome }}</span>
                                                <span v-if="partita.stato === 'programmata'" class="badge bg-secondary mx-3 fs-6">VS</span>
                                                <span v-else class="badge bg-dark mx-3 fs-5">{{ partita.gol_casa }} - {{ partita.gol_trasferta }}</span>
                                                <span class="fw-bold fs-5 text-start w-50">{{ partita.squadra_trasferta?.nome }}</span>
                                            </div>

                                            <div class="w-25 text-end">
                                                <button @click="apriModifica(partita)" class="btn btn-sm btn-outline-primary me-2">✏️ Risultato</button>
                                                <button @click="eliminaPartita(partita.id)" class="btn btn-sm btn-outline-danger">🗑️</button>
                                            </div>
                                        </div>

                                        <div v-if="partita.marcatori && partita.marcatori.length > 0" class="mt-3 pt-2 border-top text-center small">
                                            <div class="text-muted fw-bold mb-2 text-center">⚽ Reti: </div>
                                            
                                            <div class="d-flex flex-column align-items-center">
                                                <div v-for="m in partita.marcatori" :key="m.id" class="mb-1 w-75 d-flex justify-content-between border-bottom pb-1">
                                                    <span class="fw-bold text-dark">{{ m.minuto }}'</span>
                                                    <span>
                                                        <span class="fw-semibold">{{ m.giocatore?.nome_cognome }}</span>
                                                        <span v-if="m.tipo_gol" class="text-muted fst-italic ms-1">({{ m.tipo_gol }})</span>
                                                    </span>
                                                    <span class="text-success" style="font-size: 0.85em;">
                                                        <template v-if="m.assistman?.nome_cognome">
                                                            Assist: {{ m.assistman.nome_cognome }}
                                                        </template>
                                                    </span>
                                                </div>
                                            </div>
                                            
                                        </div>
                                    </div>

                                    <div v-else class="bg-light p-3 rounded border border-primary">
                                        <div class="row align-items-center text-center mb-3">
                                            <div class="col-4 fw-bold">{{ partita.squadra_casa?.nome }}</div>
                                            <div class="col-4">
                                                <div class="d-flex justify-content-center align-items-center">
                                                    <input type="number" class="form-control text-center w-50 me-2" v-model="partita.gol_casa" min="0">
                                                    <span>-</span>
                                                    <input type="number" class="form-control text-center w-50 me-2" v-model="partita.gol_trasferta" min="0">
                                                </div>
                                            </div>
                                            <div class="col-4 fw-bold">{{ partita.squadra_trasferta?.nome }}</div>
                                        </div>

                                        <hr>

                                        <div class="mb-3">
                                            <label class="fw-bold text-primary mb-2">⚽ Aggiungi un marcatore</label>

                                            <div class="row g-2 mb-3">
                                                <div class="col-md-4">
                                                    <label class="small text-muted fw-semibold">Marcatore *</label>
                                                    <select class="form-select form-select-sm" v-model="partita.marcatoreSelezionato">
                                                        <option value="" selected disabled>Seleziona</option>
                                                        <optgroup :label="partita.squadra_casa?.nome">
                                                            <option v-for="g in partita.giocatoriDisponibili.filter(g => g.id_squadra === partita.id_squadra_casa)" :key="g.id" :value="g.id">
                                                                {{ g.nome_cognome }}
                                                            </option>
                                                        </optgroup>

                                                        <optgroup :label="partita.squadra_trasferta?.nome">
                                                            <option v-for="g in partita.giocatoriDisponibili.filter(g => g.id_squadra === partita.id_squadra_trasferta)" :key="g.id" :value="g.id">
                                                                {{ g.nome_cognome }}
                                                            </option>
                                                        </optgroup>
                                                    </select>
                                                </div>

                                                <div class="col-md-2">
                                                    <label class="small text-muted fw-semibold">Minuto *</label>
                                                    <input type="number" class="form-control form-control-sm" v-model="partita.minutoSelezionato" min="1" max="120" placeholder="es. 12">
                                                </div>

                                                <div class="col-md-3">
                                                    <label class="small text-muted fw-semibold">Tipo Rete</label>
                                                    <select class="form-select form-select-sm" v-model="partita.tipoGolSelezionato">
                                                        <option value="">Nessuno</option>
                                                        <option value="Destro">Destro</option>
                                                        <option value="Sinistro">Sinistro</option>
                                                        <option value="Testa">Testa</option>
                                                        <option value="Rigore">Rigore</option>
                                                        <option value="Punizione">Punizione</option>
                                                    </select>
                                                </div>

                                                <div class="col-md-3">
                                                    <label class="small text-muted fw-semibold">Assist (Opzionale)</label>
                                                    <select class="form-select form-select-sm" v-model="partita.assistmanSelezionato">
                                                        <option value="">Nessuno</option>
                                                        <optgroup :label="partita.squadra_casa?.nome">
                                                            <option v-for="g in partita.giocatoriDisponibili.filter(g => g.id_squadra === partita.id_squadra_casa)" :key="g.id" :value="g.id">
                                                                {{ g.nome_cognome }}
                                                            </option>
                                                        </optgroup>

                                                        <optgroup :label="partita.squadra_trasferta?.nome">
                                                            <option v-for="g in partita.giocatoriDisponibili.filter(g => g.id_squadra === partita.id_squadra_trasferta)" :key="g.id" :value="g.id">
                                                                {{ g.nome_cognome }}
                                                            </option>
                                                        </optgroup>
                                                    </select>
                                                </div>

                                                <div class="col-12 text-end mt-2">
                                                    <button type="button" class="btn btn-sm btn-primary fw-bold" @click="aggiungiMarcatoreTemp(partita)">
                                                        + Aggiungi Gol
                                                    </button>
                                                </div>
                                            </div>

                                            <ul class="list-group mt-2" v-if="partita.marcatoriTemp.length > 0">
                                                <li v-for="(m, index) in partita.marcatoriTemp" :key="index" class="list-group-item d-flex justify-content-between align-items-center py-2 bg-light">
                                                    <span>
                                                        <span class="badge" :class="m.id_squadra === partita.id_squadra_casa ? 'bg-secondary' : 'bg-dark'">
                                                            {{ m.minuto }}
                                                        </span>
                                                        <span class="ms-2 fw-bold">{{ m.nome_cognome }}</span>
                                                        <span class="badge bg-info text-dark ms-2" v-if="m.tipo_gol">⚽ {{ m.tipo_gol }}</span>
                                                        <span class="text-success small ms-2 fw-semibold" v-if="m.nome_assistman">
                                                            <span class="me-1"></span>Assist: {{ m.nome_assistman }}
                                                        </span>
                                                    </span>
                                                    <button type="button" class="btn btn-sm text-danger" @click="rimuoviMarcatoreTemp(partita, index)">
                                                        ✖️
                                                    </button>
                                                </li>
                                            </ul>
                                        </div>

                                        <hr>

                                        <div class="d-flex justify-content-center align-items-center">
                                            <select class="form-select w-auto" v-model="partita.stato">
                                                <option value="programmata">Programmata (Da giocare)</option>
                                                <option value="in_corso">In Corso (Live)</option>
                                                <option value="finita">Finita</option>
                                            </select>

                                            <div>
                                                <button @click="partita.isEditing = false" class="btn btn-sm btn-secondary me-2">Annulla</button>
                                                <button @click="aggiornaRisultato(partita)" class="btn btn-sm btn-success fw-bold">Salva</button>
                                            </div>
                                        </div>
                                    </div>

                                </li>
                            </ul>

                            
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>