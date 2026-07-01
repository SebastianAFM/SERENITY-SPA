import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

/* ========================================= */
/* CONFIGURA TUS DATOS */
/* ========================================= */
const supabaseUrl = 'https://aonkerizxolmeizhizwp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvbmtlcml6eG9sbWVpemhpendwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzU4MDIsImV4cCI6MjA5NDQ1MTgwMn0.9awKi3grvNO7VP70gaCMQN_76SLTzCLLmHjdI4jNnlc'

const supabase = createClient(supabaseUrl, supabaseKey)

/* ========================================= */
/* VERIFICACIÓN DE SESIÓN */
/* ========================================= */
const usuarioLogueado = JSON.parse(localStorage.getItem('usuarioLogueado'));

if (!usuarioLogueado || usuarioLogueado.rol !== 'trabajador') {
  alert("Acceso denegado: Se requiere perfil de Colaborador.");
  window.location.href = "login.html";
}

// Inicializar textos y agenda
document.addEventListener("DOMContentLoaded", () => {
  if (usuarioLogueado) {
    const nombreCompleto = `${usuarioLogueado.nombre} ${usuarioLogueado.apellido}`;
    document.getElementById("workerBadge").innerHTML = `<i class="bi bi-person-badge-fill me-1"></i>${nombreCompleto} (${usuarioLogueado.rol})`;
    document.getElementById("welcomeMessage").innerText = `Bienvenido, ${usuarioLogueado.nombre}`;
  }
  cargarAgenda();
});

/* ========================================= */
/* CARGAR AGENDA Y ACTUALIZAR MÉTRICAS */
/* ========================================= */
async function cargarAgenda() {
  if (!usuarioLogueado) return;

  const nombreTrabajador = `${usuarioLogueado.nombre} ${usuarioLogueado.apellido}`;

  try {
    // Buscar citas donde el trabajador sea este profesional específicamente
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('trabajador', nombreTrabajador)
      .order('fecha', { ascending: true });

    if (error) {
      console.error("Error al cargar la agenda:", error.message);
      alert("Hubo un error al cargar la agenda de trabajo.");
      return;
    }

    // Calcular métricas
    const total = data.length;
    const completadas = data.filter(c => c.estado === 'Completada').length;
    const pendientes = data.filter(c => c.estado === 'Confirmada' || c.estado === 'Pendiente').length;

    document.getElementById("totalCitas").innerText = total;
    document.getElementById("citasCompletadas").innerText = completadas;
    document.getElementById("citasPendientes").innerText = pendientes;

    renderAgenda(data);

  } catch (err) {
    console.error("Error inesperado:", err);
  }
}

/* ========================================= */
/* RENDERIZAR TABLA DE CITAS */
/* ========================================= */
function renderAgenda(citas) {
  const tbody = document.getElementById("tablaCitasTrabajador");
  tbody.innerHTML = "";

  if (citas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted py-5">
          <i class="bi bi-calendar-x" style="font-size: 2.5rem;"></i>
          <p class="mt-2 mb-0">No tienes citas asignadas en este momento.</p>
        </td>
      </tr>
    `;
    return;
  }

  citas.forEach(cita => {
    const estadoClase = cita.estado.toLowerCase();
    
    // Solo mostrar botones de acción si el estado está activo (Confirmada o Pendiente)
    let botonesAccion = `
      <span class="text-muted" style="font-size: 13px;">Sin acciones</span>
    `;

    if (cita.estado === 'Confirmada' || cita.estado === 'Pendiente') {
      botonesAccion = `
        <div class="d-flex justify-content-center gap-2">
          <button class="btn-action-status btn-complete" onclick="actualizarEstadoCita('${cita.id}', 'Completada')">
            <i class="bi bi-check-circle-fill me-1"></i> Completar
          </button>
          <button class="btn-action-status btn-cancel" onclick="actualizarEstadoCita('${cita.id}', 'Cancelada')">
            <i class="bi bi-x-circle-fill me-1"></i> Cancelar
          </button>
        </div>
      `;
    }

    tbody.innerHTML += `
      <tr>
        <td><strong>${cita.nombre}</strong></td>
        <td><i class="bi bi-bookmark-heart text-success me-1"></i>${cita.servicio}</td>
        <td>${cita.fecha}</td>
        <td>${cita.hora}</td>
        <td>
          <span class="badge-status ${estadoClase}">
            ${cita.estado}
          </span>
        </td>
        <td class="text-center">
          ${botonesAccion}
        </td>
      </tr>
    `;
  });
}

/* ========================================= */
/* ACTUALIZAR ESTADO DE CITA */
/* ========================================= */
window.actualizarEstadoCita = async function (id, nuevoEstado) {
  const result = await Swal.fire({
    title: "Actualizar Sesión",
    text: `¿Estás seguro de marcar esta sesión como "${nuevoEstado}"?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#198754",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Sí, actualizar",
    cancelButtonText: "Cancelar",
    customClass: { popup: 'glass-modal' }
  });
  if (!result.isConfirmed) return;

  try {
    // 1. Obtener detalles de la reserva antes de actualizar para enviar el correo
    const { data: reserva, error: fetchError } = await supabase
      .from('reservas')
      .select('*, usuarios(correo)')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.warn("No se pudo obtener la reserva para notificación:", fetchError.message);
    }

    // 2. Actualizar el estado en la base de datos
    const { error } = await supabase
      .from('reservas')
      .update({ estado: nuevoEstado })
      .eq('id', id);

    if (error) {
      console.error("Error al actualizar cita:", error.message);
      alert("No se pudo actualizar el estado de la cita: " + error.message);
      return;
    }

    alert(`Sesión marcada como ${nuevoEstado} exitosamente. ✨`);

    // 3. Enviar notificación por correo si todo fue exitoso
    if (reserva && reserva.usuarios && reserva.usuarios.correo && window.emailService) {
      window.emailService.enviarActualizacionCita(
        reserva.nombre,
        reserva.usuarios.correo,
        reserva.servicio,
        reserva.trabajador,
        reserva.fecha,
        reserva.hora,
        nuevoEstado,
        'estado'
      );
    }

    cargarAgenda();

  } catch (err) {
    console.error("Error inesperado:", err);
  }
};

/* ========================================= */
/* CERRAR SESIÓN */
/* ========================================= */
window.logoutTrabajador = async function () {
  const result = await Swal.fire({
    title: "Cerrar Sesión",
    text: "¿Seguro que deseas salir del portal de colaboradores?",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Salir",
    cancelButtonText: "Cancelar",
    customClass: { popup: 'glass-modal' }
  });
  if (result.isConfirmed) {
    localStorage.removeItem('usuarioLogueado');
    window.location.href = "login.html";
  }
};
