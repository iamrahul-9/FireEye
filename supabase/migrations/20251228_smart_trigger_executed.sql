CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Check if a role is specified in user_metadata, otherwise default to 'admin'
  -- This allows creating 'inspector' users via Admin Console while keeping public signups as 'admin'
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'role', 'admin'), 
    COALESCE(new.raw_user_meta_data->>'full_name', 'System User')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
