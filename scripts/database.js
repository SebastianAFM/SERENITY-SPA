// Configuración de Supabase
// REEMPLAZA ESTOS VALORES CON LOS DE TU PROYECTO EN SUPABASE.COM
const SUPABASE_URL = "https://aonkerizxolmeizhizwp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_rlrPOkZ3hms2iGJMEbqX6w_EQZi3iG5";
// Usamos window.supabase para evitar la referencia circular con la constante
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

console.log("Conexión a base de datos inicializada");
