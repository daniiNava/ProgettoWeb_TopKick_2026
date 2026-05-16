require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');              // Importazione del client ufficiale

// Istanziamo Supabase una volta sola e lo esportiamo
const supabaseUrl = 'https://kwawnceudvzlwjrjxmqy.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);                // Inizializza la connessione

module.exports = supabase                                               // Esportazione dell'istanza per usarla negli altri altri file