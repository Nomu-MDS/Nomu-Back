-- Migration 002 : ajout de la colonne gender sur profiles
-- À exécuter UNE SEULE FOIS par environnement
-- psql -U nomu_user -d nomu_prod -f migrations/002_add_profile_gender.sql

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gender VARCHAR(50);
