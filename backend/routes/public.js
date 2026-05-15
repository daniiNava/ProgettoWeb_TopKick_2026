const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Funzione di supporto per aggirare il limite delle 1000 righe di supabase
async function getAllData(queryBuilder) {
    let allData = [];
    let from = 0;
    let to = 999;
    let finished = false;

    while (!finished) {
        const { data, error } = await queryBuilder.range(from, to);
        if (error) throw error;
        if (data && data.length > 0) {
            allData = [...allData, ...data];
            from += 1000;
            to += 1000;
        } else {
            finished = true;
        }
    }
    return { data: allData };
}

// --- HOMEPAGE ---

router.get('/notizie/recenti', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('notizie')
            .select('*')
            .order('data_pubblicazione', { ascending: false})
            .limit(5);

        if(error) throw error;
        res.json(data);
    } catch(err){
        console.error("Errore nel recupero delle notizie", err);
        res.status(500).json({ error: "Errore del server nel recupero delle notizie" });
    }
});

router.get('/partite', async (req, res) => {
    try {
        const dataRichiesta = req.query.data || new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('partite')
            .select(`
                id, data_ora, gol_casa, gol_trasferta, stato,
                competizioni ( nome ),
                squadra_casa:squadre!id_squadra_casa ( id, nome, logo_url ), 
                squadra_trasferta:squadre!id_squadra_trasferta ( id, nome, logo_url )
            `)
            .gte('data_ora', `${dataRichiesta}T00:00:00`)
            .lte('data_ora', `${dataRichiesta}T23:59:59`)
            .order('data_ora', { ascending: true});

        if(error) throw error;
        res.json(data);
    } catch(err){
        console.error("Errore nel recupero delle partite", err);
        res.status(500).json({ error: "Errore del server nel recupero delle partite" });
    }
});

// --- NOTIZIE ---

router.get('/notizie', async (req, res) => {
    try {
        const {data, error} = await supabase
            .from('notizie')
            .select(`id, titolo, contenuto, img_url, data_pubblicazione, competizioni( nome )`)
            .order('data_pubblicazione', {ascending: false }); 
        if (error) throw error;
        res.json(data);
    } catch(err) {
        console.error("Errore nel recupero di tutte le notizie:", err);
        res.status(500).json({error: "Errore interno del server"});
    }
});

router.get('/notizie/:id', async (req, res) => {
    const { id } = req.params; 
    try {
        const {data, error} = await supabase 
            .from('notizie')
            .select('id, titolo, contenuto, img_url, data_pubblicazione, competizioni(nome)')
            .eq('id', id)
            .single(); 
        if(error) throw error;
        if(!data) return res.status(404).json({error: "Notizia non trovata"});
        res.json(data);
    } catch (err) {
        console.error("Errore nel recupero della notizia:", err);
        res.status(500).json({error:"Errore interno del server"});
    }
});

// --- RICERCA INTELLIGENTE ---

router.get('/ricerca', async (req, res) => {
    const {q, tipo} = req.query;
    if(!q) return res.json({squadre: [], giocatori: [], competizioni: [], notizie: []});

    const searchTerm = `%${q}%`; 
    let risultati = {squadre: [], giocatori: [], competizioni: [], notizie: []};

    try {
        if (tipo === 'tutto' || tipo === 'squadre') {
            const {data} = await supabase.from('squadre').select('id, nome, logo_url').ilike('nome', searchTerm);
            risultati.squadre = data || [];
        }
        if (tipo === 'tutto' || tipo === 'giocatori') {
            const {data} = await supabase.from('giocatori').select('id, nome_cognome, ruolo, squadre(nome)').ilike('nome_cognome', searchTerm);
            let listaUnica = [];
            if (data) {
                listaUnica = data.filter((giocatore, index, self) =>
                    index === self.findIndex((g) => g.nome_cognome === giocatore.nome_cognome)
                );
            }
            risultati.giocatori = listaUnica;
         }
        if (tipo === 'tutto' || tipo === 'competizioni') {
            const {data} = await supabase.from('competizioni').select('id, nome, logo_url').ilike('nome', searchTerm);
            risultati.competizioni = data || [];
         }
         if (tipo === 'tutto' || tipo === 'notizie') {
            const {data} = await supabase.from('notizie')
                .select('id, titolo, data_pubblicazione')
                .or(`titolo.ilike.${searchTerm},contenuto.ilike.${searchTerm}`);
            risultati.notizie = data || [];
         }
         res.json(risultati);
    } catch(err) {
        console.error("Errore durante la ricerca:", err);
        res.status(500).json({error: "Errore interno del server durante la ricerca"});
    }
});

// --- COMPETIZIONI ---

router.get('/competizioni', async (req, res) => {
    const annataRichiesta = req.query.annata || '25/26'; // Prende l'annata di riferimento dall'URL altrimenti usa di default 25/26
    try {
        // 1. Estrae l'elenco di tutti i campionati in ordine alfabetico
        const { data: competizioni } = await supabase.from('competizioni').select('*').order('nome', { ascending: true });

        // 2. Estrae tutte le partite finite di quell'annata usando la funzione getAllData()
        const { data: partite } = await getAllData(supabase.from('partite')
            .select(`
                id_competizione, gol_casa, gol_trasferta,
                squadra_casa:squadre!id_squadra_casa(id, nome, logo_url),
                squadra_trasferta:squadre!id_squadra_trasferta(id, nome, logo_url)
            `)
            .eq('stato', 'finita')
            .eq('annata', annataRichiesta));

        // 3. Estrae le annate della competizione per popolare il filtro a tendina nel frontend        
        const { data: annateData } = await supabase.from('partite').select('annata');
        let annateDisponibili = annateData ? [...new Set(annateData.map(p => p.annata))].sort().reverse() : ['25/26'];

        // 4. Invia al frontend
        res.json({ competizioni: competizioni || [], partite: partite || [], annate_disponibili: annateDisponibili });
    } catch (err) {
        console.error("Errore competizioni:", err);
        res.status(500).json({ error: "Errore nel recupero delle competizioni" });
    }
});

router.get('/competizioni/:id/dettagli', async (req, res) => {
    const idCompetizione = req.params.id;
    const annataRichiesta = req.query.annata || '25/26'; // Prende l'annata di riferimento dall'URL altrimenti usa di default 25/26

    try {
        // 1. Estrae i dati base della competizione
        const { data: competizione } = await supabase.from('competizioni').select('*').eq('id', idCompetizione).single();

        // 2. Estrae tutte le partite di quella competizione per quell'annata
        const { data: partite } = await supabase.from('partite').select(`
            *, squadra_casa:squadre!id_squadra_casa(id, nome, logo_url), 
            squadra_trasferta:squadre!id_squadra_trasferta(id, nome, logo_url)
        `).eq('id_competizione', idCompetizione).eq('annata', annataRichiesta);

        // 3. Estrae i marcatori grezzi usando una INNER JOIN per filtrare solo i gol di questa competizione
        const { data: marcatoriRaw } = await supabase.from('marcatori').select(`
                id, id_partita, minuto, tipo_gol,
                marcatore_originale:id_giocatore(id, nome_cognome, id_squadra), 
                assistman_originale:id_assistman(id, nome_cognome, id_squadra),
                partita:id_partita!inner(id_competizione, annata)
            `)
            .eq('partita.id_competizione', idCompetizione)
            .eq('partita.annata', annataRichiesta);
            
        // 4. Estrae un array univoco con i nomi di tutti i giocatori che hanno segnato o fatto assist
        const nomiGiocatori = [...new Set([
            ...(marcatoriRaw?.map(m => m.marcatore_originale?.nome_cognome) || []),
            ...(marcatoriRaw?.map(m => m.assistman_originale?.nome_cognome) || [])
        ].filter(Boolean))];

        // 5. Cerca nel DB i dati di questi giocatori relativi all'annata richiesta
        const { data: giocatoriAnnata } = await supabase.from('giocatori')
            .select(`id, nome_cognome, annata, id_squadra, squadra:squadre!inner(id, nome, id_competizione)`)
            .in('nome_cognome', nomiGiocatori)
            .eq('annata', annataRichiesta)
            .eq('squadra.id_competizione', idCompetizione);

        // 6. Crea un dizionario per accesso rapido O(1) ai dati del giocatore
        const mappaGiocatori = {};
        giocatoriAnnata?.forEach(g => { mappaGiocatori['${g.nome_cognome}|${g.id_squadra}'] = g; });

        // 7. Ricostruisce l'array dei marcatori unendo i dati grezzi con i dati aggiornati della mappa
        const marcatoriRisolti = (marcatoriRaw || []).map(m => {
            const marcatoreObj = m.marcatore_originale;
            const assistmanObj = m.assistman_originale;
            const chiaveM = marcatoreObj ? `${marcatoreObj.nome_cognome}|${marcatoreObj.id_squadra}` : null;
            const chiaveA = assistmanObj ? `${assistmanObj.nome_cognome}|${assistmanObj.id_squadra}` : null;

            return {
                id: m.id, partita_id: m.id_partita, minuto: m.minuto, tipo_gol: m.tipo_gol,
                giocatore: chiaveM ? mappaGiocatori[chiaveM] : (marcatoreObj ? { ...marcatoreObj, squadra: { nome: 'N.D.' } } : null),
                assistman: chiaveA ? mappaGiocatori[chiaveA] : (assistmanObj ? { ...assistmanObj } : null)
            };
        });

        // 8. Estrae le notizie
        const {data : notizie} = await supabase.from('notizie').select(`id, titolo, contenuto, img_url, data_pubblicazione, id_competizione`).eq('id_competizione', idCompetizione);
        
        res.json({ competizione, partite: partite || [], marcatori: marcatoriRisolti, notizie });
    } catch (err) {
        console.error("Errore dettagli competizione:", err);
        res.status(500).json({ error: "Errore interno" });
    }
});

// --- SQUADRE ---

router.get('/squadre/:id/dettagli', async (req, res) => {
    const idSquadra = req.params.id;
    const annataRichiesta = req.query.annata || '25/26'; // Prende l'annata di riferimento dall'URL altrimenti usa di default 25/26
    
    try {
        // 1. Estrae i dati della squadra e il nome della competizione a cui partecipa (tramite JOIN implicita)
        const { data: squadra, error: sqError } = await supabase.from('squadre')
            .select(`id, nome, logo_url, id_competizione, competizioni ( id, nome )`)
            .eq('id', idSquadra)
            .single();
        if (sqError || !squadra) return res.status(404).json({ error: "Squadra non trovata" });

        // 2. Estrae la rosa dei giocatori della squadra nell'annata, ordinati per ruolo
        const { data: giocatori } = await supabase.from('giocatori')
            .select('*')
            .eq('id_squadra', idSquadra).eq('annata', annataRichiesta)
            .order('ruolo', { ascending: true });
        
        // 3. Estrae tutte le partite giocate da questa squadra in quell'annata
        const { data: partite } = await supabase.from('partite')
            .select(`*,
                squadra_casa:squadre!id_squadra_casa(id, nome, logo_url),
                squadra_trasferta:squadre!id_squadra_trasferta(id, nome, logo_url)
            `)
            .or(`id_squadra_casa.eq.${idSquadra},id_squadra_trasferta.eq.${idSquadra}`)
            .eq('annata', annataRichiesta)
            .order('data_ora', { ascending: false });

        let marcatori = [];
        if (partite && partite.length > 0) {
            // 4. Se ci sono partite, estrae tutti i marcatori di quelle specifiche partite
            const { data: marcatoriData } = await supabase.from('marcatori').select(`
                *, 
                giocatore:giocatori!id_giocatore(id, nome_cognome, id_squadra)
                `).in('id_partita', partite.map(p => p.id));
            marcatori = marcatoriData || [];
        }

        // 5. Estrae tutte le partite finite del campionato di appartenenza (Serve al frontend per calcolare la classifica)
        const { data: partiteCompetizione } = await supabase.from('partite')
            .select(`
                id_squadra_casa, id_squadra_trasferta, gol_casa, gol_trasferta, 
                squadra_casa:squadre!id_squadra_casa(id, nome, logo_url), 
                squadra_trasferta:squadre!id_squadra_trasferta(id, nome, logo_url)
                `)
            .eq('id_competizione', squadra.id_competizione)
            .eq('stato', 'finita')
            .eq('annata', annataRichiesta);
        
        // 6. Estrae le ultime 5 notizie relative al campionato di appartenenza
        const { data: notizie } = await supabase.from('notizie')
            .select('*')
            .eq('id_competizione', squadra.id_competizione)
            .order('data_pubblicazione', { ascending: false })
            .limit(5);
        
        // 7. Cerca nel DB quali annate esistono per questa squadra (per popolare la tendina del filtro anni)
        const { data: annateData } = await supabase.from('giocatori')
            .select('annata')
            .eq('id_squadra', squadra.id);
        let annateDisponibili = annateData ? [...new Set(annateData.map(p => p.annata))].sort().reverse() : ['25/26']; // Usa Set per rimuovere i duplicati

        // 8. Invia al frontend
        res.json({ squadra, giocatori: giocatori || [], partite: partite || [], marcatori, partite_competizione: partiteCompetizione || [], notizie: notizie || [], annate_disponibili: annateDisponibili });
    } catch (err) {
        res.status(500).json({ error: "Errore interno del server" });
    }
});

// --- GIOCATORI ---

router.get('/giocatori/dettaglio/:identifier', async (req, res) => {
    const rawIdentifier = req.params.identifier; // Può essere un ID numerico o un Nome testuale
    if (!rawIdentifier || rawIdentifier === 'undefined') {
        console.log("❌ Bloccata richiesta con parametro undefined o vuoto");
        return res.status(400).json({ message: "URL non valido (parametro mancante)" });
    }

    let nomeCercato = decodeURIComponent(rawIdentifier).trim(); // Pulisce la stringa
    console.log(`\n--- CERCO GIOCATORE: ${nomeCercato} ---`);

    try {
        // 1. Se l'identificatore è un numero, fa una query per scoprire il nome testuale associato
        if (!isNaN(nomeCercato) && nomeCercato !== '') {
            const { data: p } = await supabase.from('giocatori')
                .select('nome_cognome')
                .eq('id', nomeCercato)
                .single();
            if (p) nomeCercato = p.nome_cognome.trim(); // Sovrascrive l'ID con il Nome
        }

        // 2. Cerca tutti i dati del giocatore usando il nome
        const { data: records, error: pError } = await supabase.from('giocatori')
            .select(`
                *, 
                squadre (id, nome, logo_url, id_competizione)
            `)
            .ilike('nome_cognome', `%${nomeCercato}%`)
            .order('annata', { ascending: false });
        if (pError) {
            console.error("⚠️ ERRORE DATABASE (Tabella giocatori):", pError);
            return res.status(500).json({ message: "Errore query database", errore: pError });
        }
        if (!records || records.length === 0) {
            console.log(`❌ Nessun giocatore trovato con il nome simile a: %${nomeCercato}%`);
            return res.status(404).json({ message: "Giocatore non trovato" });
        }

        console.log('✅ Giocatore trovato! Trovati ${records.length} record in carriera.');

        const infoAttuali = records[0]; // Prende il record più recente come info principali
        const tuttiIdGiocatori = records.map(r => r.id); // Estrae tutti gli ID storici del giocatore

        // 3. Estrae tutti i gol e gli assist fatti da questo giocatore in tutta la carriera
        const { data: marcatori } = await supabase.from('marcatori')
            .select(`id_giocatore, id_assistman, gol`)
            .or(`id_giocatore.in.(${tuttiIdGiocatori.join(',')}),id_assistman.in.(${tuttiIdGiocatori.join(',')})`);
        let totaleGol = 0, totaleAssist = 0;

        // 4. Calcola le statistiche combinando i dati del DB
        const carrieraConStatistiche = records.map(record => {
            const eventiGol = marcatori ? marcatori.filter(m => m.id_giocatore === record.id) : [];
            const eventiAssist = marcatori ? marcatori.filter(m => m.id_assistman === record.id) : [];
            const golStagione = eventiGol.reduce((acc, curr) => acc + (curr.gol > 0 ? curr.gol : 1), 0);
            totaleGol += golStagione; totaleAssist += eventiAssist.length;
            return { ...record, gol: golStagione, assist: eventiAssist.length };
        });

        let ultimePartite = [];
        if (infoAttuali.id_squadra) {
            // 5. Estrae le ultime 50 partite della squadra ATTUALE del giocatore
            const { data: partite, error: errPartite } = await supabase.from('partite')
                .select(`
                    id, data_ora, gol_casa, gol_trasferta, stato, 
                    squadra_casa:squadre!partite_id_squadra_casa_fkey (id, nome, logo_url), 
                    squadra_trasferta:squadre!partite_id_squadra_trasferta_fkey (id, nome, logo_url)
                `)
                .eq('stato', 'finita')
                .or(`id_squadra_casa.eq.${infoAttuali.id_squadra},id_squadra_trasferta.eq.${infoAttuali.id_squadra}`)
                .order('data_ora', { ascending: false }).limit(50);
            if (errPartite) console.error("⚠️ ERRORE DATABASE (Tabella partite):", errPartite);
            if (partite && partite.length > 0) {

                // 6. Controlla se in quelle 50 partite il giocatore ha segnato o fatto assist
                const { data: marcatoriUltimePartite } = await supabase.from('marcatori')
                    .select('id_partita, id_giocatore, id_assistman, gol')
                    .in('id_partita', partite.map(p => p.id))
                    .or(`id_giocatore.eq.${infoAttuali.id},id_assistman.eq.${infoAttuali.id}`);
                
                // 7. Aggiunge i gol/assist del giocatore all'oggetto della partita
                ultimePartite = partite.map(partita => {
                    const eventiGolMatch = marcatoriUltimePartite ? marcatoriUltimePartite.filter(m => m.id_partita === partita.id && m.id_giocatore === infoAttuali.id) : [];
                    const eventiAssistMatch = marcatoriUltimePartite ? marcatoriUltimePartite.filter(m => m.id_partita === partita.id && m.id_assistman === infoAttuali.id) : [];
                    return { ...partita, gol_giocatore: eventiGolMatch.reduce((acc, curr) => acc + (curr.gol > 0 ? curr.gol : 1), 0), assist_giocatore: eventiAssistMatch.length };
                });
            }
        }
        // 8. Invia al frontend
        res.json({ info: infoAttuali, carriera: carrieraConStatistiche, statistiche: { gol: totaleGol, assist: totaleAssist }, ultime_partite: ultimePartite });

    } catch (error) {
        console.error("🔥 ERRORE FATALE API GIOCATORE:", error);
        res.status(500).json({ error: "Errore interno del server" });
    }
});

module.exports = router;