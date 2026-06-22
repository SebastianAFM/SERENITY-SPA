# 🧘‍♀️ SERENITY SPA

**Sistema integral de gestión para spa, reservas y tienda online**

Proyecto final - Programación de Software SENA

---

## ✨ Características Principales

### 📋 Portal de Usuarios
- ✅ Reserva de servicios (masajes, faciales, sauna, etc)
- ✅ Asignación automática de terapeutas
- ✅ Historial de reservas
- ✅ Gestión de perfil

### 🛒 Tienda Online
- ✅ Catálogo de productos integrado con base de datos
- ✅ Carrito de compras dinámico
- ✅ Formulario de datos de envío
- ✅ **Integración con MercadoPago** (Pago seguro)
- ✅ Gestión de stock en tiempo real

### 💳 Pagos (MercadoPago)
- ✅ Checkout seguro
- ✅ Múltiples métodos de pago (tarjeta, transferencia, PSE, etc)
- ✅ Validación y confirmación automática
- ✅ Historial de transacciones

### 👨‍💼 Portal de Trabajadores
- ✅ Ver reservas del día
- ✅ Gestionar horarios
- ✅ Perfil de servicios

### 🔐 Panel de Administrador
- ✅ Gestión de usuarios
- ✅ Gestión de productos
- ✅ Reportes de reservas y ventas
- ✅ Control de trabajadores

---

## 🗄️ Base de Datos

**Plataforma:** Supabase (PostgreSQL + Auth)

### Tablas Principales
- `usuarios` - Usuarios registrados (clientes, trabajadores, admins)
- `reservas` - Reservas de servicios
- `productos` - Catálogo de tienda
- `ordenes` - Compras (nueva)
- `pagos_mercadopago` - Transacciones (nueva)

---

## 🚀 Inicio Rápido

### 1. Clonar/Descargar
```bash
git clone <tu-repo>
cd Proyecto(Spa)
```

### 2. Configurar Credenciales Supabase
En `scripts/portalusuarios.js`:
```javascript
const supabaseUrl = 'tu-url'
const supabaseKey = 'tu-key'
```

### 3. Configurar MercadoPago (Tienda Online)
En `scripts/portalusuarios.js`:
```javascript
const mp = new MercadoPago('APP_USR-tu-public-key')
```

Ver: [MERCADOPAGO_SETUP.md](./MERCADOPAGO_SETUP.md)

### 4. Crear Tablas en Supabase
Ejecutar SQL de [sql/SETUP_ORDENES.sql](./sql/SETUP_ORDENES.sql)

### 5. Abrir en navegador
```
file:///C:/path/to/index.html
```

---

## 📁 Estructura del Proyecto

```
Proyecto(Spa)/
├── index.html              # Página principal
├── login.html              # Login
├── registro.html           # Registro de usuarios
├── portalusuario.html      # Portal cliente + Tienda Online
├── portaltrabajador.html   # Portal terapeutas
├── admin.html              # Panel administrativo
│
├── scripts/
│   ├── database.js         # Configuración Supabase
│   ├── portalusuarios.js   # Lógica tienda + carrito + MercadoPago ⭐
│   ├── loginscript.js      # Autenticación
│   ├── indexscript.js      # Página principal
│   └── ...
│
├── styles/
│   ├── styles.css          # Estilos generales
│   ├── portalusuario.css   # Estilos tienda
│   └── ...
│
├── img/                    # Imágenes
├── sql/
│   ├── schema.sql          # Schema original
│   └── SETUP_ORDENES.sql   # ⭐ Nuevas tablas para tienda
│
├── MERCADOPAGO_SETUP.md        # ⭐ Guía de MercadoPago
├── CHECKLIST_RAPIDO.md         # ⭐ Pasos paso a paso
├── WEBHOOK_BACKEND_EJEMPLOS.md # ⭐ Backend + webhooks
└── README.md               # Este archivo
```

---

## 🛍️ Cómo Usar la Tienda Online

### Como Cliente
1. Inicia sesión
2. Ve a **Tienda Online**
3. Explora productos
4. **Agregar al carrito**
5. **Ver Carrito** y completa datos de envío
6. **Finalizar Compra** (Se abre MercadoPago)
7. Paga de forma segura
8. ¡Confirmación instantánea! ✅

### Como Administrador
1. Ve a [admin.html](./admin.html)
2. **Gestionar Productos**
   - Agregar nuevos
   - Editar precio/stock
   - Eliminar
3. **Ver Órdenes de Compra**
   - Cliente
   - Dirección de envío
   - Total
   - Estado (pendiente, pagada, envío, entregada)
4. **Reportes**
   - Ventas totales
   - Productos más vendidos

---

## 💾 Datos Guardados

### Información del Cliente
```
✓ Nombre completo
✓ Teléfono
✓ Email
✓ Dirección
✓ Ciudad / Departamento
✓ Historial de compras
✓ Métodos de pago
```

### En Supabase (Seguro)
- Órdenes de compra
- Transacciones de MercadoPago
- Estados de pago
- Datos de envío

### En Navegador (localStorage)
- Carrito actual (mientras compra)
- Datos de envío (temporal)

---

## 🔒 Seguridad

### Autenticación
- ✅ Registro/Login con email y contraseña
- ✅ Tokens JWT automáticos
- ✅ Session management

### Pagos
- ✅ **Datos de tarjeta NO se guardan** (MercadoPago encriptado)
- ✅ SSL/HTTPS (requerido en producción)
- ✅ Validación de transacciones

### Base de Datos
- ✅ Row Level Security (RLS) en Supabase
- ✅ Usuarios solo ven sus datos
- ✅ Backup automático

---

## 📊 Ejemplo de Flujo de Compra

```
┌─────────────────────┐
│  Usuario Compra 🛒  │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────┐
│ Completa datos de envío  │ ← Formulario nuevo
│ • Nombre                 │
│ • Teléfono               │
│ • Dirección              │
│ • Ciudad / Depto         │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Crea orden en Supabase  │ ← Estado: pendiente
│  (ID: 12345)             │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ Abre MercadoPago Checkout│
│ • Lee tabla de precios   │
│ • Pone datos del cliente │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ Usuario paga con tarjeta │
│ (Seguro, encriptado)     │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ MercadoPago confirma ✅  │
│ Redirige al cliente      │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ Actualiza orden:         │
│ • Estado: PAGADA ✅      │
│ • ID transacción         │
│ • Actualiza stock -1     │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ Cliente ve confirmación  │
│ "¡Pago completado!" 🎉   │
└──────────────────────────┘
```

---

## 🔧 Configuración Avanzada

### Variables de Entorno (Para Backend)
Si implementas webhook/backend:
```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MERCADOPAGO_PUBLIC_KEY=APP_USR-...
```

### Webhook de MercadoPago
Para actualizaciones automáticas:
```
POST https://tudominio.com/api/webhook/mercadopago
```

Ver: [WEBHOOK_BACKEND_EJEMPLOS.md](./WEBHOOK_BACKEND_EJEMPLOS.md)

---

## 📱 Responsividad

- ✅ Desktop (1920px+)
- ✅ Tablet (768px - 1024px)
- ✅ Mobile (320px - 768px)
- ✅ Compatible con navegadores modernos

---

## 🐛 Troubleshooting

### "No aparecen los productos en la tienda"
- [ ] Verifica que `supabase` está inicializado
- [ ] Revisa que exista tabla `productos` en Supabase
- [ ] Abre F12 → Console y busca errores
- [ ] Revisa en Supabase que hay registros

### "El pago no funciona"
- [ ] Reemplaza `APP_USR-REEMPLAZA-...` con tu Public Key real
- [ ] Usa tarjeta de prueba: `4111 1111 1111 1111`
- [ ] Verifica HTTPS (requerido)
- [ ] Revisa credenciales de MercadoPago

### "No se guardan datos de envío"
- [ ] Ejecuta SQL de `SETUP_ORDENES.sql`
- [ ] Verifica tabla `ordenes` existe en Supabase
- [ ] Completa TODOS los campos requeridos

---

## 📚 Documentación Completa

- [CHECKLIST_RAPIDO.md](./CHECKLIST_RAPIDO.md) - Implementación paso a paso
- [MERCADOPAGO_SETUP.md](./MERCADOPAGO_SETUP.md) - Guía detallada de MercadoPago
- [WEBHOOK_BACKEND_EJEMPLOS.md](./WEBHOOK_BACKEND_EJEMPLOS.md) - Backend + Node.js/Python
- [sql/schema.sql](./sql/schema.sql) - Schema original
- [sql/SETUP_ORDENES.sql](./sql/SETUP_ORDENES.sql) - Nuevas tablas

---

## 🤝 Contribuir

Si encuentras errores o tienes mejoras:
1. Fork el proyecto
2. Crea rama `feature/tu-mejora`
3. Commit con mensajes claros
4. Push y abre Pull Request

---

## 📄 Licencia

Proyecto educativo - SENA 2026

---

## 📞 Contacto

Para preguntas o soporte sobre MercadoPago:
- [Documentación MercadoPago](https://www.mercadopago.com.co/developers)
- [Supabase Docs](https://supabase.com/docs)

---

**Última actualización:** Junio 2026
**Versión:** 2.0 (Con integración de MercadoPago)

