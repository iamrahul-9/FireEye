-- Enable RLS on Clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Policy: View Own Clients
CREATE POLICY "Users can view own clients" ON public.clients
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Insert Own Clients
CREATE POLICY "Users can insert own clients" ON public.clients
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Update Own Clients
CREATE POLICY "Users can update own clients" ON public.clients
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Delete Own Clients
CREATE POLICY "Users can delete own clients" ON public.clients
    FOR DELETE USING (auth.uid() = user_id);


-- Enable RLS on Inspections (Inherit from Client)
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- Policy: View Own Inspections
CREATE POLICY "Users can view own inspections" ON public.inspections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.clients 
            WHERE clients.id = inspections.client_id 
            AND clients.user_id = auth.uid()
        )
    );

-- Policy: Insert Own Inspections
CREATE POLICY "Users can insert own inspections" ON public.inspections
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.clients 
            WHERE clients.id = inspections.client_id 
            AND clients.user_id = auth.uid()
        )
    );

-- Policy: Update Own Inspections
CREATE POLICY "Users can update own inspections" ON public.inspections
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.clients 
            WHERE clients.id = inspections.client_id 
            AND clients.user_id = auth.uid()
        )
    );
