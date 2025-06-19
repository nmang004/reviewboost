-- Create users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('employee', 'business_owner')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  job_type TEXT NOT NULL,
  has_photo BOOLEAN DEFAULT FALSE,
  keywords TEXT NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create points table
CREATE TABLE public.points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_reviews_employee_id ON public.reviews(employee_id);
CREATE INDEX idx_reviews_created_at ON public.reviews(created_at DESC);
CREATE INDEX idx_points_employee_id ON public.points(employee_id);
CREATE INDEX idx_points_points ON public.points(points DESC);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view all users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for reviews table
CREATE POLICY "Employees can create their own reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Everyone can view reviews" ON public.reviews
  FOR SELECT USING (true);

-- RLS Policies for points table
CREATE POLICY "Everyone can view points" ON public.points
  FOR SELECT USING (true);

CREATE POLICY "System can manage points" ON public.points
  FOR ALL USING (true);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update points timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update points timestamp
CREATE TRIGGER update_points_updated_at BEFORE UPDATE ON public.points
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert demo data
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('11111111-1111-1111-1111-111111111111', 'owner@demo.com', '{"name": "Demo Owner", "role": "business_owner"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'employee@demo.com', '{"name": "John Employee", "role": "employee"}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', 'jane@demo.com', '{"name": "Jane Worker", "role": "employee"}'::jsonb);

-- Note: In production, you'll need to set passwords for these users through Supabase Auth