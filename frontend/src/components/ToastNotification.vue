<script setup>
import { toastState, closeToast } from '@/utils/toastStore';
</script>

<template>
    <!-- Contenitore fisso in basso a dx, z-index alto per stare sopra le modali -->
    <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1060;">

        <!-- Transizione di Vue per un'entrata/uscita fluida -->
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
                        <!-- Icone dinamiche in base al tipo di notifica -->
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
/* Animazione custom per il toast */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}
.toast-fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>