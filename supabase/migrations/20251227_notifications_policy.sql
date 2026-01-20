
-- 1. Enable Insert for Authenticated Users (for logging activities)
CREATE POLICY "Users can insert logs" ON public.notification_logs FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'); 
-- Note: We allow any auth user to insert logs (e.g. "I did X"). 
-- Ideally strict: actor_id = auth.uid(), but for system events we might need flexibility.

-- 2. Enable Update for Admins (Approve/Deny)
CREATE POLICY "Admins can update logs" ON public.notification_logs FOR UPDATE
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 3. Enable Select for Users (View their own logs? Or strictly Admins?)
-- Current policy is Admin only. Let's keep it Admin only for the "Feed", 
-- but maybe Users need to see their own "Notifications"?
-- Adding policy for users to see logs directed to them (recipient).
-- We don't have a 'recipient_user_id' column, only 'recipient' (email).
-- We'll rely on Admin View for the "Activity Feed". 
