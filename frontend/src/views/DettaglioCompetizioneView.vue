<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const idCompetizione = parseInt(route.params.id)

const competizione = ref(null)
const partite = ref([])
const notizie = ref([])
const caricamento = ref(true)
const activeTab = ref('classifica')

// Variabili per l'Annata
const annataSelezionata = ref(route.query.annata || '25/26');
const annateDisponibili = ref(['23/24','24/25','25/26'])

const fetchDettagli = async () => {
  try {
    const response = await fetch(`/api/competizioni/${idCompetizione}/dettagli?annata=${annataSelezionata.value}`);
    if (response.ok) {
      const data = await response.json();
      competizione.value = data.competizione;
      partite.value = data.partite;
      marcatoriRisolti.value = data.marcatori;
      notizie.value = data.notizie;
    }
  } catch (error) { console.error(error); }
  finally { caricamento.value = false }
};
// --- COMPUTED PROPERTIES ---

const partiteGiocate = computed(() => partite.value.filter(p => p.stato === 'finita').reverse())
const partiteDaGiocare = computed(() => partite.value.filter(p => p.stato !== 'finita'))
const prossimePartite = computed(() => partiteDaGiocare.value.slice(0, 4))

// ALGORITMO CLASSIFICA + FORMA (V, N, P)
// ALGORITMO CLASSIFICA + FORMA (V, N, P) - VERSIONE SICURA
const classificaCalcolata = computed(() => {
  const classifica = {}

  // Inizializziamo le squadre (SOLO se la partita ha entrambe le squadre valide)
  partite.value.forEach(p => {
    if (p.squadra_casa && p.squadra_trasferta) {
      [p.squadra_casa, p.squadra_trasferta].forEach(sq => {
        if (!classifica[sq.id]) {
          classifica[sq.id] = { 
            id: sq.id, nome: sq.nome, logo: sq.logo_url, 
            punti: 0, giocate: 0, v: 0, n: 0, p: 0, gf: 0, gs: 0, 
            storicoForma: [] 
          }
        }
      })
    }
  })

  // Calcoliamo i punti e la forma (solo partite finite E con squadre valide)
  const finite = partite.value.filter(p => p.stato === 'finita' && p.squadra_casa && p.squadra_trasferta)
  
  finite.forEach(p => {
    const sqCasa = classifica[p.squadra_casa.id]
    const sqTrasf = classifica[p.squadra_trasferta.id]

    // Se per qualche motivo le squadre non sono nell'oggetto, saltiamo
    if (!sqCasa || !sqTrasf) return;

    sqCasa.giocate++; sqTrasf.giocate++;
    sqCasa.gf += p.gol_casa; sqCasa.gs += p.gol_trasferta;
    sqTrasf.gf += p.gol_trasferta; sqTrasf.gs += p.gol_casa;

    if (p.gol_casa > p.gol_trasferta) {
      sqCasa.punti += 3; sqCasa.v++; sqCasa.storicoForma.push('V');
      sqTrasf.p++; sqTrasf.storicoForma.push('P');
    } else if (p.gol_casa < p.gol_trasferta) {
      sqTrasf.punti += 3; sqTrasf.v++; sqTrasf.storicoForma.push('V');
      sqCasa.p++; sqCasa.storicoForma.push('P');
    } else {
      sqCasa.punti += 1; sqCasa.n++; sqCasa.storicoForma.push('N');
      sqTrasf.punti += 1; sqTrasf.n++; sqTrasf.storicoForma.push('N');
    }
  })

  // Trasformiamo in array, calcoliamo la Differenza Reti e prendiamo solo le ultime 5 per la Forma
  return Object.values(classifica).map(sq => {
    sq.dr = sq.gf - sq.gs
    sq.forma = sq.storicoForma.slice(-5).reverse() 
    return sq
  }).sort((a, b) => {
    if (b.punti !== a.punti) return b.punti - a.punti
    if (b.dr !== a.dr) return b.dr - a.dr
    return b.gf - a.gf
  })
})

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
const marcatoriRisolti = ref([]); // Sarà popolato dal fetch

const classificaMarcatori = computed(() => {
  const stats = {};
  
  marcatoriRisolti.value.forEach(m => {
    const g = m.giocatore;
    if (g && g.nome_cognome) {
      const chiave = g.nome_cognome.trim();
      if (!stats[chiave]) {
        stats[chiave] = { 
          nome: chiave, 
          squadra: g.squadra?.nome || 'N.D.', 
          gol: 0 
        };
      }
      stats[chiave].gol++;
    }
  });
  return Object.values(stats)
    .filter(item => item.nome !== "" && item.nome !== "undefined")
    .sort((a, b) => b.gol - a.gol)
    .slice(0, 15);
});

const classificaAssist = computed(() => {
  const stats = {};
  
  marcatoriRisolti.value.forEach(m => {
    const a = m.assistman;
    // Se l'assistman esiste ed ha un nome, lo contiamo a prescindere dal record dell'annata[cite: 3]
    if (a && a.nome_cognome) {
      const nomeAssistman = a.nome_cognome.trim();
      if (!stats[nomeAssistman]) {
        stats[nomeAssistman] = { 
          nome: nomeAssistman, 
          squadra: a.squadra?.nome || 'N.D.',
          assist: 0 
        };
      }
      stats[nomeAssistman].assist++;
    }
  });

  return Object.values(stats)
    .sort((a, b) => b.assist - a.assist)
    .slice(0, 15);
});

const partitePerGiornata = computed(() => {
  const giornate = {};
  
  // Ordiniamo le partite prima per giornata e poi per data
  const partiteOrdinate = [...partite.value].sort((a, b) => {
    if (a.giornata !== b.giornata) return a.giornata - b.giornata;
    return new Date(a.data_ora) - new Date(b.data_ora);
  });

  partiteOrdinate.forEach(partita => {
    const n = partita.giornata || 'Altro';
    if (!giornate[n]) {
      giornate[n] = [];
    }
    giornate[n].push(partita);
  });
  
  return giornate;
});

onMounted(() => fetchDettagli())

</script>

<template>
  <div class="container py-5">
    <div v-if="caricamento" class="text-center my-5">
      <div class="spinner-border text-success" role="status"></div>
    </div>

    <div v-else-if="competizione">
      
      <!-- HEADER COMPETIZIONE -->
      <div class="d-flex justify-content-between align-items-center mb-4 bg-white p-4 rounded-4 shadow-sm border">
        <img :src="competizione.logo_url || 'https://via.placeholder.com/100'" class="me-4 rounded" style="width: 100px; height: 100px; object-fit: contain;">
        <div class="col">
          <h1 class="fw-bold mb-1">{{ competizione.nome }}</h1>
          <p class="text-muted mb-0 fs-5">{{ competizione.nazione || 'Internazionale' }}</p>
        </div>
        <div>
          <label class="form-label text-muted small fw-bold mb-1 d-block text-end">Stagione</label>
          <select class="form-select border-success fw-bold w-auto" v-model="annataSelezionata" @change="fetchDettagli">
            <option v-for="annata in annateDisponibili" :key="annata" :value="annata">
              {{ annata }}
            </option>
          </select>
        </div>
      </div>

      <!-- NAVIGAZIONE A TAB -->
      <ul class="nav nav-tabs mb-4 border-bottom-2 flex-nowrap overflow-auto" style="white-space: nowrap;">
        <li class="nav-item" v-for="tab in ['riepilogo', 'risultati', 'classifica', 'marcatori', 'assist', 'news']" :key="tab">
          <a class="nav-link fw-bold text-uppercase px-4" 
             :class="{ 'active text-success border-success border-bottom-3': activeTab === tab, 'text-muted': activeTab !== tab }" 
             href="#" @click.prevent="activeTab = tab">
            {{ tab }}
          </a>
        </li>
      </ul>

      <!-- CONTENUTO TAB -->
      <div class="bg-white p-4 rounded-4 shadow-sm border min-vh-50">
        
        <!-- TAB: CLASSIFICA (Il cuore della pagina) -->
        <div v-if="activeTab === 'classifica'">
          <div class="table-responsive">
            <table class="table table-hover align-middle">
              <thead class="table-light text-muted small text-uppercase">
                <tr>
                  <th style="width: 50px;">#</th>
                  <th>Squadra</th>
                  <th class="text-center">PG</th>
                  <th class="text-center">V</th>
                  <th class="text-center">N</th>
                  <th class="text-center">P</th>
                  <th class="text-center d-none d-md-table-cell">Reti</th>
                  <th class="text-center">DR</th>
                  <th class="text-center fs-6 text-dark">PT</th>
                  <th class="text-center">Forma</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(sq, index) in classificaCalcolata" :key="sq.id">
                  <td>
                    <div class="pos-badge" :class="getBadgeClass(index)">{{ index + 1 }}</div>
                  </td>
                  <td class="fw-semibold">
                    <RouterLink :to="`/squadre/${sq.id}`" class="text-decoration-none text-dark d-flex align-items-center custom-link">
                      <img :src="sq.logo || 'https://via.placeholder.com/25'" class="rounded-circle me-2 shadow-sm" style="width: 25px; height: 25px; object-fit: cover;">
                      {{ sq.nome }}
                    </RouterLink>
                  </td>
                  <td class="text-center">{{ sq.giocate }}</td>
                  <td class="text-center">{{ sq.v }}</td>
                  <td class="text-center">{{ sq.n }}</td>
                  <td class="text-center">{{ sq.p }}</td>
                  <td class="text-center d-none d-md-table-cell text-muted">{{ sq.gf }}:{{ sq.gs }}</td>
                  <td class="text-center">{{ sq.dr > 0 ? '+'+sq.dr : sq.dr }}</td>
                  <td class="text-center fw-bold fs-5">{{ sq.punti }}</td>
                  <td class="text-center">
                    <!-- I QUADRATINI DELLA FORMA -->
                    <div class="d-flex justify-content-center gap-1">
                      <span v-for="(ris, i) in sq.forma" :key="i" class="forma-box" :class="'forma-' + ris.toLowerCase()">
                        {{ ris }}
                      </span>
                      <!-- Se ha giocato meno di 5 partite, riempiamo con quadratini grigi -->
                      <span v-for="i in (5 - sq.forma.length)" :key="'empty'+i" class="forma-box forma-empty">?</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB: RIEPILOGO -->
        <div v-if="activeTab === 'riepilogo'">
          <h5 class="fw-bold mb-3">Prossime Partite</h5>
          <div class="row g-3">
            <div v-for="p in prossimePartite" :key="p.id" class="col-md-6 col-lg-3">
              <div class="card border-0 bg-light h-100 text-center p-3 shadow-sm rounded-4">
                <small class="text-muted mb-2">{{ formattaData(p.data_ora) }}</small>
                <div class="d-flex justify-content-between align-items-center">
                  <span class="fw-bold text-truncate w-40">{{ p.squadra_casa?.nome }}</span>
                  <span class="badge bg-secondary mx-1">VS</span>
                  <span class="fw-bold text-truncate w-40">{{ p.squadra_trasferta?.nome }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB: RISULTATI -->
        <div v-if="activeTab === 'risultati' || activeTab === 'calendario'">
          <div v-for="(partiteGiornata, numeroGiornata) in partitePerGiornata" 
              :key="numeroGiornata" class="mb-5">
            
            <!-- Intestazione Giornata -->
            <div class="d-flex align-items-center mb-4">
              <div class="bg-success text-white px-3 py-1 rounded-pill fw-bold small text-uppercase">
                Giornata {{ numeroGiornata }}
              </div>
              <div class="flex-grow-1 ms-3 border-bottom opacity-25"></div>
            </div>

            <div class="row g-3">
              <div v-for="partita in partiteGiornata" :key="partita.id" class="col-12 col-md-6">
                <div class="card border-0 shadow-sm hover-shadow transition">
                  <div class="card-body p-3">
                    
                    <!-- Data e Ora -->
                    <div class="text-center mb-3">
                      <span class="badge bg-light text-dark border fw-normal">
                        {{ formattaData(partita.data_ora) }}
                      </span>
                    </div>
                    
                    <div class="d-flex align-items-center">
                      <!-- Squadra Casa -->
                      <div class="text-center flex-grow-1" style="width: 35%;">
                        <img :src="partita.squadra_casa?.logo_url" 
                            class="img-fluid mb-2" style="max-height: 40px; object-fit: contain;">
                        <div class="fw-bold small text-truncate">{{ partita.squadra_casa?.nome }}</div>
                      </div>

                      <!-- BLOCCO PUNTEGGIO / VS -->
                      <div class="px-3">
                        <template v-if="partita.stato === 'finita'">
                          <div class="d-flex flex-column align-items-center">
                            <div class="fw-black fs-4">{{ partita.gol_casa }} - {{ partita.gol_trasferta }}</div>
                            <span class="badge bg-secondary-subtle text-secondary px-2 py-0" style="font-size: 0.6rem;">FINALE</span>
                          </div>
                        </template>
                        <template v-else>
                          <div class="fw-bold text-muted border-start border-end px-3">VS</div>
                        </template>
                      </div>

                      <!-- Squadra Trasferta -->
                      <div class="text-center flex-grow-1" style="width: 35%;">
                        <img :src="partita.squadra_trasferta?.logo_url" 
                            class="img-fluid mb-2" style="max-height: 40px; object-fit: contain;">
                        <div class="fw-bold small text-truncate">{{ partita.squadra_trasferta?.nome }}</div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- TAB: CALENDARIO -->
        <div v-if="activeTab === 'calendario'">
          <ul class="list-group list-group-flush">
            <li v-for="p in partiteDaGiocare" :key="p.id" class="list-group-item py-3">
              <div class="d-flex justify-content-between align-items-center">
                <span class="text-muted small w-25">{{ formattaData(p.data_ora) }}</span>
                <div class="d-flex justify-content-center align-items-center w-50">
                  <span class="fw-bold text-end w-50">{{ p.squadra_casa?.nome }}</span>
                  <span class="badge bg-secondary mx-3">VS</span>
                  <span class="fw-bold text-start w-50">{{ p.squadra_trasferta?.nome }}</span>
                </div>
                <span class="w-25 text-end text-warning small fw-bold">PROGRAMMATA</span>
              </div>
            </li>
          </ul>
        </div>

        <!-- TAB: NEWS -->
        <div v-if="activeTab === 'news'">
          <div class="list-group shadow-sm">
            <RouterLink v-for="n in notizie" :key="n.id" :to="`/notizie/${n.id}`" class="list-group-item list-group-item-action py-3 d-flex align-items-center text-decoration-none text-dark">
              <img :src="n.img_url || 'https://via.placeholder.com/80'" class="rounded me-3" style="width: 80px; height: 60px; object-fit: cover;">
              <div>
                <h5 class="mb-1 fw-bold">{{ n.titolo }}</h5>
                <small class="text-muted">{{ formattaData(n.data_pubblicazione) }}</small>
              </div>
            </RouterLink>
          </div>
        </div>
        <!-- TAB: MARCATORI -->
        <div v-if="activeTab === 'marcatori'">
          <div class="table-responsive">
            <table class="table table-hover align-middle">
              <thead class="table-light">
                <tr>
                  <th>Pos</th>
                  <th>Giocatore</th>
                  <th>Squadra</th>
                  <th class="text-center">Gol</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(g, index) in classificaMarcatori" :key="index">
                  <td>{{ index + 1 }}</td>
                  <td class="fw-bold">{{ g.nome }}</td>
                  <td class="text-muted small">{{ g.squadra }}</td>
                  <td class="text-center fw-bold fs-5">{{ g.gol }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB: ASSIST -->
        <div v-if="activeTab === 'assist'">
          <div class="table-responsive">
            <table class="table table-hover align-middle">
              <thead class="table-light">
                <tr>
                  <th>Pos</th>
                  <th>Giocatore</th>
                  <th>Squadra</th>
                  <th class="text-center">Assist</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(g, index) in classificaAssist" :key="index">
                  <td>{{ index + 1 }}</td>
                  <td class="fw-bold">{{ g.nome }}</td>
                  <td class="text-muted small">{{ g.squadra }}</td>
                  <td class="text-center fw-bold fs-5">{{ g.assist }}</td>
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
/* Stili per i Tab */
.nav-tabs .nav-link { border: none; color: #6c757d; }
.nav-tabs .nav-link.active { border-bottom: 3px solid #198754 !important; color: #198754 !important; background-color: transparent; }
.nav-tabs .nav-link:hover:not(.active) { border-bottom: 3px solid #dee2e6; }
.nav-tabs::-webkit-scrollbar { display: none; }

/* Stili per i Badge Posizione */
.pos-badge { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; font-weight: bold; font-size: 0.85rem; }
.badge-champions { background-color: #004684; color: white; }
.badge-europa { background-color: #8b0021; color: white; }
.badge-conference { background-color: #b8860b; color: white; }
.badge-default { background-color: transparent; color: #495057; }

/* Stili per i Quadratini della Forma (V, N, P) */
.forma-box { width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border-radius: 4px; font-weight: bold; font-size: 0.75rem; color: white; }
.forma-v { background-color: #198754; } /* Verde Vittoria */
.forma-n { background-color: #ffc107; color: black; } /* Giallo Pareggio */
.forma-p { background-color: #dc3545; } /* Rosso Sconfitta */
.forma-empty { background-color: #e9ecef; color: #adb5bd; } /* Grigio Non Giocata */

.custom-link:hover { color: #198754 !important; }
</style>