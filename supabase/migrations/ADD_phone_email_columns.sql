-- FINAL FIX: Add phone and email as real columns to clients table
-- This solves the universal access problem

-- 1. Add columns
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS email text;

-- 2. Migrate existing data from structure.contact to new columns
UPDATE public.clients
SET 
    phone = structure->'contact'->>'phone',
    email = structure->'contact'->>'email'
WHERE structure->'contact' IS NOT NULL;

-- Done! Now phone and email are proper columns, accessible everywhere
