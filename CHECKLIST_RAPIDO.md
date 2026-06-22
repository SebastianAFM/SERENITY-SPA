# ✅ CHECKLIST DE IMPLEMENTACIÓN - Carrito + MercadoPago

## 🎯 PASO 1: PREPARAR MERCADOPAGO (5 min)

- [ ] Crear cuenta en https://www.mercadopago.com.co
- [ ] Completar verificación de identidad
- [ ] Ir a Dashboard → Configuración → Integraciones → Credenciales
- [ ] Copiar **Public Key** (comienza con `APP_USR-`)
- [ ] Copiar **Access Token**
- [ ] Guardar en lugar seguro (archivo, gestor de contraseñas, etc)

---

## 🎯 PASO 2: ACTUALIZAR CREDENCIALES EN EL CÓDIGO (2 min)

En `scripts/portalusuarios.js`:

### Línea ~480:
```javascript
// ANTES:
const mp = new MercadoPago('APP_USR-REEMPLAZA-CON-TU-PUBLIC-KEY', {

// DESPUÉS:
const mp = new MercadoPago('APP_USR-tu_public_key_aqui_123abc', {
```

### Línea ~510:
```javascript
// ANTES:
'Authorization': 'Bearer APP_USR-REEMPLAZA-CON-TU-ACCESS-TOKEN'

// DESPUÉS:
'Authorization': 'Bearer APP_USR-tu_access_token_aqui_xyz789'
```

⚠️ **NO compartas estos valores públicamente**

---

## 🎯 PASO 3: CREAR TABLA EN SUPABASE (5 min)

1. Abre tu proyecto en https://app.supabase.com
2. Ve a **SQL Editor** → **Crear Query**
3. Abre el archivo `sql/SETUP_ORDENES.sql`
4. Copia TODO el contenido
5. Pégalo en el editor SQL de Supabase
6. Ejecuta (Ctrl+Enter o ▶️)
7. Espera a que termine (debe decir ✅)

✅ Debería crear:
- Tabla `ordenes`
- Tabla `pagos_mercadopago`
- Índices automáticos
- Políticas de seguridad (RLS)

---

## 🎯 PASO 4: VERIFICAR EN EL NAVEGADOR (3 min)

1. Abre tu aplicación en navegador
2. Inicia sesión como usuario
3. Ve a **Tienda Online**
4. Agrega un producto al carrito
5. Haz clic en **Ver Carrito**

✅ Debería aparecer:
- Tabla de productos en el carrito
- **Nuevo formulario de envío** con campos:
  - Nombre completo
  - Teléfono
  - Dirección
  - Ciudad
  - Departamento
  - Detalles adicionales

---

## 🎯 PASO 5: PROBAR CON TARJETA DE PRUEBA (10 min)

1. En el modal del carrito, completa el formulario con datos de prueba:
   - Nombre: `Juan Pérez`
   - Teléfono: `3001234567`
   - Dirección: `Calle 10 #20-30 Apt 301`
   - Ciudad: `Bogotá`
   - Departamento: `Cundinamarca`

2. Haz clic en **Finalizar Compra**

3. Serás redirigido a MercadoPago

4. Usa la **tarjeta de prueba EXITOSA**:
   - Número: `4111 1111 1111 1111`
   - Expiración: `12/25`
   - CVV: `123`

5. Completa el flujo

✅ Si todo funciona:
- Deberías ver "✅ ¡Pago completado!"
- El carrito debe limpiarse
- En Supabase → Tabla `ordenes` debe aparecer un nuevo registro

---

## 🎯 PASO 6: VERIFICAR DATOS EN SUPABASE (3 min)

En Supabase:

1. Ve a **Editor SQL** → **Nueva Query**
2. Ejecuta:
```sql
SELECT id, usuario_email, total, estado, envio_nombre, envio_ciudad, 
       fecha_creacion FROM ordenes ORDER BY fecha_creacion DESC LIMIT 10;
```

✅ Debería mostrar:
- Tu orden recién creada
- Todos los datos de envío guardados
- Estado: `pagada` (si fue exitoso)

---

## 🎯 PASO 7 (OPCIONAL): CONFIGURAR WEBHOOK

Si quieres actualizaciones automáticas cuando un usuario completa el pago:

1. Lee `WEBHOOK_BACKEND_EJEMPLOS.md`
2. Elige: Node.js (fácil) o Python (si prefieres)
3. Configura el endpoint en tu servidor
4. En MercadoPago → Configuración → Webhooks
5. Agrega tu URL: `https://tudominio.com/api/webhook/mercadopago`

---

## 🎯 PASO 8 (OPCIONAL): EMAILS DE CONFIRMACIÓN

Si quieres enviar emails automáticos:

1. Usa un servicio como:
   - SendGrid (gratis hasta 100/mes)
   - Mailgun
   - AWS SES
   - Brevo (Sendinblue)

2. En `scripts/portalusuarios.js`, después de `actualizarEstadoOrden()`, llama:
```javascript
await enviarEmailConfirmacion(pagoOrdenId);
```

3. Implementa la función:
```javascript
async function enviarEmailConfirmacion(ordenId) {
  const { data: orden } = await supabase
    .from('ordenes')
    .select('*')
    .eq('id', ordenId)
    .single();

  // Llamar a tu backend para enviar email
  await fetch('/api/emails/confirmacion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orden)
  });
}
```

---

## 🚀 ESTADO ACTUAL

✅ **YA IMPLEMENTADO:**
- Formulario de envío en el carrito
- Validación de datos requeridos
- Integración básica de MercadoPago SDK
- Guardado de datos en Supabase (tabla `ordenes`)
- Guardado en localStorage como backup
- Detección automática del resultado del pago
- Actualización de estado de orden

⏳ **TODO FUNCIONA EN 8 PASOS**

---

## 🧪 FLUJO COMPLETO

```
Usuario compra
    ↓
Completa datos de envío
    ↓
Valida datos (son requeridos)
    ↓
Crea orden en Supabase (estado: pendiente)
    ↓
Se abre checkout de MercadoPago
    ↓
Usuario paga con tarjeta
    ↓
MercadoPago redirige a tu sitio
    ↓
Se actualiza orden a "pagada"
    ↓
Se actualizan stocks de productos
    ↓
Usuario ve confirmación ✅
    ↓
(Opcional) Se envía email de confirmación
```

---

## ❓ PREGUNTAS FRECUENTES

**P: ¿Qué pasa si cierro el navegador antes de pagar?**
A: La orden se queda en "pendiente" en Supabase. Puedes completar el pago después.

**P: ¿Cómo recibo el dinero de los pagos?**
A: MercadoPago lo transfiere a tu cuenta bancaria automáticamente. Configúralo en tu cuenta.

**P: ¿Los datos de tarjeta se guardan en mis servidores?**
A: NO. Todo va directo a MercadoPago encriptado. Tu servidor nunca ve los datos sensibles.

**P: ¿Funciona en celular?**
A: Sí. MercadoPago es responsivo y funciona en cualquier dispositivo.

**P: ¿Hay costos de MercadoPago?**
A: Sí. Cobran una comisión por transacción (varía según el país). Para Colombia es ~2.9% + $0.5 USD.

---

## 📞 SOPORTE

Si algo no funciona:

1. **Revisa la consola** del navegador (F12)
2. **Revisa los logs** de Supabase
3. **Verifica credenciales** están correctas
4. **Usa tarjeta de prueba**, no real
5. **Comprueba HTTPS** en producción (MercadoPago requiere)

---

## 📚 ARCHIVOS CREADOS

- ✅ `sql/SETUP_ORDENES.sql` - Script para crear tabla
- ✅ `MERCADOPAGO_SETUP.md` - Guía completa
- ✅ `WEBHOOK_BACKEND_EJEMPLOS.md` - Ejemplos de backend
- ✅ `scripts/portalusuarios.js` - Actualizado con integración
- ✅ `portalusuario.html` - Actualizado con formulario

---

**¿Listo? ¡Comienza por el PASO 1!** 🚀
