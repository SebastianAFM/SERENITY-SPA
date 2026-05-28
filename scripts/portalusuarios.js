
    import { createClient }

      from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

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

    if (!usuarioLogueado) {
      alert("Por favor, inicia sesión para acceder al portal.");
      window.location.href = "login.html";
    }

    // Auto-completar nombre
    document.addEventListener("DOMContentLoaded", () => {
      const nombreInput = document.getElementById("nombre");
      if (nombreInput && usuarioLogueado) {
        nombreInput.value = usuarioLogueado.nombre + " " + usuarioLogueado.apellido;
        nombreInput.disabled = true; // El nombre está bloqueado para el usuario logueado
      }
    });

    /* ========================================= */
    /* LOGOUT Y NAVEGACIÓN DE PESTAÑAS */
    /* ========================================= */
    window.logoutUsuario = function() {
      if (confirm("¿Seguro que deseas cerrar sesión?")) {
        localStorage.removeItem('usuarioLogueado');
        window.location.href = "login.html";
      }
    };

    window.switchUserTab = function(tab) {
      const tabReservas = document.getElementById("tabContentReservas");
      const tabTienda = document.getElementById("tabContentTienda");
      const navReservas = document.getElementById("navReservas");
      const navTienda = document.getElementById("navTienda");

      if (tab === 'reservas') {
        tabReservas.style.display = 'block';
        tabTienda.style.display = 'none';
        navReservas.classList.add('fw-bold');
        navReservas.style.color = '#4f8f7b';
        navReservas.style.borderBottom = '2px solid #4f8f7b';
        navTienda.classList.remove('fw-bold');
        navTienda.style.color = '#555';
        navTienda.style.borderBottom = 'none';
      } else {
        tabReservas.style.display = 'none';
        tabTienda.style.display = 'block';
        navTienda.classList.add('fw-bold');
        navTienda.style.color = '#4f8f7b';
        navTienda.style.borderBottom = '2px solid #4f8f7b';
        navReservas.classList.remove('fw-bold');
        navReservas.style.color = '#555';
        navReservas.style.borderBottom = 'none';
      }
    };

    /* ========================================= */
    /* LÓGICA DEL CARRITO DE COMPRAS (TIENDA) */
    /* ========================================= */
    let carrito = [];

    window.agregarAlCarrito = function(id, nombre, precio, imagen) {
      const itemExistente = carrito.find(item => item.id === id);
      if (itemExistente) {
        itemExistente.cantidad++;
      } else {
        carrito.push({ id, nombre, precio, imagen, cantidad: 1 });
      }
      actualizarContadorCarrito();
      alert(`¡${nombre} añadido al carrito! 🛍️`);
    };

    function actualizarContadorCarrito() {
      const count = carrito.reduce((total, item) => total + item.cantidad, 0);
      document.getElementById("cartCount").innerText = count;
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

    window.finalizarCompra = function() {
      // Simular compra exitosa con una animación premium y limpia
      bootstrap.Modal.getInstance(document.getElementById('carritoModal')).hide();
      
      alert("¡Procesando tu pago seguro Serenity Pay... 💳✨!");
      
      setTimeout(() => {
        alert("¡Compra exitosa! 🎉\n\nHemos registrado tu pedido en Serenity Spa. Te enviaremos un correo de confirmación con los detalles del envío.");
        carrito = [];
        actualizarContadorCarrito();
      }, 1500);
    };

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

      const trabajador =
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

      limpiarFormulario()

      cargarReservas()
    }

    /* ========================================= */
    /* CANCELAR */
    /* ========================================= */

    window.cancelarReserva = async function (id) {

      const confirmar =
        confirm("¿Cancelar reserva?")

      if (!confirmar) return

      const { error } = await supabase
        .from('reservas')
        .delete()
        .eq('id', id)

      if (error) {

        console.log(error)

        alert("Error")
        return
      }

      alert("Reserva cancelada")

      cargarReservas()
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
    /* INIT */
    /* ========================================= */

    cargarReservas()
