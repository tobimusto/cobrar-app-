-- update_v16_profiles_fullname.sql
-- Añade la columna full_name a la tabla profiles para el Perfil de Usuario

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
