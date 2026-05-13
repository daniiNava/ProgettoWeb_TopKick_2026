<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const dati = ref(null)
const caricamento = ref(true)
const errore = ref(null)
const activeTab = ref('riepilogo')

// --- LOGICA ESPANSIONE PARTITE ---
const mostraTuttePartite = ref(false)

const partiteVisibili = computed(() => {
  if (!dati.value || !dati.value.ultime_partite) return []
  // Se è true mostra tutto l'array, altrimenti taglia ai primi 5 elementi
  return mostraTuttePartite.value ? dati.value.ultime_partite : dati.value.ultime_partite.slice(0, 5)
})

const fetchDatiGiocatore = async () => {
  caricamento.value = true
  errore.value = null
  
  const chiaviParams = Object.keys(route.params)
  const identifier = chiaviParams.length > 0 ? route.params[chiaviParams[0]] : null
  
  if (!identifier) {
    errore.value = "Errore di caricamento: parametro URL mancante."
    caricamento.value = false
    return
  }

  try {
    const response = await fetch(`/api/giocatori/dettaglio/${encodeURIComponent(identifier)}`)
    if (!response.ok) {
       const errorData = await response.json()
       throw new Error(errorData.message || "Giocatore non trovato")
    }
    dati.value = await response.json()
  } catch (err) {
    errore.value = err.message
  } finally {
    caricamento.value = false
  }
}

// Funzioni per l'Età e formattazione Date
const formattaDataNascita = (dataStr) => {
  if (!dataStr) return 'N.D.'
  const d = new Date(dataStr)
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')
}

const calcolaEta = (data) => {
  if (!data) return ''
  const nascita = new Date(data)
  const oggi = new Date()
  let eta = oggi.getFullYear() - nascita.getFullYear()
  if (oggi.getMonth() < nascita.getMonth() || (oggi.getMonth() === nascita.getMonth() && oggi.getDate() < nascita.getDate())) eta--
  return `${eta} (${formattaDataNascita(data)})`
}

const formattaDataPartita = (dataStr) => {
  const d = new Date(dataStr)
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '.')
}

// Calcolo Esito Partita (V, N, P)
const getEsito = (match) => {
  if (!dati.value) return { testo: '-', classe: 'bg-secondary' }
  const idSquadraGiocatore = dati.value.info.id_squadra
  
  const golCasa = match.gol_casa || 0
  const golTrasferta = match.gol_trasferta || 0

  if (golCasa === golTrasferta) return { testo: 'N', classe: 'bg-warning text-dark' }

  const inCasa = match.squadra_casa?.id === idSquadraGiocatore
  const vittoriaEffettiva = inCasa ? (golCasa > golTrasferta) : (golTrasferta > golCasa)

  return vittoriaEffettiva 
    ? { testo: 'V', classe: 'bg-success' } 
    : { testo: 'P', classe: 'bg-danger' }
}

watch(() => route.params, () => fetchDatiGiocatore(), { deep: true })
onMounted(() => fetchDatiGiocatore())
</script>

<template>
  <div class="container py-4 py-md-5 bg-light-soft max-w-custom">
    
    <div v-if="caricamento" class="d-flex justify-content-center align-items-center py-5" style="min-height: 50vh;">
      <div class="spinner-border text-success" style="width: 3rem; height: 3rem;" role="status"></div>
    </div>

    <div v-else-if="errore" class="alert alert-danger text-center shadow-sm rounded-4 max-w-md mx-auto mt-5">
      <i class="bi bi-exclamation-circle fs-3 d-block mb-2"></i>
      {{ errore }}
      <div class="mt-3">
        <RouterLink to="/" class="btn btn-outline-danger rounded-pill px-4">Torna alla Home</RouterLink>
      </div>
    </div>

    <div v-else-if="dati">
      
      <div class="bg-white rounded-3 shadow-sm border mb-3 p-4 d-flex flex-column flex-md-row align-items-center align-items-md-start gap-4">
        <div class="avatar-box border rounded-3 flex-shrink-0 d-flex align-items-center justify-content-center bg-light">
           <span v-if="!dati.info.img_url" class="fs-1 fw-bold text-success">
             {{ dati.info.nome_cognome.split(' ').map(n => n[0]).join('') }}
           </span>
           <img v-else :src="dati.info.img_url" class="img-fluid rounded-3" style="width: 100%; height: 100%; object-fit: cover;">
        </div>

        <div class="flex-grow-1 text-center text-md-start mt-2">
          <h1 class="fw-bolder mb-2 text-dark fs-2">{{ dati.info.nome_cognome }}</h1>
          
          <div class="text-dark fs-6 lh-lg">
            <div><span class="fw-bold">{{ dati.info.ruolo }}</span> ({{ dati.info.squadre?.nome }})</div>
            <div><span class="fw-bold">Età:</span> {{ calcolaEta(dati.info.data_nascita) }}</div>
            <div class="text-muted"><span class="fw-bold text-dark">Numero maglia:</span> {{ dati.info.numero }}</div>
            <div class="text-muted"><span class="fw-bold text-dark">Nazionalità:</span> {{ dati.info.nazionalita || 'N.D.' }}</div>
          </div>
        </div>

        <div class="club-maxi-logo d-none d-md-flex align-items-center justify-content-center border rounded-3 bg-white p-3 flex-shrink-0 ms-auto">
          <img :src="dati.info.squadre?.logo_url" class="img-fluid" style="max-height: 80px; object-fit: contain;">
        </div>
      </div>

      <div class="border-bottom mb-4 flashscore-tabs-container">
        <ul class="nav nav-tabs gap-4 mb-0">
          <li class="nav-item">
            <button class="nav-link text-uppercase fw-bold pb-3 px-0 border-0 bg-transparent"
               :class="{ 'active-tab text-dark': activeTab === 'riepilogo', 'text-muted': activeTab !== 'riepilogo' }" 
               @click="activeTab = 'riepilogo'">
              Riepilogo
            </button>
          </li>
          <li class="nav-item">
            <button class="nav-link text-uppercase fw-bold pb-3 px-0 border-0 bg-transparent"
               :class="{ 'active-tab text-dark': activeTab === 'carriera', 'text-muted': activeTab !== 'carriera' }" 
               @click="activeTab = 'carriera'">
              Carriera
            </button>
          </li>
        </ul>
      </div>

      <div v-if="activeTab === 'riepilogo'">
        <h5 class="fw-bold text-dark mb-3">Ultime partite</h5>
        
        <div class="bg-white border rounded-3 shadow-sm overflow-hidden mb-5">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0 custom-flash-table">
              <thead class="bg-light border-bottom text-muted">
                <tr>
                  <th class="py-2 ps-3 fw-normal small" style="width: 120px;">Data</th>
                  <th class="py-2 pe-5 fw-normal small">Incontro</th>
                  <th class="text-center py-2 fw-normal small ps-3" style="width: 60px;">⚽</th>
                  <th class="text-center py-2 fw-normal small" style="width: 60px;">👟</th>
                  <th class="text-center py-2 fw-normal small pe-3" style="width: 50px;"></th>
                </tr>
              </thead>
              <tbody v-if="partiteVisibili.length > 0">
                <tr v-for="match in partiteVisibili" :key="match.id" class="border-bottom">
                  
                  <td class="ps-3 text-muted small">{{ formattaDataPartita(match.data_ora) }}</td>
                  
                  <td class="py-2 pe-5">
                    <div class="d-flex align-items-center justify-content-between mb-1" :class="{'fw-bold': match.gol_casa > match.gol_trasferta}">
                      <div class="d-flex align-items-center">
                        <img :src="match.squadra_casa?.logo_url" class="match-logo me-2">
                        <span>{{ match.squadra_casa?.nome }}</span>
                      </div>
                      <span class="ms-3">{{ match.gol_casa }}</span>
                    </div>
                    <div class="d-flex align-items-center justify-content-between" :class="{'fw-bold': match.gol_trasferta > match.gol_casa}">
                      <div class="d-flex align-items-center">
                        <img :src="match.squadra_trasferta?.logo_url" class="match-logo me-2">
                        <span>{{ match.squadra_trasferta?.nome }}</span>
                      </div>
                      <span class="ms-3">{{ match.gol_trasferta }}</span>
                    </div>
                  </td>

                  <td class="text-center fw-bold ps-3" :class="match.gol_giocatore > 0 ? 'text-success' : 'text-muted'">
                    {{ match.gol_giocatore || 0 }}
                  </td>
                  <td class="text-center fw-bold" :class="match.assist_giocatore > 0 ? 'text-primary' : 'text-muted'">
                    {{ match.assist_giocatore || 0 }}
                  </td>

                  <td class="pe-3 text-end">
                    <span class="badge rounded-1 fs-7" :class="getEsito(match).classe">
                      {{ getEsito(match).testo }}
                    </span>
                  </td>
                </tr>
              </tbody>
              <tbody v-else>
                <tr>
                  <td colspan="5" class="text-center py-4 text-muted">Nessuna partita recente trovata.</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div v-if="dati.ultime_partite && dati.ultime_partite.length > 5" 
               class="text-center py-2 bg-light border-top show-more-bar"
               @click="mostraTuttePartite = !mostraTuttePartite">
            <span class="text-muted fw-bold small text-uppercase d-flex align-items-center justify-content-center gap-2">
              {{ mostraTuttePartite ? 'Mostra meno' : 'Mostra altri incontri' }}
              <i class="bi" :class="mostraTuttePartite ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
            </span>
          </div>

        </div>
      </div>

      <div v-if="activeTab === 'carriera'">
        <h5 class="fw-bold text-dark mb-3">Storico Stagioni</h5>
        <div class="bg-white border rounded-3 shadow-sm overflow-hidden mb-5">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0 custom-flash-table">
              <thead class="bg-light border-bottom text-muted">
                <tr>
                  <th class="ps-3 py-2 fw-bold small text-uppercase">Stagione</th>
                  <th class="py-2 fw-bold small text-uppercase">Squadra</th>
                  <th class="text-center py-2 fw-bold small text-uppercase">N°</th>
                  <th class="text-center py-2 fw-bold small text-uppercase">Gol</th>
                  <th class="text-center py-2 fw-bold small text-uppercase pe-3">Assist</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="anno in dati.carriera" :key="anno.id" class="border-bottom">
                  <td class="ps-3 fw-bold text-secondary">{{ anno.annata }}</td>
                  <td class="fw-medium">
                    <div class="d-flex align-items-center">
                      <img :src="anno.squadre?.logo_url" class="match-logo me-2" alt="Logo">
                      {{ anno.squadre?.nome }}
                    </div>
                  </td>
                  <td class="text-center text-muted">{{ anno.numero }}</td>
                  <td class="text-center fw-bold text-success">{{ anno.gol || 0 }}</td>
                  <td class="text-center fw-bold text-primary pe-3">{{ anno.assist || 0 }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.nav-tabs .nav-link { color: #6c757d; border-bottom: 3px solid transparent !important; border-radius: 0; transition: all 0.2s ease; letter-spacing: 0.5px; }
.nav-tabs .nav-link:hover { color: #212529 !important; }
.nav-tabs .active-tab { border-bottom: 3px solid #198754 !important; }
</style>