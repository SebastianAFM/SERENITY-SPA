-- Tabla de Usuarios
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  correo TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  rol TEXT DEFAULT 'cliente' NOT NULL, -- 'cliente', 'admin' o 'trabajador'
  horario_inicio TEXT, -- Hora de inicio del turno para trabajadores (ej: '09:00')
  horario_fin TEXT, -- Hora de fin del turno para trabajadores (ej: '18:00')
  servicios TEXT[], -- Servicios que puede ofrecer el trabajador
  foto_perfil TEXT, -- URL de la foto de perfil del usuario
  telefono TEXT, -- Teléfono de contacto del usuario
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
  trabajador TEXT, -- Nombre del terapeuta/trabajador asignado
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de Productos para la tienda
CREATE TABLE productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  imagen TEXT NOT NULL,
  precio INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ejemplo de productos iniciales:
INSERT INTO productos (nombre, descripcion, imagen, precio, stock)
VALUES
  ('Aceite Esencial Lavanda', '100% puro y natural. Ideal para relajación y aromaterapia profunda antes de dormir.', 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?q=80&w=600&auto=format&fit=crop', 35000, 12),
  ('Exfoliante Coco & Miel', 'Remueve células muertas dejando una piel extremadamente suave, hidratada y con aroma tropical.', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=600&auto=format&fit=crop', 45000, 8),
  ('Arcilla Verde Facial', 'Desintoxicación y limpieza profunda de poros. Elimina impurezas y regula la grasitud facial.', 'https://images.unsplash.com/photo-1567894192231-d22d9c1349b0?q=80&w=600&auto=format&fit=crop', 38000, 10)
ON CONFLICT (nombre) DO NOTHING;

-- Tabla para registrar alertas de inventario (stock bajo / agotado)
CREATE TABLE IF NOT EXISTS stock_alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID REFERENCES productos(id) ON DELETE CASCADE,
  mensaje TEXT NOT NULL,
  nivel_stock INTEGER NOT NULL,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  notificado BOOLEAN DEFAULT FALSE
);

-- Función usada por la aplicación para decrementar stock y crear alertas automáticamente
CREATE OR REPLACE FUNCTION decrementar_stock(prod_id UUID, cantidad INTEGER)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  current_stock INTEGER;
  new_stock INTEGER;
  umbral INTEGER := 3; -- umbral de stock bajo (configurable aquí)
BEGIN
  SELECT stock INTO current_stock FROM productos WHERE id = prod_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado: %', prod_id;
  END IF;

  new_stock := GREATEST(0, current_stock - cantidad);

  UPDATE productos SET stock = new_stock WHERE id = prod_id;

  IF new_stock <= umbral THEN
    INSERT INTO stock_alertas(producto_id, mensaje, nivel_stock)
    VALUES (prod_id, CASE WHEN new_stock = 0 THEN 'Producto agotado' ELSE 'Stock bajo' END, new_stock);
  END IF;
END;
$$;

-- Trigger que registra alertas cuando el stock cambia y cae por debajo del umbral
CREATE OR REPLACE FUNCTION productos_stock_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF NEW.stock <= 3 AND (OLD.stock IS NULL OR NEW.stock < OLD.stock) THEN
      INSERT INTO stock_alertas(producto_id, mensaje, nivel_stock)
      VALUES (NEW.id, CASE WHEN NEW.stock = 0 THEN 'Producto agotado' ELSE 'Stock bajo' END, NEW.stock);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_productos_stock_change ON productos;
CREATE TRIGGER trg_productos_stock_change
AFTER UPDATE ON productos
FOR EACH ROW
WHEN (OLD.stock IS DISTINCT FROM NEW.stock)
EXECUTE FUNCTION productos_stock_trigger();

/* 
  ==============================================================
  ¿YA TIENES ESTAS TABLAS CREADAS EN SUPABASE?
  EJECUTA ESTE CÓDIGO EN EL SQL EDITOR DE SUPABASE PARA ACTUALIZARLAS:
  ==============================================================

  -- 1. Agregar columna de rol a usuarios
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rol TEXT DEFAULT 'cliente' NOT NULL;

  -- 2. Agregar horarios, servicios, foto y teléfono a usuarios (para trabajadores y perfil)
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS horario_inicio TEXT DEFAULT '09:00';
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS horario_fin TEXT DEFAULT '18:00';
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS servicios TEXT[];
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_perfil TEXT;
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono TEXT;

  -- 3. Agregar columnas faltantes a reservas
  ALTER TABLE reservas ADD COLUMN IF NOT EXISTS nombre TEXT;
  ALTER TABLE reservas ADD COLUMN IF NOT EXISTS hora TEXT;
  ALTER TABLE reservas ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'Confirmada' NOT NULL;
  ALTER TABLE reservas ADD COLUMN IF NOT EXISTS trabajador TEXT;

  -- 4. Insertar un Administrador de Prueba para ensayar el Dashboard:
  INSERT INTO usuarios (nombre, apellido, correo, password, rol) 
  VALUES ('Admin', 'Serenity', 'admin@serenity.com', 'admin12345', 'admin')
  ON CONFLICT (correo) DO NOTHING;

  -- 5. Insertar Trabajadores de Prueba para el Portal de Trabajadores:
  INSERT INTO usuarios (nombre, apellido, correo, password, rol, horario_inicio, horario_fin, servicios) 
  VALUES ('Carlos', 'Ruiz', 'carlos@serenity.com', 'trabajador123', 'trabajador', '09:00', '17:00', ARRAY['Masaje relajante', 'Aromaterapia'])
  ON CONFLICT (correo) DO NOTHING;

  INSERT INTO usuarios (nombre, apellido, correo, password, rol, horario_inicio, horario_fin, servicios) 
  VALUES ('Laura', 'Gómez', 'laura@serenity.com', 'trabajador123', 'trabajador', '10:00', '18:00', ARRAY['Tratamiento facial', 'Masaje terapéutico'])
  ON CONFLICT (correo) DO NOTHING;

  INSERT INTO usuarios (nombre, apellido, correo, password, rol, horario_inicio, horario_fin, servicios) 
  VALUES ('Sofía', 'Marín', 'sofia@serenity.com', 'trabajador123', 'trabajador', '08:00', '16:00', ARRAY['Pedicura', 'Masaje descontracturante'])
  ON CONFLICT (correo) DO NOTHING;

  -- 6. IMPORTANTE: Crear bucket de Storage en Supabase para fotos de perfil
  -- En Supabase:
  -- 1. Ve a "Storage" en el panel lateral
  -- 2. Crea un nuevo bucket llamado "fotos-perfil"
  -- 3. Configura las políticas de acceso público en "Policies"
  -- 4. Agrega esta política: SELECT * en Anonymous Role
  -- Esto permitirá que los usuarios suban y visualicen sus fotos de perfil
*/


