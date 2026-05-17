<script setup>
// Importo lo stato globale e la funzione di chiusura
import { toastState, closeToast } from '@/utils/toastStore';
</script>

<template>
    <!-- Contenitore fisso in basso a dx, z-index alto per stare sopra le modali -->
    <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1060;">              <!--pos-fixed: posizione ancorata in basso a dx | bottom-0: ancora il contenitore in basso
                                                                                                            | end-0: ancora al margine destro | p-3: padding verso tutti i lati -->

        <!-- Transizione di Vue per un'entrata/uscita fluida (animazione css) -->
        <transition name="toast-fade">                                                                  <!--show: visibile | align...: allinea quello che è contenuto (testo e bottone) | border-0: rimozione bordo-->
            <div
                v-if="toastState.visible"                                        
                class="toast show align-items-center text-white border-0"
                :class="`bg-${toastState.theme}`"
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
            >   <!--
                    visible (prendo il caso in cui il toast esiste nel DOM)
                    :class="..." cambia sfondo a seconda del valore di theme (costrutto dinamico)
                    aria-live: rende urgente questo componente da farlo far visualizzare
                    aria-atomic: assicura di far prendere tutto il contenuto e farlo visualizzare all'utente
                -->
                <div class="d-flex">                                                                    <!--Sarebbe display:flex. Fa disporre i figli in modo flessibile e responsive (Il txt a sx e il pulsante a dx) -->
                    <div class="toast-body fw-semibold fs-6">                                           <!--semibold: testo leggermente in grassetto | font-size-6 => carattere h6-->
                        <!-- Icone dinamiche in base al tipo di notifica -->
                        <span v-if="toastState.theme === 'success'"  class="me-2">✅</span>             <!--me-2 => margin end, applica spazio a dx delle icone distanziandole dal txt-->
                        <span v-if="toastState.theme === 'danger'"   class="me-2">❌</span>
                        <span v-if="toastState.theme === 'warning'"  class="me-2">⚠️</span>
                        <span v-if="toastState.theme === 'info'"     class="me-2">ℹ️</span>
                        {{ toastState.message }}
                    </div>
                    <button
                        type="button"
                        class="btn-close btn-close-white me-2 m-auto"
                        @click="closeToast"
                        aria-label="Close"
                    ></button>                                                  <!--btn-close: imm. vettoriale con una X e ...-white la rende bianca-->
                </div>                                                          <!--m-auto: forza i margini automatici-->
            </div>
        </transition>
    </div>
</template>