require('dotenv').config();                                 // Caricamento delle variabili segrete dal file .env bell'oggetto processo .env

const express = require('express');
const cors = require('cors');                               // In questo modo vengono autorizzate le risorse (API) ad essere richieste da un dominio frontend diverso da quello del backend
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);    // Modulo per salvare le sessioni su PostgreSQL
const { Pool } = require('pg');                             // Client per connettersi a PostgreSQL

// Instanziazione del server
const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURAZIONE DATABASE PER LE SESSIONI ---
const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL      // Usa l'URL del db su Supabase (.env)
});

// --- MIDDLEWARE GLOBALI ---
app.use(cors({
    origin: 'http://localhost:5173',                // Permette al frontend (porta 5173) di fare chiamate al backend (porta 3000)
    credentials: true                               // Permette al browser di inviare il cookie di sessione al server
}));
app.use(express.json());                            // Permette al server di leggere il body delle richieste POST in formato JSON

// --- SETUP SESSIONI ---
app.use(session({
    store: new pgSession({
        pool: pgPool,                               // Dove salvare le sessioni (nostro DB)
        tableName: 'session'                        // Nome della tabella su Supabase
    }),
    secret: process.env.SESSION_SECRET,             // Chiave crittografata per firmare i cookie (.env)
    resave: false,                                  // Non risalva la sessione se non è stata modificata
    saveUninitialized: false,                       // Non vengono create sessioni vuote per utenti non loggati
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24,                // Il cookie dura 24 ore
        httpOnly: true                              // Previene attacchi XSS (Impedisce a JS di leggere il cookie)
    }
}));

// --- IMPORTAZIONE ROTTE (Moduli) ---
const authRoutes = require('./routes/auth');
const preferitiRoutes = require('./routes/preferiti');
const publicRoutes = require('./routes/public'); 
const premiumRoutes = require('./routes/premium');

// --- AGGANCIO DELLE ROTTE AL SERVER ---
app.use('/api', authRoutes); 
app.use('/api/preferiti', preferitiRoutes); 
app.use('/api', publicRoutes); 
app.use('/api', premiumRoutes);

// Rotta di test per vedere se il server è vivo
app.get('/api/test', (req, res) => {
    res.json({ message: "Benvenuto nel Backend modulare di TOPKICK!" });
});

// --- AVVIO DEL SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 Server in esecuzione su http://localhost:${PORT}`);
});