-- Update handle_new_user trigger to create organization for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    new_org_id uuid;
    org_slug text;
BEGIN
    -- Generate unique slug from email
    org_slug := regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9]', '-', 'g') || '-' || substr(md5(new.id::text), 1, 6);
    
    -- Create new organization for this user
    INSERT INTO public.organizations (name, slug, owner_id)
    VALUES (
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)) || '''s Organization',
        org_slug,
        new.id
    )
    RETURNING id INTO new_org_id;
    
    -- Create profile linked to the new organization
    INSERT INTO public.profiles (id, email, role, full_name, organization_id)
    VALUES (
        new.id,
        new.email,
        'admin', -- First user in an org is admin
        new.raw_user_meta_data->>'full_name',
        new_org_id
    );
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger is attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
