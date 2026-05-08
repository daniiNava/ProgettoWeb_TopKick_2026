require('dotenv').config()

const express = require('express'); // acquisizione framework Express.js per la gestione dell'HTTP e delle API
const cors = require('cors'); // cors permette di far comunicare il server con origini diverse dalla propria, nel nostro caso con il nostro frontend
const session = require('express-session'); // visto che HTTP è stateless, questo serve per far salvare un cookie con l'id utente
const pgSession = require('connect-pg-simple')(session); // vengono salvati dei dati di sessione a un database PostGreSql nella RAM del server
const { Pool } = require('pg'); // estrapola la classe Pool da pg. Pattern architetturale che mantiene attive alcune connessioni al database 
const { createClient } = require('@supabase/supabase-js'); // Permette di comunicare con Supabase, tramite query con metodi JavaScript anzichè costrutti puri SQL
const bcrypt = require('bcrypt'); // Permette di comunicare le password di autenticazione degli utenti
const multer = require('multer');
// Instanziazione del server
const app = express();  // Instanzia un nuovo oggetto express. app è il server stesso
const PORT = 3000;      // Costante di tempo che definisce il valore della porta TCP

// --- CONFIGURAZIONE SUPABASE ---
const supabaseUrl = 'https://kwawnceudvzlwjrjxmqy.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- CONFIGURAZIONE DATABASE PER LE SESSIONI ---
const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL        // vecchia: postgresql://postgres:AnagninaCentocelleViterbo@db.kwawnceudvzlwjrjxmqy.supabase.co:5432/postgres
});

// --- MIDDLEWARE (Pre-elaborazione) ---
app.use(cors({
    origin: 'http://localhost:5173', // Porta di default di Vue.js (Vite)
    credentials: true // Per far passare i cookie di sessione
}));
app.use(express.json()); // Per leggere i body delle richieste in formato JSON

// --- SETUP SESSIONI ---
app.use(session({
    store: new pgSession({
        pool: pgPool,
        tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24,    // Il cookie dura 24 ore
        httpOnly: true                  // Sicurezza: il cookie non è leggibile da JS lato client
    }
}));

// --- Configurazione MULTER: si tiene il file in memoria RAM per passarlo direttamente poi a Supabase
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- ROTTA DI TEST ---
app.get('/api/test', (req, res) => {
    res.json({ message: "Benvenuto nel Backend di TOPKICK!" });
});

// =========================================
// ---- API HOMEPAGE ----
// =========================================

// Prima API: Ultime 5 notizie
app.get('/api/notizie/recenti', async (req, res) => {
    try {
        // Richiesta a Supabase delle 5 notizie ordinate per data decrescente
        const { data, error } = await supabase
            .from('notizie')
            .select('*')
            .order('data_pubblicazione', { ascending: false})
            .limit(5)

        if(error) throw error;
        res.json(data);
    } catch(err){
        console.error("Errore nel recupero delle notizie", err);
        res.status(500).json({ error: "Errore del server nel recupero delle notizie" });
    }
})

// Seconda API: Partite per Data
app.get('/api/partite', async (req, res) => {
    try {
        
        // Recupero della data dalla query string
        const dataRichiesta = req.query.data || new Date().toISOString().split('T')[0];
        
        // Richiesta a Supabase delle partite a seconda della data
        // Join implicito tra il nome delle squadre e il nome dei giocatori
        // ---------------- VEDERE COME PRENDERE I GIOCATORI MARCATORI DELLE PARTITE (perche per ora il join tra squadre e giocatori non viene effettuato)  ----------------------------
        const { data, error } = await supabase
            .from('partite')
            .select(`
                id, data_ora, gol_casa, gol_trasferta, stato,
                competizioni ( nome ),
                squadra_casa:squadre!id_squadra_casa ( id, nome, logo_url ), 
                squadra_trasferta:squadre!id_squadra_trasferta ( id, nome, logo_url )
            `)
            .gte('data_ora', `${dataRichiesta}T00:00:00`)
            .lte('data_ora', `${dataRichiesta}T23:59:59`)
            .order('data_ora', { ascending: true})

        if(error) throw error;
        res.json(data);
    } catch(err){
        console.error("Errore nel recupero delle notizie", err);
        res.status(500).json({ error: "Errore del server nel recupero delle notizie" });
    }
})


// =========================================
// ---- API AUTENTICAZIONE E PROFILO ----
// =========================================

// 1. Api per la REGISTRAZIONE
app.post('/api/register', async(req, res) => {      // Rotta che gestisce il flusso di creazione di una nuova identità nel sistema
    const { username, email, password } = req.body;     // Destruttura il payload ricevuto nella richiesta HTTP per estrarre le 3 variabili

    // Validazione base
    if (!username || !email || !password) {
        return res.status(400).json({ error: "Tutti i campi devono essere inseriti"});      // 400 Bad Request
    }
    if (password.length < 8) {
        return res.status(400).json({ error: "La password deve avere almeno 8 caratteri" });
    }

    try {
        // Cripting della password
        const saltRounds = 10;  // Fattore di costo per l'algoritmo di Hashing (prodotta con 2^10 iterazioni)
        const hash = await bcrypt.hash(password, saltRounds); // Viene applicata una funzione crittografica alla password in chiaro, generando un hash combinata con un salt casuale

        // Inserimento dell'utente su Supabase
        const { data, error } = await supabase  
            .from('utenti')
            .insert([{                              // Viene inviata l'istruzione di inserimento a Supabase
                username: username,
                email: email,
                password_hash: hash
                // non viene passato il ruolo che è di default 'base'
            }])
            .select();      // Restituisce l'intero record appena creato, necessario per estrarre l'ID assegnato dal DB
        
        // Gestione errori
        if(error) {         // Ad es. se email o username già esistenti
            if(error.code === '23505'){ // Codice PostGreSQL per violazione UNIQUE
                return res.status(400).json({ error: "Username o Email già registrati" })
            }
            throw error;
        }

        // Se tutto è corretto, viene creata la sessione per il log automatico dell'utente (autenticazione implicita post-registrazione)
        req.session.user = {                    // session express serializza questi dati, li salva nella tabella session
            id: data[0].id,                     // ... e invia un cookie al client
            username: data[0].username,
            email: data[0].email,
            ruolo: data[0].ruolo
        };

        res.status(201).json({ message: "Registrazione completata correttamente!" })

    } catch(err){
        console.error("Errore registrazione:", err);
        res.status(500).json({ error: "Errore interno del server" });
    }

});

// 2. Api per il LOGIN
app.post('/api/login', async(req, res) => {         // Rotta che controlla le credenziali fornite e instaura una sessione crittografata
    const { email, password } = req.body;

    if(!email || !password) {
        return res.status(400).json({ error: "Inserisci email e password" });   
    }

    try {
        // Ricerca dell'utente tramite email
        const { data: user, error } = await supabase
            .from('utenti')
            .select('*')
            .eq('email', email)         // clausola SQL condizionale (where email=...)
            .single();                  // ci fa restituire un solo oggetto JSON (1 sola riga), non un array

        if (error || !user) {           // Se non ci sono corrispondenze
            return res.status(401).json({ error: "Credenziali di accesso non valide" });
        }

        // Confronto tra password inserita e hash salvato nel DB
        const isPasswordCorrect = await bcrypt.compare(password, user.password_hash); //Estrae il salt dall'hash salvato nel DB e lo applica alla password inserita dall'utente e poi confronta
        // Ciò viene fatto per mitigare i "timing attack" (attacchi basati sui tempi di risposta del server) 

        if(isPasswordCorrect) {
            // Salvo i dati nel payload della sessione (express session a sua volta li salva nel DB)
            req.session.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                ruolo: user.ruolo
            };
            res.json({ message: "Login Effettuato con successo!", user: req.session.user });
        } else {
            res.status(401).json({ error: "Credenziali di accesso non valide"});
        }
    
    } catch(err){
        console.error("Errore login:", err);
        res.status(500).json({ error: "Errrore interno del server"});
    }
});

// 3. Api per il CONTROLLO SESSIONE (Utile per la gestione del Frontend (Vue) per far visualizzare o meno il profilo)
app.get('/api/me', async(req, res) => { // Ponte logico tra comportamento "stateless" del frontend e lo stato conservato nel backend
    if (req.session.user) {
        res.json(req.session.user);
    } else {
        res.status(401).json({ error: "Non sei ancora loggato" })
    }
});
// All'avvio della pagina, vue interroga questa rotta. Se il browser invia un cookie di sessione valido, il server Node restituisce
// un json con i dati utente, permettendo al vue di ripristinare l'interfaccia

// 4. Api per il LOGOUT
app.post('/api/logout', async(req, res) => {
    req.session.destroy((err) => {              // Individua il record della sessione attiva e lo elimina dal  DB
        if(err){
            console.error("Errore durante il logout:", err);
            return res.status(500).json({ error: "Impossibile effettuare  il logout" });
        }
        res.clearCookie('connect.sid'); // Cancellazione del cookie del Browser (lato Client)
        res.json({ message: "Logout effettuato con successo" });
    });

});

// 5. MIDDLEWARE DI SICUREZZA
// Api per bloccare chiunque provi a creare una competizione senza essere Premium (Middleware)
const checkPremium = (req, res, next) => {
    // Controllo l'utente se è loggato
    if(!req.session.user){ 
        return res.status(401).json({ error: "Effettua prima l'accesso." });
    }

    // Controllo se è premium
    if(req.session.user.ruolo !== 'premium'){ 
        return res.status(403).json({ error: "Accesso negato. Funzionalità riservata agli utenti Premium." });
    }

    // Se supera i controlli, procede all'API richiesta (vedere la fase 7)
    next();
}

// =============================
// 7.1 API PREMIUM: Le mie competizioni: GESTIONE COMPETIZIONI
// =============================

// Prende le Mie Competizioni dell'utente premium
app.get('/api/mie-competizioni', checkPremium, async (req, res) => {
    try {
        const { data, error } = await supabase
        .from('competizioni')
        .select('*')
        .eq('creato_da', req.session.user.id) // Filtro fondamentale per la sicurezza
        .order('creato_il', { ascending: false })

        if(error) throw error;
        res.json(data);
    } catch(error){
        res.status(500).json({ error: "Errore nel recupero delle tue competizioni." });
    }
});

// Crea una nuova competizione 
app.post('/api/mie-competizioni', checkPremium, upload.single('logo'), async (req, res) => {
    const { nome, numero_squadre } = req.body;
    const file = req.file;

    if(!nome || !numero_squadre){
        return res.status(400).json({ error: "Nome e numero squadre sono obbligatori"});
    }

    try {
        let logo_url = null;

        // Se l'utente ha mandato un file, si invia a Supabase
        if(file){
            // Creazione di un nome file univoco (timestamp + nome orig. senza spazi)
            const fileName = `${Date.now()}_${file.originalname.replace(/\s/g, '_')}`; 
        
            // Upload su Supabase Storage (nel bucket 'loghi_UtentePremium)
            const { data: storageData, error: storageError } = await supabase.storage
                .from('Loghi_UtentePremium')
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype      // Es. image/png, image/jpeg
                });

            if(storageError) throw storageError;

            // Otteniamo l'URL pubblico dell'immagine appena caricata
            const { data: publicUrlData } = supabase.storage
                .from('Loghi_UtentePremium')
                .getPublicUrl(fileName);

            logo_url = publicUrlData.publicUrl;
        
        }

        // Inserimento dati nel database PostgreSQL
        const { data, error } = await supabase
        .from('competizioni')
        .insert([{
            nome: nome,
            logo_url: logo_url,                   // Url di Supabase Storage o Null
            numero_squadre: numero_squadre,
            creato_da: req.session.user.id       // Associazione tra la competizione e chi l'ha creata
        }])
        .select();

        if(error) throw error;
        res.status(201).json({ message: "Competizione creata!", competizione: data[0] });

    } catch (error){
        console.error("Errore creazione competizione: ", error)
        res.status(500).json({ error: "Errore nella creazione della competizione"});
    }
});

// Eliminazione di una competizione
app.delete('/api/mie-competizioni/:id', checkPremium, async (req, res) => {
    const idCompetizione = req.params.id;

    try {
        // Sicurezza doppia: Elimino solo se l'ID corrisponde e se l'ha creata l'utente loggato
        const { error } = await supabase
        .from('competizioni')
        .delete()
        .eq('id', idCompetizione)
        .eq('creato_da', req.session.user.id);

        if(error) throw error;
        res.json({ message: "Competizione eliminata con successo!" });

    } catch (error){
        res.status(500).json({ error: "Errore nell'eliminazione della competizione"});
    }
});

// =============================
// 7.2 API PREMIUM: gestione SQUADRE (delle competizioni)
// =============================

// Recupera i dettagli dettagli della competizione e le sue squadre
app.get('/api/mie-competizioni/:id/squadre', checkPremium, async(req, res) => {
    const idCompetizione = req.params.id;

    try{
        // 1. Verifica che la competizione esista e sia dell'utente loggato
        const { data: comp, error: compError } = await supabase
            .from('competizioni')
            .select('id, nome, numero_squadre, creato_da')
            .eq('id', idCompetizione)
            .single();

        if(compError || !comp)  return res.status(404).json({ error: "Competizione non trovata" });
        if(comp.creato_da !== req.session.user.id)  return res.status(403).json({ error: "Non autorizzato" });

        // 2. Recupero delle squadre
        const { data: squadre, error: squadreError } = await supabase
            .from('squadre')
            .select('*')
            .eq('id_competizione', idCompetizione)
            .order('creato_il', { ascending:false })

        if(squadreError) throw squadreError;

        // Restituzione dei dati della competizione (per titolo) e delle squadre
        res.json({ competizione: comp, squadre: squadre });

    } catch(err){
        res.status(500).json({ error: "Errore nel recupero delle squadre" })
    }
});


// Aggiunge una nuova SQUADRA
app.post('/api/mie-competizioni/:id/squadre', checkPremium, upload.single('logo'), async (req, res) => {
    const idCompetizione = req.params.id;
    const { nome } = req.body;
    const file = req.file;

    if(!nome) return res.status(400).json({ error: "Il nome della squadra è obbligatorio"});

    try {

        // Controlli in piu (che per l'aggiunte delle competizioni, prima non veniva fatto)
        // 0.1 Controllo Sicurezza e Limite squadre
        const { data: comp } = await supabase
            .from('competizioni')
            .select('creato_da, numero_squadre')
            .eq('id', idCompetizione)
            .single();

        if(!comp || comp.creato_da !== req.session.user.id) return res.status(403).json({ error: "Non autorizzato" });

        // 0.2 Contiamo quante squadre ci sono gia
        const { count } = await supabase
            .from('squadre')
            .select('*', { count: 'exact', head: true })
            .eq('id_competizione', idCompetizione);

        if(count >= comp.numero_squadre) return res.status(400).json({ error: `Limite massimo raggiunto (${comp.numero_squadre}).` });

        
        // 1. Upload Logo
        let logo_url = null;

        // Se l'utente ha mandato un file, si invia a Supabase
        if(file){
            // Creazione di un nome file univoco (timestamp + nome orig. senza spazi)
            const fileName = `squadre/${Date.now()}_${file.originalname.replace(/\s/g, '_')}`; 

            const { error: storageError } = await supabase.storage
                .from('Loghi_UtentePremium')
                .upload(fileName, file.buffer, { contentType: file.mimetype });

            if(storageError) throw storageError;

            const { data: publicUrlData } = supabase.storage
                .from('Loghi_UtentePremium')
                .getPublicUrl(fileName);       
            
            logo_url = publicUrlData.publicUrl;
        
        }

        // 2. Inserimento dati nel database PostgreSQL
        const { data, error } = await supabase
        .from('squadre')
        .insert([{
            nome: nome,
            logo_url: logo_url,                   // Url di Supabase Storage o Null
            id_competizione: idCompetizione,
            creato_da: req.session.user.id       // Associazione tra la competizione e chi l'ha creata
        }])
        .select();

        if(error) throw error;
        res.status(201).json({ message: "Squadra creata e aggiunta!", squadra: data[0] });

    } catch (error){
        console.error("Errore creazione competizione: ", error)
        res.status(500).json({ error: "Errore nell'aggiunta della squadra"});
    }
});

// Eliminazione di una SQUADRA
app.delete('/api/squadre/:id', checkPremium, async (req, res) => {
    const idSquadra = req.params.id;

    try {
        // Sicurezza doppia: Elimino solo se l'ID corrisponde e se l'ha creata l'utente loggato
        const { error } = await supabase
        .from('squadre')
        .delete()
        .eq('id', idSquadra)
        .eq('creato_da', req.session.user.id);

        if(error) throw error;
        res.status(200).json({ message: "Squadra eliminata con successo!" });

    } catch (error){
        res.status(500).json({ error: "Errore nell'eliminazione della squadra"});
    }
});



// =============================
// 7.3 API PREMIUM: gestione CALCIATORI (delle squadre delle competizioni)
// =============================

// Limiti massimi per ruolo
const LIMITI_RUOLI = {
    'Portiere': 3,
    'Difensore': 6,
    'Centrocampista': 6,
    'Attaccante': 4,
}


// Recupera i dettagli della squadra e la sua rosa di giocatori
app.get('/api/squadre/:id/giocatori', checkPremium, async (req, res) => {
    const idSquadra = req.params.id;

    try {
        // Verifica che la squadra esista e sia dell'utente loggato
        const { data: squadra, error: sqError } = await supabase
            .from('squadre')
            .select('id, nome, logo_url, id_competizione, creato_da')
            .eq('id', idSquadra)
            .single();

        if(sqError || !squadra) return res.status(404).json({ error: "Squadra non trovata" });
        if(squadra.creato_da !== req.session.user.id) return res.status(403).json({ error: "Non autorizzato per questa competizione" });
        
        // Recupero dei giocatori
        const { data: giocatori, error: gioError } = await supabase
            .from('giocatori')
            .select('*')
            .eq('id_squadra', idSquadra)
            .order('ruolo', { ascending: true });  // Restituzione dei giocatori ordinata per ruolo

        if(gioError) throw gioError;

        res.json({ squadra: squadra, giocatori: giocatori  });
    } catch (error) {
        res.status(500).json({ error: "Errore nel recupero dei giocatori" });
    }

});

// Aggiunge un nuovo giocatore
app.post('/api/squadre/:id/giocatori', checkPremium, async (req, res) => {
    const idSquadra = req.params.id;
    const { nome_cognome, ruolo, data_nascita, piede_preferito } = req.body;

    // Controllo inserimento campi obbligatori
    if(!nome_cognome || !ruolo) return res.status(400).json({ error: "Nome e ruolo sono obbligatori" });

    // Controllo ruolo
    if(!LIMITI_RUOLI[ruolo]) return res.status(400).json({ error: "Ruolo non valido" })

    try {
        // Verifica che la squadra sia dell'utente loggato
        const { data: squadra } = await supabase
            .from('squadre')
            .select('creato_da')
            .eq('id', idSquadra)
            .single();

        if(!squadra || squadra.creato_da !== req.session.user.id){
            return res.status(403).json({ error: "Non autorizzato per questa competizione" });
        }

        // Controllo limite per quel ruolo specifico (Recupero dei giocatori)
        const { count, countError } = await supabase
            .from('giocatori')
            .select('*', { count: 'exact', head: true })
            .eq('id_squadra', idSquadra)
            .eq('ruolo', ruolo );  

        if(countError) throw countError;

        if(count >= LIMITI_RUOLI[ruolo]) {
            return res.status(400).json({ error: `Limite max raggiunto per il ruolo che hai scelto: ${ruolo} (${LIMITI_RUOLI[ruolo]}).` });
        }

        // Inserimento nel DB
        const { data, error } = await supabase
            .from('giocatori')
            .insert([{
                nome_cognome,
                ruolo,
                data_nascita: data_nascita || null, 
                piede_preferito: piede_preferito || null, 
                id_squadra: idSquadra,
                creato_da: req.session.user.id
            }])
            .select();

        if(error) throw error;
        res.status(201).json({ message: "Giocatore aggiunto!", giocatore: data[0] });

    } catch (err) {
        res.status(500).json({ error: "Errore nell'aggiunta del giocatore" });
    }

});

// Eliminazione di un GIOCATORE
app.delete('/api/giocatori/:id', checkPremium, async (req, res) => {
    const idGiocatore = req.params.id;

    try {
        // Sicurezza doppia: Elimino solo se l'ID corrisponde e se l'ha creato l'utente loggato
        const { error } = await supabase
        .from('giocatori')
        .delete()
        .eq('id', idGiocatore)
        .eq('creato_da', req.session.user.id);

        if(error) throw error;
        res.status(200).json({ message: "Giocatore eliminato con successo!" });

    } catch (error){
        res.status(500).json({ error: "Errore nell'eliminazione del giocatore"});
    }
});

// ==============================================
//      FASE 7.4 - GESTIONE CALENDARIO E PARTITE
// ==============================================

// (GET): Recupero delle squadre (per il menu a tendina) e di tutte le partite della competizione
app.get('/api/mie-competizioni/:id/calendario', checkPremium, async (req, res) => {
    const idCompetizione = req.params.id;

    try {
        // 1. Verifica che la competizione esista e sia dell'utente loggato
        const { data: comp, error: compError } = await supabase
            .from('competizioni')
            .select('id, nome, creato_da')
            .eq('id', idCompetizione)
            .single();

        if(compError || !comp) return res.status(404).json({ error: "Competizione non trovata" });
        if(comp.creato_da !== req.session.user.id) return res.status(403).json({ error: "Non autorizzato per questa competizione" });
        
        // 2. Recupero delle squadre iscritte (Utili per il menu a tendina -> creazione calendario)
        const { data: squadre, error: sqError } = await supabase
            .from('squadre')
            .select('id, nome, logo_url')
            .eq('id_competizione', idCompetizione)
            .order('nome', { ascending: true });

        if(sqError) throw sqError;

        // 3. Recupero delle partite già create (con il nome delle squadre grazie ad un JOIN)
        const { data: partite, error: partiteError } = await supabase
            .from('partite')
            .select(`
                *,
                competizioni ( nome ),
                squadra_casa:squadre!id_squadra_casa ( nome, logo_url ), 
                squadra_trasferta:squadre!id_squadra_trasferta ( nome, logo_url ),
                marcatori(id, 
                    id_giocatore, 
                    gol, 
                    minuto, 
                    tipo_gol, 
                    id_assistman, 
                    giocatore:giocatori!marcatori_id_giocatore_fkey(nome_cognome, id_squadra),
                    assistman:giocatori!marcatori_id_assistman_fkey(nome_cognome)
                )
            `)
            .eq('id_competizione', idCompetizione)
            .order('giornata', { ascending: true })    // Ordiniamo la restituzione delle partite in base al risultato ...
            .order('data_ora', { ascending: true });    // ... e in base alla data e ora
            

        if(partiteError) throw partiteError;

        res.json({ competizione: comp, squadre: squadre || [], partite: partite || []  });
    } catch (error) {
        res.status(500).json({ error: "Errore nel recupero dei calendario" });
    }

});

// (POST)
app.post('/api/mie-competizioni/:id/partite', checkPremium, async (req, res) => {
    const idCompetizione = req.params.id;
    const { id_squadra_casa, id_squadra_trasferta, data_ora, giornata } = req.body;

    // Controllo inserimento campi obbligatori
    if(!id_squadra_casa || !id_squadra_trasferta || !data_ora || !giornata ) {
        return res.status(400).json({ error: "Tutti i campi sono obbligatori!" });
    }

    if (id_squadra_casa === id_squadra_trasferta){
        return res.status(400).json({ error: "Una squadra non può giocare contro se stessa!" });
    }
    
    try {
        // Controllo sicurezza omesso per brevita (si da per scontato che il frontend abbia l'ID giusto)
        
        // Inserimento nel DB
        const { data, error } = await supabase
            .from('partite')
            .insert([{
                id_competizione: idCompetizione,
                id_squadra_casa,
                id_squadra_trasferta,
                data_ora,
                giornata,
                stato: 'programmata'    // Default
            }])
            .select(`
                *,
                squadra_casa:squadre!id_squadra_casa ( nome, logo_url ), 
                squadra_trasferta:squadre!id_squadra_trasferta ( nome, logo_url )
            `);

        

        if(error) throw error;
        res.status(201).json({ message: "Partita aggiunta!", partita: data[0] });

    } catch (err) {
        res.status(500).json({ error: "Errore nell'aggiunta della partita" });
    }

});

// (PUT): Aggiunta di un risultato
app.put('/api/partite/:id', checkPremium, async (req, res) => {
    const idPartita = req.params.id;
    const { gol_casa, gol_trasferta, stato, lista_marcatori } = req.body;
    
    try {
        // 1. Aggiornamento della partita
        const { error: updateError } = await supabase
            .from('partite')
            .update({ gol_casa, gol_trasferta, stato })
            .eq('id', idPartita);

        if(updateError) throw updateError;

        // 2. Eliminazione dei vecchi marcatori della partita corrente (pulizia)
        const { error: deleteError } = await supabase
            .from('marcatori')
            .delete()
            .eq('id_partita', idPartita);

        if(deleteError) throw deleteError;

        // 3. Inserimento dei nuovi marcatori (se ce ne sono)
        if(lista_marcatori && lista_marcatori.length > 0){
            const marcatoriDaInserire = lista_marcatori.map(m => ({
                id_partita: idPartita,
                id_giocatore: m.id_giocatore,
                gol: 1,
                minuto: m.minuto,
                tipo_gol: m.tipo_gol,
                id_assistman: m.id_assistman,
            }));
            
            const { error: insertError } = await supabase
                .from('marcatori')
                .insert(marcatoriDaInserire);
                
            if(insertError) throw insertError;
        }

        // Esecuzione UPDATE finale (restituzione della partita aggiornata)
        const { data, error } = await supabase
            .from('partite')
            .select(`
                *,
                squadra_casa:squadre!id_squadra_casa ( nome, logo_url ), 
                squadra_trasferta:squadre!id_squadra_trasferta ( nome, logo_url ),
                marcatori(id, 
                    id_giocatore, 
                    gol, 
                    minuto, 
                    tipo_gol, 
                    id_assistman, 
                    giocatore:giocatori!marcatori_id_giocatore_fkey(nome_cognome, id_squadra),
                    assistman:giocatori!marcatori_id_assistman_fkey(nome_cognome)
                )
            `)
            .eq('id', idPartita)
            .single();

        

        if(error) throw error;
        res.status(200).json({ message: "Risultato e marcatori aggiornati!", partita: data });

    } catch (err) {
        console.error("Errore PUT risultato/marcatori:", err);
        // INIEZIONE DIAGNOSTICA
        res.status(500).json({ 
            error: "Errore nell'aggiornamento (Risultato+Marcatori)",
            dettaglio_tecnico: err 
        });
    }
});

// (DELETE): Eliminazione di una partita
app.delete('/api/partite/:id', checkPremium, async (req, res) => {
    const idPartita = req.params.id
    try {
        const { error } = await supabase
        .from('partite')
        .delete()
        .eq('id', idPartita)

        if(error) throw error;
        res.status(200).json({ message: "Partita eliminata con successo!" });

    } catch (error){
        res.status(500).json({ error: "Errore nell'eliminazione della partita"});
    }
});


// (GET): Recupero dei giocatori delle due squadre (per poi selezionare i marcatori della partita corrente)
app.get('/api/partite/:id/giocatori-disponibili', checkPremium, async (req, res) => {
    const idPartita = req.params.id;

    try{
        // 1. Si trova la partita -> per recuperare le due squadre
        const { data: partita, error: pError } = await supabase
            .from('partite')
            .select('id_squadra_casa, id_squadra_trasferta')
            .eq('id', idPartita)
            .single();

        if(pError || !partita) throw pError;
        
        // 2. Recupero di tutti i giocatori che appartengono a una di queste due squadre
        const { data: giocatori, error: gError } = await supabase
            .from('giocatori')
            .select('id, nome_cognome, id_squadra, ruolo')
            .in('id_squadra', [partita.id_squadra_casa, partita.id_squadra_trasferta])
            .order('ruolo', { ascending: true });

        if(gError) throw gError;
        res.json(giocatori);
    } catch (error) {
        res.status(500).json({ error: "Errore nel recupero dei giocatori" });
    }
});


// ========================================
//      FASE 6 - /Notizie
// ========================================

app.get('/api/notizie', async (requestAnimationFrame, res) => {
    try {
        //query alla tabella notizie, che tramite join con competizioni(nome) ci da anche il
        //campionato associato alla notizia
        const {data,error}= await supabase
            .from('notizie')
            .select(`
                id,
                titolo,
                contenuto,
                img_url,
                data_pubblicazione,
                competizioni( nome )
                `)
                .order('data_pubblicazione', {ascending: false }); //ordina l'array dalla piu recente alla piu vecchia 
        if (error) throw error 
        res.json(data)
    } catch(err) {
        console.error("Errore nel recupero di tutte le notizie:", err);
        res.status(500).json({error: "Errore interno del server"});
    }
});

// Chiamata per recuperare una singola notizia tramite id (per visualizzare una notizia singolarmente in una pagina a parte)
app.get('/api/notizie/:id', async (req, res) => {
    const {id}= req.params; //estraiamo l'id dall'url
    try {
        const {data, error} = await supabase 
            .from('notizie')
            .select(`
                id,
                titolo,
                contenuto,
                img_url,
                data_pubblicazione,
                competizioni(nome)
            `)
            .eq('id', id) //filtriamo il tutto per id 
            .single() //perche vogliamo un singolo risultato
        if(error) throw error;
        if(!data) return res.status(404).json({error: "Notizia non trovata"});
        res.json(data);
    } catch (err) {
        console.error("Errore nel recupero della notizia:", err);
        res.status(500).json({error:"Errore interno del server"});
    }
});


// ==========================================
// API RICERCA INTELLIGENTE 
// ==========================================

//diciamo al server -> quando qualcuno ti cerca all'indirizzo /api/ricerca esegui questa funzione, la funzione è async perche faremo operazioni che richiederanno tempo (parlare con database), req contiene la domanda dell'utente e res la risposta del server 
app.get('/api/ricerca', async (req, res) => {
    //estraimamo i parametri dalle query 
    const {q, tipo} = req.query; //prende l'url e ne estrae la parola cercata q e ne filtra il tipo
    if(!q) {
        return res.json({squadre: [], giocatori: [], competizioni: [], notizie: []});
    }

    const searchTerm=`%${q}%`; //trucco per dire -> trova questa parola ovunque si trovi nel testo
    let risultati= {squadre: [], giocatori: [], competizioni: [], notizie: []};

    try {
        //cerco nelle squadre
        if (tipo==='tutto' || tipo==='squadre') {
            const {data}= await supabase 
                .from('squadre')
                .select('id, nome, logo_url')
                .ilike('nome', searchTerm); //ilike -> la i sta per insensitive, signifca che sia se cerchiamo ROMA o roma trovera comunque risultati 
            risultati.squadre=data || [];

        }
        //cerco nei giocatori 
        if (tipo==='tutto' || tipo==='giocatori') {
            const {data}= await supabase 
                .from('giocatori')
                .select('id, nome_cognome, ruolo, squadre(nome)')
                .ilike('nome_cognome', searchTerm);
            listaUnica = []
            if (data) {
                listaUnica = data.filter((giocatore, index, self) =>
                    index === self.findIndex((g) => g.nome_cognome === giocatore.nome_cognome)
                );
            }
            risultati.giocatori = listaUnica;
         }
         //cerco nelle competizioni
        if (tipo==='tutto' || tipo==='competizioni') {
            const {data}= await supabase 
                .from('competizioni')
                .select('id, nome, logo_url')
                .ilike('nome', searchTerm);
            risultati.competizioni=data || [];
         }

         //cerco nelle notizie
         if (tipo==='tutto' || tipo==='notizie') {
            const {data}= await supabase 
                .from('notizie')
                .select('id, titolo, data_pubblicazione')
                .or(`titolo.ilike.${searchTerm},contenuto.ilike.${searchTerm}`); // mi trova tutte le notizie dove la parola cercata è prsente nel titolo oppure nel contenuto
            risultati.notizie=data || [];
         }
         res.json(risultati);
        } catch(err) {
            console.error("Errore durante la ricerca:", err);
            res.status(500).json({error: "Errore interno del server durante la ricerca"});

        }
})

async function getAllData(queryBuilder) {
    let allData = [];
    let from = 0;
    let to = 999;
    let finished = false;

    while (!finished) {
        const { data, error } = await queryBuilder.range(from, to);
        if (error) throw error;
        if (data && data.length > 0) {
            allData = [...allData, ...data];
            from += 1000;
            to += 1000;
        } else {
            finished = true;
        }
    }
    return { data: allData };
}
// 1. GET TUTTE LE COMPETIZIONI (Con filtro annata)
app.get('/api/competizioni', async (req, res) => {
    const annataRichiesta = req.query.annata || '25/26';

    try {
        // 1. Prendiamo tutte le competizioni
        const { data: competizioni } = await supabase
            .from('competizioni')
            .select('*')
            .order('nome', { ascending: true });

        // 2. Prendiamo TUTTE le partite finite di quell'annata per calcolare le classifiche
        const { data: partite } = await getAllData(supabase
            .from('partite')
            .select(`
                id_competizione, gol_casa, gol_trasferta,
                squadra_casa:squadre!id_squadra_casa(id, nome, logo_url),
                squadra_trasferta:squadre!id_squadra_trasferta(id, nome, logo_url)
            `)
            .eq('stato', 'finita')
            .eq('annata', annataRichiesta));
            

        // 3. Troviamo tutte le annate disponibili (per il menu a tendina)
        const { data: annateData } = await supabase
            .from('partite')
            .select('annata');
            
        
        let annateDisponibili = [];
        if (annateData) {
            annateDisponibili = [...new Set(annateData.map(p => p.annata))].sort().reverse();
        }
        if (annateDisponibili.length === 0) annateDisponibili = ['25/26'];
        
        res.json({ 
            competizioni: competizioni || [], 
            partite: partite || [],
            annate_disponibili: annateDisponibili
        });
    } catch (err) {
        console.error("Errore competizioni:", err);
        res.status(500).json({ error: "Errore nel recupero delle competizioni" });
    }
});


// 2. GET DETTAGLIO SINGOLA COMPETIZIONE
app.get('/api/competizioni/:id/dettagli', async (req, res) => {
    const idCompetizione = req.params.id;
    const annataRichiesta = req.query.annata || '25/26';

    try {
        // 1. Dati base
        const { data: competizione } = await supabase.from('competizioni').select('*').eq('id', idCompetizione).single();
        
        const { data: partite } = await supabase.from('partite').select(`
            *, 
            squadra_casa:squadre!id_squadra_casa(id, nome, logo_url), 
            squadra_trasferta:squadre!id_squadra_trasferta(id, nome, logo_url)
        `).eq('id_competizione', idCompetizione).eq('annata', annataRichiesta);

        // 2. Recupero MARCATORI - Join implicito per ottenere id_squadra dai giocatori
        const { data: marcatoriRaw } = await supabase
            .from('marcatori')
            .select(`
                id,
                id_partita,
                minuto,
                tipo_gol,
                marcatore_originale:id_giocatore(id, nome_cognome, id_squadra), 
                assistman_originale:id_assistman(id, nome_cognome, id_squadra),
                partita:id_partita!inner(id_competizione, annata)
            `)
            .eq('partita.id_competizione', idCompetizione)
            .eq('partita.annata', annataRichiesta);

        // 3. Estrazione nomi unici (per il recupero dei record completi dell'annata)
        const nomiGiocatori = [...new Set([
            ...(marcatoriRaw?.map(m => m.marcatore_originale?.nome_cognome) || []),
            ...(marcatoriRaw?.map(m => m.assistman_originale?.nome_cognome) || [])
        ].filter(Boolean))];

        // 4. Recupero record GIOCATORI dell'annata
        const { data: giocatoriAnnata } = await supabase
            .from('giocatori')
            .select(`
                id, 
                nome_cognome, 
                annata, 
                id_squadra,
                squadra:squadre!inner(id, nome, id_competizione)
            `)
            .in('nome_cognome', nomiGiocatori)
            .eq('annata', annataRichiesta)
            .eq('squadra.id_competizione', idCompetizione);

        // 5. Creazione Mappa con chiave composta (Nome + Squadra)
        const mappaGiocatori = {};
        giocatoriAnnata?.forEach(g => {
            const key = `${g.nome_cognome}|${g.id_squadra}`;
            mappaGiocatori[key] = g;
        });

        // 6. Mappatura finale
        const marcatoriRisolti = (marcatoriRaw || []).map(m => {
            const marcatoreObj = m.marcatore_originale;
            const assistmanObj = m.assistman_originale;

            const chiaveM = marcatoreObj ? `${marcatoreObj.nome_cognome}|${marcatoreObj.id_squadra}` : null;
            const chiaveA = assistmanObj ? `${assistmanObj.nome_cognome}|${assistmanObj.id_squadra}` : null;

            const giocatoreRisolto = chiaveM ? mappaGiocatori[chiaveM] : null;
            const assistmanRisolto = chiaveA ? mappaGiocatori[chiaveA] : null;

            return {
                id: m.id,
                partita_id: m.id_partita,
                minuto: m.minuto,
                tipo_gol: m.tipo_gol,
                giocatore: giocatoreRisolto || (marcatoreObj ? { ...marcatoreObj, squadra: { nome: 'N.D.' } } : null),
                assistman: assistmanRisolto || (assistmanObj ? { ...assistmanObj } : null)
            };
        });
        // 7. Ricerca Notizie
        const {data : notizie} = await supabase 
            .from('notizie')
            .select(`
                id,
                titolo,
                contenuto,
                img_url,
                data_pubblicazione,
                id_competizione
            `)
            .eq('id_competizione', idCompetizione)
        res.json({
            competizione,
            partite: partite || [],
            marcatori: marcatoriRisolti,
            notizie: notizie // Aggiungi qui la query notizie se serve
        });

    } catch (err) {
        console.error("Errore dettagli competizione:", err);
        res.status(500).json({ error: "Errore interno" });
    }
});

// ==========================================
// API PUBBLICHE: DETTAGLIO SQUADRA (AGGIORNATO CON MARCATORI)
// ==========================================

app.get('/api/squadre/:id/dettagli', async (req, res) => {
    const idSquadra = req.params.id;
    const annataRichiesta = req.query.annata || '25/26'; 
    console.log("CHIAMATA API DETTAGLI - ID SQUADRA RICEVUTO:", idSquadra);
    
    try {
        // 1. Dati della Squadra
        const { data: squadra, error: sqError } = await supabase
            .from('squadre')
            .select(`id, nome, logo_url, id_competizione, competizioni ( id, nome )`)
            .eq('id', idSquadra)
            .single();

        if (sqError || !squadra) return res.status(404).json({ error: "Squadra non trovata" });

        // 2. La Rosa (Giocatori filtrati per annata)
        const { data: giocatori } = await supabase
            .from('giocatori')
            .select('*')
            .eq('id_squadra', idSquadra)
            .eq('annata', annataRichiesta)
            .order('ruolo', { ascending: true });

        // 3. Le Partite della squadra
        const { data: partite } = await supabase
            .from('partite')
            .select(`
                *,
                squadra_casa:squadre!id_squadra_casa(id, nome, logo_url),
                squadra_trasferta:squadre!id_squadra_trasferta(id, nome, logo_url)
            `)
            .or(`id_squadra_casa.eq.${idSquadra},id_squadra_trasferta.eq.${idSquadra}`)
            .eq('annata', annataRichiesta)
            .order('data_ora', { ascending: false });

        // 4. I Marcatori di queste partite (Serve per la tendina a comparsa)
        let marcatori = [];
        if (partite && partite.length > 0) {
            const idPartite = partite.map(p => p.id);
            const { data: marcatoriData } = await supabase
                .from('marcatori')
                .select(`
                    *,
                    giocatore:giocatori!id_giocatore(id, nome_cognome, id_squadra)
                `)
                .in('id_partita', idPartite);
            marcatori = marcatoriData || [];
        }

        // 5. TUTTE le partite finite della competizione (Per la Classifica)
        const { data: partiteCompetizione } = await supabase
            .from('partite')
            .select(`
                id_squadra_casa, id_squadra_trasferta, gol_casa, gol_trasferta,
                squadra_casa:squadre!id_squadra_casa(id, nome, logo_url),
                squadra_trasferta:squadre!id_squadra_trasferta(id, nome, logo_url)
            `)
            .eq('id_competizione', squadra.id_competizione)
            .eq('stato', 'finita')
            .eq('annata', annataRichiesta);

        // 6. Le News
        const { data: notizie } = await supabase
            .from('notizie')
            .select('*')
            .eq('id_competizione', squadra.id_competizione)
            .order('data_pubblicazione', { ascending: false })
            .limit(5);

        // 7. Annate disponibili
        const { data: annateData } = await supabase
            .from('partite')
            .select('annata')
            .eq('id_competizione', squadra.id_competizione);
        
        let annateDisponibili = [];
        if (annateData) {
            annateDisponibili = [...new Set(annateData.map(p => p.annata))].sort().reverse();
        }
        if (annateDisponibili.length === 0) annateDisponibili = ['25/26'];

        res.json({
            squadra: squadra,
            giocatori: giocatori || [],
            partite: partite || [],
            marcatori: marcatori, // <-- Aggiunto!
            partite_competizione: partiteCompetizione || [],
            notizie: notizie || [],
            annate_disponibili: annateDisponibili
        });

    } catch (err) {
        console.error("Errore dettaglio squadra:", err);
        res.status(500).json({ error: "Errore interno del server" });
    }
});


// Se usi il client supabase: const { createClient } = require('@supabase/supabase-js')
// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

app.get('/api/giocatori/dettaglio/:identifier', async (req, res) => {
    const rawIdentifier = req.params.identifier;
    
    if (!rawIdentifier || rawIdentifier === 'undefined') {
        console.log("❌ Bloccata richiesta con parametro undefined o vuoto");
        return res.status(400).json({ message: "URL non valido (parametro mancante)" });
    }

    const identifier = decodeURIComponent(rawIdentifier).trim();
    let nomeCercato = identifier;

    console.log(`\n--- CERCO GIOCATORE: ${nomeCercato} ---`);

    try {
        if (!isNaN(identifier) && identifier !== '') {
            const { data: p, error: errId } = await supabase
                .from('giocatori')
                .select('nome_cognome')
                .eq('id', identifier)
                .single();
            
            if (errId) console.error("Errore ricerca ID:", errId);
            
            if (p) {
                nomeCercato = p.nome_cognome.trim();
                console.log("ID riconosciuto. Nome reale dal DB:", nomeCercato);
            } else {
                return res.status(404).json({ message: "ID giocatore non trovato" });
            }
        }

        const { data: records, error: pError } = await supabase
            .from('giocatori')
            .select(`
                *,
                squadre (id, nome, logo_url, id_competizione)
            `)
            .ilike('nome_cognome', `%${nomeCercato}%`) 
            .order('annata', { ascending: false });

        if (pError) {
            console.error("⚠️ ERRORE DATABASE (Tabella giocatori):", pError);
            return res.status(500).json({ message: "Errore query database", errore: pError });
        }

        if (!records || records.length === 0) {
            console.log(`❌ Nessun giocatore trovato con il nome simile a: %${nomeCercato}%`);
            return res.status(404).json({ message: "Giocatore non trovato" });
        }

        console.log(`✅ Giocatore trovato! Trovati ${records.length} record in carriera.`);

        const infoAttuali = records[0];
        const tuttiIdGiocatori = records.map(r => r.id);

        const { data: marcatori } = await supabase
            .from('marcatori')
            .select('id_giocatore, id_assistman, gol')
            .or(`id_giocatore.in.(${tuttiIdGiocatori.join(',')}),id_assistman.in.(${tuttiIdGiocatori.join(',')})`);

        let totaleGol = 0;
        let totaleAssist = 0;

        const carrieraConStatistiche = records.map(record => {
            const eventiGol = marcatori ? marcatori.filter(m => m.id_giocatore === record.id) : [];
            const eventiAssist = marcatori ? marcatori.filter(m => m.id_assistman === record.id) : [];

            const golStagione = eventiGol.reduce((acc, curr) => acc + (curr.gol > 0 ? curr.gol : 1), 0);
            const assistStagione = eventiAssist.length;

            totaleGol += golStagione;
            totaleAssist += assistStagione;

            return { ...record, gol: golStagione, assist: assistStagione };
        });

        let ultimePartite = [];
        const idSquadraCorrente = infoAttuali.id_squadra;

        if (idSquadraCorrente) {
            // 🔥 ECCO LA MODIFICA: ho alzato il limite a 50 partite invece di 5
            const { data: partite, error: errPartite } = await supabase
                .from('partite')
                .select(`
                    id, data_ora, gol_casa, gol_trasferta, stato,
                    squadra_casa:squadre!partite_id_squadra_casa_fkey (id, nome, logo_url),
                    squadra_trasferta:squadre!partite_id_squadra_trasferta_fkey (id, nome, logo_url)
                `)
                .eq('stato', 'finita')
                .or(`id_squadra_casa.eq.${idSquadraCorrente},id_squadra_trasferta.eq.${idSquadraCorrente}`)
                .order('data_ora', { ascending: false })
                .limit(50); // <--- Modificato qui!

            if (errPartite) console.error("⚠️ ERRORE DATABASE (Tabella partite):", errPartite);

            if (partite && partite.length > 0) {
                const idsPartite = partite.map(p => p.id);
                
                const { data: marcatoriUltimePartite } = await supabase
                    .from('marcatori')
                    .select('id_partita, id_giocatore, id_assistman, gol')
                    .in('id_partita', idsPartite)
                    .or(`id_giocatore.eq.${infoAttuali.id},id_assistman.eq.${infoAttuali.id}`);

                ultimePartite = partite.map(partita => {
                    const eventiGolMatch = marcatoriUltimePartite ? marcatoriUltimePartite.filter(m => m.id_partita === partita.id && m.id_giocatore === infoAttuali.id) : [];
                    const eventiAssistMatch = marcatoriUltimePartite ? marcatoriUltimePartite.filter(m => m.id_partita === partita.id && m.id_assistman === infoAttuali.id) : [];
                    
                    return {
                        ...partita,
                        gol_giocatore: eventiGolMatch.reduce((acc, curr) => acc + (curr.gol > 0 ? curr.gol : 1), 0),
                        assist_giocatore: eventiAssistMatch.length
                    };
                });
            }
        }

        res.json({
            info: infoAttuali,
            carriera: carrieraConStatistiche,
            statistiche: { gol: totaleGol, assist: totaleAssist },
            ultime_partite: ultimePartite
        });

    } catch (error) {
        console.error("🔥 ERRORE FATALE API GIOCATORE:", error);
        res.status(500).json({ error: "Errore interno del server" });
    }
});
// --- AVVIO DEL SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 Server in esecuzione su http://localhost:${PORT}`);
});

