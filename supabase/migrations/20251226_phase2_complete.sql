    -- Phase 2: Complete Architecture Reset & Upgrade

    -- 0. Clean Slate (Caution: Deletes all data)
    TRUNCATE TABLE public.inspections, public.clients, public.profiles CASCADE;

    -- 1. Update Profiles Trigger (Default to Admin for new public signups)
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger AS $$
    BEGIN
    -- Default to 'admin' so the first user is an Admin.
    -- Subsequent Inspector users created via Admin Console will be handled separately (or manually inserted into profiles with 'inspector' role).
    INSERT INTO public.profiles (id, email, role, full_name)
    VALUES (new.id, new.email, 'admin', new.raw_user_meta_data->>'full_name');
    RETURN new;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- 2. Add Wings to Clients
    ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS wings jsonb DEFAULT '[]'::jsonb;

    -- 3. Add Wing to Inspections
    ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS wing text;

    -- 4. Create Notification Logs (for Activity Tab & Approval)
    CREATE TABLE IF NOT EXISTS public.notification_logs (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
        type text NOT NULL, -- 'Client Added', 'Inspection Scheduled', 'Report Generated'
        message text NOT NULL,
        actor_id uuid REFERENCES public.profiles(id),
        resource_id uuid, -- ID of the client, inspection, etc.
        status text DEFAULT 'Unread', -- 'Unread', 'Read', 'Approved', 'Denied'
        created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
    );
    ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Admins view all logs" ON public.notification_logs FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

    -- 5. Client Assignments Table (Link Inspector <-> Client)
    CREATE TABLE IF NOT EXISTS public.client_assignments (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
        client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
        inspector_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
        assigned_by uuid REFERENCES public.profiles(id),
        created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
        UNIQUE(client_id, inspector_id)
    );
    ALTER TABLE public.client_assignments ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Admins manage assignments" ON public.client_assignments FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

    CREATE POLICY "Inspectors view own assignments" ON public.client_assignments FOR SELECT USING (
        inspector_id = auth.uid()
    );

    -- 6. Strict RLS for Clients (Inspectors see only assigned)
    DROP POLICY IF EXISTS "Everyone can view clients" ON public.clients;
    DROP POLICY IF EXISTS "Admins can manage clients" ON public.clients;

    -- Admin Policy: Full Access
    CREATE POLICY "Admins manage clients" ON public.clients FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

    -- Inspector Policy: View Only Assigned
    CREATE POLICY "Inspectors view assigned clients" ON public.clients FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.client_assignments 
            WHERE client_id = clients.id AND inspector_id = auth.uid()
        )
    );

    -- 7. Strict RLS for Inspections (Inspectors see only for assigned clients)
    DROP POLICY IF EXISTS "Everyone can view inspections" ON public.inspections;
    DROP POLICY IF EXISTS "Inspectors can create inspections" ON public.inspections;
    DROP POLICY IF EXISTS "Inspectors can update their own inspections" ON public.inspections;

    -- Admin Policy: Full Access
    CREATE POLICY "Admins manage inspections" ON public.inspections FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

    -- Inspector Policy: View Assigned Client Inspections
    CREATE POLICY "Inspectors view assigned client inspections" ON public.inspections FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.client_assignments 
            WHERE client_id = inspections.client_id AND inspector_id = auth.uid()
        )
    );

    -- Inspector Policy: Create/Update Inspections for Assigned Clients
    CREATE POLICY "Inspectors manage assigned inspections" ON public.inspections FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.client_assignments 
            WHERE client_id = client_id AND inspector_id = auth.uid()
        )
    );
