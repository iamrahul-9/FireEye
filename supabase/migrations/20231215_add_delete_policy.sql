-- Allow admins to delete inspections
CREATE POLICY "Admins can delete inspections" ON public.inspections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND role = 'admin'
    )
  );
