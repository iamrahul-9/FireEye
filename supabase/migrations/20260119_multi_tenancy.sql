-- Multi-Tenancy Architecture: Organization-Based Isolation
-- This migration adds organization-level data isolation to enable true SaaS multi-tenancy

-- 1. Create Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Organization RLS: Users can only see their own organization
CREATE POLICY "Users view own organization" ON public.organizations
FOR SELECT USING (
    id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Admins can update their organization
CREATE POLICY "Org owners manage organization" ON public.organizations
FOR ALL USING (
    owner_id = auth.uid() OR 
    id IN (
        SELECT organization_id FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 2. Add organization_id to all tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.client_assignments ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_inspections_organization_id ON public.inspections(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_organization_id ON public.client_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_organization_id ON public.notification_logs(organization_id);

-- 4. Create default organization for existing data (MIGRATION ONLY)
-- This groups all existing users/data into one org for backwards compatibility
DO $$
DECLARE
    default_org_id uuid;
    first_admin_id uuid;
BEGIN
    -- Find first admin (or any user) to be the owner
    SELECT id INTO first_admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
    
    -- If no admin exists, use any user
    IF first_admin_id IS NULL THEN
        SELECT id INTO first_admin_id FROM public.profiles LIMIT 1;
    END IF;
    
    -- Only create default org if there's existing data
    IF first_admin_id IS NOT NULL THEN
        INSERT INTO public.organizations (name, slug, owner_id)
        VALUES ('Default Organization', 'default', first_admin_id)
        ON CONFLICT (slug) DO NOTHING
        RETURNING id INTO default_org_id;
        
        -- If insert failed due to conflict, get the existing one
        IF default_org_id IS NULL THEN
            SELECT id INTO default_org_id FROM public.organizations WHERE slug = 'default';
        END IF;
        
        -- Assign all existing data to default organization
        UPDATE public.profiles SET organization_id = default_org_id WHERE organization_id IS NULL;
        UPDATE public.clients SET organization_id = default_org_id WHERE organization_id IS NULL;
        UPDATE public.inspections SET organization_id = default_org_id WHERE organization_id IS NULL;
        UPDATE public.client_assignments SET organization_id = default_org_id WHERE organization_id IS NULL;
        UPDATE public.notification_logs SET organization_id = default_org_id WHERE organization_id IS NULL;
    END IF;
END $$;

-- 5. Make organization_id NOT NULL (after migration)
-- We do this after assigning default org to ensure no nulls
ALTER TABLE public.profiles ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.clients ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.inspections ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.client_assignments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.notification_logs ALTER COLUMN organization_id SET NOT NULL;

-- 6. UPDATE ALL RLS POLICIES TO FILTER BY ORGANIZATION

-- PROFILES: Users only see profiles in their organization
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;

CREATE POLICY "Users view org profiles" ON public.profiles
FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins manage org profiles" ON public.profiles
FOR ALL USING (
    public.is_admin() AND 
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- CLIENTS: Scoped to organization
DROP POLICY IF EXISTS "Admins manage clients" ON public.clients;
DROP POLICY IF EXISTS "Inspectors view assigned clients" ON public.clients;

CREATE POLICY "Admins manage org clients" ON public.clients
FOR ALL USING (
    public.is_admin() AND 
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Inspectors view org assigned clients" ON public.clients
FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM public.client_assignments 
        WHERE client_id = clients.id AND inspector_id = auth.uid()
    )
);

-- INSPECTIONS: Scoped to organization
DROP POLICY IF EXISTS "Admins manage inspections" ON public.inspections;
DROP POLICY IF EXISTS "Inspectors view assigned client inspections" ON public.inspections;
DROP POLICY IF EXISTS "Inspectors manage assigned inspections" ON public.inspections;

CREATE POLICY "Admins manage org inspections" ON public.inspections
FOR ALL USING (
    public.is_admin() AND 
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Inspectors view org assigned inspections" ON public.inspections
FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM public.client_assignments 
        WHERE client_id = inspections.client_id AND inspector_id = auth.uid()
    )
);

CREATE POLICY "Inspectors manage org assigned inspections" ON public.inspections
FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM public.client_assignments 
        WHERE client_id = inspections.client_id AND inspector_id = auth.uid()
    )
);

CREATE POLICY "Inspectors update org assigned inspections" ON public.inspections
FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM public.client_assignments 
        WHERE client_id = inspections.client_id AND inspector_id = auth.uid()
    )
);

-- CLIENT_ASSIGNMENTS: Scoped to organization
DROP POLICY IF EXISTS "Admins manage assignments" ON public.client_assignments;
DROP POLICY IF EXISTS "Inspectors view own assignments" ON public.client_assignments;

CREATE POLICY "Admins manage org assignments" ON public.client_assignments
FOR ALL USING (
    public.is_admin() AND 
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Inspectors view org assignments" ON public.client_assignments
FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND inspector_id = auth.uid()
);

-- NOTIFICATION_LOGS: Scoped to organization
DROP POLICY IF EXISTS "Admins view all logs" ON public.notification_logs;

CREATE POLICY "Users view org notifications" ON public.notification_logs
FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins manage org notifications" ON public.notification_logs
FOR ALL USING (
    public.is_admin() AND 
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- 7. Helper function to get current user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_user_organization_id IS 'Returns the organization_id of the current authenticated user';
