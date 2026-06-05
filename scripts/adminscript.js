// Lógica del Dashboard del Administrador - Serenity Spa
let usersData = [];
let bookingsData = [];
let servicesChart = null;

// Precios estimados para calcular ganancias dinámicas
const PRECIOS_SERVICIOS = {
  "Masaje relajante": 80000,
  "Tratamiento facial": 60000,
  "Sauna": 40000,
  "Pestana": 50000,
  "Exfoliacion": 45000,
  "Fisioterapia": 90000
};

// ==========================================
// 1. SEGURIDAD Y CARGA INICIAL
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  verificarSesionAdmin();
  inicializarDashboard();
});

function verificarSesionAdmin() {
  const usuario = JSON.parse(localStorage.getItem('usuarioLogueado'));

  if (!usuario || usuario.rol !== 'admin') {
    alert("Acceso denegado: Se requiere perfil de Administrador.");
    window.location.href = "login.html";
    return;
  }

  // Cargar datos de perfil en el DOM
  document.getElementById("admin-fullname").innerText = `${usuario.nombre} ${usuario.apellido}`;
  document.getElementById("admin-avatar-initials").innerText = usuario.nombre[0].toUpperCase() + (usuario.apellido ? usuario.apellido[0].toUpperCase() : "");
}

function establecerMinimoFechaReservasAdmin() {
  const hoy = new Date().toISOString().split('T')[0];
  const fechaEditar = document.getElementById('modal-reserva-fecha');
  const fechaCrear = document.getElementById('modal-crear-fecha');

  if (fechaEditar) fechaEditar.min = hoy;
  if (fechaCrear) fechaCrear.min = hoy;
}

function obtenerHorarioTrabajadorPorNombre(nombreCompleto) {
  const trabajador = usersData.find(u => u.rol === 'trabajador' && `${u.nombre} ${u.apellido}` === nombreCompleto);
  if (!trabajador) return null;
  return {
    inicio: trabajador.horario_inicio || '09:00',
    fin: trabajador.horario_fin || '18:00'
  };
}

function esFechaValidaReserva(fecha) {
  return fecha >= new Date().toISOString().split('T')[0];
}

function esHoraDentroHorario(hora, horario) {
  return hora >= horario.inicio && hora <= horario.fin;
}

async function asignarTrabajadorLibreAdmin(fecha, hora) {
  const { data: trabajadores, error: errTrabajadores } = await supabase
    .from('usuarios')
    .select('nombre, apellido, horario_inicio, horario_fin')
    .eq('rol', 'trabajador');

  if (errTrabajadores) {
    throw new Error(errTrabajadores.message);
  }

  const { data: reservas, error: errReservas } = await supabase
    .from('reservas')
    .select('trabajador')
    .eq('fecha', fecha)
    .eq('hora', hora)
    .neq('estado', 'Cancelada');

  if (errReservas) {
    throw new Error(errReservas.message);
  }

  const reservados = reservas.map(r => r.trabajador);

  for (const trabajador of trabajadores) {
    const nombreCompleto = `${trabajador.nombre} ${trabajador.apellido}`;
    const inicio = trabajador.horario_inicio || '09:00';
    const fin = trabajador.horario_fin || '18:00';

    if (hora < inicio || hora > fin) continue;
    if (reservados.includes(nombreCompleto)) continue;

    return nombreCompleto;
  }

  return null;
}

async function inicializarDashboard() {
  await cargarDatosBase();
  establecerMinimoFechaReservasAdmin();
  renderMetrics();
  renderRecentActivity();
  renderReservasRecientes();
  renderTablaUsuarios();
  renderTablaReservas();
  renderChartServicios();
  poblarSelectUsuarios();
}

async function cargarDatosBase() {
  try {
    // 1. Cargar usuarios
    const { data: users, error: errUsers } = await supabase
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false });

    if (errUsers) throw errUsers;
    usersData = users || [];

    // 2. Cargar reservas
    const { data: bookings, error: errBookings } = await supabase
      .from('reservas')
      .select('*')
      .order('fecha', { ascending: false });

    if (errBookings) throw errBookings;
    bookingsData = bookings || [];

  } catch (error) {
    console.error("Error al cargar datos desde Supabase:", error.message);
    alert("Hubo un error al conectar con la base de datos Supabase: " + error.message + "\n\nPor favor revisa que hayas ejecutado el script en tu panel de Supabase.");
  }
}

// ==========================================
// 2. NAVEGACIÓN POR PESTAÑAS (TABS)
// ==========================================
window.switchTab = function(tabId) {
  // Ocultar todas las secciones
  const sections = document.querySelectorAll(".dashboard-section");
  sections.forEach(sec => sec.classList.remove("active-section"));

  // Desactivar todos los botones de menú
  const menuItems = document.querySelectorAll(".sidebar-menu li");
  menuItems.forEach(item => item.classList.remove("active"));

  // Activar sección y menú seleccionado
  document.getElementById(`section-${tabId}`).classList.add("active-section");
  document.getElementById(`menu-${tabId}`).classList.add("active");

  // Cambiar título de página
  const titles = {
    'dashboard': 'Vista General',
    'usuarios': 'Gestión de Usuarios',
    'reservas': 'Gestión de Reservas'
  };
  document.getElementById("page-title").innerText = titles[tabId] || 'Panel Administrativo';
}

// ==========================================
// 3. RENDER METRICAS Y DATOS DINÁMICOS
// ==========================================
function renderMetrics() {
  // Total Usuarios
  document.getElementById("stat-total-usuarios").innerText = usersData.length;

  // Total Reservas
  document.getElementById("stat-total-reservas").innerText = bookingsData.length;

  // Ganancias Estimadas (Citas que NO están canceladas)
  let ganancias = 0;
  bookingsData.forEach(b => {
    if (b.estado !== 'Cancelada') {
      const precio = PRECIOS_SERVICIOS[b.servicio] || 50000;
      ganancias += precio;
    }
  });
  // Formatear a moneda COP/Local
  document.getElementById("stat-ganancias").innerText = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(ganancias);

  // Tasa de Asistencia (Citas Completadas o Confirmadas vs Canceladas)
  if (bookingsData.length > 0) {
    const efectivas = bookingsData.filter(b => b.estado === 'Confirmada' || b.estado === 'Completada').length;
    const tasa = Math.round((efectivas / bookingsData.length) * 100);
    document.getElementById("stat-asistencia").innerText = `${tasa}%`;
  } else {
    document.getElementById("stat-asistencia").innerText = "0%";
  }
}

// Genera un log de actividad simulado con datos reales para dar mayor realismo
function renderRecentActivity() {
  const container = document.getElementById("recent-activity-container");
  container.innerHTML = "";

  const actividades = [];

  // Recolectar nuevos usuarios
  usersData.slice(0, 3).forEach(u => {
    const fecha = new Date(u.created_at);
    actividades.push({
      texto: `<strong>${u.nombre} ${u.apellido}</strong> se ha registrado en el sistema.`,
      tiempo: fecha,
      tipo: 'user',
      icon: 'bi-person-plus-fill'
    });
  });

  // Recolectar nuevas citas
  bookingsData.slice(0, 3).forEach(b => {
    const fecha = new Date(b.created_at || b.fecha);
    actividades.push({
      texto: `Cita agendada para <strong>${b.nombre}</strong> (${b.servicio}).`,
      tiempo: fecha,
      tipo: 'booking',
      icon: 'bi-calendar-plus-fill'
    });
  });

  // Si no hay datos
  if (actividades.length === 0) {
    container.innerHTML = `<div class="text-center text-muted py-3">No hay actividad registrada aún.</div>`;
    return;
  }

  // Ordenar cronológicamente
  actividades.sort((a, b) => b.tiempo - a.tiempo);

  // Mostrar los primeros 5
  actividades.slice(0, 5).forEach(act => {
    const item = document.createElement("div");
    item.className = `activity-item ${act.tipo}`;
    
    // Formato de tiempo relativo simplificado
    const hace = calcularTiempoTranscurrido(act.tiempo);

    item.innerHTML = `
      <div class="activity-icon">
        <i class="bi ${act.icon}"></i>
      </div>
      <div class="activity-details">
        <p>${act.texto}</p>
        <span>${hace}</span>
      </div>
    `;
    container.appendChild(item);
  });
}

function calcularTiempoTranscurrido(date) {
  const diffMs = new Date() - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Hace un momento";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours} horas`;
  return `Hace ${diffDays} días`;
}

function renderReservasRecientes() {
  const tbody = document.getElementById("tabla-reservas-recientes");
  tbody.innerHTML = "";

  // Mostrar las 5 citas más recientes
  const recientes = bookingsData.slice(0, 5);

  if (recientes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No hay reservas registradas.</td></tr>`;
    return;
  }

  recientes.forEach(b => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${b.nombre}</strong></td>
      <td>${b.servicio}</td>
      <td>${b.fecha}</td>
      <td>${b.hora}</td>
      <td><span class="badge-status ${b.estado.toLowerCase()}">${b.estado}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================
// 4. GESTIÓN DE USUARIOS
// ==========================================
window.renderTablaUsuarios = function(filtrados = null) {
  const tbody = document.getElementById("tabla-usuarios");
  tbody.innerHTML = "";

  const lista = filtrados || usersData;

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No se encontraron usuarios.</td></tr>`;
    return;
  }

  lista.forEach(u => {
    const tr = document.createElement("tr");
    const fechaReg = new Date(u.created_at).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const horario = u.rol === 'trabajador'
      ? `${u.horario_inicio || '09:00'} - ${u.horario_fin || '18:00'}`
      : '-';

    tr.innerHTML = `
      <td>
        <div class="d-flex align-items-center gap-3">
          <div class="admin-avatar" style="width:36px; height:36px; font-size:13px;">${u.nombre[0].toUpperCase()}${u.apellido[0].toUpperCase()}</div>
          <strong>${u.nombre} ${u.apellido}</strong>
        </div>
      </td>
      <td>${u.correo}</td>
      <td><span class="badge-role ${u.rol.toLowerCase()}">${u.rol}</span></td>
      <td>${horario}</td>
      <td>${u.rol === 'trabajador' ? (Array.isArray(u.servicios) ? u.servicios.join(', ') : u.servicios || '-') : '-'}</td>
      <td>${fechaReg}</td>
      <td class="text-center">
        <button class="btn-action-edit me-2" onclick="abrirModalRol('${u.id}', '${u.nombre} ${u.apellido}', '${u.correo}', '${u.rol}')" title="Administrar Rol">
          <i class="bi bi-shield-lock"></i>
        </button>
        <button class="btn-action-delete" onclick="eliminarUsuario('${u.id}', '${u.nombre} ${u.apellido}')" title="Eliminar Cuenta">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.filtrarUsuarios = function() {
  const query = document.getElementById("buscar-usuario").value.toLowerCase();
  const filtroRol = document.getElementById("filtro-rol-usuario").value;

  const filtrados = usersData.filter(u => {
    const coincideBusqueda = u.nombre.toLowerCase().includes(query) || 
                              u.apellido.toLowerCase().includes(query) || 
                              u.correo.toLowerCase().includes(query);
    const coincideRol = filtroRol === 'todos' || u.rol === filtroRol;

    return coincideBusqueda && coincideRol;
  });

  renderTablaUsuarios(filtrados);
}

// Abrir modal de Rol
window.abrirModalRol = function(id, nombreCompleto, correo, rolActual) {
  const usuario = usersData.find(u => u.id === id) || {};

  document.getElementById("modal-rol-userid").value = id;
  document.getElementById("modal-rol-username").innerText = nombreCompleto;
  document.getElementById("modal-rol-useremail").innerText = correo;
  document.getElementById("modal-rol-select").value = rolActual;
  document.getElementById("modal-rol-avatar").innerText = nombreCompleto[0].toUpperCase() + (nombreCompleto.split(" ")[1] ? nombreCompleto.split(" ")[1][0].toUpperCase() : "");

  document.getElementById("modal-rol-horario-inicio").value = usuario.horario_inicio || '09:00';
  document.getElementById("modal-rol-horario-fin").value = usuario.horario_fin || '18:00';
  document.getElementById("modal-rol-servicios").value = Array.isArray(usuario.servicios)
    ? usuario.servicios.join(', ')
    : usuario.servicios || '';
  mostrarCamposHorario();

  const modal = new bootstrap.Modal(document.getElementById('modalEditarRol'));
  modal.show();
}

window.mostrarCamposHorario = function() {
  const rol = document.getElementById("modal-rol-select").value;
  const horarioGroup = document.getElementById("modal-horario-group");
  const serviciosGroup = document.getElementById("modal-servicios-group");

  if (rol === 'trabajador') {
    horarioGroup.style.display = 'block';
    serviciosGroup.style.display = 'block';
  } else {
    horarioGroup.style.display = 'none';
    serviciosGroup.style.display = 'none';
  }
}

// Guardar Rol de Usuario
window.guardarRolUsuario = async function() {
  const id = document.getElementById("modal-rol-userid").value;
  const nuevoRol = document.getElementById("modal-rol-select").value;
  const horarioInicio = document.getElementById("modal-rol-horario-inicio").value;
  const horarioFin = document.getElementById("modal-rol-horario-fin").value;
  const serviciosText = document.getElementById("modal-rol-servicios").value.trim();

  const datosActualizar = {
    rol: nuevoRol
  };

  if (nuevoRol === 'trabajador') {
    datosActualizar.horario_inicio = horarioInicio || '09:00';
    datosActualizar.horario_fin = horarioFin || '18:00';
    datosActualizar.servicios = serviciosText ? serviciosText.split(',').map(s => s.trim()).filter(Boolean) : null;
  } else {
    datosActualizar.horario_inicio = null;
    datosActualizar.horario_fin = null;
    datosActualizar.servicios = null;
  }

  try {
    const { error } = await supabase
      .from('usuarios')
      .update(datosActualizar)
      .eq('id', id);

    if (error) throw error;

    alert("El rol del usuario ha sido actualizado correctamente.");
    
    // Ocultar Modal
    bootstrap.Modal.getInstance(document.getElementById('modalEditarRol')).hide();
    
    // Recargar datos
    await inicializarDashboard();

  } catch (err) {
    console.error("Error al actualizar rol:", err.message);
    alert("Error al actualizar el rol: " + err.message);
  }
}

// Eliminar Usuario
window.eliminarUsuario = async function(id, nombre) {
  if (confirm(`¿Estás completamente seguro de que deseas eliminar permanentemente la cuenta de ${nombre}? Se eliminarán todas sus reservas asociadas.`)) {
    try {
      // 1. Eliminar reservas vinculadas primero
      const { error: errReservas } = await supabase
        .from('reservas')
        .delete()
        .eq('usuario_id', id);

      if (errReservas) throw errReservas;

      // 2. Eliminar el usuario
      const { error: errUser } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id);

      if (errUser) throw errUser;

      alert(`Usuario ${nombre} eliminado del sistema.`);
      await inicializarDashboard();

    } catch (err) {
      console.error("Error al eliminar usuario:", err.message);
      alert("Error al eliminar: " + err.message);
    }
  }
}

// ==========================================
// 5. GESTIÓN DE RESERVAS
// ==========================================
window.renderTablaReservas = function(filtradas = null) {
  const tbody = document.getElementById("tabla-reservas");
  tbody.innerHTML = "";

  const lista = filtradas || bookingsData;

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No se encontraron reservas.</td></tr>`;
    return;
  }

  lista.forEach(b => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><strong>${b.nombre}</strong></td>
      <td>${b.servicio}</td>
      <td class="fw-semibold text-muted" style="font-size: 14px;"><i class="bi bi-person-badge text-success me-1"></i>${b.trabajador || 'Cualquiera'}</td>
      <td>${b.fecha}</td>
      <td>${b.hora}</td>
      <td><span class="badge-status ${b.estado.toLowerCase()}">${b.estado}</span></td>
      <td class="text-center">
        <button class="btn-action-edit me-2" onclick="abrirModalEditarReserva('${b.id}', '${b.nombre}', '${b.servicio}', '${b.fecha}', '${b.hora}', '${b.estado}', '${b.trabajador || 'Cualquiera'}')" title="Reagendar / Editar">
          <i class="bi bi-pencil-square"></i>
        </button>
        <button class="btn-action-delete" onclick="eliminarReserva('${b.id}')" title="Eliminar Reserva">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.filtrarReservas = function() {
  const query = document.getElementById("buscar-reserva").value.toLowerCase();
  const filtroEstado = document.getElementById("filtro-estado-reserva").value;

  const filtradas = bookingsData.filter(b => {
    const coincideBusqueda = b.nombre.toLowerCase().includes(query) || 
                              b.servicio.toLowerCase().includes(query) ||
                              (b.trabajador && b.trabajador.toLowerCase().includes(query));
    const coincideEstado = filtroEstado === 'todos' || b.estado === filtroEstado;

    return coincideBusqueda && coincideEstado;
  });

  renderTablaReservas(filtradas);
}

// Abrir Modal Editar Reserva
window.abrirModalEditarReserva = function(id, cliente, servicio, fecha, hora, estado, trabajador) {
  document.getElementById("modal-reserva-id").value = id;
  document.getElementById("modal-reserva-cliente").value = cliente;
  document.getElementById("modal-reserva-servicio").value = servicio;
  document.getElementById("modal-reserva-trabajador").value = trabajador || 'Cualquiera';
  document.getElementById("modal-reserva-fecha").value = fecha;
  document.getElementById("modal-reserva-hora").value = hora;
  document.getElementById("modal-reserva-estado").value = estado;

  const modal = new bootstrap.Modal(document.getElementById('modalEditarReserva'));
  modal.show();
}

// Guardar Edición de Reserva
window.guardarEdicionReserva = async function() {
  const id = document.getElementById("modal-reserva-id").value;
  const servicio = document.getElementById("modal-reserva-servicio").value;
  const trabajador = document.getElementById("modal-reserva-trabajador").value;
  const fecha = document.getElementById("modal-reserva-fecha").value;
  const hora = document.getElementById("modal-reserva-hora").value;
  const estado = document.getElementById("modal-reserva-estado").value;

  if (!esFechaValidaReserva(fecha)) {
    alert("No se pueden reservar fechas anteriores al día de hoy.");
    return;
  }

  const horario = trabajador !== 'Cualquiera' ? obtenerHorarioTrabajadorPorNombre(trabajador) : null;
  if (horario && !esHoraDentroHorario(hora, horario)) {
    alert(`La hora seleccionada no está dentro del horario laboral de ${trabajador}: ${horario.inicio} - ${horario.fin}.`);
    return;
  }

  try {
    const { error } = await supabase
      .from('reservas')
      .update({ servicio, trabajador, fecha, hora, estado })
      .eq('id', id);

    if (error) throw error;

    alert("La cita ha sido actualizada exitosamente.");
    bootstrap.Modal.getInstance(document.getElementById('modalEditarReserva')).hide();
    await inicializarDashboard();

  } catch (err) {
    console.error("Error al actualizar reserva:", err.message);
    alert("Error al actualizar la cita: " + err.message);
  }
}

// Eliminar Reserva
window.eliminarReserva = async function(id) {
  if (confirm("¿Estás seguro de que deseas eliminar permanentemente esta reserva?")) {
    try {
      const { error } = await supabase
        .from('reservas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert("Reserva eliminada con éxito.");
      await inicializarDashboard();

    } catch (err) {
      console.error("Error al eliminar reserva:", err.message);
      alert("Error al eliminar la reserva: " + err.message);
    }
  }
}

// Poblar desplegable de usuarios en Modal de Crear
function poblarSelectUsuarios() {
  const select = document.getElementById("modal-crear-usuario-id");
  select.innerHTML = '<option value="">-- Cita de Invitado (Sin Cuenta) --</option>';

  usersData.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.dataset.nombre = `${u.nombre} ${u.apellido}`;
    opt.innerText = `${u.nombre} ${u.apellido} (${u.correo})`;
    select.appendChild(opt);
  });
}

window.autoCompletarNombreCrear = function() {
  const select = document.getElementById("modal-crear-usuario-id");
  const selectedOpt = select.options[select.selectedIndex];
  const nombreInput = document.getElementById("modal-crear-nombre");

  if (select.value !== "") {
    nombreInput.value = selectedOpt.dataset.nombre;
    nombreInput.disabled = true;
  } else {
    nombreInput.value = "";
    nombreInput.disabled = false;
  }
}

// Guardar nueva reserva creada por administrador
window.guardarNuevaReservaAdmin = async function() {
  const usuarioId = document.getElementById("modal-crear-usuario-id").value;
  const nombre = document.getElementById("modal-crear-nombre").value;
  const servicio = document.getElementById("modal-crear-servicio").value;
  let trabajador = document.getElementById("modal-crear-trabajador").value;
  const fecha = document.getElementById("modal-crear-fecha").value;
  const hora = document.getElementById("modal-crear-hora").value;

  if (nombre.trim() === "" || fecha === "" || hora === "") {
    alert("Por favor completa los datos obligatorios (Nombre, Fecha y Hora).");
    return;
  }

  if (!esFechaValidaReserva(fecha)) {
    alert("No se pueden reservar fechas anteriores al día de hoy.");
    return;
  }

  if (trabajador === 'Cualquiera') {
    try {
      const asignado = await asignarTrabajadorLibreAdmin(fecha, hora);
      if (!asignado) {
        alert("No hay ningún terapeuta disponible para ese horario. Por favor elige otra fecha u hora.");
        return;
      }
      trabajador = asignado;
    } catch (err) {
      console.error(err);
      alert("Error al asignar un terapeuta disponible: " + err.message);
      return;
    }
  }

  const horario = trabajador !== 'Cualquiera' ? obtenerHorarioTrabajadorPorNombre(trabajador) : null;
  if (horario && !esHoraDentroHorario(hora, horario)) {
    alert(`La hora seleccionada no está dentro del horario laboral de ${trabajador}: ${horario.inicio} - ${horario.fin}.`);
    return;
  }

  try {
    const { error } = await supabase
      .from('reservas')
      .insert([{
        usuario_id: usuarioId || null,
        nombre: nombre,
        servicio: servicio,
        trabajador: trabajador,
        fecha: fecha,
        hora: hora,
        estado: 'Confirmada'
      }]);

    if (error) throw error;

    alert("Nueva cita creada exitosamente.");
    
    // Limpiar y ocultar modal
    document.getElementById("modal-crear-usuario-id").value = "";
    document.getElementById("modal-crear-nombre").value = "";
    document.getElementById("modal-crear-nombre").disabled = false;
    document.getElementById("modal-crear-trabajador").value = "Cualquiera";
    document.getElementById("modal-crear-fecha").value = "";
    document.getElementById("modal-crear-hora").value = "";
    bootstrap.Modal.getInstance(document.getElementById('modalCrearReservaAdmin')).hide();
    
    // Recargar datos
    await inicializarDashboard();

  } catch (err) {
    console.error("Error al crear cita:", err.message);
    alert("Error al agendar la cita: " + err.message);
  }
}

// ==========================================
// 6. RENDERIZACIÓN DE GRÁFICOS (CHART.JS)
// ==========================================
function renderChartServicios() {
  const ctx = document.getElementById('chart-servicios').getContext('2d');

  // Contabilizar reservas por servicio
  const conteo = {
    "Masaje relajante": 0,
    "Tratamiento facial": 0,
    "Sauna": 0,
    "Pestana": 0,
    "Exfoliacion": 0,
    "Fisioterapia": 0
  };

  bookingsData.forEach(b => {
    if (conteo[b.servicio] !== undefined) {
      conteo[b.servicio]++;
    }
  });

  const labels = Object.keys(conteo);
  const data = Object.values(conteo);

  // Destruir gráfico anterior si existe para evitar superposiciones
  if (servicesChart) {
    servicesChart.destroy();
  }

  // Estética de colores curada y coordinada
  const palette = [
    '#4f8f7b', // Mint verde principal
    '#7bb8a4', // Mint suave
    '#a2cfbf', // Mint muy suave
    '#3e7262', // Verde oscuro
    '#6c9a8b', // Secundario
    '#2b3a35'  // Oscuro
  ];

  servicesChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: palette,
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: {
              family: "'Segoe UI', sans-serif",
              size: 12,
              weight: '500'
            },
            padding: 20,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          padding: 12,
          backgroundColor: 'rgba(43, 58, 53, 0.9)',
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 12 },
          cornerRadius: 8
        }
      },
      cutout: '70%'
    }
  });
}

// ==========================================
// 7. CERRAR SESIÓN
// ==========================================
window.logoutAdmin = function() {
  if (confirm("¿Seguro que deseas salir del panel de administración?")) {
    localStorage.removeItem('usuarioLogueado');
    window.location.href = "login.html";
  }
}
