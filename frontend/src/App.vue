<script setup>
import { RouterView } from 'vue-router'
import Navbar from './components/Navbar.vue'
import Navbar from './components/Footer.vue'

</script>

<template>
  <div class=""d-flex flex-column min-vh-100> <!-- Spinge il footer sempre in fondo alla pagina-->
    <Navbar />

    <main class="flex-grow-1 bg-light"> <!-- Qui verrano caricate dinamicamente la Home, il Login, ...-->
      <RouterView />
    </main>

    <Footer />
  </div>
</template>

<style scoped></style>
