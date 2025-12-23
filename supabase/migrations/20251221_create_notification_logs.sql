-- Add user_id to clients for Private Workspace isolation
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);

-- Create notification_logs table
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    inspection_id uuid REFERENCES public.inspections(id) ON DELETE SET NULL,
    type text NOT NULL CHECK (type IN ('Manual Reminder', 'Upcoming Inspection', 'Urgent Action', 'Report Generated')),
    recipient text NOT NULL, -- Email or 'System'
    sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- Null if system generated
    message text,
    status text DEFAULT 'Sent'
);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view logs for their own clients" ON public.notification_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.clients 
            WHERE clients.id = notification_logs.client_id 
            AND clients.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert logs for their own clients" ON public.notification_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.clients 
            WHERE clients.id = notification_logs.client_id 
            AND clients.user_id = auth.uid()
        )
    );

-- Indexes for performance
CREATE INDEX idx_notification_logs_client_id ON public.notification_logs(client_id);
CREATE INDEX idx_notification_logs_created_at ON public.notification_logs(created_at DESC);
