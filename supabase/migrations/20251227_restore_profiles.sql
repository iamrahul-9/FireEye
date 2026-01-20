-- RESTORE PROFILES FROM AUTH
-- This script repopulates the public.profiles table using existing users in auth.users.
-- Run this if you ran TRUNCATE on profiles but still have users in the Auth system.

INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', 'System Admin'),
    'admin' -- Defaulting everyone to Admin to ensure you can access the dashboard
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET role = 'admin'; -- Ensure existing profiles are promoted to admin if they exist

-- Note: This ensures RLS policies (which check profiles.role) will pass.
