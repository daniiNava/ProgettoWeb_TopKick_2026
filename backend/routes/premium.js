const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { checkPremium } = require('../middlewares/controlli');
const multer = require('multer');

// Setup Multer per tenere i file in RAM (buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const LIMITI_RUOLI = {
    'Portiere': 3,
    'Difensore': 6,
    'Centrocampista': 6,
    'Attaccante': 4,
};

// --- GESTIONE COMPETIZIONI ---

router.get('/mie-competizioni', checkPremium, async (req, res) => {
    try {
        const { data, error } = await supabase.from('competizioni').select('*').eq('creato_da', req.session.user.id).order('creato_il', { ascending: false });
        if(error) throw error;
        res.json(data);
    } catch(error){
        res.status(500).json({ error: "Errore nel recupero delle tue competizioni." });
    }
});

router.post('/mie-competizioni', checkPremium, upload.single('logo'), async (req, res) => {
    const { nome, numero_squadre } = req.body;
    const file = req.file;

    if(!nome || !numero_squadre) return res.status(400).json({ error: "Nome e numero squadre sono obbligatori"});

    try {
        let logo_url = null;
        if(file){
            const fileName = `${Date.now()}_${file.originalname.replace(/\s/g, '_')}`; 
            const { error: storageError } = await supabase.storage.from('Loghi_UtentePremium').upload(fileName, file.buffer, { contentType: file.mimetype });
            if(storageError) throw storageError;

            const { data: publicUrlData } = supabase.storage.from('Loghi_UtentePremium').getPublicUrl(fileName);
            logo_url = publicUrlData.publicUrl;
        }

        const { data, error } = await supabase.from('competizioni').insert([{
            nome: nome, logo_url: logo_url, numero_squadre: numero_squadre, creato_da: req.session.user.id
        }]).select();

        if(error) throw error;
        res.status(201).json({ message: "Competizione creata!", competizione: data[0] });
    } catch (error){
        console.error("Errore creazione competizione: ", error);
        res.status(500).json({ error: "Errore nella creazione della competizione"});
    }
});

router.delete('/mie-competizioni/:id', checkPremium, async (req, res) => {
    try {
        // Sicurezza doppia: id e creato_da
        const { error } = await supabase.from('competizioni').delete().eq('id', req.params.id).eq('creato_da', req.session.user.id);
        if(error) throw error;
        res.json({ message: "Competizione eliminata con successo!" });
    } catch (error){
        res.status(500).json({ error: "Errore nell'eliminazione della competizione"});
    }
});

// --- GESTIONE SQUADRE ---

router.get('/mie-competizioni/:id/squadre', checkPremium, async(req, res) => {
    const idCompetizione = req.params.id;
    try{
        const { data: comp, error: compError } = await supabase.from('competizioni').select('id, nome, numero_squadre, creato_da').eq('id', idCompetizione).single();
        if(compError || !comp) return res.status(404).json({ error: "Competizione non trovata" });
        if(comp.creato_da !== req.session.user.id) return res.status(403).json({ error: "Non autorizzato" });

        const { data: squadre, error: squadreError } = await supabase.from('squadre').select('*').eq('id_competizione', idCompetizione).order('creato_il', { ascending:false });
        if(squadreError) throw squadreError;

        res.json({ competizione: comp, squadre: squadre });
    } catch(err){
        res.status(500).json({ error: "Errore nel recupero delle squadre" });
    }
});

router.post('/mie-competizioni/:id/squadre', checkPremium, upload.single('logo'), async (req, res) => {
    const idCompetizione = req.params.id;
    const { nome } = req.body;
    const file = req.file;

    if(!nome) return res.status(400).json({ error: "Il nome della squadra è obbligatorio"});

    try {
        const { data: comp } = await supabase.from('competizioni').select('creato_da, numero_squadre').eq('id', idCompetizione).single();
        if(!comp || comp.creato_da !== req.session.user.id) return res.status(403).json({ error: "Non autorizzato" });

        const { count } = await supabase.from('squadre').select('*', { count: 'exact', head: true }).eq('id_competizione', idCompetizione);
        if(count >= comp.numero_squadre) return res.status(400).json({ error: `Limite massimo raggiunto (${comp.numero_squadre}).` });

        let logo_url = null;
        if(file){
            const fileName = `squadre/${Date.now()}_${file.originalname.replace(/\s/g, '_')}`; 
            const { error: storageError } = await supabase.storage.from('Loghi_UtentePremium').upload(fileName, file.buffer, { contentType: file.mimetype });
            if(storageError) throw storageError;

            const { data: publicUrlData } = supabase.storage.from('Loghi_UtentePremium').getPublicUrl(fileName);       
            logo_url = publicUrlData.publicUrl;
        }

        const { data, error } = await supabase.from('squadre').insert([{
            nome: nome, logo_url: logo_url, id_competizione: idCompetizione, creato_da: req.session.user.id
        }]).select();

        if(error) throw error;
        res.status(201).json({ message: "Squadra creata e aggiunta!", squadra: data[0] });
    } catch (error){
        res.status(500).json({ error: "Errore nell'aggiunta della squadra"});
    }
});

router.delete('/squadre/:id', checkPremium, async (req, res) => {
    try {
        const { error } = await supabase.from('squadre').delete().eq('id', req.params.id).eq('creato_da', req.session.user.id);
        if(error) throw error;
        res.status(200).json({ message: "Squadra eliminata con successo!" });
    } catch (error){
        res.status(500).json({ error: "Errore nell'eliminazione della squadra"});
    }
});

// --- GESTIONE GIOCATORI ---

router.get('/squadre/:id/giocatori', checkPremium, async (req, res) => {
    try {
        const { data: squadra, error: sqError } = await supabase.from('squadre').select('id, nome, logo_url, id_competizione, creato_da').eq('id', req.params.id).single();
        if(sqError || !squadra) return res.status(404).json({ error: "Squadra non trovata" });
        if(squadra.creato_da !== req.session.user.id) return res.status(403).json({ error: "Non autorizzato" });
        
        const { data: giocatori, error: gioError } = await supabase.from('giocatori').select('*').eq('id_squadra', req.params.id).order('ruolo', { ascending: true });
        if(gioError) throw gioError;

        res.json({ squadra: squadra, giocatori: giocatori  });
    } catch (error) {
        res.status(500).json({ error: "Errore nel recupero dei giocatori" });
    }
});

router.post('/squadre/:id/giocatori', checkPremium, async (req, res) => {
    const { nome_cognome, ruolo, data_nascita, piede_preferito } = req.body;
    if(!nome_cognome || !ruolo) return res.status(400).json({ error: "Nome e ruolo sono obbligatori" });
    if(!LIMITI_RUOLI[ruolo]) return res.status(400).json({ error: "Ruolo non valido" });

    try {
        const { data: squadra } = await supabase.from('squadre').select('creato_da').eq('id', req.params.id).single();
        if(!squadra || squadra.creato_da !== req.session.user.id) return res.status(403).json({ error: "Non autorizzato" });

        const { count, countError } = await supabase.from('giocatori').select('*', { count: 'exact', head: true }).eq('id_squadra', req.params.id).eq('ruolo', ruolo);  
        if(countError) throw countError;
        if(count >= LIMITI_RUOLI[ruolo]) return res.status(400).json({ error: `Limite max raggiunto per il ruolo che hai scelto: ${ruolo} (${LIMITI_RUOLI[ruolo]}).` });

        const { data, error } = await supabase.from('giocatori').insert([{
            nome_cognome, ruolo, data_nascita: data_nascita || null, piede_preferito: piede_preferito || null, id_squadra: req.params.id, creato_da: req.session.user.id
        }]).select();

        if(error) throw error;
        res.status(201).json({ message: "Giocatore aggiunto!", giocatore: data[0] });
    } catch (err) {
        res.status(500).json({ error: "Errore nell'aggiunta del giocatore" });
    }
});

router.delete('/giocatori/:id', checkPremium, async (req, res) => {
    try {
        const { error } = await supabase.from('giocatori').delete().eq('id', req.params.id).eq('creato_da', req.session.user.id);
        if(error) throw error;
        res.status(200).json({ message: "Giocatore eliminato con successo!" });
    } catch (error){
        res.status(500).json({ error: "Errore nell'eliminazione del giocatore"});
    }
});

// --- GESTIONE CALENDARIO E PARTITE ---

router.get('/mie-competizioni/:id/calendario', checkPremium, async (req, res) => {
    try {
        const { data: comp, error: compError } = await supabase.from('competizioni').select('id, nome, creato_da').eq('id', req.params.id).single();
        if(compError || !comp) return res.status(404).json({ error: "Competizione non trovata" });
        if(comp.creato_da !== req.session.user.id) return res.status(403).json({ error: "Non autorizzato" });
        
        const { data: squadre } = await supabase.from('squadre').select('id, nome, logo_url').eq('id_competizione', req.params.id).order('nome', { ascending: true });
        const { data: partite } = await supabase.from('partite').select(`
                *, competizioni ( nome ),
                squadra_casa:squadre!id_squadra_casa ( nome, logo_url ), 
                squadra_trasferta:squadre!id_squadra_trasferta ( nome, logo_url ),
                marcatori(id, id_giocatore, gol, minuto, tipo_gol, id_assistman, 
                    giocatore:giocatori!marcatori_id_giocatore_fkey(nome_cognome, id_squadra),
                    assistman:giocatori!marcatori_id_assistman_fkey(nome_cognome)
                )
            `).eq('id_competizione', req.params.id).order('giornata', { ascending: true }).order('data_ora', { ascending: true });

        res.json({ competizione: comp, squadre: squadre || [], partite: partite || []  });
    } catch (error) {
        res.status(500).json({ error: "Errore nel recupero del calendario" });
    }
});

router.post('/mie-competizioni/:id/partite', checkPremium, async (req, res) => {
    const { id_squadra_casa, id_squadra_trasferta, data_ora, giornata } = req.body;
    if(!id_squadra_casa || !id_squadra_trasferta || !data_ora || !giornata ) return res.status(400).json({ error: "Tutti i campi sono obbligatori!" });
    if (id_squadra_casa === id_squadra_trasferta) return res.status(400).json({ error: "Una squadra non può giocare contro se stessa!" });
    
    try {
        const { data, error } = await supabase.from('partite').insert([{
                id_competizione: req.params.id, id_squadra_casa, id_squadra_trasferta, data_ora, giornata, stato: 'programmata'
            }]).select(`*, squadra_casa:squadre!id_squadra_casa ( nome, logo_url ), squadra_trasferta:squadre!id_squadra_trasferta ( nome, logo_url )`);

        if(error) throw error;
        res.status(201).json({ message: "Partita aggiunta!", partita: data[0] });
    } catch (err) {
        res.status(500).json({ error: "Errore nell'aggiunta della partita" });
    }
});

router.put('/partite/:id', checkPremium, async (req, res) => {
    const { gol_casa, gol_trasferta, stato, lista_marcatori } = req.body;
    try {
        // 1. Aggiornamento
        await supabase.from('partite').update({ gol_casa, gol_trasferta, stato }).eq('id', req.params.id);
        
        // 2. Pulizia vecchi marcatori
        await supabase.from('marcatori').delete().eq('id_partita', req.params.id);

        // 3. Inserimento nuovi
        if(lista_marcatori && lista_marcatori.length > 0){
            const marcatoriDaInserire = lista_marcatori.map(m => ({
                id_partita: req.params.id, id_giocatore: m.id_giocatore, gol: 1, minuto: m.minuto, tipo_gol: m.tipo_gol, id_assistman: m.id_assistman,
            }));
            await supabase.from('marcatori').insert(marcatoriDaInserire);
        }

        // 4. Risposta
        const { data, error } = await supabase.from('partite').select(`
                *, squadra_casa:squadre!id_squadra_casa ( nome, logo_url ), squadra_trasferta:squadre!id_squadra_trasferta ( nome, logo_url ),
                marcatori(id, id_giocatore, gol, minuto, tipo_gol, id_assistman, 
                    giocatore:giocatori!marcatori_id_giocatore_fkey(nome_cognome, id_squadra), assistman:giocatori!marcatori_id_assistman_fkey(nome_cognome)
                )
            `).eq('id', req.params.id).single();

        if(error) throw error;
        res.status(200).json({ message: "Risultato e marcatori aggiornati!", partita: data });
    } catch (err) {
        res.status(500).json({ error: "Errore nell'aggiornamento", dettaglio_tecnico: err });
    }
});

router.delete('/partite/:id', checkPremium, async (req, res) => {
    try {
        const { error } = await supabase.from('partite').delete().eq('id', req.params.id);
        if(error) throw error;
        res.status(200).json({ message: "Partita eliminata con successo!" });
    } catch (error){
        res.status(500).json({ error: "Errore nell'eliminazione della partita"});
    }
});

router.get('/partite/:id/giocatori-disponibili', checkPremium, async (req, res) => {
    try{
        const { data: partita, error: pError } = await supabase.from('partite').select('id_squadra_casa, id_squadra_trasferta').eq('id', req.params.id).single();
        if(pError || !partita) throw pError;
        
        const { data: giocatori, error: gError } = await supabase.from('giocatori').select('id, nome_cognome, id_squadra, ruolo').in('id_squadra', [partita.id_squadra_casa, partita.id_squadra_trasferta]).order('ruolo', { ascending: true });
        if(gError) throw gError;
        res.json(giocatori);
    } catch (error) {
        res.status(500).json({ error: "Errore nel recupero dei giocatori" });
    }
});

module.exports = router;