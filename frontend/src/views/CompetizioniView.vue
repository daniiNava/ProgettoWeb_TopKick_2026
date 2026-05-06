<script setup>
import { ref, onMounted, computed, watch } from 'vue'

const competizioni = ref([])
const partite = ref([])
const caricamento = ref(true)

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
      console.log(data)
    }
  } catch (error) {
    console.error("Errore:", error)
  } finally {
    caricamento.value = false
  }
}



// Funzione che calcola la classifica per una specifica competizione (VERSIONE SICURA)
const calcolaClassifica = (idComp) => {
  const classifica = {}
  const partiteComp = partite.value.filter(p => p.id_competizione === idComp)

  partiteComp.forEach(p => {
    // CONTROLLO FONDAMENTALE: Procediamo solo se la partita ha entrambe le squadre
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

// Restituisce solo le prime 6 squadre per ogni competizione
const top6PerCompetizione = computed(() => {
  const result = {}
  competizioni.value.forEach(c => {
    // Assicuriamoci che restituisca sempre un array, anche vuoto
    result[c.id] = calcolaClassifica(c.id).slice(0, 6) || []
  })
  return result
})

// Funzione per il colore del badge posizione
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
    
    <!-- HEADER CON TITOLO E MENU A TENDINA -->
    <div class="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2 border-success">
      <h1 class="fw-bold mb-0">Tutte le Competizioni</h1>
      
      <div>
        <label class="form-label text-muted small fw-bold mb-1 d-block text-end">Stagione</label>
        <select class="form-select border-success fw-bold w-auto" v-model="annataSelezionata" @change="fetchDati">
          <option v-for="annata in annateDisponibili" :key="annata" :value="annata">
            {{ annata }}
          </option>
        </select>
      </div>
    </div>

    <!-- CARICAMENTO -->
    <div v-if="caricamento" class="text-center my-5">
      <div class="spinner-border text-success" role="status"></div>
    </div>

    <!-- GRIGLIA COMPETIZIONI -->
    <div v-else class="row g-4">
      
      <div v-if="competizioni.length === 0" class="alert alert-info text-center w-100">
        Nessuna competizione presente nel database.
      </div>

      <div v-for="comp in competizioni" :key="comp.id" class="col-lg-6">
        <div class="card h-100 shadow-sm border-0 rounded-4 overflow-hidden">
          
          <!-- Header Card -->
          <div class="card-header bg-white border-bottom-0 pt-4 pb-0 d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
              <img :src="comp.logo_url || 'https://via.placeholder.com/40'" class="me-3" style="width: auto; height: 40px;">
              <h4 class="fw-bold mb-0">{{ comp.nome }}</h4>
            </div>
            <RouterLink :to="{ path: `/competizioni/${comp.id}`, query: { annata: annataSelezionata } }" class="btn btn-sm btn-outline-success rounded-pill px-3 fw-bold">
              Vedi tutta ➔
            </RouterLink>
          </div>

          <!-- Body Card (Mini Classifica) -->
          <div class="card-body">
            <!-- Il ?. previene il crash se l'array non è ancora pronto -->
            <div v-if="!top6PerCompetizione[comp.id] || top6PerCompetizione[comp.id].length === 0" class="text-muted text-center py-3">              Nessuna partita giocata nella stagione {{ annataSelezionata }}.
            </div>
            
            <table v-else class="table table-borderless align-middle mb-0">
              <tbody>
                <tr v-for="(sq, index) in top6PerCompetizione[comp.id]" :key="sq.id" class="border-bottom">
                  <td style="width: 40px;">
                    <div class="pos-badge" :class="getBadgeClass(index)">{{ index + 1 }}.</div>
                  </td>
                  <td>
                    <RouterLink :to="`/squadre/${sq.id}`" class="text-decoration-none text-dark fw-semibold d-flex align-items-center custom-link">
                      <img :src="sq.logo || 'https://via.placeholder.com/25'" class="me-2" style="width: auto; height: 25px;">
                      {{ sq.nome }}
                    </RouterLink>
                  </td>
                  <td class="text-end fw-bold fs-5">{{ sq.punti }} <span class="text-muted fs-6 fw-normal">pt</span></td>
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
/* Stili personalizzati per i badge delle posizioni */
.pos-badge {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-weight: bold;
  font-size: 0.9rem;
}
.badge-champions { background-color: #004684; color: white; }
.badge-europa { background-color: #8b0021; color: white; }
.badge-conference { background-color: #b8860b; color: white; }
.badge-default { background-color: #f8f9fa; color: #6c757d; }

.custom-link:hover { color: #198754 !important; }
</style>