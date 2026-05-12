require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Istanziamo Supabase una volta sola e lo esportiamo
const supabaseUrl = 'https://kwawnceudvzlwjrjxmqy.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase