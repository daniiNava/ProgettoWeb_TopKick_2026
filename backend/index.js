const express = require('express'); // acquisizione framework Express.js per la gestione dell'HTTP e delle API
const cors = require('cors'); // cors permette di far comunicare il server con origini diverse dalla propria, nel nostro caso con il nostro frontend
const session = require('express-session'); // visto che HTTP è stateless, questo serve per far salvare un cookie con l'id utente
const pgSession = require('connect-pg-simple')(session); // vengono salvati dei dati di sessione a un database PostGreSql nella RAM del server
const { Pool } = require('pg'); // estrapola la classe Pool da pg. Pattern architetturale che mantiene attive alcune connessioni al database 
const { createClient } = require('@supabase/supabase-js'); // Permette di comunicare con Supabase, tramite query con metodi JavaScript anzichè costrutti puri SQL
// Instanziazione del server
const app = express();  // Instanzia un nuovo oggetto express. app è il server stesso
const PORT = 3000;      // Costante di tempo che definisce il valore della porta TCP

// --- CONFIGURAZIONE SUPABASE ---
const supabaseUrl = 'https://kwawnceudvzlwjrjxmqy.supabase.co/rest/v1/';
const supabaseKey = 'sb_publishable_dZdJngqz09EvJxz8kHVh8A_azSDBZTr';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- CONFIGURAZIONE DATABASE PER LE SESSIONI ---
const pgPool = new Pool({
    connectionString: "postgresql://postgres:[AnagninaCentocelleViterbo]@db.kwawnceudvzlwjrjxmqy.supabase.co:5432/postgres"
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
    secret: 'K9xQ2vL5jP8mW3cR7zN1bT6yF4hD0gS5kV8nC2xM9lB3jZ7pW1fR6qT4dH0yN5mS',
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

// API HOMEPAGE
// Prima API: Ultime 5 notizie
app.get('/api/notizie/recenti', async (req, res) => {
    try {
        // Richiesta a Supabase delle 5 notizie ordinate per data decrescente
        const { data, error } = await supabase
            .from('notizie')
            .select('*')
            .order('data_pubblicazione', { ascending: false})
            .limit('5')

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
                squadra_casa:id_squadra_casa ( nome, logo_url ), 
                squadra_trasferta:id_squadra_trasferta ( nome, logo_url )
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



// --- AVVIO DEL SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 Server in esecuzione su http://localhost:${PORT}`);
});