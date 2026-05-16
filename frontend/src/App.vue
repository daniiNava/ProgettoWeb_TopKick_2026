<!--Modulo che definisce il layout del nostro sito-->
<!--Gestisce il modo con cui gli elementi sono disposti-->
<script setup>
import { RouterView } from 'vue-router'
import Navbar from './components/Navbar.vue'
import Footer from './components/Footer.vue'
import ToastNotification from './components/ToastNotification.vue'; // Gestione degli errori (senza l'uso degli alert)

</script>

<template>
  <div class="d-flex flex-column min-vh-100">         <!-- Layout flex che occupa almeno il 100% dell'altezza dello schermo -->
    
    <Navbar />                                        <!-- Componente statico: sempre visibile in alto -->

    <main class="flex-grow-1 bg-light">   <!-- Spinge il footer sempre in fondo alla pagina -->
      <RouterView />                      <!-- Qui verrano caricate dinamicamente la Home, il Login, ...-->
    </main>

    <Footer />                            <!-- Componente statico: sempre visibile in basso -->

    <ToastNotification />                 <!-- Visibile a livello globale in tutto il sito quando viene "triggerato" -->
  </div>
</template>

<style scoped></style>
