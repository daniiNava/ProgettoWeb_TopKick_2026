import { reactive } from 'vue'

// Oggetto reattivo globale che contiene lo stato del Toast
export const toastState = reactive({
    visible: false, 
    message: '',
    theme: 'success'    // Può essere 'success', 'danger', 'warning', 'info'
})

let timeoutId = null;

// Funzione globale per richiamare il Toast da qualsiasi pagina
export const showToast = (msg, theme='success') => {
    // Impostazione dei dati
    toastState.message = msg;
    toastState.theme = theme;
    toastState.visible = true;

    // Se c'era già un timer attivo, lo cancella
    if (timeoutId) clearTimeout(timeoutId);

    // Nasconde il toast automaticamente dopo 3.5 s
    timeoutId = setTimeout(() => {
        toastState.visible = false;
    }, 3500);
}

// Funzione per chiuderlo manualmente (cliccando la X)
export const closeToast = () => {
    toastState.visible = false;
}