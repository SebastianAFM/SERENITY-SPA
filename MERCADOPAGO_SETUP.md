# 🛒 Guía de Configuración: Carrito + MercadoPago + Supabase

## 1️⃣ CONFIGURACIÓN EN MERCADOPAGO

### Paso 1: Crear cuenta en MercadoPago
1. Ve a https://www.mercadopago.com.co
2. Regístrate con tus datos
3. Completa la verificación de identidad (requerido para recibir pagos)

### Paso 2: Obtener credenciales
1. Accede a tu Dashboard de MercadoPago
2. Vete a **Configuración** → **Integraciones** → **Credenciales**
3. Encontrarás:
   - **Public Key** (comienza con `APP_USR-...`)
   - **Access Token** (para el backend)

### Paso 3: Guardar credenciales
En [portalusuarios.js](../scripts/portalusuarios.js#L480):
```javascript
// Línea ~480: Reemplaza con tu Public Key
const mp = new MercadoPago('APP_USR-REEMPLAZA-CON-TU-PUBLIC-KEY', {
  locale: 'es-CO'
});

// Línea ~510: Reemplaza con tu Access Token
headers: {
  'Authorization': 'Bearer APP_USR-REEMPLAZA-CON-TU-ACCESS-TOKEN'
}
```

---

## 2️⃣ CONFIGURACIÓN EN SUPABASE

### Paso 1: Crear tabla de órdenes
1. Abre tu proyecto en https://app.supabase.com
2. Ve a **SQL Editor**
3. Crea una nueva query
4. Copia TODO el contenido de [SETUP_ORDENES.sql](./SETUP_ORDENES.sql)
5. Ejecuta la query (Ctrl+Enter o el botón ▶️)

✅ Esto creará:
- Tabla `ordenes` con todos los campos de envío
- Tabla `pagos_mercadopago` para reconciliación
- Índices para búsquedas rápidas
- Políticas RLS de seguridad

### Paso 2: Verificar permisos
En Supabase → **Authentication** → **Policies**:
- [ ] Existe policy: "Usuarios ven solo sus órdenes"
- [ ] Existe policy: "Los usuarios pueden insertar sus propias órdenes"

---

## 3️⃣ FLUJO DE COMPRA IMPLEMENTADO

### 📋 Datos de envío que se guardan:
```
✓ Nombre completo
✓ Teléfono
✓ Dirección
✓ Ciudad
✓ Departamento
✓ Detalles adicionales (apartamento, piso, etc)
✓ Items del carrito (JSON)
✓ Total del pedido
✓ Timestamp de creación
```

### 🔄 Flujo:
1. **Usuario** hace clic en "Finalizar Compra"
2. **Validación** de datos de envío (requeridos)
3. **Creación de orden** en Supabase (estado: "pendiente")
4. **Inicialización** de MercadoPago con los datos
5. **Redirección** a checkout de MercadoPago
6. **Usuario** completa pago (tarjeta, transferencia, etc)
7. **Webhook** de MercadoPago notifica resultado
8. **Actualización** de estado de orden (pagada/rechazada)

---

## 4️⃣ ESTADOS DE ORDEN

| Estado | Significado |
|--------|------------|
| `pendiente` | Orden creada, esperando pago |
| `pagada` | Pago confirmado en MercadoPago ✅ |
| `cancelada` | Usuario canceló o pago rechazado ❌ |
| `envío` | En tránsito |
| `entregada` | Completada |

---

## 5️⃣ WEBHOOK (Importante para producción)

### ¿Por qué?
MercadoPago te notifica automáticamente cuando un pago se completa, falla o está pendiente.

### Configurar Webhook:
1. En Dashboard MercadoPago → **Configuración** → **Webhooks**
2. Agrega un endpoint: `https://tudominio.com/api/webhook/mercadopago`
3. Eventos: `payment.created`, `payment.updated`

### En el backend (Node.js ejemplo):
```javascript
app.post('/api/webhook/mercadopago', async (req, res) => {
  const { data, action } = req.body;
  
  if (action === 'payment.updated') {
    const transactionId = data.id;
    const status = data.status; // approved, pending, rejected
    
    // Actualizar orden en Supabase
    const orden = await supabase
      .from('ordenes')
      .update({ 
        estado: status === 'approved' ? 'pagada' : status,
        mercadopago_transaction_id: transactionId
      })
      .eq('mercadopago_transaction_id', transactionId);
  }
  
  res.status(200).json({ received: true });
});
```

---

## 6️⃣ DATOS ALMACENADOS

### En Supabase (tabla `ordenes`):
```sql
SELECT 
  id,              -- ID único de la orden
  usuario_id,      -- Quién compró
  total,           -- Monto total
  estado,          -- Estado actual
  items,           -- Productos en JSON
  envio_*,         -- Datos de envío (nombre, telefono, dirección, etc)
  mercadopago_transaction_id,  -- ID de MercadoPago
  fecha_creacion   -- Cuándo se creó
FROM ordenes;
```

### En localStorage (navegador):
```javascript
// Se guarda temporalmente antes de procesar pago
{
  "nombre": "Juan Pérez",
  "telefono": "3001234567",
  "direccion": "Calle 10 #20-30",
  "ciudad": "Bogotá",
  "departamento": "Cundinamarca",
  "detalles": "Apto 301",
  "fecha": "2026-06-13T10:30:00Z"
}
```

---

## 7️⃣ VISTA DEL CARRITO ACTUALIZADA

El modal del carrito ahora incluye:

```html
<!-- Formulario de envío -->
<div class="mt-4 pt-3">
  <h6>Datos de Envío</h6>
  
  <!-- Campos de formulario (nombre, telefono, dirección, etc) -->
  <!-- Validación al hacer clic en "Finalizar Compra" -->
  
  <!-- Botón "Finalizar Compra" que:
       1. Valida datos
       2. Crea orden en Supabase
       3. Abre checkout de MercadoPago
  -->
</div>
```

---

## 8️⃣ VARIACIÓN: ENTORNO LOCAL vs PRODUCCIÓN

### 🔧 Local (desarrollo):
```javascript
// localhost - no hay HTTPS, MercadoPago puede no funcionar
// Usa modo de prueba
const mp = new MercadoPago('TEST_PUBLIC_KEY_...');
```

### 🚀 Producción:
```javascript
// Con HTTPS - MercadoPago funciona normalmente
const mp = new MercadoPago('APP_USR-...');
// Y configura variables de entorno
```

---

## 9️⃣ PRUEBAS DE PAGO

### Tarjetas de prueba en MercadoPago:

**Tarjeta de crédito EXITOSA:**
- Número: `4111 1111 1111 1111`
- Expiración: `12/25`
- CVV: `123`

**Tarjeta RECHAZADA:**
- Número: `5105 1051 0510 5100`
- Expiración: `12/25`
- CVV: `123`

---

## 🔟 PRÓXIMOS PASOS

✅ **Ya configurado:**
- Formulario de envío en el carrito
- Validación de datos requeridos
- Integración básica de MercadoPago
- Guardado de datos en Supabase y localStorage

⚠️ **Aún necesitas hacer:**
1. Reemplazar Public Key y Access Token
2. Ejecutar SQL para crear tabla de órdenes
3. (Opcional) Crear webhook para actualizaciones automáticas
4. (Opcional) Crear página de confirmación de pago
5. (Opcional) Integrar envío de emails

---

## ⚠️ NOTAS IMPORTANTES

- **Seguridad**: Nunca compartas tu Access Token públicamente
- **Variables de entorno**: En producción, usa `.env` para guardar credenciales
- **HTTPS**: MercadoPago requiere HTTPS en producción
- **Pruebas**: Siempre prueba con tarjetas de prueba antes de producción
