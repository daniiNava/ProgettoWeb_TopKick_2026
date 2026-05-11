<script setup>
import { toastState, closeToast } from '@/utils/toastStore';
</script>

<template>
    <!--Contenitore fisso in basso a dx. z-index altissimo per stare sopra a tutto-->
    <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1060;">

        <!--Usiamo la transizione di Vue per un'entrata/uscita morbida-->
        <transition name="toast-fade">
            <div
                v-if="toastState.visible"
                class="toast show align-items-center text-white border-0"
                :class="`bg-${toastState.theme}`"
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
            >
                <div class="d-flex">
                    <div class="toast-body fw-semibold fs-6">
                        <!--Icone dinamiche in base al tema-->
                        <span v-if="toastState.theme === 'success'" class="me-2">✅</span>
                        <span v-if="toastState.theme === 'danger'" class="me-2">❌</span>
                        <span v-if="toastState.theme === 'warning'" class="me-2">⚠️</span>
                        <span v-if="toastState.theme === 'info'" class="me-2">ℹ️</span>
                        {{ toastState.message }}
                    </div>
                    <button
                        type="button"
                        class="btn-close btn-close-white me-2 m-auto"
                        @click="closeToast"
                        aria-label="Close"
                    ></button>
                </div>
            </div>
        </transition>
    </div>
</template>

<style scoped>
/* Animazione fluida di entrata e uscita */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}
.toast-fade-enter-from {
  opacity: 0;
  transform: translateY(20px); /* Entra dal basso */
}
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(20px); /* Esce verso il basso */
}
</style>