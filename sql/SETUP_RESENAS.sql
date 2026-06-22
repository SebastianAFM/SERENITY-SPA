-- ========================================
-- TABLA DE RESEÑAS DE CLIENTES
-- ========================================

-- Crear tabla de reseñas
CREATE TABLE IF NOT EXISTS resenas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  calificacion INTEGER NOT NULL CHECK (calificacion >= 1 AND calificacion <= 5),
  comentario TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para búsquedas rápidas (por usuario y por fecha descendente)
CREATE INDEX IF NOT EXISTS idx_resenas_usuario_id ON resenas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_resenas_fecha ON resenas(created_at DESC);

-- Nota: Si usas Row Level Security (RLS) en Supabase, ejecuta lo siguiente para permitir acceso:
-- ALTER TABLE resenas ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Permitir lectura pública de reseñas" ON resenas FOR SELECT USING (true);
-- CREATE POLICY "Permitir a usuarios autenticados insertar reseñas" ON resenas FOR INSERT WITH CHECK (auth.uid() = usuario_id);
