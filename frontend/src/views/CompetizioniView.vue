<script setup>
import { ref, onMounted, computed } from 'vue'

const competizioni = ref([])
const partite = ref([])
const caricamento = ref(true)
const ricerca = ref('') // Aggiunta per coerenza con news

// Variabili per l'Annata
const annataSelezionata = ref('25/26')
const annateDisponibili = ref(['23/24','24/25','25/26'])

const fetchDati = async () => {
  caricamento.value = true
  try {
    const response = await fetch(`/api/competizioni?annata=${annataSelezionata.value}`)
    if (response.ok) {
      const data = await response.json()
      competizioni.value = data.competizioni
      partite.value = data.partite
      annateDisponibili.value=data.annate_disponibili
    }
  } catch (error) {
    console.error("Errore:", error)
  } finally {
    caricamento.value = false
  }
}

// Filtro per la ricerca (Pattern Notizie)
const competizioniFiltrate = computed(() => {
  return competizioni.value.filter(c => 
    c.nome.toLowerCase().includes(ricerca.value.toLowerCase())
  )
})

const calcolaClassifica = (idComp) => {
  const classifica = {}
  const partiteComp = partite.value.filter(p => p.id_competizione === idComp)

  partiteComp.forEach(p => {
    if (p.squadra_casa && p.squadra_trasferta) {
      [p.squadra_casa, p.squadra_trasferta].forEach(sq => {
        if (!classifica[sq.id]) {
          classifica[sq.id] = { id: sq.id, nome: sq.nome, logo: sq.logo_url, punti: 0, gf: 0, gs: 0 }
        }
      })
      
      classifica[p.squadra_casa.id].gf += p.gol_casa
      classifica[p.squadra_casa.id].gs += p.gol_trasferta
      classifica[p.squadra_trasferta.id].gf += p.gol_trasferta
      classifica[p.squadra_trasferta.id].gs += p.gol_casa

      if (p.gol_casa > p.gol_trasferta) classifica[p.squadra_casa.id].punti += 3
      else if (p.gol_casa < p.gol_trasferta) classifica[p.squadra_trasferta.id].punti += 3
      else {
        classifica[p.squadra_casa.id].punti += 1
        classifica[p.squadra_trasferta.id].punti += 1
      }
    }
  })

  return Object.values(classifica).sort((a, b) => {
    if (b.punti !== a.punti) return b.punti - a.punti
    return (b.gf - b.gs) - (a.gf - a.gs)
  })
}

const top6PerCompetizione = computed(() => {
  const result = {}
  competizioni.value.forEach(c => {
    result[c.id] = calcolaClassifica(c.id).slice(0, 6) || []
  })
  return result
})

const getBadgeClass = (index) => {
  if (index < 4) return 'badge-champions'
  if (index === 4) return 'badge-europa'
  if (index === 5) return 'badge-conference'
  return 'badge-default'
}

onMounted(() => fetchDati())
</script>

<template>
  <div class="container py-5">
    
    <!-- HEADER (Pattern Notizie: Titolo a sinistra, Filtri a destra) -->
    <div class="row align-items-center mb-5 border-bottom pb-4 border-success">
      <div class="col-lg-6">
          <h1 class="fw-bold text-success mb-0">Campionati & Coppe</h1>
          <p class="text-muted">Classifiche in tempo reale della stagione</p>
      </div>
      
      <div class="col-lg-6">
          <div class="row g-2">
              <div class="col-md-8">
                  <input 
                      v-model="ricerca" 
                      type="text" 
                      class="form-control border-success" 
                      placeholder="Cerca campionato (es: Serie A...)"
                  >
              </div>
              <div class="col-md-4">
                  <select class="form-select border-success fw-bold" v-model="annataSelezionata" @change="fetchDati">
                    <option v-for="annata in annateDisponibili" :key="annata" :value="annata">
                      {{ annata }}
                    </option>
                  </select>
              </div>
          </div>
      </div>
    </div>

    <!-- CARICAMENTO -->
    <div v-if="caricamento" class="text-center my-5 py-5">
      <div class="spinner-border text-success" role="status"></div>
      <p class="mt-2 text-muted">Aggiornamento classifiche...</p>
    </div>

    <!-- GRIGLIA COMPETIZIONI -->
    <div v-else class="row g-4">
      
      <!-- Caso Nessun Risultato -->
      <div v-if="competizioniFiltrate.length === 0" class="alert alert-info text-center w-100">
        Nessuna competizione trovata per "{{ ricerca }}" nella stagione {{ annataSelezionata }}.
      </div>

      <!-- Card Singola Competizione -->
      <div v-for="comp in competizioniFiltrate" :key="comp.id" class="col-lg-6">
        <div v-if="top6PerCompetizione[comp.id] && top6PerCompetizione[comp.id].length > 0" class="card h-100 shadow-sm border-0 rounded-4 overflow-hidden comp-card">
          
          <!-- Accent Line superiore (Pattern Verde) -->
          <div class="bg-success" style="height: 4px;"></div>

          <!-- Header Card -->
          <div class="card-header bg-white border-bottom-0 pt-4 pb-3 d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
              <img :src="comp.logo_url || 'https://via.placeholder.com/40'" class="me-3" style="width: auto; height: 45px; object-fit: contain;">
              <div>
                <h4 class="fw-bold mb-0 text-dark">{{ comp.nome }}</h4>
                <small class="text-muted">Stagione {{ annataSelezionata }}</small>
              </div>
            </div>
          </div>

          <!-- Body Card (Mini Classifica) -->
          <div class="card-body pt-0">
            
            <table class="table table-hover align-middle mb-0">
              <thead>
                <tr class="text-muted small uppercase">
                  <th style="width: 40px;">Pos</th>
                  <th>Squadra</th>
                  <th class="text-end">Punti</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(sq, index) in top6PerCompetizione[comp.id]" :key="sq.id">
                  <td>
                    <div class="pos-badge" :class="getBadgeClass(index)">{{ index + 1 }}</div>
                  </td>
                  <td>
                    <RouterLink :to="`/squadre/${sq.id}`" class="text-decoration-none text-dark fw-semibold d-flex align-items-center custom-link">
                      <img :src="sq.logo || 'https://via.placeholder.com/25'" class="me-2" style="width: 25px; height: 25px; object-fit: contain;">
                      {{ sq.nome }}
                    </RouterLink>
                  </td>
                  <td class="text-end fw-bold">
                    <span class="fs-5">{{ sq.punti }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <RouterLink :to="{ path: `/competizioni/${comp.id}`, query: { annata: annataSelezionata } }" class="btn btn-sm btn-success rounded-pill px-3 shadow-sm w-100">
              Classifica Completa ➔
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
/* Stile tabella */
.table thead th {
  font-size: 0.75rem;
  font-weight: 700;
  border: none;
}
.table td {
  border-color: #f8f9fa;
  padding: 10px 0;
}
</style>