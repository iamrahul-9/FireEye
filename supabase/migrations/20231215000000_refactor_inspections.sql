-- Drop assets table and any related objects
DROP TABLE IF EXISTS public.assets CASCADE;

-- Update inspections table structure
ALTER TABLE public.inspections 
    DROP COLUMN IF EXISTS asset_id,
    ADD COLUMN IF NOT EXISTS compliance_score integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS critical_issues_count integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone;

-- Update status constraint
ALTER TABLE public.inspections DROP CONSTRAINT IF EXISTS inspections_status_check;

-- Backfill invalid statuses before applying new constraint
UPDATE public.inspections SET status = 'Draft' WHERE status = 'Pending';
UPDATE public.inspections SET status = 'Action Required' WHERE status = 'Flagged';
UPDATE public.inspections SET status = 'Completed' WHERE status NOT IN ('Draft', 'Completed', 'Action Required');

ALTER TABLE public.inspections 
    ADD CONSTRAINT inspections_status_check 
    CHECK (status IN ('Draft', 'Completed', 'Action Required'));
