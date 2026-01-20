-- Add ai_summary column to inspections table
ALTER TABLE public.inspections 
ADD COLUMN IF NOT EXISTS ai_summary text;

-- Optional: Add index for searching AI summaries
CREATE INDEX IF NOT EXISTS idx_inspections_ai_summary 
ON public.inspections USING gin(to_tsvector('english', ai_summary)) 
WHERE ai_summary IS NOT NULL;
