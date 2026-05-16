const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { checkPremium } = require('../middlewares/controlli');
const multer = require('multer');                                                   // Middleware per gestire l'upload di file (multipart/form-data)

// Setup Multer per tenere i file in RAM (buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Limiti superiori per i controlli sul numero di giocatori da far inserire all'utente
const LIMITI_RUOLI = {
    'Portiere': 3,
    'Difensore': 6,
    'Centrocampista': 6,
    'Attaccante': 4,
};

// ==================================
// --- GESTIONE COMPETIZIONI ---
// ==================================

// GET: Recupero delle competizioni dell'utente
router.get('/mie-competizioni', checkPremium, async (req, res) => {             // Prima di effettuare questa chiamata, viene effettuato il controllo se l'utente è Premium
    try {
        const { data, error } = await supabase
            .from('competizioni')
            .select('*')
            .eq('creato_da', req.session.user.id)
            .order('creato_il', { ascending: false });

        if(error) throw error;
        res.json(data);
    } catch(error){
        res.status(500).json({ error: "Errore nel recupero delle tue competizioni." });
    }
});

// POST: Creazione competizione con Upload Logo
router.post('/mie-competizioni', checkPremium, upload.single('logo'), async (req, res) => {
    const { nome, numero_squadre } = req.body;
    const file = req.file;                                                  // File intercettato da Multier

    if(!nome || !numero_squadre) return res.status(400).json({ error: "Nome e numero squadre sono obbligatori"});

    try {
        let logo_url = null;
        if(file){
            // Creazione nome univoco usando il timestamp
            const fileName = `${Date.now()}_${file.originalname.replace(/\s/g, '_')}`;      // Tutti i caratteri di spaziatura sostituiti da underscore
            
            // Spostamento del buffer dalla RAM direttamente nel Bucket (DB)
            const { error: storageError } = await supabase.storage
                .from('Loghi_UtentePremium')
                .upload(fileName, file.buffer, { contentType: file.mimetype });
            if(storageError) throw storageError;

            // Recupera l'URL pubblico dell'immagine appena caricata
            const { data: publicUrlData } = supabase.storage
                .from('Loghi_UtentePremium')
                .getPublicUrl(fileName);
            logo_url = publicUrlData.publicUrl;
        }

        // Inserimento del record nel DB, associandolo all'utente loggato (creato_da)
        const { data, error } = await supabase
            .from('competizioni')
            .insert([{
                nome: nome, 
                logo_url: logo_url, 
                numero_squadre: numero_squadre, 
                creato_da: req.session.user.id
            }])
            .select();

        if(error) throw error;
        res.status(201).json({ message: "Competizione creata!", competizione: data[0] });
    } catch (error){
        console.error("Errore creazione competizione: ", error);
        res.status(500).json({ error: "Errore nella creazione della competizione"});
    }
});

// DELETE: Eliminazione competizione 
router.delete('/mie-competizioni/:id', checkPremium, async (req, res) => {
    try {
        // Sicurezza doppia: Controllo sia l'id (sessione) e sia il creato_da (id nel DB)
        const { error } = await supabase.from('competizioni').delete().eq('id', req.params.id).eq('creato_da', req.session.user.id);
        if(error) throw error;
        res.json({ message: "Competizione eliminata con successo!" });
    } catch (error){
        res.status(500).json({ error: "Errore nell'eliminazione della competizione"});
    }
});

// ========================
// --- GESTIONE SQUADRE ---
// ========================

// GET: Recupero delle squadre dell'utente
router.get('/mie-competizioni/:id/squadre', checkPremium, async(req, res) => {
    const idCompetizione = req.params.id;
    try{
        const { data: comp, error: compError } = await supabase
            .from('competizioni')
            .select('id, nome, numero_squadre, creato_da')
            .eq('id', idCompetizione)
            .single();
        if(compError || !comp) return res.status(404).json({ error: "Competizione non trovata" });
        if(comp.creato_da !== req.session.user.id) return res.status(403).json({ error: "Non autorizzato" });

        const { data: squadre, error: squadreError } = await supabase
            .from('squadre')
            .select('*')
            .eq('id_competizione', idCompetizione)
            .order('creato_il', { ascending:false });
        if(squadreError) throw squadreError;

        res.json({ competizione: comp, squadre: squadre });
    } catch(err){
        res.status(500).json({ error: "Errore nel recupero delle squadre" });
    }
});

// POST: Aggiunta di una squadra
router.post('/mie-competizioni/:id/squadre', checkPremium, upload.single('logo'), async (req, res) => {
    const idCompetizione = req.params.id;
    const { nome } = req.body;
    const file = req.file;

    if(!nome) return res.status(400).json({ error: "Il nome della squadra è obbligatorio"});

    try {
        // 1. Mi prendo la competizione
        const { data: comp } = await supabase
            .from('competizioni')
            .select('creato_da, numero_squadre')
            .eq('id', idCompetizione)
            .single();
        if(!comp || comp.creato_da !== req.session.user.id) return res.status(403).json({ error: "Non autorizzato" });

        // 2. Conto il numero delle squadre all'interno della competizione precedentemente presa
        const { count } = await supabase
            .from('squadre')
            .select('*', { count: 'exact', head: true })                // Supabase conta il numero esatto di righe (Richiesta HEAD e non GET: Non viene passato il payload, ovvero il body, ma solo l'header)
            .eq('id_competizione', idCompetizione);

        // Controllo che il numero delle squadre non abbiamo raggiunto il limite
        if(count >= comp.numero_squadre) return res.status(400).json({ error: `Limite massimo raggiunto (${comp.numero_squadre}).` });

        // Inserimento logo squadra (Stessa logica dell'inserimento del logo della competizione)
        let logo_url = null;
        if(file){
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

        const { data, error } = await supabase
            .from('squadre')
            .insert([{
                nome: nome, 
                logo_url: logo_url, 
                id_competizione: idCompetizione, 
                creato_da: req.session.user.id
            }])
            .select();

        if(error) throw error;
        res.status(201).json({ message: "Squadra creata e aggiunta!", squadra: data[0] });
    } catch (error){
        res.status(500).json({ error: "Errore nell'aggiunta della squadra"});
    }
});

// DELETE: Eliminazione squadra
router.delete('/squadre/:id', checkPremium, async (req, res) => {
    try {
        const { error } = await supabase.from('squadre').delete().eq('id', req.params.id).eq('creato_da', req.session.user.id);
        if(error) throw error;
        res.status(200).json({ message: "Squadra eliminata con successo!" });
    } catch (error){
        res.status(500).json({ error: "Errore nell'eliminazione della squadra"});
    }
});

// =============================
// --- GESTIONE GIOCATORI ---
// =============================

router.get('/squadre/:id/giocatori', checkPremium, async (req, res) => {
    try {
        // 1. Mi prendo la squadra
        const { data: squadra, error: sqError } = await supabase
            .from('squadre')
            .select('id, nome, logo_url, id_competizione, creato_da')
            .eq('id', req.params.id)
            .single();
        if(sqError || !squadra) return res.status(404).json({ error: "Squadra non trovata" });
        if(squadra.creato_da !== req.session.user.id) return res.status(403).json({ error: "Non autorizzato" });
        
        // 2. Mi prendo i giocatori della squadra appena trovata
        const { data: giocatori, error: gioError } = await supabase
            .from('giocatori')
            .select('*')
            .eq('id_squadra', req.params.id)
            .order('ruolo', { ascending: true });
        if(gioError) throw gioError;

        res.json({ squadra: squadra, giocatori: giocatori  });
    } catch (error) {
        res.status(500).json({ error: "Errore nel recupero dei giocatori" });
    }
});

// POST: Inserimento di un nuovo giocatore 
router.post('/squadre/:id/giocatori', checkPremium, async (req, res) => {
    const { nome_cognome, ruolo, data_nascita, piede_preferito } = req.body;
    
    // Controllo 1: Inserimento campi obbligatori
    if(!nome_cognome || !ruolo) return res.status(400).json({ error: "Nome e ruolo sono obbligatori" });
    // Controllo 2: Limiti superiori non superati
    if(!LIMITI_RUOLI[ruolo]) return res.status(400).json({ error: "Ruolo non valido" });

    try {
        // 1. Mi prendo il creatore della squadra (per poi fare il controllo)
        const { data: squadra } = await supabase
            .from('squadre')
            .select('creato_da')
            .eq('id', req.params.id)
            .single();
        if(!squadra || squadra.creato_da !== req.session.user.id) return res.status(403).json({ error: "Non autorizzato" });

        // 2. Conto il numero di giocatori all'interno della squadra precedentemente presa
        const { count, countError } = await supabase
            .from('giocatori')
            .select('*', { count: 'exact', head: true })                // Chiamata HEAD (niente body, ma solo header)
            .eq('id_squadra', req.params.id)
            .eq('ruolo', ruolo);  
        if(countError) throw countError;
        
        // Controllo che il numero di giocatori inseriti non superi il limite (3, 6, 6, 4)
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

// DELETE: Eliminazione di un giocatore
router.delete('/giocatori/:id', checkPremium, async (req, res) => {
    try {
        // Eliminazione della squadra tramite id della squadra e id del creatore
        const { error } = await supabase
            .from('giocatori')
            .delete()
            .eq('id', req.params.id)
            .eq('creato_da', req.session.user.id);
        if(error) throw error;
        res.status(200).json({ message: "Giocatore eliminato con successo!" });
    } catch (error){
        res.status(500).json({ error: "Errore nell'eliminazione del giocatore"});
    }
});

// =======================================
// --- GESTIONE CALENDARIO E PARTITE ---
// =======================================

// GET: Recupera il calendario della competizione
router.get('/mie-competizioni/:id/calendario', checkPremium, async (req, res) => {
    try {
        // 1. Recupero della competizione
        const { data: comp, error: compError } = await supabase
            .from('competizioni')
            .select('id, nome, creato_da')
            .eq('id', req.params.id)
            .single();
        if(compError || !comp) return res.status(404).json({ error: "Competizione non trovata" });
        if(comp.creato_da !== req.session.user.id) return res.status(403).json({ error: "Non autorizzato" });
        
        // 2. Recupero delle squadre
        const { data: squadre } = await supabase
            .from('squadre')
            .select('id, nome, logo_url')
            .eq('id_competizione', req.params.id)
            .order('nome', { ascending: true });

        // 3. Recupero delle partite (con la squadra di casa, la squadra di trasferta e i marcatori)
        const { data: partite } = await supabase
            .from('partite')
            //Spiegazione del select                                            // alias:tabella!chiave_esterna(colonne)
                                                                                // Viene usato percè ci sono due chiavi esterne che puntano alla stessa tabella (da partite a squadre)
                                                                                // marcatori(...) LEFT JOIN con la tabella Marcatori, da dove si estraggono i suoi dati e in piu fa 2 join annidati verso Giocatori 
            .select(`
                *, competizioni ( nome ),
                squadra_casa:squadre!id_squadra_casa ( nome, logo_url ),                
                squadra_trasferta:squadre!id_squadra_trasferta ( nome, logo_url ),
                marcatori(id, id_giocatore, gol, minuto, tipo_gol, id_assistman, 
                    giocatore:giocatori!marcatori_id_giocatore_fkey(nome_cognome, id_squadra),
                    assistman:giocatori!marcatori_id_assistman_fkey(nome_cognome)
                )
            `)
            .eq('id_competizione', req.params.id)
            .order('giornata', { ascending: true })                             // Ordinamento per giornata di campionato
            .order('data_ora', { ascending: true });                            // Per più partite della stessa giornata, vengono ordinate per orario 

        res.json({ competizione: comp, squadre: squadre || [], partite: partite || []  });
    } catch (error) {
        res.status(500).json({ error: "Errore nel recupero del calendario" });
    }
});

// POST: Riempimento del calendario (inserimento di partite programmate)
router.post('/mie-competizioni/:id/partite', checkPremium, async (req, res) => {
    const { id_squadra_casa, id_squadra_trasferta, data_ora, giornata } = req.body;

    // Controllo 1: Inserimento campi obbligatori
    if(!id_squadra_casa || !id_squadra_trasferta || !data_ora || !giornata ) return res.status(400).json({ error: "Tutti i campi sono obbligatori!" });
    // Controllo 2: Inserimento squadre diverse che si scontrano
    if (id_squadra_casa === id_squadra_trasferta) return res.status(400).json({ error: "Una squadra non può giocare contro se stessa!" });
    
    try {
        // Inserimento partita
        const { data, error } = await supabase
            .from('partite')
            .insert([{
                id_competizione: req.params.id, id_squadra_casa, id_squadra_trasferta, data_ora, giornata, stato: 'programmata'
            }])
            .select(`
                *, 
                squadra_casa:squadre!id_squadra_casa ( nome, logo_url ), 
                squadra_trasferta:squadre!id_squadra_trasferta ( nome, logo_url )`
            );

        if(error) throw error;
        res.status(201).json({ message: "Partita aggiunta!", partita: data[0] });
    } catch (err) {
        res.status(500).json({ error: "Errore nell'aggiunta della partita" });
    }
});

// PUT: Aggiornamento partita e marcatori
router.put('/partite/:id', checkPremium, async (req, res) => {
    const { gol_casa, gol_trasferta, stato, lista_marcatori } = req.body;
    try {
        // 1. Aggiornamento del risultato della partita (gol e stato)
        await supabase
            .from('partite')
            .update({ gol_casa, gol_trasferta, stato })
            .eq('id', req.params.id);
        
        // 2. Pulizia vecchi marcatori
        await supabase
            .from('marcatori')
            .delete()
            .eq('id_partita', req.params.id);

        // 3. Inserimento nuovi
        if(lista_marcatori && lista_marcatori.length > 0){
            const marcatoriDaInserire = lista_marcatori.map(m => ({
                id_partita: req.params.id, 
                id_giocatore: m.id_giocatore, 
                gol: 1, 
                minuto: m.minuto, 
                tipo_gol: m.tipo_gol, 
                id_assistman: m.id_assistman
            }));
            await supabase
                .from('marcatori')
                .insert(marcatoriDaInserire);
        }

        // 4. Risposta (Per far visualizzare il nuovo risultato, con gol, marcatori e assistman)
        const { data, error } = await supabase
            .from('partite')
            .select(`
                *, 
                squadra_casa:squadre!id_squadra_casa ( nome, logo_url ), 
                squadra_trasferta:squadre!id_squadra_trasferta ( nome, logo_url ),
                marcatori(id, id_giocatore, gol, minuto, tipo_gol, id_assistman, 
                    giocatore:giocatori!marcatori_id_giocatore_fkey(nome_cognome, id_squadra), 
                    assistman:giocatori!marcatori_id_assistman_fkey(nome_cognome)
                )
            `)
            .eq('id', req.params.id)
            .single();

        if(error) throw error;
        res.status(200).json({ message: "Risultato e marcatori aggiornati!", partita: data });
    } catch (err) {
        res.status(500).json({ error: "Errore nell'aggiornamento", dettaglio_tecnico: err });
    }
});

// DELETE: Eliminazione di una partita
router.delete('/partite/:id', checkPremium, async (req, res) => {
    try {
        const { error } = await supabase.from('partite').delete().eq('id', req.params.id);
        if(error) throw error;
        res.status(200).json({ message: "Partita eliminata con successo!" });
    } catch (error){
        res.status(500).json({ error: "Errore nell'eliminazione della partita"});
    }
});

// GET: Elenco di giocatori che possono esser scelti da inserire come marcatori
router.get('/partite/:id/giocatori-disponibili', checkPremium, async (req, res) => {
    try{
        // 1. Mi prendo l'id delle due squadre che si scontrano
        const { data: partita, error: pError } = await supabase
            .from('partite')
            .select('id_squadra_casa, id_squadra_trasferta')
            .eq('id', req.params.id)
            .single();
        if(pError || !partita) throw pError;
        
        // 2. Mi prendo i giocatori delle due squadre
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

module.exports = router;