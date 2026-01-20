-- DEBUG: Check your current user role and organization

-- 1. Check if you're really an admin
SELECT 
    p.id,
    p.email,
    p.role,
    p.organization_id,
    o.name as org_name,
    o.slug as org_slug
FROM profiles p
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE p.id = auth.uid();

-- 2. Check if is_admin() function works
SELECT public.is_admin() as am_i_admin;

-- 3. Check if get_user_organization_id() works
SELECT public.get_user_organization_id() as my_org_id;

-- 4. Check your clients (what RLS returns)
SELECT id, name, organization_id FROM clients;

-- 5. Check all clients (bypassing RLS - only works if you run as supabase admin)
SELECT id, name, organization_id FROM clients LIMIT 5;

-- 6. Test the policy manually
SELECT 
    c.id,
    c.name,
    c.organization_id,
    public.is_admin() as is_admin,
    public.get_user_organization_id() as my_org,
    (c.organization_id = public.get_user_organization_id()) as org_match
FROM clients c
LIMIT 5;
