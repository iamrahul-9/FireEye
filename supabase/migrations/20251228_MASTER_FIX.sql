-- MASTER FIX SCRIPT
-- Run this in Supabase Dashboard -> SQL Editor

-- 1. FIX TRIGGERS (Ensures profiles are created)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'role', 'admin'), 
    COALESCE(new.raw_user_meta_data->>'full_name', 'System User')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. BACKFILL PROFILES (Fixes 'Fetch Error' for existing users)
INSERT INTO public.profiles (id, email, role, full_name)
SELECT 
    au.id, 
    au.email, 
    'admin', 
    COALESCE(au.raw_user_meta_data->>'full_name', 'System User')
FROM auth.users au
LEFT JOIN public.profiles pp ON au.id = pp.id
WHERE pp.id IS NULL;

-- 3. ENABLE RLS POLICIES (Fixes 'Permission Denied')
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile (Crucial for Dashboard check)
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());

-- Allow Admins to manage profiles
DROP POLICY IF EXISTS "Admins manage profiles" ON public.profiles;
CREATE POLICY "Admins manage profiles" ON public.profiles FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Allow Insert for Logs (Activity Feed)
DROP POLICY IF EXISTS "Users can insert logs" ON public.notification_logs;
CREATE POLICY "Users can insert logs" ON public.notification_logs FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow Admins to View/Update Logs
DROP POLICY IF EXISTS "Admins manage logs" ON public.notification_logs;
CREATE POLICY "Admins manage logs" ON public.notification_logs FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
