// Reemplazo global de la alerta nativa usando SweetAlert2
window.alert = function(msg) {
  // Determinar el icono según el contenido del mensaje
  let iconType = 'info';
  const text = String(msg).toLowerCase();
  
  if (text.includes('error') || text.includes('denegado') || text.includes('incorrecta') || text.includes('vacío') || text.includes('no se pudo')) {
    iconType = 'error';
  } else if (text.includes('éxito') || text.includes('correctamente') || text.includes('exitosamente') || text.includes('✨')) {
    iconType = 'success';
  } else if (text.includes('seguro') || text.includes('advertencia') || text.includes('atención') || text.includes('no hay')) {
    iconType = 'warning';
  }

  Swal.fire({
    text: msg,
    icon: iconType,
    confirmButtonColor: '#198754',
    confirmButtonText: 'Entendido',
    customClass: {
      popup: 'glass-modal'
    }
  });
};
