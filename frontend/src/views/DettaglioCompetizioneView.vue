<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const idCompetizione = parseInt(route.params.id)

// --- VARIABILI DI STATO ---
const competizione = ref(null)
const partite = ref([])
const notizie = ref([])
const marcatoriRisolti = ref([])
const caricamento = ref(true)
const activeTab = ref('classifica')

// Variabili per l'Annata
const annataSelezionata = ref(route.query.annata || '25/26');
const annateDisponibili = ref(['23/24','24/25','25/26'])

// Variabili per l'UI della Giornata e Dettagli Partita
const giornataSelezionata = ref(null);
const partiteEspanse = ref([]); 

// --- FETCH DEI DATI ---
const fetchDettagli = async () => {
  caricamento.value = true;
  try {
    const response = await fetch(`/api/competizioni/${idCompetizione}/dettagli?annata=${annataSelezionata.value}`);
    if (response.ok) {
      const data = await response.json();
      competizione.value = data.competizione;
      partite.value = data.partite;
      marcatoriRisolti.value = data.marcatori || [];
      notizie.value = data.notizie;
    }
  } catch (error) { 
    console.error(error); 
  } finally { 
    caricamento.value = false;
  }
};

// --- COMPUTED PROPERTIES: PARTITE ---
const partiteGiocate = computed(() => partite.value.filter(p => p.stato === 'finita').reverse())
const partiteDaGiocare = computed(() => partite.value.filter(p => p.stato !== 'finita'))
const prossimePartite = computed(() => partiteDaGiocare.value.slice(0, 4))

const partitePerGiornata = computed(() => {
  const giornate = {};
  const partiteOrdinate = [...partite.value].sort((a, b) => {
    if (a.giornata !== b.giornata) return a.giornata - b.giornata;
    return new Date(a.data_ora) - new Date(b.data_ora);
  });

  partiteOrdinate.forEach(partita => {
    const n = partita.giornata || 'Altro';
    if (!giornate[n]) giornate[n] = [];
    giornate[n].push(partita);
  });
  
  return giornate;
});

// Imposta l'ultima giornata non appena le partite vengono caricate e raggruppate
watch(partitePerGiornata, (nuoveGiornate) => {
  const giornateKeys = Object.keys(nuoveGiornate);
  if (giornateKeys.length > 0 && !giornataSelezionata.value) {
    giornataSelezionata.value = giornateKeys[giornateKeys.length - 1];
  }
});

// --- FUNZIONI DI SUPPORTO PER I GOL E L'UI ---
const toggleDettagliPartita = (partitaId) => {
  const index = partiteEspanse.value.indexOf(partitaId);
  if (index === -1) {
    partiteEspanse.value.push(partitaId);
  } else {
    partiteEspanse.value.splice(index, 1);
  }
};

const checkAutogol = (tipo) => {
  const t = (tipo || '').toLowerCase().trim();
  return t === 'autogol' || t === 'own_goal' || t === 'own goal' || t === 'owngoal';
};

const checkRigore = (tipo) => {
  const t = (tipo || '').toLowerCase().trim();
  return t === 'rigore' || t === 'penalty';
};

// --- LOGICA DI ASSEGNAZIONE GOL (CASA) ---
const getMarcatoriCasa = (partita) => {
  if (!partita || !partita.squadra_casa || !partita.squadra_trasferta) return [];
  
  return marcatoriRisolti.value.filter(m => {
    if (Number(m.partita_id) !== Number(partita.id)) return false;
    
    const idSquadraGiocatore = Number(m.giocatore?.id_squadra);
    const idCasa = Number(partita.squadra_casa.id);
    const idTrasferta = Number(partita.squadra_trasferta.id);
    const isAutogol = checkAutogol(m.tipo_gol);

    const golNormaleCasa = (idSquadraGiocatore === idCasa) && !isAutogol;
    const autogolTrasferta = (idSquadraGiocatore === idTrasferta) && isAutogol;

    return golNormaleCasa || autogolTrasferta;
  }).sort((a, b) => Number(a.minuto) - Number(b.minuto));
};

// --- LOGICA DI ASSEGNAZIONE GOL (TRASFERTA) ---
const getMarcatoriTrasferta = (partita) => {
  if (!partita || !partita.squadra_casa || !partita.squadra_trasferta) return [];
  
  return marcatoriRisolti.value.filter(m => {
    if (Number(m.partita_id) !== Number(partita.id)) return false;
    
    const idSquadraGiocatore = Number(m.giocatore?.id_squadra);
    const idCasa = Number(partita.squadra_casa.id);
    const idTrasferta = Number(partita.squadra_trasferta.id);
    const isAutogol = checkAutogol(m.tipo_gol);

    const golNormaleTrasferta = (idSquadraGiocatore === idTrasferta) && !isAutogol;
    const autogolCasa = (idSquadraGiocatore === idCasa) && isAutogol;

    return golNormaleTrasferta || autogolCasa;
  }).sort((a, b) => Number(a.minuto) - Number(b.minuto));
};

// --- ALGORITMO CLASSIFICA ---
const classificaCalcolata = computed(() => {
  const classifica = {}

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

  const finite = partite.value.filter(p => p.stato === 'finita' && p.squadra_casa && p.squadra_trasferta)
  
  finite.forEach(p => {
    const sqCasa = classifica[p.squadra_casa.id]
    const sqTrasf = classifica[p.squadra_trasferta.id]

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

// --- STATISTICHE INDIVIDUALI ---
const classificaMarcatori = computed(() => {
  const stats = {};
  
  marcatoriRisolti.value.forEach(m => {
    if (checkAutogol(m.tipo_gol)) return; // Esclude autogol

    const g = m.giocatore;
    if (g && g.nome_cognome) {
      const chiave = g.nome_cognome.trim();
      if (!stats[chiave]) {
        stats[chiave] = { nome: chiave, squadra: g.squadra?.nome || 'N.D.', gol: 0 };
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
    if (checkAutogol(m.tipo_gol)) return; // Esclude assist su autogol

    const a = m.assistman;
    if (a && a.nome_cognome) {
      const nomeAssistman = a.nome_cognome.trim();
      if (!stats[nomeAssistman]) {
        stats[nomeAssistman] = { nome: nomeAssistman, squadra: a.squadra?.nome || 'N.D.', assist: 0 };
      }
      stats[nomeAssistman].assist++;
    }
  });

  return Object.values(stats)
    .sort((a, b) => b.assist - a.assist)
    .slice(0, 15);
});

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

onMounted(() => fetchDettagli())

</script>

<template>
  <div class="container py-5">
    <div v-if="caricamento" class="text-center my-5">
      <div class="spinner-border text-success" role="status"></div>
    </div>

    <div v-else-if="competizione">
      
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 bg-white p-4 rounded-4 shadow-sm border">
        <img :src="competizione.logo_url || 'https://via.placeholder.com/100'" class="me-md-4 img-fluid" style="max-height: 100px; width: auto; object-fit: contain;">
        <div class="w-100 text-center text-md-start my-3">
          <h1 class="fw-bold mb-1">{{ competizione.nome }}</h1>
          <p class="text-muted mb-0 fs-5">{{ competizione.nazione || 'Internazionale' }}</p>
        </div>
        <div>
          <label class="form-label text-muted small fw-bold mb-1 d-block">Stagione</label>
          <select class="form-select border-success fw-bold w-auto" v-model="annataSelezionata" @change="fetchDettagli">
            <option v-for="annata in annateDisponibili" :key="annata" :value="annata">
              {{ annata }}
            </option>
          </select>
        </div>
      </div>

      <ul class="nav nav-tabs mb-4 border-bottom-2 flex-nowrap overflow-auto" style="white-space: nowrap;">
        <li class="nav-item" v-for="tab in ['riepilogo', 'risultati', 'classifica', 'marcatori', 'assist', 'news']" :key="tab">
          <a class="nav-link fw-bold text-uppercase px-4" 
             :class="{ 'active text-success border-success border-bottom-3': activeTab === tab, 'text-muted': activeTab !== tab }" 
             href="#" @click.prevent="activeTab = tab">
            {{ tab }}
          </a>
        </li>
      </ul>

      <div class="bg-white p-4 rounded-4 shadow-sm border min-vh-50">
        
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
                      <img :src="sq.logo || 'https://via.placeholder.com/25'" class="me-2" style="width: auto; height: 25px;">
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
                    <div class="d-flex justify-content-center gap-1">
                      <span v-for="(ris, i) in sq.forma" :key="i" class="forma-box" :class="'forma-' + ris.toLowerCase()">
                        {{ ris }}
                      </span>
                      <span v-for="i in (5 - sq.forma.length)" :key="'empty'+i" class="forma-box forma-empty">?</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="activeTab === 'riepilogo'">
          <h5 class="fw-bold mb-3">Prossime Partite</h5>
          <div v-if="prossimePartite.length === 0" class="text-muted p-3 bg-light rounded-3 text-center">
            Nessuna partita in programma.
          </div>
          <div class="row g-3">
            <div v-for="partita in prossimePartite" :key="partita.id" class="col-md-6 col-lg-4">
              <div class="card border-0 shadow-sm transition h-100">
                <div class="card-body p-3">
                  <div class="text-center mb-3">
                    <span class="badge bg-light text-dark border fw-normal">
                      {{ formattaData(partita.data_ora) }}
                    </span>
                  </div>
                  <div class="d-flex align-items-center justify-content-between">
                    <div class="text-center" style="width: 35%;">
                      <RouterLink :to="`/squadre/${partita.squadra_casa?.id}`" class="text-decoration-none text-dark custom-link">
                        <img :src="partita.squadra_casa?.logo_url" class="img-fluid mb-2" style="max-height: 40px; object-fit: contain;">
                        <div class="small text-truncate fw-bold">
                          {{ partita.squadra_casa?.nome }}
                        </div>
                      </RouterLink>
                    </div>
                    <div class="fw-bold text-muted px-2 small">VS</div>
                    <div class="text-center" style="width: 35%;">
                      <RouterLink :to="`/squadre/${partita.squadra_trasferta?.id}`" class="text-decoration-none text-dark custom-link">
                        <img :src="partita.squadra_trasferta?.logo_url" class="img-fluid mb-2" style="max-height: 40px; object-fit: contain;">
                        <div class="small text-truncate fw-bold">
                          {{ partita.squadra_trasferta?.nome }}
                        </div>
                      </RouterLink>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        

        <div v-if="activeTab === 'risultati' || activeTab === 'calendario'">
          
          <div class="mb-4 bg-light p-3 rounded-4 shadow-sm border">
            <h6 class="text-uppercase text-muted small fw-bold mb-3 ms-1">Seleziona Giornata</h6>
            <div class="d-flex overflow-auto pb-2 gap-2 hide-scrollbar">
              <button v-for="(partiteLista, numeroGiornata) in partitePerGiornata" :key="numeroGiornata" 
                      class="btn rounded-pill px-4 py-2 fw-semibold flex-shrink-0 transition"
                      :class="giornataSelezionata === String(numeroGiornata) ? 'btn-success shadow-sm' : 'btn-white border text-muted bg-white'"
                      @click="giornataSelezionata = String(numeroGiornata); partiteEspanse = [];">
                Giornata {{ numeroGiornata }}
              </button>
            </div>
          </div>

          <div v-if="giornataSelezionata && partitePerGiornata[giornataSelezionata]" class="row g-3">
            <div v-for="partita in partitePerGiornata[giornataSelezionata]" :key="partita.id" class="col-12 col-lg-6">
              
              <div class="card border-0 shadow-sm transition">
                <div class="card-body p-3">
                  <div class="text-center mb-3">
                    <span class="badge bg-light text-dark border fw-normal">
                      {{ formattaData(partita.data_ora) }}
                    </span>
                  </div>
                  
                  <div class="d-flex align-items-center justify-content-between">
                    <div class="text-center" style="width: 35%;">
                      <RouterLink :to="`/squadre/${partita.squadra_casa?.id}`" class="text-decoration-none text-dark custom-link">
                        <img :src="partita.squadra_casa?.logo_url" class="img-fluid mb-2" style="max-height: 40px; object-fit: contain;">
                        <div class="fw-bold small text-truncate">{{ partita.squadra_casa?.nome }}</div>
                      </RouterLink>
                    </div>

                    <div class="px-2 text-center punteggio-box p-2 rounded-3" @click="toggleDettagliPartita(partita.id)">
                      <template v-if="partita.stato === 'finita'">
                        <div class="fw-black fs-4 text-dark lh-1 mb-1">{{getMarcatoriCasa(partita).length}} - {{ getMarcatoriTrasferta(partita).length }}</div>
                        <div class="d-flex align-items-center justify-content-center gap-1 text-secondary" style="font-size: 0.65rem;">
                          <span>FINALE</span>
                          <span class="freccia-dettagli" :class="{'ruotata': partiteEspanse.includes(partita.id)}">▼</span>
                        </div>
                      </template>
                      <template v-else>
                        <div class="fw-bold text-muted px-3">VS</div>
                      </template>
                    </div>

                    <div class="text-center" style="width: 35%;">
                      <RouterLink :to="`/squadre/${partita.squadra_trasferta?.id}`" class="text-decoration-none text-dark custom-link">
                        <img :src="partita.squadra_trasferta?.logo_url" class="img-fluid mb-2" style="max-height: 40px; object-fit: contain;">
                        <div class="fw-bold small text-truncate">{{ partita.squadra_trasferta?.nome }}</div>
                      </RouterLink>
                    </div>
                  </div>
                </div>

                <div v-if="partiteEspanse.includes(partita.id) && partita.stato === 'finita'" class="card-footer bg-white border-top p-3 details-dropdown">
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
        </div>

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
                  <td class="fw-bold">
                    <RouterLink
                        :key="g.nome" 
                        :to="`/giocatori/${g.nome}`" 
                        class="list-group-item list-group-item-action d-flex justify-content-between align-items-center text-decoration-none"
                    >{{ g.nome }}
                    </RouterLink>
                  </td>
                  <td class="text-muted small">{{ g.squadra }}</td>
                  <td class="text-center fw-bold fs-5">{{ g.gol }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

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
                  <td class="fw-bold">
                    <RouterLink
                        :key="g.nome" 
                        :to="`/giocatori/${g.nome}`" 
                        class="list-group-item list-group-item-action d-flex justify-content-between align-items-center text-decoration-none"
                    >{{ g.nome }}
                    </RouterLink>
                  </td>
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
.forma-v { background-color: #198754; } 
.forma-n { background-color: #ffc107; color: black; } 
.forma-p { background-color: #dc3545; } 
.forma-empty { background-color: #e9ecef; color: #adb5bd; } 

.custom-link:hover { color: #198754 !important; }

/* --- NUOVI STILI PER INTERATTIVITA' RISULTATI --- */
.punteggio-box {
  cursor: pointer;
  user-select: none;
  background-color: #f8f9fa;
  border: 1px solid transparent;
  transition: all 0.2s ease-in-out;
}
.punteggio-box:hover {
  background-color: #e9ecef;
  border-color: #dee2e6;
  transform: scale(1.05);
}

.freccia-dettagli {
  display: inline-block;
  transition: transform 0.3s ease;
  font-size: 10px;
}
.freccia-dettagli.ruotata {
  transform: rotate(180deg);
}

.details-dropdown {
  animation: slideDown 0.3s ease-out forwards;
  transform-origin: top;
}
@keyframes slideDown {
  from { opacity: 0; transform: scaleY(0); }
  to { opacity: 1; transform: scaleY(1); }
}

/* Nasconde la scrollbar orizzontale per il menu giornate */
.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>