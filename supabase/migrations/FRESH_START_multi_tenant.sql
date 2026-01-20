-- FireEye Complete Schema - Multi-Tenant Edition
-- This is a CLEAN SLATE migration - drops everything and rebuilds with organization isolation

-- 1. Drop all existing tables (clean slate)
DROP TABLE IF EXISTS public.notification_logs CASCADE;
DROP TABLE IF EXISTS public.client_assignments CASCADE;
DROP TABLE IF EXISTS public.inspections CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_organization_id() CASCADE;

-- 2. Create Organizations Table (Tenant Boundary)
CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    owner_id uuid, -- Will reference profiles.id, set after profile creation
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 3. Create Profiles Table (Users) WITH organization_id
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    full_name text,
    role text NOT NULL DEFAULT 'inspector' CHECK (role IN ('admin', 'inspector')),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create Clients Table WITH organization_id
CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    address text,
    type text CHECK (type IN ('Office/Store', 'Society/Residential')),
    structure jsonb DEFAULT '{}'::jsonb,
    wings jsonb DEFAULT '[]'::jsonb,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 5. Create Inspections Table WITH organization_id
CREATE TABLE public.inspections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    inspector_id uuid NOT NULL REFERENCES public.profiles(id),
    wing text,
    date timestamptz NOT NULL,
    status text DEFAULT 'Pending',
    compliance_score int DEFAULT 0,
    critical_issues_count int DEFAULT 0,
    findings jsonb DEFAULT '{}'::jsonb,
    next_inspection_date timestamptz,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- 6. Create Client Assignments WITH organization_id
CREATE TABLE public.client_assignments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    inspector_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_by uuid REFERENCES public.profiles(id),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(client_id) -- Ensure one client = one inspector
);

ALTER TABLE public.client_assignments ENABLE ROW LEVEL SECURITY;

-- 7. Create Notification Logs WITH organization_id
CREATE TABLE public.notification_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    type text NOT NULL,
    message text NOT NULL,
    actor_id uuid REFERENCES public.profiles(id),
    resource_id uuid,
    status text DEFAULT 'Unread',
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- 8. Add foreign key for owner_id (now profiles table exists)
ALTER TABLE public.organizations ADD CONSTRAINT organizations_owner_id_fkey 
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 9. Create Indexes for Performance
CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_clients_organization_id ON public.clients(organization_id);
CREATE INDEX idx_inspections_organization_id ON public.inspections(organization_id);
CREATE INDEX idx_inspections_client_id ON public.inspections(client_id);
CREATE INDEX idx_client_assignments_organization_id ON public.client_assignments(organization_id);
CREATE INDEX idx_client_assignments_inspector_id ON public.client_assignments(inspector_id);
CREATE INDEX idx_notification_logs_organization_id ON public.notification_logs(organization_id);

-- 10. Helper Function: Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- 11. Helper Function: Get current user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 12. RLS POLICIES - Organizations
CREATE POLICY "Users view own organization" ON public.organizations
FOR SELECT USING (
    id = public.get_user_organization_id()
);

CREATE POLICY "Org owners manage organization" ON public.organizations
FOR ALL USING (
    owner_id = auth.uid() OR public.is_admin()
);

-- 13. RLS POLICIES - Profiles
CREATE POLICY "Users view org profiles" ON public.profiles
FOR SELECT USING (
    organization_id = public.get_user_organization_id()
);

CREATE POLICY "Admins manage org profiles" ON public.profiles
FOR ALL USING (
    public.is_admin() AND organization_id = public.get_user_organization_id()
);

-- 14. RLS POLICIES - Clients
CREATE POLICY "Admins manage org clients" ON public.clients
FOR ALL USING (
    public.is_admin() AND organization_id = public.get_user_organization_id()
);

CREATE POLICY "Inspectors view assigned org clients" ON public.clients
FOR SELECT USING (
    organization_id = public.get_user_organization_id()
    AND EXISTS (
        SELECT 1 FROM public.client_assignments 
        WHERE client_id = clients.id AND inspector_id = auth.uid()
    )
);

-- 15. RLS POLICIES - Inspections
CREATE POLICY "Admins manage org inspections" ON public.inspections
FOR ALL USING (
    public.is_admin() AND organization_id = public.get_user_organization_id()
);

CREATE POLICY "Inspectors view org assigned inspections" ON public.inspections
FOR SELECT USING (
    organization_id = public.get_user_organization_id()
    AND EXISTS (
        SELECT 1 FROM public.client_assignments 
        WHERE client_id = inspections.client_id AND inspector_id = auth.uid()
    )
);

CREATE POLICY "Inspectors insert org assigned inspections" ON public.inspections
FOR INSERT WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND EXISTS (
        SELECT 1 FROM public.client_assignments 
        WHERE client_id = inspections.client_id AND inspector_id = auth.uid()
    )
);

CREATE POLICY "Inspectors update org assigned inspections" ON public.inspections
FOR UPDATE USING (
    organization_id = public.get_user_organization_id()
    AND EXISTS (
        SELECT 1 FROM public.client_assignments 
        WHERE client_id = inspections.client_id AND inspector_id = auth.uid()
    )
);

-- 16. RLS POLICIES - Client Assignments
CREATE POLICY "Admins manage org assignments" ON public.client_assignments
FOR ALL USING (
    public.is_admin() AND organization_id = public.get_user_organization_id()
);

CREATE POLICY "Inspectors view own assignments" ON public.client_assignments
FOR SELECT USING (
    organization_id = public.get_user_organization_id()
    AND inspector_id = auth.uid()
);

-- 17. RLS POLICIES - Notification Logs
CREATE POLICY "Users view org notifications" ON public.notification_logs
FOR SELECT USING (
    organization_id = public.get_user_organization_id()
);

CREATE POLICY "Admins manage org notifications" ON public.notification_logs
FOR ALL USING (
    public.is_admin() AND organization_id = public.get_user_organization_id()
);

-- 18. Auth Trigger: Auto-create organization and profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    new_org_id uuid;
    org_slug text;
BEGIN
    -- Generate unique slug from email
    org_slug := regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '-', 'g') 
                || '-' || substr(md5(NEW.id::text), 1, 6);
    
    -- Create new organization for this user
    INSERT INTO public.organizations (name, slug)
    VALUES (
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Organization',
        org_slug
    )
    RETURNING id INTO new_org_id;
    
    -- Create profile linked to the new organization
    INSERT INTO public.profiles (id, email, role, full_name, organization_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'admin'), -- First user is admin, or use metadata
        NEW.raw_user_meta_data->>'full_name',
        new_org_id
    );
    
    -- Set organization owner
    UPDATE public.organizations SET owner_id = NEW.id WHERE id = new_org_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- DONE! Database is now multi-tenant ready.
