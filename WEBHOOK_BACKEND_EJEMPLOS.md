# 🔗 Webhook de MercadoPago - Ejemplos de Backend

## ¿Qué es un Webhook?
Un webhook es una URL que MercadoPago llama automáticamente cuando un pago se completa, falla o está pendiente. Esto es importante para actualizar el estado de la orden en tiempo real.

---

## 📝 Ejemplo 1: Node.js + Express

```javascript
// npm install express dotenv axios
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// Inicializar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // ⚠️ Usar SERVICE ROLE, no la ANON KEY
);

// Webhook de MercadoPago
app.post('/api/webhook/mercadopago', async (req, res) => {
  try {
    console.log('[MercadoPago Webhook]', req.body);
    
    const { action, data } = req.body;
    
    // Solo procesamos updates de pagos
    if (action !== 'payment.updated') {
      return res.status(200).json({ received: true });
    }

    const paymentId = data.id;
    const status = data.status; // approved, pending, rejected, etc

    // Obtener detalles completos del pago
    const paymentDetails = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
        }
      }
    );

    const externalReference = paymentDetails.data.external_reference; // El ID de nuestra orden

    console.log(`[Pago ${paymentId}] Estado: ${status}, Orden: ${externalReference}`);

    // Mapeo de estados MercadoPago a nuestros estados
    let estadoOrden = 'pendiente';
    if (status === 'approved') {
      estadoOrden = 'pagada';
    } else if (status === 'rejected' || status === 'cancelled') {
      estadoOrden = 'cancelada';
    }

    // Actualizar orden en Supabase
    const { error } = await supabase
      .from('ordenes')
      .update({
        estado: estadoOrden,
        mercadopago_transaction_id: paymentId,
        fecha_pago: new Date().toISOString()
      })
      .eq('id', externalReference);

    if (error) {
      console.error('[Error actualizando orden]:', error);
      return res.status(500).json({ error: error.message });
    }

    // Guardar en tabla de pagos (para auditoría)
    await supabase.from('pagos_mercadopago').insert([{
      orden_id: externalReference,
      transaction_id: paymentId,
      monto: paymentDetails.data.transaction_amount,
      estado: status,
      tipo_pago: paymentDetails.data.payment_type_id,
      metodo_pago: paymentDetails.data.payment_method_id,
      respuesta_mercadopago: paymentDetails.data
    }]);

    // Si el pago fue exitoso, enviar email de confirmación
    if (status === 'approved') {
      // await enviarEmailConfirmacion(externalReference);
    }

    res.status(200).json({ 
      received: true,
      orden_id: externalReference,
      estado: estadoOrden
    });

  } catch (err) {
    console.error('[Webhook Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para obtener el estado de una orden
app.get('/api/ordenes/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ordenes')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(404).json({ error: 'Orden no encontrada' });
  }
});

// Endpoint para crear preferencia de pago (alternativa segura)
app.post('/api/pagos/preferencia', async (req, res) => {
  try {
    const { ordenId } = req.body;

    // Obtener datos de la orden desde Supabase
    const { data: orden, error } = await supabase
      .from('ordenes')
      .select('*')
      .eq('id', ordenId)
      .single();

    if (error) throw error;

    const items = JSON.parse(orden.items);

    // Crear preferencia en MercadoPago
    const preference = {
      items: items.map(item => ({
        id: item.id,
        title: item.nombre,
        description: `Cantidad: ${item.cantidad}`,
        unit_price: item.precio,
        quantity: item.cantidad
      })),
      payer: {
        name: orden.envio_nombre,
        phone: {
          number: orden.envio_telefono
        },
        address: {
          street_name: orden.envio_direccion,
          city_name: orden.envio_ciudad
        }
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL}/portalusuario.html?pago=exitoso&orden=${ordenId}`,
        failure: `${process.env.FRONTEND_URL}/portalusuario.html?pago=fallido&orden=${ordenId}`,
        pending: `${process.env.FRONTEND_URL}/portalusuario.html?pago=pendiente&orden=${ordenId}`
      },
      external_reference: ordenId,
      metadata: {
        orden_id: ordenId
      }
    };

    const response = await axios.post(
      'https://api.mercadopago.com/checkout/preferences',
      preference,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
        }
      }
    );

    res.json({
      preference_id: response.data.id,
      init_point: response.data.init_point // URL del checkout
    });

  } catch (err) {
    console.error('[Error creando preferencia]:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
```

### Archivo `.env`:
```
SUPABASE_URL=https://aonkerizxolmeizhizwp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxx-yyyy-zzzz
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxx-yyyy-zzzz
FRONTEND_URL=https://tudominio.com
PORT=3000
```

---

## 📝 Ejemplo 2: Python + Flask

```python
# pip install flask python-dotenv requests postgrest
from flask import Flask, request, jsonify
import requests
import os
from dotenv import load_dotenv
from postgrest import PostgrestClient

load_dotenv()

app = Flask(__name__)

# Cliente Supabase
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
supabase = PostgrestClient(f"{supabase_url}/rest/v1", headers={
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}"
})

@app.route('/api/webhook/mercadopago', methods=['POST'])
def webhook_mercadopago():
    try:
        data = request.get_json()
        action = data.get('action')
        
        if action != 'payment.updated':
            return jsonify({'received': True}), 200
        
        payment_id = data['data']['id']
        
        # Obtener detalles del pago
        headers = {
            'Authorization': f"Bearer {os.getenv('MERCADOPAGO_ACCESS_TOKEN')}"
        }
        response = requests.get(
            f"https://api.mercadopago.com/v1/payments/{payment_id}",
            headers=headers
        )
        payment = response.json()
        
        external_reference = payment.get('external_reference')
        status = payment.get('status')
        
        # Mapear estado
        estado_orden = 'pendiente'
        if status == 'approved':
            estado_orden = 'pagada'
        elif status in ['rejected', 'cancelled']:
            estado_orden = 'cancelada'
        
        # Actualizar en Supabase
        supabase.table('ordenes').update({
            'estado': estado_orden,
            'mercadopago_transaction_id': payment_id,
            'fecha_pago': 'now()'
        }).eq('id', external_reference).execute()
        
        return jsonify({
            'received': True,
            'orden_id': external_reference,
            'estado': estado_orden
        }), 200
        
    except Exception as e:
        print(f"[Error]: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ordenes/<orden_id>', methods=['GET'])
def obtener_orden(orden_id):
    try:
        result = supabase.table('ordenes') \
            .select('*') \
            .eq('id', orden_id) \
            .execute()
        
        if result.data:
            return jsonify(result.data[0]), 200
        return jsonify({'error': 'Orden no encontrada'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=3000)
```

---

## 🔧 Configurar Webhook en MercadoPago

1. Inicia sesión en tu cuenta de MercadoPago
2. Ve a **Configuración** → **Integraciones** → **Webhooks**
3. Haz clic en **Agregar webhook**
4. URL: `https://tudominio.com/api/webhook/mercadopago`
5. Selecciona eventos:
   - ✅ `payment.created`
   - ✅ `payment.updated`
6. Guarda

---

## 🧪 Probar Webhook Localmente

Usa ngrok para exponer tu servidor local a internet:

```bash
# Instalar ngrok
npm install -g ngrok

# En terminal 1: Inicia tu servidor Node
npm start
# Output: Server running on port 3000

# En terminal 2: Expone tu servidor
ngrok http 3000
# Output: https://abc123.ngrok.io

# En MercadoPago: Configura webhook con
# https://abc123.ngrok.io/api/webhook/mercadopago
```

---

## 📊 Monitorear Webhooks

```javascript
// En tu dashboard o admin panel
app.get('/api/webhooks/historial', async (req, res) => {
  const { data } = await supabase
    .from('pagos_mercadopago')
    .select('*')
    .order('fecha_creacion', { ascending: false })
    .limit(50);
  
  res.json(data);
});
```

---

## ⚠️ Seguridad del Webhook

1. **Validar firma** (opcional pero recomendado)
2. **Usar SERVICE ROLE KEY** en el backend (nunca la ANON KEY)
3. **HTTPS obligatorio** en producción
4. **Rate limiting** para evitar spam
5. **Logs detallados** para auditoría

```javascript
// Validar IP de MercadoPago
const MERCADOPAGO_IPS = ['200.160.0.0/12']; // Rango aproximado

app.use((req, res, next) => {
  if (req.path === '/api/webhook/mercadopago') {
    const ip = req.ip;
    // Validar IP aquí si necesario
  }
  next();
});
```

---

## 📚 Referencias

- [Docs MercadoPago - Webhooks](https://www.mercadopago.com.co/developers/es/guides/notifications/webhooks)
- [API Reference - Payments](https://www.mercadopago.com.co/developers/es/reference/payments/_payments_id/get)
- [Supabase - JavaScript Client](https://supabase.com/docs/reference/javascript)
