-- Fix RLS Ambiguity for Inspections
-- Run this in Supabase Dashboard -> SQL Editor

-- 1. Fix Inspector Policy (Ambiguous client_id)
DROP POLICY IF EXISTS "Inspectors manage assigned inspections" ON public.inspections;

CREATE POLICY "Inspectors manage assigned inspections" ON public.inspections FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.client_assignments ca
        WHERE ca.client_id = inspections.client_id  -- Compare Inspection's Client ID with Assignment's Client ID
        AND ca.inspector_id = auth.uid()            -- Ensure Inspector ID matches current user
    )
);

-- 2. Ensure Admin Policy uses the safe function
DROP POLICY IF EXISTS "Admins manage inspections" ON public.inspections;

CREATE POLICY "Admins manage inspections" ON public.inspections FOR ALL USING (
    public.is_admin()
);

-- 3. Safety: Grant permissions just in case (though authenticated role usually has them)
GRANT ALL ON public.inspections TO authenticated;
