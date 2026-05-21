
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
    /* CARGAR RESERVAS */
    /* ========================================= */

    async function cargarReservas() {

      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .order('id', { ascending: false })

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
                onclick="reagendarReserva(${reserva.id})">

                <i class="bi bi-pencil-square"></i>

              </button>

              <button
                class="btn-delete"
                onclick="cancelarReserva(${reserva.id})">

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

      const nombre =
        document.getElementById("nombre").value

      const servicio =
        document.getElementById("servicio").value

      const fecha =
        document.getElementById("fecha").value

      const hora =
        document.getElementById("hora").value

      if (
        nombre === "" ||
        fecha === "" ||
        hora === ""
      ) {

        alert("Completa todos los campos")
        return
      }

      const { error } = await supabase
        .from('reservas')
        .insert([{
          nombre,
          servicio,
          fecha,
          hora,
          estado: 'Confirmada'
        }])

      if (error) {

        console.log(error)

        alert("Error al guardar")
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

      document.getElementById("nombre").value = ""
      document.getElementById("fecha").value = ""
      document.getElementById("hora").value = ""

    }

    /* ========================================= */
    /* INIT */
    /* ========================================= */

    cargarReservas()
