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
                            👤 Profilo di {{ utente.username }}
                            <span v-if="utente.ruolo === 'premium'" title="Utente Premium">⭐</span>
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
                            <h4 class="text-warning fw-bold">Passa a Premium! ⭐</h4>
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