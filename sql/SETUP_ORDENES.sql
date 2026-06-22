-- ========================================
-- TABLA DE ÓRDENES DE COMPRA (MercadoPago)
-- ========================================

-- Crear tabla de órdenes
CREATE TABLE IF NOT EXISTS ordenes (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  usuario_email TEXT NOT NULL,
  items JSONB NOT NULL, -- Array de items [{ id, nombre, precio, cantidad, ... }]
  total DECIMAL(10, 2) NOT NULL,
  envio_nombre TEXT NOT NULL,
  envio_telefono TEXT NOT NULL,
  envio_direccion TEXT NOT NULL,
  envio_ciudad TEXT NOT NULL,
  envio_departamento TEXT NOT NULL,
  envio_detalles TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente', -- pendiente, pagada, cancelada, envío, entregada
  mercadopago_transaction_id TEXT UNIQUE,
  mercadopago_preference_id TEXT,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP DEFAULT NOW(),
  fecha_pago TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_ordenes_usuario_id ON ordenes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes(estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_fecha ON ordenes(fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_ordenes_mercadopago_id ON ordenes(mercadopago_transaction_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE ordenes ENABLE ROW LEVEL SECURITY;

-- Política RLS: Los usuarios solo ven sus propias órdenes
CREATE POLICY "Usuarios ven solo sus órdenes" ON ordenes
  FOR SELECT USING (usuario_id = auth.uid());

CREATE POLICY "Los usuarios pueden insertar sus propias órdenes" ON ordenes
  FOR INSERT WITH CHECK (usuario_id = auth.uid());

-- Los admins/trabajadores pueden ver todas (opcional)
CREATE POLICY "Admins ven todas las órdenes" ON ordenes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id = auth.uid() AND (u.rol = 'admin' OR u.rol = 'trabajador')
    )
  );

-- Crear vista para resumen de órdenes del usuario
CREATE VIEW IF NOT EXISTS v_ordenes_usuario AS
SELECT 
  o.id,
  o.usuario_email,
  o.total,
  o.estado,
  o.fecha_creacion,
  o.envio_ciudad,
  o.envio_departamento,
  ARRAY_LENGTH(o.items::jsonb, 1) as cantidad_items
FROM ordenes o;

-- ========================================
-- TABLA OPCIONAL: Historial de pagos
-- ========================================

CREATE TABLE IF NOT EXISTS pagos_mercadopago (
  id BIGSERIAL PRIMARY KEY,
  orden_id BIGINT NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL UNIQUE,
  monto DECIMAL(10, 2) NOT NULL,
  estado TEXT NOT NULL, -- approved, pending, rejected
  tipo_pago TEXT, -- tarjeta_credito, transferencia, etc
  metodo_pago TEXT,
  respuesta_mercadopago JSONB,
  fecha_creacion TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagos_orden_id ON pagos_mercadopago(orden_id);
CREATE INDEX IF NOT EXISTS idx_pagos_transaction_id ON pagos_mercadopago(transaction_id);

-- ========================================
-- FUNCIONES DE UTILIDAD
-- ========================================

-- Función para obtener el total de ventas por mes
CREATE OR REPLACE FUNCTION obtener_ventas_mes()
RETURNS TABLE(mes TEXT, total_ventas DECIMAL, cantidad_ordenes BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(fecha_creacion, 'YYYY-MM') as mes,
    SUM(total)::DECIMAL as total_ventas,
    COUNT(*)::BIGINT as cantidad_ordenes
  FROM ordenes
  WHERE estado = 'pagada'
  GROUP BY TO_CHAR(fecha_creacion, 'YYYY-MM')
  ORDER BY mes DESC;
END;
$$ LANGUAGE plpgsql;

-- Comentarios de documentación
COMMENT ON TABLE ordenes IS 'Tabla de órdenes de compra con integración a MercadoPago';
COMMENT ON COLUMN ordenes.items IS 'Array JSON con los productos del carrito: [{id, nombre, precio, cantidad}, ...]';
COMMENT ON COLUMN ordenes.estado IS 'Estados: pendiente (creada), pagada (MercadoPago confirmó), cancelada, envío, entregada';
COMMENT ON COLUMN ordenes.mercadopago_transaction_id IS 'ID único de la transacción en MercadoPago para reconciliación';
