-- Add next_inspection_date to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS next_inspection_date timestamp with time zone;

-- Comment on column
COMMENT ON COLUMN public.clients.next_inspection_date IS 'Scheduled date for the next inspection. calculated automatically or set by admin.';
