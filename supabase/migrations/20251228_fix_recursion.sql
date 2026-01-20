-- FIX INFINITE RECURSION
-- Run this in Supabase Dashboard -> SQL Editor

-- 1. Create a secure function to check admin status without triggering RLS loops
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with owner privileges, bypassing RLS
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- 2. Update Profiles Policies to use the safe function
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins manage profiles" ON public.profiles;

-- Re-create with safe check
CREATE POLICY "Admins manage profiles" ON public.profiles
FOR ALL
USING (
  public.is_admin() 
  OR 
  id = auth.uid() -- Users can always manage themselves (or at least view, we refine this next)
);

-- Actually, let's split it for clarity and safety as per previous design:
-- Admin Access
CREATE POLICY "Admins full access" ON public.profiles
FOR ALL
USING (public.is_admin());

-- User View Access (Self)
-- Note: We don't need to drop "Users view own profile" if it's correct, but let's ensure it's clean.
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- 3. Update Other Tables (Clients, Inspections) to use the safe function too
-- This prevents recursion if they were also checking profiles table directly in their policies

DROP POLICY IF EXISTS "Admins manage clients" ON public.clients;
CREATE POLICY "Admins manage clients" ON public.clients
FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins manage inspections" ON public.inspections;
CREATE POLICY "Admins manage inspections" ON public.inspections
FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins manage logs" ON public.notification_logs;
CREATE POLICY "Admins manage logs" ON public.notification_logs
FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins view all logs" ON public.notification_logs;
DROP POLICY IF EXISTS "Admins can update logs" ON public.notification_logs;
-- (Legacy names cleanup)
