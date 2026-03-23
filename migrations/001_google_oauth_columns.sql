-- Migration 001 : colonnes Google OAuth + bio
-- À exécuter UNE SEULE FOIS sur la base de données de production
-- psql -U nomu_user -d nomu_db -f migrations/001_google_oauth_columns.sql

-- Ajoute google_id sur users (liaison compte Google)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_id VARCHAR(255),
  ADD CONSTRAINT IF NOT EXISTS users_google_id_unique UNIQUE (google_id);

-- Ajoute bio sur profiles (champ court hérité du modèle User)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio TEXT;
