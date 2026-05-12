const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { checkAuth } = require('../middlewares/controlli');

// GET: Recupero tutti i preferiti dell'utente loggato
router.get('/', checkAuth, async (req, res) => {
    const idUtente = req.session.user.id;
    
    try {
        // Recupero Competizioni Preferite
        const { data: compPreferite, error: errComp } = await supabase
            .from('preferiti_competizioni')
            .select('competizioni(id, nome, logo_url)')
            .eq('id_utente', idUtente);
        if (errComp) throw errComp;

        // Recupero SQUADRE Preferite
        const { data: sqPreferite, error: errSq } = await supabase
            .from('preferiti_squadre')
            .select('squadre(id, nome, logo_url)')
            .eq('id_utente', idUtente);
        if (errSq) throw errSq;

        // Formattazione dati per Vue
        const competizioni = compPreferite ? compPreferite.map(p => p.competizioni) : [];
        const squadre = sqPreferite ? sqPreferite.map(p => p.squadre) : [];

        res.json({ competizioni, squadre });

    } catch (err) {
        res.status(500).json({ error: "Errore nel recupero dei preferiti" });
    }
});

// DELETE: Eliminazione di una competizione
router.delete('/competizioni/:id', checkAuth, async (req, res) => {
    try {
        const { error } = await supabase.from('preferiti_competizioni')
            .delete()
            .eq('id_utente', req.session.user.id)
            .eq('id_competizione', req.params.id);

        if (error) throw error;            
        res.json({ message: "Competizione rimossa dai preferiti" });
    } catch (err) {
        res.status(500).json({ error: "Errore nell'eliminazione della competizione tra i preferiti" });
    }
});

// DELETE: Eliminazione di una squadra
router.delete('/squadre/:id', checkAuth, async (req, res) => {
    try {
        const { error } = await supabase.from('preferiti_squadre')
            .delete()
            .eq('id_utente', req.session.user.id)
            .eq('id_squadra', req.params.id);

        if (error) throw error;
        res.json({ message: "Squadra rimossa dai preferiti" });
    } catch (err) {
        res.status(500).json({ error: "Errore nell'eliminazione della squadra tra i preferiti" });
    }
});

// POST: Aggiunta competizione
router.post('/competizioni', checkAuth, async (req, res) => {
    const { id_competizione } = req.body;
    try {
        const { error } = await supabase
            .from('preferiti_competizioni')
            .insert([{ id_utente: req.session.user.id, id_competizione }]);

        if (error) throw error;
        res.status(201).json({ message: "Aggiunta ai preferiti" });
    } catch (err) {
        res.status(500).json({ error: "Errore nell'aggiunta ai preferiti" });
    }
});

// POST: Aggiunta squadra
router.post('/squadre', checkAuth, async (req, res) => {
    const { id_squadra } = req.body;
    try {
        const { error } = await supabase
            .from('preferiti_squadre')
            .insert([{ id_utente: req.session.user.id, id_squadra }]);

        if (error) throw error;
        res.status(201).json({ message: "Aggiunta ai preferiti" });
    } catch (err) {
        res.status(500).json({ error: "Errore nell'aggiunta ai preferiti" });
    }
});

module.exports = router;