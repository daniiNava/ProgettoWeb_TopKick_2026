<script setup>
import { RouterView } from 'vue-router'
import Navbar from './components/Navbar.vue'
import Footer from './components/Footer.vue'
import ToastNotification from './components/ToastNotification.vue'; // Gestione degli errori (senza l'uso degli alert)

</script>

<template>
  <div class="d-flex flex-column min-vh-100"> <!-- Spinge il footer sempre in fondo alla pagina-->
    <Navbar />

    <main class="flex-grow-1 bg-light"> <!-- Qui verrano caricate dinamicamente la Home, il Login, ...-->
      <RouterView />
    </main>

    <Footer />

    <ToastNotification />
  </div>
</template>

<style scoped></style>
