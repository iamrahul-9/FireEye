-- Enforce Strict Assignments & Visibility
-- Run in Supabase SQL Editor

-- 1. CLEANUP: Remove duplicate assignments (keep the most recent one)
-- This prevents the Unique Constraint from failing if duplicates exist
DELETE FROM public.client_assignments a USING public.client_assignments b
WHERE a.id < b.id AND a.client_id = b.client_id;

-- 2. CONSTRAINT: Ensure a Client can only be assigned to ONE Inspector
ALTER TABLE public.client_assignments
DROP CONSTRAINT IF EXISTS client_assignments_client_id_key; -- specific name might vary, simplified here

ALTER TABLE public.client_assignments
ADD CONSTRAINT client_assignments_client_id_unique UNIQUE (client_id);

-- 3. RLS FIX: Clients Table
-- Ensure only Assigned Clients are visible to Inspectors
DROP POLICY IF EXISTS "Inspectors view assigned clients" ON public.clients;

CREATE POLICY "Inspectors view assigned clients" ON public.clients
FOR SELECT
USING (
    -- Admin sees all (handled by separate admin policy, but for safety in this policy context?)
    -- No, keep separate. This policy is for Inspectors.
    EXISTS (
        SELECT 1 FROM public.client_assignments
        WHERE client_assignments.client_id = clients.id
        AND client_assignments.inspector_id = auth.uid()
    )
);

-- Ensure explicit Admin policy exists (re-run to be safe)
DROP POLICY IF EXISTS "Admins manage clients" ON public.clients;
CREATE POLICY "Admins manage clients" ON public.clients
FOR ALL USING (public.is_admin());

-- 4. RLS FIX: Cleanup "Everyone" or "Authenticated" leaks
DROP POLICY IF EXISTS "Everyone can view clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
-- If any other policies exist, they might be leaking. 
-- You can check active policies in Dashboard, but this covers standard naming.
