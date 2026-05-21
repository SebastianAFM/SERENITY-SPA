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
        window.location.href = "portalusuario.html";

        // Aquí puedes conectar con backend
        console.log("Inicio de sesión correcto");
      }

    });