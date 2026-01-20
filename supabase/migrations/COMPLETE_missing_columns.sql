-- COMPREHENSIVE FIX: Add ALL missing columns to tables
-- This fixes all "column not found" errors at once

-- ==============================================
-- 1. CLIENTS TABLE - Add missing columns
-- ==============================================

-- Phone and Email (if not already added)
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS email text;

-- Next inspection date scheduling
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS next_inspection_date timestamptz;

-- Wings (for compatibility, though structure.wings is preferred)
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS wings jsonb DEFAULT '[]'::jsonb;

-- ==============================================
-- 2. INSPECTIONS TABLE - Add missing columns
-- ==============================================

-- AI-generated summary
ALTER TABLE public.inspections 
ADD COLUMN IF NOT EXISTS ai_summary text;

-- PDF report URL (for generated reports)
ALTER TABLE public.inspections 
ADD COLUMN IF NOT EXISTS pdf_url text;

-- ==============================================
-- 3. PROFILES TABLE - Add missing columns
-- ==============================================

-- Avatar URL (if users upload profile pictures)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Phone number for user profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone text;

-- ==============================================
-- 4. INDEXES for Performance
-- ==============================================

-- Client scheduling index
CREATE INDEX IF NOT EXISTS idx_clients_next_inspection_date 
ON public.clients(next_inspection_date) 
WHERE next_inspection_date IS NOT NULL;

-- Inspection AI summary search index (full-text search)
CREATE INDEX IF NOT EXISTS idx_inspections_ai_summary_search 
ON public.inspections USING gin(to_tsvector('english', COALESCE(ai_summary, ''))) 
WHERE ai_summary IS NOT NULL;

-- Inspection status filtering
CREATE INDEX IF NOT EXISTS idx_inspections_status 
ON public.inspections(status);

-- ==============================================
-- 5. DATA MIGRATION (if needed)
-- ==============================================

-- Migrate phone/email from structure.contact to root columns (if exists)
UPDATE public.clients
SET 
    phone = COALESCE(phone, structure->'contact'->>'phone'),
    email = COALESCE(email, structure->'contact'->>'email')
WHERE structure->'contact' IS NOT NULL 
  AND (phone IS NULL OR email IS NULL);

-- Done!
SELECT 'All missing columns have been added successfully!' as status;
