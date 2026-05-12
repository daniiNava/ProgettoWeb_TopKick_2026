const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const supabase = require('../config/supabase');

// Api per la REGISTRAZIONE
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Validazione base
    if (!username || !email || !password) {
        return res.status(400).json({ error: "Tutti i campi devono essere inseriti" });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: "La password deve avere almeno 8 caratteri" });
    }

    try {
        // Cripting della password
        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds);

        // Inserimento dell'utente su Supabase
        const { data, error } = await supabase
            .from('utenti')
            .insert([{ username: username, email: email, password_hash: hash }])
            .select();

        // Gestione errori DB
        if (error) {
            if (error.code === '23505') { // Codice PostGreSQL per violazione UNIQUE
                return res.status(400).json({ error: "Username o Email già registrati" });
            }
            throw error;
        }

        // Se tutto è corretto, creo la sessione per il log automatico
        req.session.user = {
            id: data[0].id,
            username: data[0].username,
            email: data[0].email,
            ruolo: data[0].ruolo
        };

        res.status(201).json({ message: "Registrazione completata correttamente!" });

    } catch (err) {
        console.error("Errore registrazione:", err);
        res.status(500).json({ error: "Errore interno del server" });
    }
});

// Api per il LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Inserisci email e password" });
    }

    try {
        // Ricerca dell'utente tramite email
        const { data: user, error } = await supabase
            .from('utenti')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: "Credenziali di accesso non valide" });
        }

        // Confronto tra password inserita e hash salvato nel DB (mitiga timing attacks)
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

// Api per il CONTROLLO SESSIONE (Usato da Vue)
router.get('/me', async (req, res) => {
    if (req.session.user) {
        res.json(req.session.user);
    } else {
        res.status(401).json({ error: "Non sei ancora loggato" });
    }
});

// Api per il LOGOUT
router.post('/logout', async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Errore durante il logout:", err);
            return res.status(500).json({ error: "Impossibile effettuare il logout" });
        }
        res.clearCookie('connect.sid'); // Cancellazione del cookie lato Client
        res.json({ message: "Logout effettuato con successo" });
    });
});

module.exports = router;