const form = document.getElementById("registroForm");

    form.addEventListener("submit", function(event){

      event.preventDefault();

      // Inputs
      const correo = document.getElementById("correo").value;
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;

      // Errores
      const correoError = document.getElementById("correoError");
      const passwordError = document.getElementById("passwordError");
      const confirmError = document.getElementById("confirmError");
      const terminosError = document.getElementById("terminosError");
      const successMessage = document.getElementById("successMessage");
      const terminos = document.getElementById("terminos");

      // Reset
      correoError.style.display = "none";
      passwordError.style.display = "none";
      confirmError.style.display = "none";
      terminosError.style.display = "none";
      successMessage.style.display = "none";

      let valido = true;

      // Validación términos y condiciones
      if(!terminos.checked){
        terminosError.style.display = "block";
        valido = false;
      }

      // Validación correo
      const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if(!correoRegex.test(correo)){
        correoError.style.display = "block";
        valido = false;
      }

      // Validación contraseña
      // mínimo 8 caracteres, 1 mayúscula y 1 número
      const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

      if(!passwordRegex.test(password)){
        passwordError.style.display = "block";
        valido = false;
      }

      // Confirmar contraseña
      if(password !== confirmPassword){
        confirmError.style.display = "block";
        valido = false;
      }

      // Si todo es válido
      if(valido){
        registrarUsuario(correo, password, document.getElementById("nombre").value, document.getElementById("apellido").value);
      }

    });

async function registrarUsuario(correo, password, nombre, apellido) {
    const successMessage = document.getElementById("successMessage");
    
    try {
        const { data, error } = await supabase
            .from('usuarios')
            .insert([
                { 
                    nombre: nombre, 
                    apellido: apellido, 
                    correo: correo, 
                    password: password, // Nota: en producción esto debe estar cifrado
                    rol: 'cliente' // Rol por defecto
                }
            ]);

        if (error) {
            console.error("Error al registrar:", error.message);
            alert("Error al registrar: " + error.message);
        } else {
            successMessage.style.display = "block";
            console.log("Usuario registrado con éxito");
            // Limpiar formulario
            form.reset();
            // Redirigir al inicio de sesión tras 2 segundos
            setTimeout(() => {
                window.location.href = "login.html";
            }, 2000);
        }
    } catch (err) {
        console.error("Error inesperado:", err);
        alert("Ocurrió un error inesperado al conectar con la base de datos: " + err.message);
    }
}
