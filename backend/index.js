require('dotenv').config()

const express = require('express'); // acquisizione framework Express.js per la gestione dell'HTTP e delle API
const cors = require('cors'); // cors permette di far comunicare il server con origini diverse dalla propria, nel nostro caso con il nostro frontend
const session = require('express-session'); // visto che HTTP è stateless, questo serve per far salvare un cookie con l'id utente
const pgSession = require('connect-pg-simple')(session); // vengono salvati dei dati di sessione a un database PostGreSql nella RAM del server
const { Pool } = require('pg'); // estrapola la classe Pool da pg. Pattern architetturale che mantiene attive alcune connessioni al database 
const { createClient } = require('@supabase/supabase-js'); // Permette di comunicare con Supabase, tramite query con metodi JavaScript anzichè costrutti puri SQL
const bcrypt = require('bcrypt') // Permette di comunicare le password di autenticazione degli utenti
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
                squadra_casa:squadre!id_squadra_casa ( nome, logo_url ), 
                squadra_trasferta:squadre!id_squadra_trasferta ( nome, logo_url )
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


// --- AVVIO DEL SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 Server in esecuzione su http://localhost:${PORT}`);
});

// ==========================================
// API RICERCA INTELLIGENTE 
// ==========================================
app.get('/api/ricerca', async (req, res) => {
    //estraimamo i parametri dalle query 
    const {q, tipo} = req.query;
    if(!q) {
        return res.json({squadre: [], giocatori: [], competizioni: [], notizie: []});
    }

    const searchTeam=`%${q}%`;
    let risultati= {squadre: [], giocatori: [], competizioni: [], notizie: []};

    try {
        //cerco nelle squadre
        if (tipo==='tutto' || tipo==='squadre') {
            const {data}= await supabase 
                .from('squadre')
                .select('id, nome, logo_url')
                .ilike('nome', searchTerm);
            risultati.squadre=data || [];

        }
        //cerco nei giocatori 
        if (tipo==='tutto' || tipo==='giocatori') {
            const {data}= await supabase 
                .from('giocatori')
                .select('id, nome_cognome, ruolo, squadre(nome)')
                .ilike('nome_cognome', searchTerm);
            risultati.giocatori=data || [];
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
                .select('id, titolo data_pubblicazione')
                .or(`titolo.like.${searchTerm},contenuto.ilike.${searchTerm}`)
            risultati.notizie=data || [];
         }
         res.json(risultati);
        } catch(err) {
            console.error("Errore durante la ricerca:", err);
            res.status(500).json({error: "Errore interno del server durante la ricerca"});

        }
})