<script setup> // Utilizzo di Vue 3, con all'interno variabili, funzioni e/o importazioni asposte in <tamplate>
// Per ora la Navbar è statica. In futuro qui gestiremo il tema scuro/chiaro e il login
</script>

<template>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark sticky-top"> 
        <!--navbar      inizializza il componente-->
        <!--navbar-expand-lg    definisce il comportamento responsive. La barra rimane compressa (hamburger menu) sui mobile e si espande orizz. dopo la L (992 px)-->
        <!--navbar-dark bg-dark     applica una combinazione cromatica predefinita. Colore nero(2°), con il colore del carattere e dei simboli invertiti (1°) -->
        <!--sticky-top      proprietà CSS "position: sticky", ovvero la barra scorre in basso con il documento finchè non rimane fissa in alto-->
        <div class="container">
            <!-- LOGO-->
            <RouterLink class="navbar-brand fw-bold fs-3 text-success" to="/">TOPKICK</RouterLink> <!--Componente nativo della libreria Vue Router-->
            <!--<RouterLink>    a diff. di un tag tradizionale di ancoraggio (<a href>), intercetta l'evento clic e aggiorna l'URL e la vista dell'app. senza innescare chiamate HTTP e aggiornare la pag.-->
            <!--to="/"          def. il percorso di destinazione (la radice /) (se lo premi ritorni nella homepage)-->
            <!--fw-bold fs-3 text-success       (tipografia) 1°->grassetto | 2°-> dim. del carattere incrementata | 3° -> colore verde semantico |-->    

            <!-- Bottone Hamburger per il mobile -->
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <!--navbar-toggler  per creare il bottone hamburger-->
            <!--data-bs-toggle="collapse" data-bs-target="#navbarNav        attributi HTML per interfaccia il markup con il codice JS integrato in Bootstrap-->
            <!-- 1° Assegna al nottone la funzionalità di att/disattivazione di un elemento collassabile-->
            <!-- 2° Crea un collegamento univoco tramite selettore ID -->
                <span class="navbar-toggler-icon"></span> 
            </button>

            <!--Allineamento e Form di Ricerca-->
            <div class="collapse navbar-collapse" id="navbarNav">
                <!-- LINK CENTRALI-->
                <ul class="navbar-nav me-auto mb-2 mb-lg-0 ms-4"> <!-- allineamnto dei collegamenti centrali utilizzando le classi di spaziatura-->
                <!--me-auto         spinge tutti gli elementi successivi verso il margine dx-->    
                <!--mb-2 mb-lg-0    applica un margine inferiore di scala valore 2 tra gli elementi, azzerandolo quando la barra si espande su schermi grandi-->    
                <!--ms-4            applica un margine sinistro di scala valore 4 (distanzia il link dal logo)-->   
    
                    <li class="nav-item">
                        <RouterLink class="nav-link" to="/competizioni">Competizioni</RouterLink>
                    </li>
                </ul>

                <!-- BARRA DI RICERCA -->
                <form class="d-flex me-3" role="search"> 
                <!--d-flex  forza l'elemento ad adottare il modello di layout Flexbox allineando l'input di resto e il pulsante di ricerca-->
                <!--role="search"   fornisce contesto semantico per le tecnologie assistive-->    
                    <input class="form-control me-2" type="search" placeholder="Cerca squadra, giocatore..." aria-label="Search">
                    <button class="btn btn-outline-success" type="submit">Cerca</button>
                </form>

                <!-- IMPORTAZIONE (Tema) e PROFILO -->
                 <div class="d-flex align-items-center">
                    <button class="btn btn-secondary me-3" title="Cambia Tema">☀️/🌙</button>

                    <div class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle text-white" href="#" role="button" data-bs-toggle="dropdown"> <!-- (ultimo) attiva lo script Bootstrap deputato all'apertuta del menu a tendina relativo al profilo-->
                            👤 Profilo
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end"> <!-- ("Menu ancora a destra") Non fa fuoriuscire il menu a tendina dallo schermo a dx, provando uno scorrimento laterale della pagina -->
                            <li><RouterLink class="dropdown-item" to="/login">Accedi / Registrati</RouterLink></li>
                            <!-- In futuro qui metteremo i link per gli utenti loggati-->
                        </ul>
                    </div>
                 </div>
            </div>
        </div>
    </nav>
</template>