<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { showToast } from '@/utils/toastStore'

const route = useRoute()

// ID reattivo: se l'utente clicca su un'altra squadra dalla classifica, la pagina si aggiorna senza ricaricare
const idSquadra = computed(() => parseInt(route.params.id))

// --- VARIABILI DI STATO ---
const squadra = ref(null)
const giocatori = ref([])
const partite = ref([])
const partiteCompetizione = ref([])
const notizie = ref([])
const marcatoriRisolti = ref([])
const caricamento = ref(true)
const errore = ref(null) 
const activeTab = ref('riepilogo')

// Gestione utente e preferiti
const utenteLoggato = ref(null)
const isPreferita = ref(false)

// Filtri annata
const annataSelezionata = ref('25/26')
const annateDisponibili = ref(['25/26'])

// UI Calendario e Risultati
const partiteEspanse = ref([])
const mostraTuttiRisultati = ref(false)
const mostraTuttoCalendario = ref(false)

const pluraleRuolo = {
  'Portiere': 'Portieri',
  'Difensore': 'Difensori',
  'Centrocampista': 'Centrocampisti',
  'Attaccante': 'Attaccanti'
}

// Recupero tutti i dati della squadra
const fetchDettagli = async () => {
  caricamento.value = true
  errore.value = null
  try {
    const response = await fetch(`/api/squadre/${idSquadra.value}/dettagli?annata=${annataSelezionata.value}`)
    if (response.ok) {
      const data = await response.json()
      squadra.value = data.squadra
      giocatori.value = data.giocatori
      partite.value = data.partite
      partiteCompetizione.value = data.partite_competizione
      marcatoriRisolti.value = data.marcatori || []
      notizie.value = data.notizie
      
      if (data.annate_disponibili && data.annate_disponibili.length > 0) {
        annateDisponibili.value = data.annate_disponibili
      }
      
      // Se l'annata selezionata non esiste per questa squadra, prendiamo la prima disponibile
      if (!annateDisponibili.value.includes(annataSelezionata.value) && annateDisponibili.value.length > 0) {
        annataSelezionata.value = annateDisponibili.value[0]
      }
    } else {
      errore.value = `Errore dal server: ${response.status} ${response.statusText}`
    }
  } catch (err) {
    console.error("Errore fetch dettagli squadra:", err)
    errore.value = "Impossibile connettersi al server."
  } finally {
    caricamento.value = false
  }
}

// --- LOGICA PREFERITI ---
const checkSession = async () => {
  try {
    const response = await fetch('/api/me')
    if (response.ok) {
      utenteLoggato.value = await response.json()
      await checkSePreferito() 
    } else {
      utenteLoggato.value = null
      isPreferita.value = false
    }
  } catch (error) {
    console.error("Errore sessione: ", error)
  }
}

const checkSePreferito = async () => {
  try {
    const response = await fetch('/api/preferiti')
    if (response.ok) {
      const data = await response.json()
      // Uso idSquadra.value perché è una variabile computed
      isPreferita.value = data.squadre.some(s => s.id === idSquadra.value)    
    }
  } catch (error) {
    console.error("Errore controllo preferiti: ", error)
  }
}

const togglePreferito = async () => {
  if(!utenteLoggato.value) {
    showToast("Devi accedere per aggiungere ai preferiti.", "warning")
    return
  }
  try {
    if (isPreferita.value){   
      const response = await fetch(`/api/preferiti/squadre/${idSquadra.value}`, { method: 'DELETE' })
      if(response.ok){
        isPreferita.value = false
        showToast("Squadra rimossa dai preferiti", "info")
      }
    } else {
      const response = await fetch(`/api/preferiti/squadre`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_squadra: idSquadra.value })
      })
      if (response.ok) {
        isPreferita.value = true
        showToast("Squadra aggiunta ai preferiti!", "success")
      }
    }
  } catch (error) {
    console.error("Errore di connessione: ", error)
  }
}

// Watchers per aggiornare i dati quando l'utente interagisce
watch(annataSelezionata, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    partiteEspanse.value = [] 
    mostraTuttiRisultati.value = false
    mostraTuttoCalendario.value = false
    fetchDettagli()
  }
})

watch(idSquadra, () => {
  activeTab.value = 'riepilogo' 
  isPreferita.value = false 
  fetchDettagli()
  checkSession()    
})

// --- RAGGRUPPAMENTO DATI ---
const giocatoriPerRuolo = computed(() => {
  const gruppi = { 'Portiere': [], 'Difensore': [], 'Centrocampista': [], 'Attaccante': [] }
  giocatori.value.forEach(g => {
    if (gruppi[g.ruolo]) gruppi[g.ruolo].push(g)
  })
  return gruppi
})

const partiteGiocate = computed(() => partite.value.filter(p => p.stato === 'finita'))
const partiteDaGiocare = computed(() => partite.value.filter(p => p.stato !== 'finita').reverse())

// Paginazione fittizia per non allungare troppo la pagina
const partiteGiocateVisibili = computed(() => mostraTuttiRisultati.value ? partiteGiocate.value : partiteGiocate.value.slice(0, 5))
const partiteDaGiocareVisibili = computed(() => mostraTuttoCalendario.value ? partiteDaGiocare.value : partiteDaGiocare.value.slice(0, 5))
const prossimePartite = computed(() => partiteDaGiocare.value.slice(0, 3))

// --- ALGORITMO CLASSIFICA ---
const classificaCalcolata = computed(() => {
  const classifica = {}

  const aggiornaStatistiche = (sq, golFatti, golSubiti) => {
    if (!classifica[sq.id]) {
      classifica[sq.id] = { id: sq.id, nome: sq.nome, logo: sq.logo_url, punti: 0, giocate: 0, v: 0, n: 0, p: 0, gf: 0, gs: 0, dr: 0, storicoForma: [] }
    }
    classifica[sq.id].giocate += 1
    classifica[sq.id].gf += golFatti
    classifica[sq.id].gs += golSubiti
    classifica[sq.id].dr = classifica[sq.id].gf - classifica[sq.id].gs

    if (golFatti > golSubiti) { 
      classifica[sq.id].punti += 3; 
      classifica[sq.id].v += 1;
      classifica[sq.id].storicoForma.push('V'); 
    }
    else if (golFatti === golSubiti) { 
      classifica[sq.id].punti += 1; 
      classifica[sq.id].n += 1;
      classifica[sq.id].storicoForma.push('N'); 
    }
    else { 
      classifica[sq.id].p += 1;
      classifica[sq.id].storicoForma.push('P'); 
    }
  }

  partiteCompetizione.value.forEach(p => {
    if (p.squadra_casa && p.squadra_trasferta) {
      aggiornaStatistiche(p.squadra_casa, p.gol_casa, p.gol_trasferta)
      aggiornaStatistiche(p.squadra_trasferta, p.gol_trasferta, p.gol_casa)
    }
  })

  return Object.values(classifica).map(sq => {
    sq.forma = sq.storicoForma.slice(-5).reverse()
    return sq
  }).sort((a, b) => {
    if (b.punti !== a.punti) return b.punti - a.punti
    if (b.dr !== a.dr) return b.dr - a.dr
    return b.gf - a.gf
  })
})

// --- FUNZIONI UI PER I TABELLINI ---
const toggleDettagliPartita = (partitaId) => {
  const index = partiteEspanse.value.indexOf(partitaId);
  if (index === -1) partiteEspanse.value.push(partitaId);
  else partiteEspanse.value.splice(index, 1);
};

const checkAutogol = (tipo) => {
  const t = (tipo || '').toLowerCase().trim();
  return t === 'autogol' || t === 'own_goal' || t === 'own goal' || t === 'owngoal';
};

const checkRigore = (tipo) => {
  const t = (tipo || '').toLowerCase().trim();
  return t === 'rigore' || t === 'penalty';
};

const getMarcatoriCasa = (partita) => {
  if (!partita || !partita.squadra_casa || !partita.squadra_trasferta) return [];
  return marcatoriRisolti.value.filter(m => {
    if (Number(m.id_partita) !== Number(partita.id)) return false; 
    const idSquadraGiocatore = Number(m.giocatore?.id_squadra);
    const idCasa = Number(partita.squadra_casa.id);
    const idTrasferta = Number(partita.squadra_trasferta.id);
    const isAutogol = checkAutogol(m.tipo_gol);
    return (idSquadraGiocatore === idCasa && !isAutogol) || (idSquadraGiocatore === idTrasferta && isAutogol);
  }).sort((a, b) => Number(a.minuto) - Number(b.minuto));
};

const getMarcatoriTrasferta = (partita) => {
  if (!partita || !partita.squadra_casa || !partita.squadra_trasferta) return [];
  return marcatoriRisolti.value.filter(m => {
    if (Number(m.id_partita) !== Number(partita.id)) return false;
    const idSquadraGiocatore = Number(m.giocatore?.id_squadra);
    const idCasa = Number(partita.squadra_casa.id);
    const idTrasferta = Number(partita.squadra_trasferta.id);
    const isAutogol = checkAutogol(m.tipo_gol);
    return (idSquadraGiocatore === idTrasferta && !isAutogol) || (idSquadraGiocatore === idCasa && isAutogol);
  }).sort((a, b) => Number(a.minuto) - Number(b.minuto));
};

// --- UTILITY FORMATTAZIONE ---
const getBadgeClass = (index) => {
  if (index < 4) return 'badge-champions'
  if (index === 4) return 'badge-europa'
  if (index === 5) return 'badge-conference'
  return 'badge-default'
}

const formattaData = (dataStringa) => {
  const opzioni = { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
  return new Date(dataStringa).toLocaleDateString('it-IT', opzioni)
}

onMounted(() => {
  fetchDettagli()
  checkSession()
})
</script>

<template>
  <div class="container py-5">
    
    <div v-if="caricamento && !squadra" class="text-center my-5">
      <div class="spinner-border text-success" role="status"></div>
    </div>

    <div v-else-if="errore" class="alert alert-danger text-center my-5 rounded-4 shadow-sm">
      <h4 class="fw-bold">Ops! Qualcosa è andato storto.</h4>
      <p>{{ errore }}</p>
      <button class="btn btn-success mt-3" @click="fetchDettagli">Riprova</button>
    </div>

    <div v-else-if="squadra">
      
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 bg-white p-4 rounded-4 shadow-sm border">
        <img :src="squadra.logo_url || 'https://via.placeholder.com/100'" class="me-md-4 img-fluid rounded" style="width: 100px; height: 100px; object-fit: contain;">
        <div class="w-100 text-center text-md-start my-3">
            <h1 class="fw-bold mb-1 d-md-flex align-items-center text-center justify-content-center justify-content-md-start">
              <span class="me-3">{{ squadra.nome }}</span>
              
              <span
                class="fs-3 user-select-none" 
                :class="isPreferita ?  'text-warning' : 'text-secondary'" 
                style="cursor: pointer; transition: transform 0.2s; display: inline-block;" 
                @click="togglePreferito"
                :title="isPreferita ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'"
              >
              {{ isPreferita ? '★' : '☆' }}
              </span>
            </h1>
            
            <p class="text-muted mb-0 fs-5">
              Competizione: 
              <RouterLink v-if="squadra.competizioni" :to="{ path: `/competizioni/${squadra.competizioni.id}`, query: { annata: annataSelezionata } }" class="text-decoration-none text-dark custom-link fw-bold">
                {{ squadra.competizioni.nome }}
              </RouterLink>
              <strong v-else>N.D.</strong>
            </p>
          </div>
        <div>
          <label class="form-label text-muted small fw-bold mb-1 d-block">Stagione</label>
          <select class="form-select border-success fw-bold w-auto" v-model="annataSelezionata">
            <option v-for="annata in annateDisponibili" :key="annata" :value="annata">
              {{ annata }}
            </option>
          </select>
        </div>
      </div>

      <ul class="nav nav-tabs mb-4 border-bottom-2 flex-nowrap overflow-auto" style="white-space: nowrap;">
        <li class="nav-item" v-for="tab in ['riepilogo', 'risultati', 'calendario', 'classifica', 'rosa', 'news']" :key="tab">
          <a class="nav-link fw-bold text-uppercase px-4" 
             :class="{ 'active text-success border-success border-bottom-3': activeTab === tab, 'text-muted': activeTab !== tab }" 
             href="#" @click.prevent="activeTab = tab">
            {{ tab }}
          </a>
        </li>
      </ul>

      <div class="bg-white p-4 rounded-4 shadow-sm border min-vh-50 position-relative">
        
        <div v-if="caricamento" class="position-absolute top-0 start-0 w-100 h-100 bg-white bg-opacity-75 d-flex justify-content-center align-items-center rounded-4" style="z-index: 10;">
          <div class="spinner-border text-success" role="status"></div>
        </div>

        <div v-if="activeTab === 'riepilogo'">
          <h5 class="fw-bold mb-3">Prossime Partite</h5>
          <div v-if="prossimePartite.length === 0" class="text-muted">Nessuna partita in programma.</div>
          <div class="row g-3">
            <div v-for="partita in prossimePartite" :key="partita.id" class="col-md-6 col-lg-4">
              <div class="card border-0 shadow-sm transition h-100">
                <div class="card-body p-3">
                  <div class="text-center mb-3">
                    <span class="badge bg-light text-dark border fw-normal">{{ formattaData(partita.data_ora) }}</span>
                  </div>
                  <div class="d-flex align-items-center justify-content-between">
                    <RouterLink :to="`/squadre/${partita.squadra_casa?.id}`" class="text-center text-decoration-none custom-link" style="width: 35%;">
                      <img :src="partita.squadra_casa?.logo_url" class="img-fluid mb-2" style="max-height: 40px; object-fit: contain;">
                      <div class="small text-truncate" :class="{'text-success fw-bold': partita.id_squadra_casa === squadra.id, 'fw-bold text-dark': partita.id_squadra_casa !== squadra.id}">
                        {{ partita.squadra_casa?.nome }}
                      </div>
                    </RouterLink>
                    
                    <div class="fw-bold text-muted px-3">VS</div>
                    
                    <RouterLink :to="`/squadre/${partita.squadra_trasferta?.id}`" class="text-center text-decoration-none custom-link" style="width: 35%;">
                      <img :src="partita.squadra_trasferta?.logo_url" class="img-fluid mb-2" style="max-height: 40px; object-fit: contain;">
                       <div class="small text-truncate" :class="{'text-success fw-bold': partita.id_squadra_trasferta === squadra.id, 'fw-bold text-dark': partita.id_squadra_trasferta !== squadra.id}">
                        {{ partita.squadra_trasferta?.nome }}
                      </div>
                    </RouterLink>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'risultati'">
          <div v-if="partiteGiocate.length === 0" class="text-muted text-center py-4">Nessun risultato disponibile.</div>
          <div class="row g-3">
            <div v-for="partita in partiteGiocateVisibili" :key="partita.id" class="col-12 col-lg-6">
              <div class="card border-0 shadow-sm transition">
                <div class="card-body p-3">
                  <div class="text-center mb-3">
                    <span class="badge bg-light text-dark border fw-normal">{{ formattaData(partita.data_ora) }}</span>
                  </div>
                  <div class="d-flex align-items-center justify-content-between">
                    <RouterLink :to="`/squadre/${partita.squadra_casa?.id}`" class="text-center text-decoration-none custom-link" style="width: 35%;">
                      <img :src="partita.squadra_casa?.logo_url" class="img-fluid mb-2" style="max-height: 40px; object-fit: contain;">
                      <div class="small text-truncate" :class="{'text-success fw-bold': partita.id_squadra_casa === squadra.id, 'fw-bold text-dark': partita.id_squadra_casa !== squadra.id}">
                        {{ partita.squadra_casa?.nome }}
                      </div>
                    </RouterLink>

                    <div class="px-2 text-center punteggio-box p-2 rounded-3" @click="toggleDettagliPartita(partita.id)">
                      <div class="fw-black fs-4 text-dark lh-1 mb-1">{{ partita.gol_casa }} - {{ partita.gol_trasferta }}</div>
                      <div class="d-flex align-items-center justify-content-center gap-1 text-secondary" style="font-size: 0.65rem;">
                        <span>FINALE</span>
                        <span class="freccia-dettagli" :class="{'ruotata': partiteEspanse.includes(partita.id)}">▼</span>
                      </div>
                    </div>

                    <RouterLink :to="`/squadre/${partita.squadra_trasferta?.id}`" class="text-center text-decoration-none custom-link" style="width: 35%;">
                      <img :src="partita.squadra_trasferta?.logo_url" class="img-fluid mb-2" style="max-height: 40px; object-fit: contain;">
                      <div class="small text-truncate" :class="{'text-success fw-bold': partita.id_squadra_trasferta === squadra.id, 'fw-bold text-dark': partita.id_squadra_trasferta !== squadra.id}">
                        {{ partita.squadra_trasferta?.nome }}
                      </div>
                    </RouterLink>
                  </div>
                </div>
                
                <div v-if="partiteEspanse.includes(partita.id)" class="card-footer bg-white border-top p-3 details-dropdown">
                  <div class="row text-muted small">
                    <div class="col-6 text-end pe-3 border-end">
                      <div v-for="m in getMarcatoriCasa(partita)" :key="m.id" class="mb-1">
                        <span class="me-1">{{ m.giocatore?.nome_cognome }} {{ m.minuto }}'</span>
                        <span v-if="checkRigore(m.tipo_gol)">(R) ⚽</span>
                        <span v-else-if="checkAutogol(m.tipo_gol)">🔴⚽ <small>(Aut)</small></span>
                        <span v-else>⚽</span>
                      </div>
                    </div>
                    <div class="col-6 text-start ps-3">
                      <div v-for="m in getMarcatoriTrasferta(partita)" :key="m.id" class="mb-1">
                        <span v-if="checkRigore(m.tipo_gol)">⚽ (R)</span>
                        <span v-else-if="checkAutogol(m.tipo_gol)">🔴⚽ <small>(Aut)</small></span>
                        <span v-else>⚽</span>
                        <span class="ms-1">{{ m.minuto }}' {{ m.giocatore?.nome_cognome }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="partiteGiocate.length > 5" class="text-center mt-4">
            <button class="btn btn-outline-success rounded-pill px-4 fw-bold" @click="mostraTuttiRisultati = !mostraTuttiRisultati">
              {{ mostraTuttiRisultati ? 'Mostra meno' : 'Mostra tutte le partite' }}
            </button>
          </div>
        </div>

        <div v-if="activeTab === 'calendario'">
          <div v-if="partiteDaGiocare.length === 0" class="text-muted text-center py-4">Nessuna partita in programma.</div>
          <div class="row g-3">
            <div v-for="partita in partiteDaGiocareVisibili" :key="partita.id" class="col-12 col-lg-6">
              <div class="card border-0 shadow-sm transition">
                <div class="card-body p-3">
                  <div class="text-center mb-3">
                    <span class="badge bg-light text-dark border fw-normal">{{ formattaData(partita.data_ora) }}</span>
                  </div>
                  <div class="d-flex align-items-center justify-content-between">
                    <RouterLink :to="`/squadre/${partita.squadra_casa?.id}`" class="text-center text-decoration-none custom-link" style="width: 35%;">
                      <img :src="partita.squadra_casa?.logo_url" class="img-fluid mb-2" style="max-height: 40px; object-fit: contain;">
                      <div class="small text-truncate" :class="{'text-success fw-bold': partita.id_squadra_casa === squadra.id, 'fw-bold text-dark': partita.id_squadra_casa !== squadra.id}">
                        {{ partita.squadra_casa?.nome }}
                      </div>
                    </RouterLink>
                    
                    <div class="fw-bold text-muted px-3">VS</div>
                    
                    <RouterLink :to="`/squadre/${partita.squadra_trasferta?.id}`" class="text-center text-decoration-none custom-link" style="width: 35%;">
                      <img :src="partita.squadra_trasferta?.logo_url" class="img-fluid mb-2" style="max-height: 40px; object-fit: contain;">
                      <div class="small text-truncate" :class="{'text-success fw-bold': partita.id_squadra_trasferta === squadra.id, 'fw-bold text-dark': partita.id_squadra_trasferta !== squadra.id}">
                        {{ partita.squadra_trasferta?.nome }}
                      </div>
                    </RouterLink>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="partiteDaGiocare.length > 5" class="text-center mt-4">
            <button class="btn btn-outline-success rounded-pill px-4 fw-bold" @click="mostraTuttoCalendario = !mostraTuttoCalendario">
              {{ mostraTuttoCalendario ? 'Mostra meno' : 'Mostra tutto il calendario' }}
            </button>
          </div>
        </div>

        <div v-if="activeTab === 'classifica'">
          <div v-if="classificaCalcolata.length === 0" class="text-muted text-center py-4">Classifica non disponibile.</div>
          <div v-else class="table-responsive">
            <table class="table table-hover align-middle text-center">
              <thead class="table-light text-muted small text-uppercase">
                <tr>
                  <th class="text-start" style="width: 50px;">#</th>
                  <th class="text-start">Squadra</th>
                  <th>PG</th>
                  <th>V</th>
                  <th>N</th>
                  <th>P</th>
                  <th class="d-none d-md-table-cell">Reti</th>
                  <th>DR</th>
                  <th class="fs-6 text-dark">PT</th>
                  <th>Forma</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(sq, index) in classificaCalcolata" :key="sq.id" :class="{'table-success fw-bold': sq.id === squadra.id}">
                  <td class="text-start">
                    <div class="pos-badge" :class="getBadgeClass(index)">{{ index + 1 }}</div>
                  </td>
                  <td class="text-start fw-semibold">
                    <RouterLink :to="`/squadre/${sq.id}`" class="text-decoration-none text-dark d-flex align-items-center custom-link">
                      <img :src="sq.logo || 'https://via.placeholder.com/25'" class="me-2" style="width: auto; height: 25px;">
                      {{ sq.nome }}
                    </RouterLink>
                  </td>
                  <td>{{ sq.giocate }}</td>
                  <td>{{ sq.v }}</td>
                  <td>{{ sq.n }}</td>
                  <td>{{ sq.p }}</td>
                  <td class="d-none d-md-table-cell text-muted">{{ sq.gf }}:{{ sq.gs }}</td>
                  <td>{{ sq.dr > 0 ? '+'+sq.dr : sq.dr }}</td>
                  <td class="fw-bold fs-5">{{ sq.punti }}</td>
                  <td>
                    <div class="d-flex justify-content-center gap-1">
                      <span v-for="(ris, i) in sq.forma" :key="i" class="forma-box" :class="'forma-' + ris.toLowerCase()">{{ ris }}</span>
                      <span v-for="i in (5 - sq.forma.length)" :key="'empty'+i" class="forma-box forma-empty">?</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="activeTab === 'rosa'">
          <div v-if="giocatori.length === 0" class="text-muted text-center py-4">Nessun giocatore in rosa.</div>
          <div v-else class="row g-4">
            <div v-for="(lista, ruolo) in giocatoriPerRuolo" :key="ruolo" class="col-md-6">
              <h5 class="border-bottom pb-2 text-secondary">{{ pluraleRuolo[ruolo] || ruolo }}</h5>
              <ul class="list-group list-group-flush">
                <li v-for="g in lista" :key="g.id" class="list-group-item px-0 fw-semibold">
                  <RouterLink
                        :key="g.nome_cognome" 
                        :to="`/giocatori/${g.nome_cognome}`" 
                        class="list-group-item list-group-item-action d-flex justify-content-between align-items-center text-decoration-none"
                    >
                    {{ g.nome_cognome }}
                  </RouterLink>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'news'">
          <div v-if="notizie.length === 0" class="text-muted text-center py-4">Nessuna notizia recente.</div>
          <div v-else class="list-group shadow-sm">
            <RouterLink v-for="n in notizie" :key="n.id" :to="`/notizie/${n.id}`" class="list-group-item list-group-item-action py-3 d-flex align-items-center text-decoration-none text-dark">
              <img :src="n.img_url || 'https://via.placeholder.com/80'" class="rounded me-3" style="width: 80px; height: 60px; object-fit: cover;">
              <div>
                <h5 class="mb-1 fw-bold">{{ n.titolo }}</h5>
                <small class="text-muted">{{ formattaData(n.data_pubblicazione) }}</small>
              </div>
            </RouterLink>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>

</style>