require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

// Instanziazione del server
const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURAZIONE DATABASE PER LE SESSIONI ---
const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// --- MIDDLEWARE GLOBALI ---
app.use(cors({
    origin: 'http://localhost:5173', // Vue.js (Vite)
    credentials: true 
}));
app.use(express.json()); 

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
        maxAge: 1000 * 60 * 60 * 24, // Il cookie dura 24 ore
        httpOnly: true               // Previene attacchi XSS
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
    console.log(`🔧 Struttura modulare caricata con successo.`);
});