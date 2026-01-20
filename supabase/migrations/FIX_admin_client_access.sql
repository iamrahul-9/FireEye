-- Fix: Allow admins to SELECT all clients in their org (not just assigned ones)
-- The current policy requires client_assignments for both admins and inspectors

DROP POLICY IF EXISTS "Admins manage org clients" ON public.clients;
DROP POLICY IF EXISTS "Inspectors view assigned org clients" ON public.clients;

-- Admin policies: Full access to their organization's clients
CREATE POLICY "Admins view org clients" ON public.clients
FOR SELECT USING (
    public.is_admin() AND organization_id = public.get_user_organization_id()
);

CREATE POLICY "Admins insert org clients" ON public.clients
FOR INSERT WITH CHECK (
    public.is_admin() AND organization_id = public.get_user_organization_id()
);

CREATE POLICY "Admins update org clients" ON public.clients
FOR UPDATE USING (
    public.is_admin() AND organization_id = public.get_user_organization_id()
);

CREATE POLICY "Admins delete org clients" ON public.clients
FOR DELETE USING (
    public.is_admin() AND organization_id = public.get_user_organization_id()
);

-- Inspector policy: View only assigned clients
CREATE POLICY "Inspectors view assigned org clients" ON public.clients
FOR SELECT USING (
    NOT public.is_admin()
    AND organization_id = public.get_user_organization_id()
    AND EXISTS (
        SELECT 1 FROM public.client_assignments 
        WHERE client_id = clients.id AND inspector_id = auth.uid()
    )
);
