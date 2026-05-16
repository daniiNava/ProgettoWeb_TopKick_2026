const express = require('express');
const router = express.Router();                                                            // Creazione di un mini modulo di rotte
const bcrypt = require('bcrypt');                                                           // Libreria per l'hashing delle password
const supabase = require('../config/supabase');
const { checkAuth } = require('../middlewares/controlli');

// ============================
// POST: Api per la REGISTRAZIONE
// ============================

router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;                                         // Estrazione dei dati dal body JSON

    // Validazione base
    if (!username || !email || !password) {
        return res.status(400).json({ error: "Tutti i campi devono essere inseriti" });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: "La password deve avere almeno 8 caratteri" });
    }

    try {
        // Cripting della password
        const saltRounds = 10;                                                              // Complessità algoritmo di hashing
        const hash = await bcrypt.hash(password, saltRounds);                               // Criptazione della password

        // Inserimento dei dati dell'utente su Supabase                                              
        const { data, error } = await supabase
            .from('utenti')
            .insert([{ username: username, email: email, password_hash: hash }])
            .select();                                                                      // Viene chiesto a Supabase di restituirci la riga appena creato nel DB

        // Gestione errori DB
        if (error) {
            if (error.code === '23505') {                                                   // Codice PostGreSQL per violazione UNIQUE
                return res.status(400).json({ error: "Username o Email già registrati" });
            }
            throw error;
        }

        // Creazione della sessione (log automatico post-registrazione)
        req.session.user = {
            id: data[0].id,
            username: data[0].username,
            email: data[0].email,
            ruolo: data[0].ruolo
        };

        res.status(201).json({ message: "Registrazione completata correttamente!" });

    } catch (err) {
        res.status(500).json({ error: "Errore interno del server" });
    }
});

// ============================
// POST : Api per il LOGIN
// ============================

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Inserisci email e password" });
    }

    try {
        // Ricerca nel DB dell'utente tramite email
        const { data: user, error } = await supabase
            .from('utenti')
            .select('*')
            .eq('email', email)
            .single();                                                                  // assciura che ritorni un solo oggetto, non un array

        if (error || !user) {
            return res.status(401).json({ error: "Credenziali di accesso non valide" });
        }

        // Confronto tra password in chiaro inserita e l'hash salvato nel DB (mitiga timing attacks)
        const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);

        if (isPasswordCorrect) {
            // Salvo i dati nel payload della sessione
            req.session.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                ruolo: user.ruolo
            };
            res.json({ message: "Login Effettuato con successo!", user: req.session.user });
        } else {
            res.status(401).json({ error: "Credenziali di accesso non valide" });
        }

    } catch (err) {
        console.error("Errore login:", err);
        res.status(500).json({ error: "Errore interno del server" });
    }
});
// ==================================================
// Api per il CONTROLLO SESSIONE (Usato da Vue)
// ==================================================
router.get('/me', async (req, res) => {
    if (req.session.user) {
        res.json(req.session.user);
    } else {
        res.status(401).json({ error: "Non sei ancora loggato" });
    }
});

// ============================
// Api per il LOGOUT
// ============================
router.post('/logout', async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Errore durante il logout:", err);
            return res.status(500).json({ error: "Impossibile effettuare il logout" });
        }
        res.clearCookie('connect.sid');                                                       // Cancellazione del cookie lato Client
        res.json({ message: "Logout effettuato con successo" });
    });
});


// =================================
// API Upgrade Utente Base->Premium
// =================================

router.post('/upgrade', checkAuth, async(req, res) => {
    const userId = req.session.user.id;
    try{
        // 1. Aggiornamento del ruolo nel DB
        const { error } = await supabase
            .from('utenti')
            .update({ ruolo: 'premium' })
            .eq('id', userId);
        if(error) throw error;

        // 2. Aggiornamento del ruolo ANCHE nella SESSIONE CORRENTE (Ram del server) (Senza dover far fare logout e login per far vedere gli aggiornanenti all'utente)
        req.session.user.ruolo = 'premium';

        res.json({ message:"Upgrade completato con successo! Ora sei un utente Premium." })
    } catch (err) {
        console.error("Errore durante l'upgrade", err);
        res.status(500).json({ error: "Errore interno del server durante l'upgrade dell'utente" });
    }
});

module.exports = router;