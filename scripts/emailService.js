/**
 * 📧 Serenity Spa - Servicio de Notificaciones por Correo Electrónico
 * Integración con la API REST de EmailJS (https://www.emailjs.com)
 * 
 * INSTRUCCIONES PARA EL USUARIO:
 * 1. Regístrate gratis en https://dashboard.emailjs.com
 * 2. Conecta tu cuenta de correo electrónico (Gmail, Outlook, etc.) y obtén tu "Service ID".
 * 3. En el apartado de "Email Templates", crea 3 plantillas y anota sus respectivos "Template ID":
 * 
 *    - Plantilla de Bienvenida:
 *      * Asunto: ¡Bienvenido a Serenity Spa!
 *      * Variables esperadas en la plantilla: {{to_name}}, {{to_email}}
 * 
 *    - Plantilla de Nueva Cita:
 *      * Asunto: Confirmación de tu cita - Serenity Spa
 *      * Variables esperadas: {{to_name}}, {{to_email}}, {{servicio}}, {{trabajador}}, {{fecha}}, {{hora}}
 * 
 *    - Plantilla de Actualización de Cita:
 *      * Asunto: {{titulo}} - Serenity Spa
 *      * Variables esperadas: {{to_name}}, {{to_email}}, {{titulo}}, {{mensaje}}, {{servicio}}, {{trabajador}}, {{fecha}}, {{hora}}, {{estado}}
 * 
 * 4. Ve a la sección "Account" -> "API Keys" de EmailJS y copia tu "Public Key".
 * 5. Reemplaza los valores de la constante EMAILJS_CONFIG abajo.
 */

(function () {
  // CONFIGURACIÓN DE EMAILJS
  const EMAILJS_CONFIG = {
    PUBLIC_KEY: 'WkOKp4iXn8es4KYJV',
    SERVICE_ID: 'service_8zbv0ld',
    TEMPLATES: {
      BIENVENIDA: 'template_iiy1fmi',
      NUEVA_CITA: 'template_z9e8cpa',
      ACTUALIZACION_CITA: 'TU_TEMPLATE_ID_ACTUALIZACION'
    }
  };

  /**
   * Envia un correo mediante la API REST de EmailJS.
   * @param {string} templateId ID de la plantilla de EmailJS
   * @param {object} templateParams Parámetros/variables para la plantilla
   */
  async function sendEmail(templateId, templateParams) {
    if (EMAILJS_CONFIG.PUBLIC_KEY === 'TU_PUBLIC_KEY_AQUI' || EMAILJS_CONFIG.SERVICE_ID === 'TU_SERVICE_ID_AQUI') {
      console.warn('[EmailService] Las credenciales de EmailJS no están configuradas. Los correos se simularán en la consola.', { templateId, templateParams });
      return;
    }

    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          service_id: EMAILJS_CONFIG.SERVICE_ID,
          template_id: templateId,
          user_id: EMAILJS_CONFIG.PUBLIC_KEY,
          template_params: templateParams
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Error desconocido de EmailJS');
      }

      console.log(`[EmailService] Correo enviado exitosamente (Plantilla: ${templateId})`);
    } catch (err) {
      console.error('[EmailService] Error al enviar correo:', err);
    }
  }

  // Exponer el servicio en el objeto global window
  window.emailService = {
    /**
     * 1. Envía correo de bienvenida
     */
    enviarBienvenida: async function (nombre, correo) {
      console.log(`[EmailService] Iniciando envío de bienvenida para ${correo}...`);
      await sendEmail(EMAILJS_CONFIG.TEMPLATES.BIENVENIDA, {
        to_name: nombre,
        to_email: correo
      });
    },

    /**
     * 2. Envía confirmación de nueva cita
     */
    enviarNuevaCita: async function (nombreCliente, correoCliente, servicio, trabajador, fecha, hora) {
      console.log(`[EmailService] Iniciando envío de confirmación de cita para ${correoCliente}...`);
      await sendEmail(EMAILJS_CONFIG.TEMPLATES.NUEVA_CITA, {
        to_name: nombreCliente,
        to_email: correoCliente,
        servicio: servicio,
        trabajador: trabajador || 'Cualquiera',
        fecha: fecha,
        hora: hora
      });
    },

    /**
     * 3. Envía notificación de actualización, reagendamiento o cancelación de cita
     */
    enviarActualizacionCita: async function (nombreCliente, correoCliente, servicio, trabajador, fecha, hora, estado, tipoActualizacion) {
      console.log(`[EmailService] Iniciando envío de actualización (${tipoActualizacion}) para ${correoCliente}...`);
      
      let titulo = 'Actualización de tu reserva';
      let mensaje = '';

      if (tipoActualizacion === 'reagendada') {
        titulo = 'Tu cita ha sido reagendada';
        mensaje = `Te informamos que tu cita para el servicio de **${servicio}** ha sido reprogramada con éxito.`;
      } else if (tipoActualizacion === 'cancelada') {
        titulo = 'Tu cita ha sido cancelada';
        mensaje = `Te informamos que tu cita para el servicio de **${servicio}** ha sido cancelada. Si consideras que esto es un error, por favor contáctanos.`;
      } else if (tipoActualizacion === 'estado') {
        titulo = `Tu cita está ahora: ${estado}`;
        mensaje = `El estado de tu cita para el servicio de **${servicio}** ha cambiado a: **${estado}**.`;
      }

      await sendEmail(EMAILJS_CONFIG.TEMPLATES.ACTUALIZACION_CITA, {
        to_name: nombreCliente,
        to_email: correoCliente,
        titulo: titulo,
        mensaje: mensaje,
        servicio: servicio,
        trabajador: trabajador || 'Cualquiera',
        fecha: fecha,
        hora: hora,
        estado: estado
      });
    }
  };
})();
