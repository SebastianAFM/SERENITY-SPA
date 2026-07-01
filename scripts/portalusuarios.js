
    import { createClient }

      from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

    /* ========================================= */
    /* CONFIGURA TUS DATOS */
    /* ========================================= */

    const supabaseUrl = 'https://aonkerizxolmeizhizwp.supabase.co'
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvbmtlcml6eG9sbWVpemhpendwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzU4MDIsImV4cCI6MjA5NDQ1MTgwMn0.9awKi3grvNO7VP70gaCMQN_76SLTzCLLmHjdI4jNnlc'

    // Inicializar cliente Supabase y exponerlo en `window.supabase` para acceso global
    const supabase = (window.supabase && typeof window.supabase.from === 'function')
      ? window.supabase
      : (window.supabase = createClient(supabaseUrl, supabaseKey));

    /* ========================================= */
    /* VERIFICACIÓN DE SESIÓN */
    /* ========================================= */

    const usuarioLogueado = JSON.parse(localStorage.getItem('usuarioLogueado'));

    if (!usuarioLogueado) {
      alert("Por favor, inicia sesión para acceder al portal.");
      window.location.href = "login.html";
    }

    /* ========================================= */
    /* VERIFICAR RESULTADO DE PAGO MERCADOPAGO */
    /* ========================================= */

    // Detectar parámetros GET cuando regresa de MercadoPago
    const urlParams = new URLSearchParams(window.location.search);
    const pagoPago = urlParams.get('pago');
    const pagoOrdenId = urlParams.get('orden');

    if (pagoPago && pagoOrdenId) {
      (async () => {
        const mensaje = {
          exitoso: '✅ ¡Pago completado! Tu pedido ha sido confirmado.',
          fallido: '❌ El pago fue rechazado. Por favor intenta nuevamente.',
          pendiente: '⏳ Tu pago está pendiente de confirmación.'
        };
        
        alert(mensaje[pagoPago] || 'Estado de pago desconocido');
        
        if (pagoPago === 'exitoso') {
          // Actualizar orden a "pagada"
          try {
            await actualizarEstadoOrden(pagoOrdenId, 'pagada');
            await actualizarStockDespuesCompra();
            localStorage.removeItem('datosEnvioActual');
          } catch (err) {
            console.error('Error actualizando orden:', err);
          }
          // Limpiar URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      })();
    }

    // Auto-completar nombre
    const horarioAtencion = {
      inicio: "09:00",
      fin: "18:00"
    };

    // Cache local de trabajadores cargados desde BD
    let trabajadoresCache = [];
    let productosCargados = false;

    function esHoraValida(hora) {
      return hora >= horarioAtencion.inicio && hora <= horarioAtencion.fin;
    }

    async function existeConflictoReserva(trabajador, fecha, hora, excludeId = null) {
      if (trabajador === 'Cualquiera') return false;

      let query = supabase
        .from('reservas')
        .select('id')
        .eq('trabajador', trabajador)
        .eq('fecha', fecha)
        .eq('hora', hora)
        .neq('estado', 'Cancelada');

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message);
      }

      return data.length > 0;
    }

    async function asignarTrabajadorLibre(fecha, hora) {
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
        const inicio = trabajador.horario_inicio || horarioAtencion.inicio;
        const fin = trabajador.horario_fin || horarioAtencion.fin;

        if (hora < inicio || hora > fin) continue;
        if (reservados.includes(nombreCompleto)) continue;

        return nombreCompleto;
      }

      return null;
    }

    async function cargarTrabajadores() {
      const select = document.getElementById("trabajador");
      if (!select) return;

      // Primer opción por defecto
      select.innerHTML = '<option value="Cualquiera">Cualquiera (Asignación automática)</option>';

      const { data: trabajadores, error } = await supabase
        .from('usuarios')
        .select('nombre, apellido, servicios')
        .eq('rol', 'trabajador')
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error cargando trabajadores:', error.message);
        return;
      }

      // Guardar en cache y poblar según servicio seleccionado
      trabajadoresCache = (trabajadores || []).map(t => ({
        nombreCompleto: `${t.nombre} ${t.apellido}`,
        servicios: t.servicios // puede ser null, string CSV o array
      }));

      filtrarTrabajadoresPorServicio();
    }

    function normalizarServicios(servicios) {
      if (!servicios) return [];
      if (Array.isArray(servicios)) return servicios.map(s => s.toString().trim().toLowerCase());
      return servicios.toString().split(',').map(s => s.trim().toLowerCase());
    }

    function filtrarTrabajadoresPorServicio() {
      const servicioSeleccionado = (document.getElementById('servicio')?.value || '').toLowerCase();
      const select = document.getElementById('trabajador');
      if (!select) return;

      // limpiar y dejar la opción por defecto
      select.innerHTML = '<option value="Cualquiera">Cualquiera (Asignación automática)</option>';

      trabajadoresCache.forEach(t => {
        // si no hay servicios definidos para el trabajador, lo mostramos por compatibilidad
        const servicios = normalizarServicios(t.servicios);
        if (!servicioSeleccionado || servicioSeleccionado === '' || servicios.length === 0 || servicios.includes(servicioSeleccionado.toLowerCase())) {
          const opt = document.createElement('option');
          opt.value = t.nombreCompleto;
          opt.text = t.nombreCompleto;
          select.appendChild(opt);
        }
      });
    }

    function configurarHorarioAtencion() {
      const horaInput = document.getElementById("hora");
      if (horaInput) {
        horaInput.min = horarioAtencion.inicio;
        horaInput.max = horarioAtencion.fin;
      }

      const fechaInput = document.getElementById("fecha");
      if (fechaInput) {
        const hoy = new Date().toISOString().split("T")[0];
        fechaInput.min = hoy;
      }
    }

    document.addEventListener("DOMContentLoaded", () => {
      const nombreInput = document.getElementById("nombre");
      if (nombreInput && usuarioLogueado) {
        nombreInput.value = usuarioLogueado.nombre + " " + usuarioLogueado.apellido;
        nombreInput.disabled = true; // El nombre está bloqueado para el usuario logueado
      }
      configurarHorarioAtencion();
      cargarTrabajadores();
      cargarAvatarUsuario(); // Cargar avatar del usuario en navbar

      // Escuchar cambios en el servicio para filtrar trabajadores disponibles
      const servicioSelect = document.getElementById('servicio');
      if (servicioSelect) {
        servicioSelect.addEventListener('change', () => filtrarTrabajadoresPorServicio());
      }

      // Si la pestaña Tienda ya está visible/activa en la carga, cargar catálogo
      try {
        const tabTiendaEl = document.getElementById('tabContentTienda');
        const navTiendaEl = document.getElementById('navTienda');
        if ((tabTiendaEl && tabTiendaEl.style.display !== 'none') || (navTiendaEl && navTiendaEl.classList.contains('fw-bold'))) {
          if (!productosCargados) cargarProductos();
        }
      } catch (e) {
        console.warn('Comprobación inicial de pestaña tienda falló:', e);
      }
    });

    /* ========================================= */
    /* LOGOUT Y NAVEGACIÓN DE PESTAÑAS */
    /* ========================================= */
    window.logoutUsuario = async function() {
      const result = await Swal.fire({
        title: "Cerrar Sesión",
        text: "¿Seguro que deseas cerrar sesión?",
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

    window.switchUserTab = function(tab) {
      const tabInicio = document.getElementById("tabContentInicio");
      const tabReservas = document.getElementById("tabContentReservas");
      const tabTienda = document.getElementById("tabContentTienda");
      const navReservas = document.getElementById("navReservas");
      const navTienda = document.getElementById("navTienda");

      if (tab === 'Inicio') {
        tabInicio.style.display = 'block';
        tabReservas.style.display = 'none';
        tabTienda.style.display = 'none';
        navInicio.classList.add('fw-bold');
        navInicio.style.color = '#4f8f7b';
        navInicio.style.borderBottom = '2px solid #4f8f7b';
        navReservas.classList.remove('fw-bold');
        navReservas.style.color = '#555';
        navReservas.style.borderBottom = 'none';
        navTienda.classList.remove('fw-bold');
        navTienda.style.color = '#555';
        navTienda.style.borderBottom = 'none';
      } else if (tab ==='reservas') {
        tabReservas.style.display = 'block';
        tabTienda.style.display = 'none';
        tabInicio.style.display = 'none';
        navReservas.classList.add('fw-bold');
        navReservas.style.color = '#4f8f7b';
        navReservas.style.borderBottom = '2px solid #4f8f7b';
        navTienda.classList.remove('fw-bold');
        navTienda.style.color = '#555';
        navTienda.style.borderBottom = 'none';
        navInicio.classList.remove('fw-bold');
        navInicio.style.color = '#555';
        navInicio.style.borderBottom = 'none';
      }
      else {
        tabTienda.style.display = 'block';
        tabInicio.style.display = 'none';
        tabReservas.style.display = 'none';
        navTienda.classList.add('fw-bold');
        navTienda.style.color = '#4f8f7b';
        navTienda.style.borderBottom = '2px solid #4f8f7b';
        navReservas.classList.remove('fw-bold');
        navReservas.style.color = '#555';
        navReservas.style.borderBottom = 'none';
        navInicio.classList.remove('fw-bold');
        navInicio.style.color = '#555';
        navInicio.style.borderBottom = 'none';
        if (!productosCargados) cargarProductos();
      }
    };

    /* ========================================= */
    /* LÓGICA DEL PERFIL DE USUARIO */
    /* ========================================= */

    // Cargar avatar del usuario en la navbar
    window.cargarAvatarUsuario = function() {
      const usuario = JSON.parse(localStorage.getItem('usuarioLogueado'));
      if (usuario && usuario.foto_perfil) {
        const imgElement = document.getElementById('navUserAvatar');
        if (imgElement) {
          imgElement.src = usuario.foto_perfil;
        }
      }
    };

    // Abrir modal de perfil
    window.abrirModalPerfil = function() {
      const usuario = JSON.parse(localStorage.getItem('usuarioLogueado'));
      
      if (!usuario) {
        alert('No se encontraron datos del usuario');
        return;
      }

      // Cargar datos en el modal
      document.getElementById('perfilNombre').value = usuario.nombre || '';
      document.getElementById('perfilApellido').value = usuario.apellido || '';
      document.getElementById('perfilCorreo').value = usuario.correo || '';
      document.getElementById('perfilTelefono').value = usuario.telefono || '';
      
      if (usuario.foto_perfil) {
        document.getElementById('perfilAvatarModal').src = usuario.foto_perfil;
      }

      const modal = new bootstrap.Modal(document.getElementById('perfilModal'));
      modal.show();
    };

    // Vista previa de foto
    window.previewFoto = function() {
      const input = document.getElementById('fotoPerfil');
      if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
          document.getElementById('perfilAvatarModal').src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
      }
    };

    // Guardar cambios del perfil
    window.guardarPerfil = async function() {
      const usuario = JSON.parse(localStorage.getItem('usuarioLogueado'));
      const nombre = document.getElementById('perfilNombre').value.trim();
      const apellido = document.getElementById('perfilApellido').value.trim();
      const telefono = document.getElementById('perfilTelefono').value.trim();
      const password = document.getElementById('perfilPassword').value.trim();

      if (!nombre || !apellido) {
        alert('Por favor completa nombre y apellido');
        return;
      }

      try {
        const datosActualizar = {
          nombre,
          apellido,
          telefono: telefono || null
        };

        // Si ingresó una contraseña, la incluye
        if (password) {
          datosActualizar.password = password;
        }

        // Actualizar en Supabase
        const { error } = await supabase
          .from('usuarios')
          .update(datosActualizar)
          .eq('id', usuario.id);

        if (error) throw error;

        // Actualizar foto si se subió
        const fotoPerfil = document.getElementById('fotoPerfil');
        if (fotoPerfil.files && fotoPerfil.files[0]) {
          const file = fotoPerfil.files[0];
          const fileName = `${usuario.id}_${Date.now()}.${file.name.split('.').pop()}`;
          
          const { error: uploadError } = await supabase.storage
            .from('fotos-perfil')
            .upload(fileName, file, { upsert: true });

          if (uploadError) throw uploadError;

          // Obtener URL pública
          const { data: publicData } = supabase.storage
            .from('fotos-perfil')
            .getPublicUrl(fileName);

          if (publicData && publicData.publicUrl) {
            // Actualizar URL de foto en BD
            await supabase
              .from('usuarios')
              .update({ foto_perfil: publicData.publicUrl })
              .eq('id', usuario.id);

            datosActualizar.foto_perfil = publicData.publicUrl;
          }
        }

        // Actualizar localStorage
        usuario.nombre = nombre;
        usuario.apellido = apellido;
        usuario.telefono = telefono;
        if (datosActualizar.foto_perfil) {
          usuario.foto_perfil = datosActualizar.foto_perfil;
          document.getElementById('navUserAvatar').src = datosActualizar.foto_perfil;
        }
        localStorage.setItem('usuarioLogueado', JSON.stringify(usuario));

        alert('✅ Perfil actualizado correctamente');
        bootstrap.Modal.getInstance(document.getElementById('perfilModal')).hide();
        cargarAvatarUsuario();

      } catch (err) {
        console.error('Error al guardar perfil:', err);
        alert('Error al guardar cambios: ' + err.message);
      }
    };

    /* ========================================= */
    /* LÓGICA DEL CARRITO DE COMPRAS (TIENDA) */
    /* ========================================= */
    let carrito = [];

    window.agregarAlCarrito = function(id, nombre, precio, imagen, stock) {
      const itemExistente = carrito.find(item => item.id === id);
      if (itemExistente) {
        if (itemExistente.cantidad >= stock) {
          alert(`No hay más unidades disponibles de ${nombre}.`);
          return;
        }
        itemExistente.cantidad++;
      } else {
        if (stock <= 0) {
          alert(`El producto ${nombre} está agotado.`);
          return;
        }
        carrito.push({ id, nombre, precio, imagen, stock, cantidad: 1 });
      }
      actualizarContadorCarrito();
      abrirCarrito();
    };

    function actualizarContadorCarrito() {
      const count = carrito.reduce((total, item) => total + item.cantidad, 0);
      document.getElementById("cartCount").innerText = count;
    }

    async function cargarProductos() {
      const catalogo = document.getElementById("catalogoProductos");
        console.log('[portalusuarios] cargarProductos called');
        console.log('[portalusuarios] supabase client:', typeof supabase, supabase ? supabase : 'undefined');
      if (!catalogo) return;

      const placeholder = document.getElementById("catalogoPlaceholder");
      if (placeholder) placeholder.style.display = "block";
        try {
          console.log('[portalusuarios] Iniciando consulta a productos...');
          const query = supabase
            .from('productos')
            .select('id, nombre, descripcion, imagen, precio, stock')
            .order('nombre', { ascending: true });
          
          console.log('[portalusuarios] Query object:', query);
          
          const { data: productos, error } = await query;
          
          console.log('[portalusuarios] Respuesta de Supabase - Error:', error);
          console.log('[portalusuarios] Respuesta de Supabase - Data:', productos);

          if (error) {
            console.error('Error cargando productos:', error);
            catalogo.innerHTML = `
              <div class="col-12 text-center py-5 text-danger">
                No se pudo cargar el catálogo. Revisa la consola para más detalles.
              </div>
            `;
            alert('Error cargando productos: ' + (error.message || JSON.stringify(error)));
            return;
          }

          if (!productos || productos.length === 0) {
            catalogo.innerHTML = `
              <div class="col-12 text-center py-5 text-muted">
                No hay productos disponibles en este momento.
              </div>
            `;
            console.warn('[portalusuarios] No hay productos disponibles o array vacío');
            return;
          }

          console.log('[portalusuarios] Productos cargados exitosamente:', productos.length);
          renderProductos(productos);
          productosCargados = true;
        } catch (err) {
          console.error('Exception cargando productos:', err);
          catalogo.innerHTML = `
            <div class="col-12 text-center py-5 text-danger">
              Ocurrió un error cargando los productos. Revisa la consola.
            </div>
          `;
          alert('Error inesperado al cargar productos: ' + err.message);
        }
    }

    function renderProductos(productos) {
      const catalogo = document.getElementById("catalogoProductos");
      if (!catalogo) return;

      catalogo.innerHTML = productos.map(producto => {
        const precioFormateado = producto.precio.toLocaleString('es-CO');
        const stockText = producto.stock > 0 ? `Stock: ${producto.stock}` : 'Agotado';
        const botonDisabled = producto.stock <= 0 ? 'disabled' : '';
        const botonClase = producto.stock <= 0 ? 'btn-secondary' : 'btn-spa';
        const lowStockBadge = producto.stock > 0 && producto.stock <= 3 ? `<span class="badge bg-warning text-dark">Stock bajo</span>` : '';

        return `
          <div class="col-md-4">
            <div class="card h-100 border-0 shadow-sm rounded-4 overflow-hidden" style="background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(5px); border: 1px solid rgba(0,0,0,0.05) !important;">
              <img src="${producto.imagen}" class="card-img-top" alt="${producto.nombre}" style="height: 200px; object-fit: cover;">
              <div class="card-body p-4 text-start d-flex flex-column">
                <h5 class="fw-bold mb-2 text-dark">${producto.nombre}</h5>
                <p class="text-muted mb-3" style="font-size: 14px;">${producto.descripcion}</p>
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <span class="text-muted" style="font-size: 13px;">${stockText}</span>
                  ${lowStockBadge}
                  <span class="fw-bold fs-5 text-success">$${precioFormateado} COP</span>
                </div>
                <button class="btn ${botonClase} py-2 px-3 btn-sm mt-auto" onclick="agregarAlCarrito('${producto.id}', '${producto.nombre.replace(/'/g, "\\'")}', ${producto.precio}, '${producto.imagen}', ${producto.stock})" ${botonDisabled}>
                  <i class="bi bi-plus-lg"></i> ${producto.stock > 0 ? 'Agregar' : 'Agotado'}
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    window.abrirCarrito = function() {
      const modal = new bootstrap.Modal(document.getElementById('carritoModal'));
      renderCarrito();
      modal.show();
    };

    function renderCarrito() {
      const vacio = document.getElementById("carritoVacio");
      const lleno = document.getElementById("carritoLleno");
      const itemsContainer = document.getElementById("itemsCarrito");
      const totalContainer = document.getElementById("totalCarrito");

      if (carrito.length === 0) {
        vacio.style.display = 'block';
        lleno.style.display = 'none';
        return;
      }

      vacio.style.display = 'none';
      lleno.style.display = 'block';
      itemsContainer.innerHTML = '';

      let total = 0;
      carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;

        itemsContainer.innerHTML += `
          <tr style="border-bottom: 1px solid rgba(0,0,0,0.02);">
            <td>
              <div class="d-flex align-items-center gap-3">
                <img src="${item.imagen}" alt="${item.nombre}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;">
                <span class="fw-bold text-dark" style="font-size: 15px;">${item.nombre}</span>
              </div>
            </td>
            <td class="text-center">
              <div class="d-inline-flex align-items-center gap-2 border rounded-3 p-1">
                <button class="btn btn-sm btn-light p-1 border-0" onclick="cambiarCantidad('${item.id}', -1)" style="font-size: 11px; width: 22px; height: 22px; line-height: 1;"><i class="bi bi-dash"></i></button>
                <span class="fw-bold px-1" style="font-size: 14px;">${item.cantidad}</span>
                <button class="btn btn-sm btn-light p-1 border-0" onclick="cambiarCantidad('${item.id}', 1)" style="font-size: 11px; width: 22px; height: 22px; line-height: 1;"><i class="bi bi-plus"></i></button>
              </div>
            </td>
            <td class="text-end fw-semibold text-muted">$${item.precio.toLocaleString('es-CO')}</td>
            <td class="text-end fw-bold text-success">$${subtotal.toLocaleString('es-CO')}</td>
            <td class="text-center">
              <button class="btn btn-sm btn-link text-danger border-0 p-0 fs-5" onclick="eliminarDelCarrito('${item.id}')">
                <i class="bi bi-trash3-fill"></i>
              </button>
            </td>
          </tr>
        `;
      });

      totalContainer.innerText = `$${total.toLocaleString('es-CO')} COP`;
    }

    window.cambiarCantidad = function(id, delta) {
      const item = carrito.find(item => item.id === id);
      if (item) {
        item.cantidad += delta;
        if (item.cantidad <= 0) {
          carrito = carrito.filter(item => item.id !== id);
        }
      }
      actualizarContadorCarrito();
      renderCarrito();
    };

    window.eliminarDelCarrito = function(id) {
      carrito = carrito.filter(item => item.id !== id);
      actualizarContadorCarrito();
      renderCarrito();
    };

    window.finalizarCompra = async function() {
      // Validar datos de envío
      const nombre = document.getElementById('envioNombre').value.trim();
      const telefono = document.getElementById('envioTelefono').value.trim();
      const direccion = document.getElementById('envioDireccion').value.trim();
      const ciudad = document.getElementById('envioCiudad').value.trim();
      const departamento = document.getElementById('envioDepartamento').value.trim();
      const detalles = document.getElementById('envioDetalles').value.trim();

      if (!nombre || !telefono || !direccion || !ciudad || !departamento) {
        alert('Por favor completa todos los campos de envío requeridos');
        return;
      }

      if (carrito.length === 0) {
        alert('Tu carrito está vacío');
        return;
      }

      // Calcular total
      const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

      try {
        // Guardar datos de envío en localStorage
        const datosEnvio = { nombre, telefono, correo: usuarioLogueado.correo, direccion, ciudad, departamento, detalles, fecha: new Date().toISOString() };
        localStorage.setItem('datosEnvioActual', JSON.stringify(datosEnvio));

        // Crear orden en Supabase ANTES de iniciar el pago
        const ordenId = await crearOrdenEnSupabase({
          usuario_id: usuarioLogueado.id,
          usuario_email: usuarioLogueado.correo,
          items: carrito,
          total: total,
          envio: datosEnvio,
          estado: 'pendiente'
        });

        console.log('[MercadoPago] Orden creada:', ordenId);

        // Inicializar MercadoPago
        const mp = new MercadoPago('APP_USR-6cadb193-bf87-461d-a01c-c88efc79b734', {
          locale: 'es-CO'
        });

        // Crear preferencia de pago
        const items = carrito.map(item => ({
          id: item.id,
          title: item.nombre,
          description: `Cantidad: ${item.cantidad}`,
          unit_price: item.precio,
          quantity: item.cantidad
        }));

        const preference = {
          items: items,
          payer: {
            name: nombre,
            email: usuarioLogueado.correo,
            phone: {
              number: telefono
            },
            address: {
              street_name: direccion,
              city_name: ciudad
            }
          },
          back_urls: {
            success: window.location.origin + window.location.pathname + '?pago=exitoso&orden=' + ordenId,
            failure: window.location.origin + window.location.pathname + '?pago=fallido&orden=' + ordenId,
            pending: window.location.origin + window.location.pathname + '?pago=pendiente&orden=' + ordenId
          },
          statement_descriptor: 'Serenity Spa',
          external_reference: ordenId,
          metadata: {
            orden_id: ordenId,
            detalles_envio: JSON.stringify(datosEnvio)
          }
        };

        // Crear preferencia en el backend (necesitarás un endpoint)
        // Por ahora, usar la API de MercadoPago directamente
        fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer APP_USR-8745076641540038-062717-3f6ba78eb1e534c1f60421aad4001372-3503303196'
          },
          body: JSON.stringify(preference)
        })
        .then(response => response.json())
        .then(data => {
          if (data.id) {
            // Redirigir a checkout de MercadoPago (usando init_point para redirección directa)
            if (data.init_point) {
              window.location.href = data.init_point;
            } else {
              throw new Error('La respuesta de MercadoPago no incluyó un enlace de pago válido.');
            }
          } else {
            throw new Error('No se pudo crear la preferencia de pago');
          }
        })
        .catch(err => {
          console.error('[MercadoPago] Error:', err);
          alert('Error al procesar el pago: ' + err.message);
        });

      } catch (err) {
        console.error('Error en finalizarCompra:', err);
        alert('Error procesando tu compra: ' + err.message);
      }
    };

    async function crearOrdenEnSupabase(ordenData) {
      const { data, error } = await supabase
        .from('ordenes')
        .insert([{
          usuario_id: ordenData.usuario_id,
          usuario_email: ordenData.usuario_email,
          items: JSON.stringify(ordenData.items),
          total: ordenData.total,
          envio_nombre: ordenData.envio.nombre,
          envio_telefono: ordenData.envio.telefono,
          envio_direccion: ordenData.envio.direccion,
          envio_ciudad: ordenData.envio.ciudad,
          envio_departamento: ordenData.envio.departamento,
          envio_detalles: ordenData.envio.detalles,
          estado: ordenData.estado,
          fecha_creacion: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (error) {
        throw new Error('Error creando orden: ' + error.message);
      }

      return data.id;
    }

    async function actualizarEstadoOrden(ordenId, estado, transactionId = null) {
      const updateData = {
        estado: estado,
        fecha_actualizacion: new Date().toISOString()
      };

      if (transactionId) {
        updateData.mercadopago_transaction_id = transactionId;
      }

      const { error } = await supabase
        .from('ordenes')
        .update(updateData)
        .eq('id', ordenId);

      if (error) {
        console.error('Error actualizando orden:', error);
        throw new Error(error.message);
      }
    }

    async function actualizarStockDespuesCompra() {
      if (carrito.length === 0) return;

      const itemsPorProducto = carrito.reduce((acc, item) => {
        acc[item.id] = (acc[item.id] || 0) + item.cantidad;
        return acc;
      }, {});

      const updates = Object.entries(itemsPorProducto).map(async ([id, cantidad]) => {
        const { data: producto, error: fetchError } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', id)
          .single();

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        const nuevoStock = Math.max(0, (producto.stock || 0) - cantidad);
        const { error: updateError } = await supabase
          .from('productos')
          .update({ stock: nuevoStock })
          .eq('id', id);

        if (updateError) {
          throw new Error(updateError.message);
        }
      });

      await Promise.all(updates);
    }

    /* ========================================= */
    /* CARGAR RESERVAS */
    /* ========================================= */

    async function cargarReservas() {
      if (!usuarioLogueado) return;

      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .eq('usuario_id', usuarioLogueado.id)
        .order('fecha', { ascending: false })

      if (error) {
        console.log(error)
        return
      }

      renderReservas(data)
    }

    /* ========================================= */
    /* RENDER TABLA */
    /* ========================================= */

    function renderReservas(reservas) {

      const tabla =
        document.getElementById("tablaReservas")

      tabla.innerHTML = ""

      reservas.forEach((reserva) => {

        tabla.innerHTML += `

          <tr>

            <td>${reserva.nombre}</td>

            <td>${reserva.servicio}</td>

            <td><span class="text-muted fw-semibold" style="font-size: 14px;"><i class="bi bi-person-badge text-success me-1"></i>${reserva.trabajador || 'Cualquiera'}</span></td>

            <td>${reserva.fecha}</td>

            <td>${reserva.hora}</td>

            <td>
              <span class="badge-spa">
                ${reserva.estado}
              </span>
            </td>

            <td>

              <button
                class="btn-edit me-2"
                onclick="reagendarReserva('${reserva.id}')">

                <i class="bi bi-pencil-square"></i>

              </button>

              <button
                class="btn-delete"
                onclick="cancelarReserva('${reserva.id}')">

                <i class="bi bi-trash"></i>

              </button>

            </td>

          </tr>

        `
      })
    }

    /* ========================================= */
    /* CREAR RESERVA */
    /* ========================================= */

    window.crearReserva = async function () {
      if (!usuarioLogueado) return;

      const nombre = usuarioLogueado.nombre + " " + usuarioLogueado.apellido;

      const servicio =
        document.getElementById("servicio").value

      let trabajador =
        document.getElementById("trabajador").value

      const fecha =
        document.getElementById("fecha").value

      const hora =
        document.getElementById("hora").value

      if (
        fecha === "" ||
        hora === ""
      ) {

        alert("Completa todos los campos")
        return
      }

      const ahora = new Date();
      const seleccion = new Date(`${fecha}T${hora}`);
      const minAllowed = new Date(ahora.getTime() + 60 * 60 * 1000); // 1 hora

      if (seleccion < minAllowed) {
        alert("Las reservas deben solicitarse con al menos 1 hora de anticipación y no pueden ser en el pasado.");
        return
      }

      if (!esHoraValida(hora)) {
        alert(`Las reservas solo se pueden solicitar dentro del horario de atención: ${horarioAtencion.inicio} a ${horarioAtencion.fin}.`)
        return
      }

      if (trabajador === 'Cualquiera') {
        try {
          const asignado = await asignarTrabajadorLibre(fecha, hora);
          if (!asignado) {
            alert("No hay ningún terapeuta disponible para ese horario. Por favor elige otra fecha u hora.");
            return
          }
          trabajador = asignado;
        } catch (err) {
          console.error(err)
          alert("Error al asignar un terapeuta disponible: " + err.message)
          return
        }
      }

      try {
        const conflicto = await existeConflictoReserva(trabajador, fecha, hora)
        if (conflicto) {
          alert(`El terapeuta ${trabajador} ya tiene otra reserva para ${fecha} a las ${hora}. Elige otro horario o terapeuta.`)
          return
        }
      } catch (err) {
        console.error(err)
        alert("Error al validar la disponibilidad: " + err.message)
        return
      }

      const { error } = await supabase
        .from('reservas')
        .insert([{
          usuario_id: usuarioLogueado.id,
          nombre,
          servicio,
          trabajador,
          fecha,
          hora,
          estado: 'Confirmada'
        }])

      if (error) {

        console.log(error)

        alert("Error al guardar la reserva: " + error.message)
        return
      }

      alert("Reserva creada exitosamente")

      // Enviar correo de nueva cita
      if (window.emailService) {
        window.emailService.enviarNuevaCita(
          nombre,
          usuarioLogueado.correo,
          servicio,
          trabajador,
          fecha,
          hora
        );
      }

      limpiarFormulario()

      cargarReservas()
    }

    /* ========================================= */
    /* CANCELAR */
    /* ========================================= */

    window.cancelarReserva = async function (id) {

      const result = await Swal.fire({
        title: "Cancelar Reserva",
        text: "¿Estás seguro de cancelar esta reserva?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Sí, cancelar",
        cancelButtonText: "Atrás",
        customClass: { popup: 'glass-modal' }
      });

      if (!result.isConfirmed) return

      try {
        // Obtener detalles de la reserva antes de borrar
        const { data: reserva, error: fetchError } = await supabase
          .from('reservas')
          .select('*')
          .eq('id', id)
          .single();

        const { error } = await supabase
          .from('reservas')
          .delete()
          .eq('id', id)

        if (error) {
          console.log(error)
          alert("Error al cancelar la reserva")
          return
        }

        alert("Reserva cancelada")

        // Enviar correo de cancelación
        if (reserva && window.emailService) {
          const nombreCompleto = usuarioLogueado.nombre + " " + usuarioLogueado.apellido;
          window.emailService.enviarActualizacionCita(
            nombreCompleto,
            usuarioLogueado.correo,
            reserva.servicio,
            reserva.trabajador,
            reserva.fecha,
            reserva.hora,
            'Cancelada',
            'cancelada'
          );
        }

        cargarReservas()
      } catch (err) {
        console.error("Error en cancelarReserva:", err);
      }
    }

    /* ========================================= */
    /* REAGENDAR */
    /* ========================================= */

    window.reagendarReserva = async function (id) {

      const nuevaFecha =
        prompt("Nueva fecha YYYY-MM-DD")

      const nuevaHora =
        prompt("Nueva hora HH:MM")

      if (!nuevaFecha || !nuevaHora)
        return

      const hoy = new Date().toISOString().split('T')[0];
      if (nuevaFecha < hoy) {
        alert("No se pueden reservar fechas anteriores al día de hoy.")
        return
      }

      if (!esHoraValida(nuevaHora)) {
        alert(`Las reservas solo se pueden solicitar dentro del horario de atención: ${horarioAtencion.inicio} a ${horarioAtencion.fin}.`)
        return
      }

      const { data: reserva, error: fetchError } = await supabase
        .from('reservas')
        .select('trabajador, servicio')
        .eq('id', id)
        .single()

      if (fetchError) {
        console.error(fetchError)
        alert("Error al recuperar la reserva para reagendar: " + fetchError.message)
        return
      }

      try {
        const conflicto = await existeConflictoReserva(reserva.trabajador, nuevaFecha, nuevaHora, id)
        if (conflicto) {
          alert(`El terapeuta ${reserva.trabajador} ya tiene otra reserva para ${nuevaFecha} a las ${nuevaHora}. Elige otro horario o terapeuta.`)
          return
        }
      } catch (err) {
        console.error(err)
        alert("Error al validar la disponibilidad: " + err.message)
        return
      }

      const { error } = await supabase
        .from('reservas')
        .update({
          fecha: nuevaFecha,
          hora: nuevaHora
        })
        .eq('id', id)

      if (error) {

        console.log(error)

        alert("Error")
        return
      }

      alert("Reserva actualizada")

      // Enviar correo de reagendamiento
      if (reserva && window.emailService) {
        const nombreCompleto = usuarioLogueado.nombre + " " + usuarioLogueado.apellido;
        window.emailService.enviarActualizacionCita(
          nombreCompleto,
          usuarioLogueado.correo,
          reserva.servicio,
          reserva.trabajador,
          nuevaFecha,
          nuevaHora,
          'Confirmada',
          'reagendada'
        );
      }

      cargarReservas()
    }

    /* ========================================= */
    /* LIMPIAR */
    /* ========================================= */

    function limpiarFormulario() {

      document.getElementById("fecha").value = ""
      document.getElementById("hora").value = ""

    }

    /* ========================================= */
    /* LÓGICA DE RESEÑAS */
    /* ========================================= */

    window.cargarResenas = async function () {
      try {
        const { data, error } = await supabase
          .from('resenas')
          .select('*, usuarios(nombre, apellido, foto_perfil)')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error al cargar reseñas:', error);
          return;
        }

        renderResenas(data);
      } catch (err) {
        console.error('Error en cargarResenas:', err);
      }
    };

    function renderResenas(resenas) {
      const container = document.getElementById('listaResenas');
      if (!container) return;

      if (!resenas || resenas.length === 0) {
        container.innerHTML = `
          <div class="col-12 text-center py-4 text-muted" id="placeholderResenas">
            <i class="bi bi-chat-left-text" style="font-size: 3rem; opacity: 0.5;"></i>
            <p class="mt-3">Aún no hay reseñas. ¡Sé el primero en compartir tu experiencia!</p>
          </div>
        `;
        return;
      }

      container.innerHTML = '';
      resenas.forEach(resena => {
        const usuario = resena.usuarios || {};
        const nombreCompleto = `${usuario.nombre || 'Usuario'} ${usuario.apellido || ''}`.trim();
        const fotoPerfil = usuario.foto_perfil || 'img/default-avatar.svg';
        
        // Formatear calificación a estrellas
        let estrellasHtml = '';
        for (let i = 1; i <= 5; i++) {
          if (i <= resena.calificacion) {
            estrellasHtml += '<i class="bi bi-star-fill me-1"></i>';
          } else {
            estrellasHtml += '<i class="bi bi-star me-1"></i>';
          }
        }

        // Formatear fecha
        let fechaFormateada = 'Reciente';
        if (resena.created_at) {
          const d = new Date(resena.created_at);
          fechaFormateada = d.toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }

        const reviewCol = document.createElement('div');
        reviewCol.className = 'col-md-6 col-lg-4';
        reviewCol.innerHTML = `
          <div class="review-card">
            <div class="d-flex align-items-center mb-3">
              <img src="${fotoPerfil}" alt="${nombreCompleto}" class="review-avatar me-3">
              <div>
                <h5 class="fw-bold mb-1 text-dark" style="font-size: 16px;">${nombreCompleto}</h5>
                <small class="text-muted" style="font-size: 12px;">${fechaFormateada}</small>
              </div>
            </div>
            <div class="stars-container mb-2">
              ${estrellasHtml}
            </div>
            <p class="text-muted mb-0" style="font-size: 14px; line-height: 1.5; font-style: italic;">
              "${resena.comentario}"
            </p>
          </div>
        `;
        container.appendChild(reviewCol);
      });
    }

    window.publicarResena = async function () {
      if (!usuarioLogueado) {
        alert("Debes iniciar sesión para publicar una reseña.");
        return;
      }

      const calificacion = parseInt(document.getElementById("calificacionResena").value);
      const comentario = document.getElementById("comentarioResena").value.trim();

      if (calificacion === 0) {
        alert("Por favor selecciona una calificación de 1 a 5 estrellas.");
        return;
      }

      if (!comentario) {
        alert("Por favor escribe un comentario.");
        return;
      }

      try {
        const { error } = await supabase
          .from('resenas')
          .insert([{
            usuario_id: usuarioLogueado.id,
            calificacion: calificacion,
            comentario: comentario
          }]);

        if (error) {
          throw error;
        }

        alert("¡Muchas gracias por tu reseña!");
        
        // Resetear formulario
        document.getElementById("comentarioResena").value = "";
        document.getElementById("calificacionResena").value = "0";
        
        // Deseleccionar estrellas
        document.querySelectorAll("#ratingStars i").forEach(star => {
          star.classList.remove("active", "bi-star-fill");
          star.classList.add("bi-star");
        });

        // Recargar reseñas
        cargarResenas();
      } catch (err) {
        console.error("Error al publicar reseña:", err);
        alert("Hubo un error al guardar tu reseña: " + err.message);
      }
    };

    function initRatingStars() {
      const container = document.getElementById("ratingStars");
      if (!container) return;

      const stars = container.querySelectorAll("i");
      const hiddenInput = document.getElementById("calificacionResena");

      stars.forEach(star => {
        // Al hacer click, establecer la calificación
        star.addEventListener("click", () => {
          const value = parseInt(star.getAttribute("data-value"));
          hiddenInput.value = value;
          updateStarsVisual(value);
        });

        // Al pasar el ratón por encima, iluminar temporalmente hasta esa estrella
        star.addEventListener("mouseover", () => {
          const value = parseInt(star.getAttribute("data-value"));
          highlightStars(value);
        });
      });

      // Al sacar el ratón del contenedor de estrellas, restaurar la calificación seleccionada
      container.addEventListener("mouseleave", () => {
        const selectedValue = parseInt(hiddenInput.value) || 0;
        updateStarsVisual(selectedValue);
      });

      function highlightStars(value) {
        stars.forEach(star => {
          const starVal = parseInt(star.getAttribute("data-value"));
          if (starVal <= value) {
            star.classList.remove("bi-star");
            star.classList.add("bi-star-fill", "active");
          } else {
            star.classList.remove("bi-star-fill", "active");
            star.classList.add("bi-star");
          }
        });
      }

      function updateStarsVisual(value) {
        stars.forEach(star => {
          const starVal = parseInt(star.getAttribute("data-value"));
          if (starVal <= value) {
            star.classList.remove("bi-star");
            star.classList.add("bi-star-fill", "active");
          } else {
            star.classList.remove("bi-star-fill", "active");
            star.classList.add("bi-star");
          }
        });
      }
    }

    /* ========================================= */
    /* INIT */
    /* ========================================= */

    cargarReservas()
    initRatingStars()
    cargarResenas()

    /* ========================================= */
    /* SERVICIOS - BASE DE DATOS */
    /* ========================================= */

    const serviciosDetallados = {
      masajes: {
        nombre: 'Masajes',
        icon: 'bi-heart-pulse',
        imagen: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=800&auto=format&fit=crop',
        imagenes: [
          'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?q=80&w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1519699047748-de8e457a634e?q=80&w=800&auto=format&fit=crop'
        ],
        descripcion: 'Terapias relajantes y descontracturantes diseñadas para aliviar la tensión muscular, mejorar la circulación y promover el bienestar general. Cada sesión es personalizada según tus necesidades.',
        servicios: [
          'Masaje Sueco Completo',
          'Masaje Descontracturante',
          'Masaje Relajante',
          'Drenaje Linfático',
          'Reflexoterapia',
          'Masaje con Piedras Calientes'
        ],
        duracion: '60 minutos',
        precio: '$80.000 COP',
        beneficios: [
          '✨ Reduce estrés y ansiedad',
          '💪 Alivia dolores musculares',
          '❤️ Mejora la circulación',
          '😴 Promueve el descanso profundo',
          '🧘 Aumenta flexibilidad'
        ]
      },
      faciales: {
        nombre: 'Faciales',
        icon: 'bi-face-smile',
        imagen: 'https://images.unsplash.com/photo-1570172619644-dfd03cb4f6b6?q=80&w=800&auto=format&fit=crop',
        imagenes: [
          'https://images.unsplash.com/photo-1570172619644-dfd03cb4f6b6?q=80&w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?q=80&w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=800&auto=format&fit=crop'
        ],
        descripcion: 'Tratamientos rejuvenecedores que hidratan, limpian y revitalizan tu piel. Utilizamos productos premium para conseguir resultados visibles inmediatamente.',
        servicios: [
          'Limpieza Profunda',
          'Tratamiento Hidratante',
          'Facial Anti-Envejecimiento',
          'Masaje Facial Lifting',
          'Tratamiento Acné',
          'Peeling Químico Suave'
        ],
        duracion: '50 minutos',
        precio: '$90.000 COP',
        beneficios: [
          '✨ Piel más luminosa',
          '💧 Máxima hidratación',
          '🌟 Reduce arrugas y líneas',
          '🎯 Cierra poros',
          '👑 Aspecto juvenil'
        ]
      },
      sauna: {
        nombre: 'Sauna',
        icon: 'bi-water',
        imagen: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?q=80&w=800&auto=format&fit=crop',
        imagenes: [
          'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?q=80&w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=800&auto=format&fit=crop'
        ],
        descripcion: 'Purificación total del cuerpo mediante calor terapéutico. Elimina toxinas, mejora la circulación y proporciona relajación profunda.',
        servicios: [
          'Sauna Finlandesa',
          'Sauna Infrarroja',
          'Ritual Completo con Vapor',
          'Exfoliación con Agua Fría',
          'Desintoxicación',
          'Terapia de Calor'
        ],
        duracion: '45 minutos',
        precio: '$60.000 COP',
        beneficios: [
          '🔥 Elimina toxinas',
          '💧 Hidrata la piel',
          '😌 Relajación total',
          '🧬 Detoxificación profunda',
          '⚡ Energía renovada'
        ]
      },
      pestanas: {
        nombre: 'Pestañas',
        icon: 'bi-eye',
        imagen: 'https://images.unsplash.com/photo-1609592869014-34402be7d229?q=80&w=800&auto=format&fit=crop',
        imagenes: [
          'https://images.unsplash.com/photo-1609592869014-34402be7d229?q=80&w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?q=80&w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1522337094846-8a818192de1f?q=80&w=800&auto=format&fit=crop'
        ],
        descripcion: 'Extensiones de pestañas pelo a pelo, con resultados naturales y hermosos. Aplicación cuidadosa utilizando materiales premium de alta calidad.',
        servicios: [
          'Extensión Clásica',
          'Extensión Volumen 3D',
          'Extensión Volumen 5D',
          'Rellenos de Mantenimiento',
          'Lifting de Pestañas',
          'Tinte de Pestañas'
        ],
        duracion: '120 minutos',
        precio: '$120.000 COP',
        beneficios: [
          '👁️ Mirada más expresiva',
          '✨ Efecto natural',
          '💄 Durabilidad hasta 6 semanas',
          '🎀 Mayor seguridad',
          '💁 Bajo mantenimiento'
        ]
      },
      exfoliacion: {
        nombre: 'Exfoliación',
        icon: 'bi-lightning-charge',
        imagen: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?q=80&w=800&auto=format&fit=crop',
        imagenes: [
          'https://images.unsplash.com/photo-1556228578-8c89e6adf883?q=80&w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?q=80&w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?q=80&w=800&auto=format&fit=crop'
        ],
        descripcion: 'Tratamiento que elimina células muertas y deja tu piel suave, radiante e hidratada. Resultados visibles desde la primera sesión.',
        servicios: [
          'Exfoliación Mecánica Suave',
          'Exfoliación Química',
          'Body Scrub Relajante',
          'Exfoliación con Azúcar',
          'Peeling Enzimático',
          'Hidratación Post-Exfoliación'
        ],
        duracion: '40 minutos',
        precio: '$70.000 COP',
        beneficios: [
          '✨ Piel suave y sedosa',
          '💧 Máxima hidratación',
          '🌟 Textura uniforme',
          '🎯 Absorción de productos',
          '👑 Brillo natural'
        ]
      },
      fisioterapia: {
        nombre: 'Fisioterapia',
        icon: 'bi-bandaid',
        imagen: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=800&auto=format&fit=crop',
        imagenes: [
          'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1579684389782-64d84b5e901a?q=80&w=800&auto=format&fit=crop'
        ],
        descripcion: 'Tratamientos especializados que mejoran la movilidad, reducen dolor y aceleran la recuperación. Técnicas modernas y terapeutas certificados.',
        servicios: [
          'Terapia Manual',
          'Electroterapia',
          'Movilización Articular',
          'Estiramientos Terapéuticos',
          'Fortalecimiento Muscular',
          'Rehabilitación Postoperatoria'
        ],
        duracion: '60 minutos',
        precio: '$85.000 COP',
        beneficios: [
          '💪 Mayor movilidad',
          '😌 Reducción del dolor',
          '🏃 Recuperación más rápida',
          '🧬 Rehabilitación completa',
          '⚡ Mejor funcionalidad'
        ]
      }
    };


    /* ========================================= */
    /* FUNCIONES PARA MODAL DE SERVICIOS */
    /* ========================================= */

    window.abrirModalServicio = function(servicioKey) {
      const servicio = serviciosDetallados[servicioKey];
      
      if (!servicio) {
        console.error('Servicio no encontrado:', servicioKey);
        return;
      }

      // Actualizar contenido del modal
      const iconElement = document.getElementById('servicioIcon');
      if (iconElement) {
        iconElement.className = `bi ${servicio.icon} me-2`;
      }
      const nombreElement = document.getElementById('servicioNombre');
      if (nombreElement) {
        nombreElement.textContent = servicio.nombre;
      }
      
      const mainImg = document.getElementById('servicioImagenPrincipal');
      mainImg.src = servicio.imagen;
      mainImg.style.opacity = 1;
      
      document.getElementById('servicioDescripcion').textContent = servicio.descripcion;
      document.getElementById('servicioDuracion').textContent = servicio.duracion;
      document.getElementById('servicioPrecio').textContent = servicio.precio;

      // Generar miniaturas de imágenes de referencia
      const thumbnailsContainer = document.getElementById('servicioThumbnails');
      if (thumbnailsContainer) {
        thumbnailsContainer.innerHTML = '';
        if (servicio.imagenes && servicio.imagenes.length > 0) {
          servicio.imagenes.forEach((imgUrl, index) => {
            const thumbImg = document.createElement('img');
            thumbImg.src = imgUrl;
            thumbImg.className = `service-thumbnail${index === 0 ? ' active' : ''}`;
            thumbImg.alt = `${servicio.nombre} referencia ${index + 1}`;
            
            thumbImg.onclick = function() {
              // Desactivar todos los thumbnails
              thumbnailsContainer.querySelectorAll('.service-thumbnail').forEach(t => t.classList.remove('active'));
              // Activar este thumbnail
              thumbImg.classList.add('active');
              // Cambiar imagen principal con una suave animación de opacidad
              mainImg.style.opacity = 0;
              setTimeout(() => {
                mainImg.src = imgUrl;
                mainImg.style.opacity = 1;
              }, 200);
            };
            
            thumbnailsContainer.appendChild(thumbImg);
          });
        }
      }

      // Agregar servicios específicos
      const itemsList = document.getElementById('servicioItems');
      itemsList.innerHTML = '';
      servicio.servicios.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<div style="padding: 8px; background: rgba(79, 143, 123, 0.1); border-radius: 8px; font-size: 0.9rem; color: #333;">✓ ${item}</div>`;
        itemsList.appendChild(li);
      });

      // Agregar beneficios
      const beneficios = document.getElementById('servicioBeneficios');
      beneficios.innerHTML = '';
      servicio.beneficios.forEach(benefit => {
        const li = document.createElement('li');
        li.innerHTML = `<div style="padding: 10px 0; display: flex; align-items: center; border-bottom: 1px solid rgba(0,0,0,0.05); color: #333;">${benefit}</div>`;
        beneficios.appendChild(li);
      });

      // Guardar el servicio en localStorage para usarlo en reservas
      localStorage.setItem('servicioSeleccionado', JSON.stringify({
        key: servicioKey,
        nombre: servicio.nombre
      }));

      // Abrir el modal
      const modal = new bootstrap.Modal(document.getElementById('servicioModal'));
      modal.show();
    };

    window.irAReserva = function() {
      // Cerrar el modal de servicios
      const modal = bootstrap.Modal.getInstance(document.getElementById('servicioModal'));
      if (modal) {
        modal.hide();
      }

      // Obtener el servicio seleccionado
      const servicioSeleccionado = JSON.parse(localStorage.getItem('servicioSeleccionado'));
      
      // Cambiar a la pestaña de reservas
      switchUserTab('reservas');

      // Preseleccionar el servicio en el formulario
      if (servicioSeleccionado) {
        const selectServicio = document.getElementById('servicio');
        if (selectServicio) {
          // Buscar la opción que coincida
          for (let i = 0; i < selectServicio.options.length; i++) {
            const option = selectServicio.options[i].text.toLowerCase();
            if (option.includes(servicioSeleccionado.nombre.toLowerCase())) {
              selectServicio.selectedIndex = i;
              break;
            }
          }
        }
      }
    };
