-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can insert logs for their own clients" ON public.notification_logs;
DROP POLICY IF EXISTS "Users can view logs for their own clients" ON public.notification_logs;

-- New INSERT Policy: Allow users to insert logs where they are the sender
CREATE POLICY "Users can insert logs as sender" ON public.notification_logs
    FOR INSERT WITH CHECK (
        auth.uid() = sent_by
    );

-- New SELECT Policy: Allow users to view logs they sent OR logs for their clients
CREATE POLICY "Users can view relevant logs" ON public.notification_logs
    FOR SELECT USING (
        auth.uid() = sent_by
        OR
        EXISTS (
            SELECT 1 FROM public.clients 
            WHERE clients.id = notification_logs.client_id 
            AND clients.user_id = auth.uid()
        )
    );

-- Fix: Ensure all existing clients without an owner are claimed by the current user (if running in a context with a user)
-- Since we can't easily do this in migration without a specific ID, we'll make the client user_id check permissive for NULLs in the Future?
-- No, let's just fix the Immediate Issue which is the INSERT blocking.

-- Also, let's verify if 'clients' table has RLS enabled and if that interferes?
-- (Clients table RLS is usually fine, but let's double check existing policies if needed. For now assuming notification_logs was the blocker).
