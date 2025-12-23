-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  role text not null check (role in ('admin', 'inspector', 'asset_manager')),
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Create assets table
create table public.assets (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  type text not null, -- e.g., 'Extinguisher', 'Hydrant', 'Panel'
  location text not null,
  client_name text, -- e.g. 'ABC Society'
  status text not null default 'Operational' check (status in ('Operational', 'Maintenance Needed', 'Critical Failure')),
  last_inspection_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.assets enable row level security;

-- Create inspections table
create table public.inspections (
  id uuid default uuid_generate_v4() primary key,
  asset_id uuid references public.assets(id) on delete cascade not null,
  inspector_id uuid references public.profiles(id) not null,
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  status text not null default 'Pending' check (status in ('Pending', 'Completed', 'Flagged')),
  findings jsonb default '{}'::jsonb, -- Store checklist results
  ai_summary text,
  report_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.inspections enable row level security;

-- POLICIES --

-- Profiles: Everyone can read their own profile.
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

-- Assets: Everyone can view assets. Only Admins/Asset Managers can insert/update.
create policy "Everyone can view assets" on public.assets
  for select using (true);

create policy "Admins and Asset Managers can manage assets" on public.assets
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and role in ('admin', 'asset_manager')
    )
  );

-- Inspections: Inspectors can create. Everyone can view.
create policy "Everyone can view inspections" on public.inspections
  for select using (true);

create policy "Inspectors can create inspections" on public.inspections
  for insert with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and role in ('admin', 'inspector')
    )
  );

create policy "Inspectors can update their own inspections" on public.inspections
  for update using (
    inspector_id = auth.uid()
  );

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, full_name)
  values (new.id, new.email, 'inspector', new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

  for each row execute procedure public.handle_new_user();


-- Create clients table
create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  address text not null,
  phone text,
  email text,
  client_type text check (client_type in ('Office', 'Society')),
  
  -- Structure (JSONB to be flexible)
  -- { basements: 2, podiums: 1, floors: 10, structure_map: ['B1', 'B2', 'G', 'P1', '1', ... 'Terrace'] }
  building_structure jsonb default '{}'::jsonb,
  
  -- Rooms (JSONB array)
  -- ['Lift Room', 'Meter Room', 'Server Room']
  rooms jsonb default '[]'::jsonb,
  
  -- Systems (JSONB array)
  -- ['Fire Alarm', 'Hydrant Valve']
  systems jsonb default '[]'::jsonb,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for clients
alter table public.clients enable row level security;

-- Policies for clients
create policy "Everyone can view clients" on public.clients
  for select using (true);

create policy "Admins can manage clients" on public.clients
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and role = 'admin'
    )
  );

-- Update inspections table to link to clients
alter table public.inspections 
add column if not exists client_id uuid references public.clients(id);

