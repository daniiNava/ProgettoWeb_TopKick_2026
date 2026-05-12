// Middleware: controlla se l'utente ha una sessione attiva (è loggato)
const checkAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Devi effettuare l'accesso." });
    }
    next();
};

// Middleware: controlla se l'utente è loggato ED È Premium
const checkPremium = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Effettua prima l'accesso." });
    }

    if (req.session.user.ruolo !== 'premium') {
        return res.status(403).json({ error: "Accesso negato. Funzionalità riservata agli utenti Premium." });
    }

    // Se supera i controlli, procede all'API richiesta
    next();
};

module.exports = { checkAuth, checkPremium };