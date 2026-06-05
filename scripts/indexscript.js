import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

    /* ========================================= */
    /* CONFIGURA TUS DATOS */
    /* ========================================= */

    const supabaseUrl = 'https://aonkerizxolmeizhizwp.supabase.co'
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvbmtlcml6eG9sbWVpemhpendwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzU4MDIsImV4cCI6MjA5NDQ1MTgwMn0.9awKi3grvNO7VP70gaCMQN_76SLTzCLLmHjdI4jNnlc'

    const supabase = createClient(
      supabaseUrl,
      supabaseKey
    )
    
/* ========================================= */
/* VERIFICACIÓN DE SESIÓN */
/* ========================================= */
const usuarioLogueado = JSON.parse(localStorage.getItem('usuarioLogueado'));

if (usuarioLogueado && usuarioLogueado.rol === 'cliente') {
  alert("Bienvenido de nuevo.");
  window.location.href = "portalusuario.html";
}