<script setup>
import { showToast } from '@/utils/toastStore';
import { ref, onMounted } from 'vue' 
import { useRouter } from 'vue-router'; 

const router = useRouter()
const utente = ref(null)
const caricamento = ref(true)

// Recupero i dati dell'utente loggato
const fetchProfilo = async () => {
    try {
        const response = await fetch('/api/me')

        if(response.ok){
            utente.value = await response.json()
        } else {
            // Se il server risponde 401, la sessione è scaduta o inesistente
            showToast("Devi effettuare l'accesso per vedere questa pagina.", 'danger')
            router.push('/')
        }
    } catch(error) {
        console.error("Errore nel caricamento del profilo:", error)
        router.push('/')
    } finally {
        caricamento.value = false;
    }
}

onMounted(() => {
    fetchProfilo()
})
</script>

<template>
    <div class="container py-5">
        <div class="row justify-content-center">
            <div class="col-md-8">

                <div v-if="caricamento" class="text-center">
                    <div class="spinner-border text-success" role="status"></div>
                    <p class="mt-2">Caricamento profilo...</p>
                </div>

                <div v-else-if="utente" class="card shadow border-0 rounded-4">
                    <div class="card-header bg-dark text-white text-center py-4 rounded-top-4">
                        <h2 class="mb-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" fill="currentColor" class="bi bi-person me-2 mb-2" viewBox="0 0 16 16">
                                <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/>
                            </svg> Profilo di {{ utente.username }}
                            <span v-if="utente.ruolo === 'premium'" title="Utente Premium">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-star-fill text-warning ms-2 mb-2" viewBox="0 0 16 16"><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
                                </svg>
                            </span>
                        </h2>
                    </div>

                    <div class="card-body p-5">
                        <div class="row mb-4">
                            <div class="col-sm-4 fw-bold text-muted">Email:</div>
                            <div class="col-sm-8 fs-5">{{ utente.email }}</div>
                        </div>

                        <div class="row mb-4">
                            <div class="col-sm-4 fw-bold text-muted">Ruolo:</div>
                            <div class="col-sm-8 fs-5">
                                <span v-if="utente.ruolo === 'premium'" class="badge bg-warning text-dark fs-6">Premium</span>
                                <span v-else class="badge bg-secondary fs-6">Utente Base</span>
                            </div>
                        </div>

                        <hr class="my-4">

                        <!-- Sezione Upgrade (solo per utenti base) -->
                        <div v-if="utente.ruolo === 'base'" class="text-center bg-light p-4 rounded-3 border border-warning">
                            <h4 class="text-warning fw-bold">Passa a Premium! <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-star-fill text-warning ms-2 mb-2" viewBox="0 0 16 16"><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
                                </svg></h4>
                            <p>Diventa un utente premium: Potrai creare le tue competizioni e aggiungere le tue squadre personalizzate.</p>
                            <button class="btn btn-warning fw-bold text-dark">Fai l'Upgrade ora</button>
                            <p class="text-muted mt-2 small">(Funzionalità in arrivo...)</p>
                        </div>

                        <!-- Sezione Gestione (solo per utenti premium) -->
                        <div v-if="utente.ruolo === 'premium'" class="text-center bg-light p-4 rounded-3 border border-success">
                            <h4 class="text-success fw-bold">Area Gestione</h4>
                            <p>Sei un Utente Premium! Hai accesso all'area di gestione delle tue competizioni.</p>
                            <RouterLink to="/mie-competizioni" class="btn btn-success fw-bold">Vai a "Le mie Competizioni"</RouterLink>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    </div>
</template>