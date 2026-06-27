const form = document.getElementById("registroForm");
const nombreInput = document.getElementById("nombre");
const apellidoInput = document.getElementById("apellido");
const correoInput = document.getElementById("correo");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

const removeLeadingWhitespace = (input) => {
    input.value = input.value.replace(/^\s+/, "");
};

const removeAllWhitespace = (input) => {
    input.value = input.value.replace(/\s+/g, "");
};

[nombreInput, apellidoInput, correoInput].forEach((input) => {
    input.addEventListener("input", () => removeLeadingWhitespace(input));
});

[passwordInput, confirmPasswordInput].forEach((input) => {
    input.addEventListener("input", () => removeAllWhitespace(input));
});

    form.addEventListener("submit", function(event){

      event.preventDefault();

      // Inputs
      const correo = correoInput.value.trimStart();
      const nombre = nombreInput.value.trimStart();
      const apellido = apellidoInput.value.trimStart();
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;

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
      const correoRegex = /^[a-zA-Z0-9._%+-]+@(gmail|hotmail|outlook|icloud)\.(com|co|net)$/i;

      if(!correoRegex.test(correo)){
        correoError.style.display = "block";
        valido = false;
      }

      // Validación contraseña
      // mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial
      const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^*()_+\-=\[\]{};:,.?~\\|`]).{8,12}$/;
      const caracteresProhibidos = /[<>'"/&]/;
      const espaciosProhibidos = /\s/;

      if (caracteresProhibidos.test(password) || espaciosProhibidos.test(password)) {
        passwordError.style.display = "block";
        valido = false;
      }

      if(!passwordRegex.test(password)){
        passwordError.style.display = "block";
        valido = false;
      }

      // Confirmar contraseña
      if(password !== confirmPassword){
        confirmError.style.display = "block";
        valido = false;
      }

      // Actualizar valores con limpieza de espacios delante
      nombreInput.value = nombre;
      apellidoInput.value = apellido;
      correoInput.value = correo;

      // Si todo es válido
      if(valido){
        registrarUsuario(correo, password, nombre, apellido);
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
            
            // Enviar correo de bienvenida
            if (window.emailService) {
                window.emailService.enviarBienvenida(`${nombre} ${apellido}`, correo);
            }

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
