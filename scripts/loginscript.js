const form = document.getElementById("loginForm");

    form.addEventListener("submit", function(event){

      event.preventDefault();

      const correo = document.getElementById("correo").value;
      const password = document.getElementById("password").value;

      const correoError = document.getElementById("correoError");
      const passwordError = document.getElementById("passwordError");
      const successMessage = document.getElementById("successMessage");

      // Reset
      correoError.style.display = "none";
      passwordError.style.display = "none";
      successMessage.style.display = "none";

      let valido = true;

      // Validar correo
      const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if(!correoRegex.test(correo)){
        correoError.style.display = "block";
        valido = false;
      }

      // Validar contraseña
      if(password.length < 8){
        passwordError.style.display = "block";
        valido = false;
      }

      // Si todo es correcto
      if(valido){
        iniciarSesion(correo, password);
      }

    });

async function iniciarSesion(correo, password) {
  const successMessage = document.getElementById("successMessage");
  
  try {
    // Buscar al usuario por correo
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('correo', correo)
      .maybeSingle(); // Usamos maybeSingle para evitar error de no encontrar fila

    if (error) {
      console.error("Error en base de datos:", error.message);
      alert("Error al conectar con la base de datos: " + error.message);
      return;
    }

    if (!data) {
      alert("El correo electrónico no está registrado.");
      return;
    }

    // Validar contraseña
    if (data.password !== password) {
      alert("Contraseña incorrecta.");
      return;
    }

    // Login correcto
    successMessage.style.display = "block";
    
    // Guardar sesión en localStorage
    localStorage.setItem('usuarioLogueado', JSON.stringify({
      id: data.id,
      nombre: data.nombre,
      apellido: data.apellido,
      correo: data.correo,
      rol: data.rol
    }));

    console.log("Inicio de sesión correcto. Rol:", data.rol);
    
    // Redirigir según el rol
    setTimeout(() => {
      if (data.rol === 'admin') {
        window.location.href = "admin.html";
      } else if (data.rol === 'trabajador') {
        window.location.href = "portaltrabajador.html";
      } else {
        window.location.href = "portalusuario.html";
      }
    }, 1000);

  } catch (err) {
    console.error("Error inesperado:", err);
    alert("Ocurrió un error inesperado al iniciar sesión: " + err.message);
  }
}