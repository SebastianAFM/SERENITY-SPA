// Configuración de Supabase
// REEMPLAZA ESTOS VALORES CON LOS DE TU PROYECTO EN SUPABASE.COM
const SUPABASE_URL = "https://aonkerizxolmeizhizwp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvbmtlcml6eG9sbWVpemhpendwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzU4MDIsImV4cCI6MjA5NDQ1MTgwMn0.9awKi3grvNO7VP70gaCMQN_76SLTzCLLmHjdI4jNnlc";
// Usamos var para evitar conflictos de redeclaración con la variable global "supabase" creada por el CDN
var supabase = window.supabase && typeof window.supabase.createClient === 'function' 
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

console.log("Conexión a base de datos inicializada");
