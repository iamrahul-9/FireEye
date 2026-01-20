-- Add next_inspection_date column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS next_inspection_date timestamptz;

-- Optional: Create index for performance
CREATE INDEX IF NOT EXISTS idx_clients_next_inspection_date 
ON public.clients(next_inspection_date) 
WHERE next_inspection_date IS NOT NULL;
