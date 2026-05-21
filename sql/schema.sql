-- Tabla de Usuarios
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  correo TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  rol TEXT DEFAULT 'cliente' NOT NULL, -- 'cliente' o 'admin'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de Reservas
CREATE TABLE reservas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  nombre TEXT, -- Nombre del cliente (opcional para invitados o redundancia)
  servicio TEXT NOT NULL,
  fecha DATE NOT NULL,
  hora TEXT NOT NULL, -- Hora de la reserva
  estado TEXT DEFAULT 'Confirmada' NOT NULL, -- 'Confirmada', 'Cancelada', 'Completada', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

/* 
  ==============================================================
  ¿YA TIENES ESTAS TABLAS CREADAS EN SUPABASE?
  EJECUTA ESTE CÓDIGO EN EL SQL EDITOR DE SUPABASE PARA ACTUALIZARLAS:
  ==============================================================

  -- 1. Agregar columna de rol a usuarios
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rol TEXT DEFAULT 'cliente' NOT NULL;

  -- 2. Agregar columnas faltantes a reservas
  ALTER TABLE reservas ADD COLUMN IF NOT EXISTS nombre TEXT;
  ALTER TABLE reservas ADD COLUMN IF NOT EXISTS hora TEXT;
  ALTER TABLE reservas ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'Confirmada' NOT NULL;

  -- 3. Insertar un Administrador de Prueba para ensayar el Dashboard:
  INSERT INTO usuarios (nombre, apellido, correo, password, rol) 
  VALUES ('Admin', 'Serenity', 'admin@serenity.com', 'admin12345', 'admin')
  ON CONFLICT (correo) DO NOTHING;
*/
