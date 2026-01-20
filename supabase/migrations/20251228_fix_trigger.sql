-- 1. Create the Trigger (was missing previously)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Retroactive Fix: Insert profiles for any users who signed up while the trigger was missing
INSERT INTO public.profiles (id, email, role, full_name)
SELECT 
    au.id, 
    au.email, 
    'admin', -- Defaulting to admin for now as requested for new signups
    COALESCE(au.raw_user_meta_data->>'full_name', 'System User')
FROM auth.users au
LEFT JOIN public.profiles pp ON au.id = pp.id
WHERE pp.id IS NULL;
