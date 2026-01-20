
-- Enable RLS on profiles if not already
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow Admins to View All Profiles
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Allow Admins to Update Profiles (including Roles)
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Note: Users can usually view their own profile.
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (
    id = auth.uid()
);

-- Users can update own profile (but NOT role, handled by trigger/admin typically, 
-- but RLS checks the NEW row or we can use column privileges.
-- For simplicity: Allow update, but UI shouldn't expose Role field for non-admins.
-- Better security: TRIGGER to prevent role change by non-admin, or separate RLS.
-- Since we control the UI, we'll rely on "Admins update profiles" for Role changes.
-- If a user tries to update their own role via API, it might succeed if we have "Users update own profile".
-- Let's NOT add "Users update own profile" for this phase unless needed for settings.)
