-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_name text NOT NULL,
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  auth_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  auth_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  bazar_amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create meals table (with the menu columns included cleanly)
CREATE TABLE IF NOT EXISTS meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  date date NOT NULL,
  day_menu_name text,
  day_menu_image text,
  night_menu_name text,
  night_menu_image text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(hostel_id, date)
);

-- Create meal_records table
CREATE TABLE IF NOT EXISTS meal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  day_meal boolean DEFAULT false,
  night_meal boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(meal_id, member_id)
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL,
  date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create notices table
CREATE TABLE IF NOT EXISTS notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create food_items table
CREATE TABLE IF NOT EXISTS food_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_auth_id ON admins(auth_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_auth_id ON members(auth_id);
CREATE INDEX IF NOT EXISTS idx_members_hostel_id ON members(hostel_id);
CREATE INDEX IF NOT EXISTS idx_meals_hostel_id ON meals(hostel_id);
CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);
CREATE INDEX IF NOT EXISTS idx_meal_records_meal_id ON meal_records(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_records_member_id ON meal_records(member_id);
CREATE INDEX IF NOT EXISTS idx_expenses_hostel_id ON expenses(hostel_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_notices_hostel_id ON notices(hostel_id);

-- Enable Row Level Security
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;

---
--- RLS POLICIES
---

-- RLS Policies for admins table
CREATE POLICY "Admins can view own profile" ON admins FOR SELECT TO authenticated USING (auth.uid() = auth_id);
CREATE POLICY "Admins can update own profile" ON admins FOR UPDATE TO authenticated USING (auth.uid() = auth_id) WITH CHECK (auth.uid() = auth_id);
CREATE POLICY "Admins can insert own profile" ON admins FOR INSERT TO authenticated WITH CHECK (auth.uid() = auth_id);

-- RLS Policies for members table
CREATE POLICY "Admins can view their hostel members" ON members FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = members.hostel_id AND admins.auth_id = auth.uid()) OR auth.uid() = members.auth_id);
CREATE POLICY "Admins can insert members" ON members FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.id = members.hostel_id AND admins.auth_id = auth.uid()));
CREATE POLICY "Admins can update their hostel members" ON members FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = members.hostel_id AND admins.auth_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.id = members.hostel_id AND admins.auth_id = auth.uid()));
CREATE POLICY "Admins can delete their hostel members" ON members FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = members.hostel_id AND admins.auth_id = auth.uid()));

-- RLS Policies for meals table
CREATE POLICY "Users can view their hostel meals" ON meals FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = meals.hostel_id AND admins.auth_id = auth.uid()) OR EXISTS (SELECT 1 FROM members WHERE members.hostel_id = meals.hostel_id AND members.auth_id = auth.uid()));
CREATE POLICY "Admins can insert meals" ON meals FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.id = meals.hostel_id AND admins.auth_id = auth.uid()));
CREATE POLICY "Admins can update meals" ON meals FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = meals.hostel_id AND admins.auth_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.id = meals.hostel_id AND admins.auth_id = auth.uid()));
CREATE POLICY "Admins can delete meals" ON meals FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = meals.hostel_id AND admins.auth_id = auth.uid()));

-- RLS Policies for meal_records table
CREATE POLICY "Users can view their hostel meal records" ON meal_records FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM meals m JOIN admins a ON a.id = m.hostel_id WHERE m.id = meal_records.meal_id AND a.auth_id = auth.uid()) OR EXISTS (SELECT 1 FROM members WHERE members.id = meal_records.member_id AND members.auth_id = auth.uid()) OR EXISTS (SELECT 1 FROM meals m JOIN members mem ON mem.hostel_id = m.hostel_id WHERE m.id = meal_records.meal_id AND mem.auth_id = auth.uid()));
CREATE POLICY "Admins can insert meal records" ON meal_records FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM meals m JOIN admins a ON a.id = m.hostel_id WHERE m.id = meal_records.meal_id AND a.auth_id = auth.uid()));
CREATE POLICY "Members can update their own meal records" ON meal_records FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM members WHERE members.id = meal_records.member_id AND members.auth_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM members WHERE members.id = meal_records.member_id AND members.auth_id = auth.uid()));
CREATE POLICY "Admins can update meal records" ON meal_records FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM meals m JOIN admins a ON a.id = m.hostel_id WHERE m.id = meal_records.meal_id AND a.auth_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM meals m JOIN admins a ON a.id = m.hostel_id WHERE m.id = meal_records.meal_id AND a.auth_id = auth.uid()));
CREATE POLICY "Admins can delete meal records" ON meal_records FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM meals m JOIN admins a ON a.id = m.hostel_id WHERE m.id = meal_records.meal_id AND a.auth_id = auth.uid()));

-- RLS Policies for expenses table
CREATE POLICY "Users can view their hostel expenses" ON expenses FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = expenses.hostel_id AND admins.auth_id = auth.uid()) OR EXISTS (SELECT 1 FROM members WHERE members.hostel_id = expenses.hostel_id AND members.auth_id = auth.uid()));
CREATE POLICY "Admins can insert expenses" ON expenses FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.id = expenses.hostel_id AND admins.auth_id = auth.uid()));
CREATE POLICY "Admins can update expenses" ON expenses FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = expenses.hostel_id AND admins.auth_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.id = expenses.hostel_id AND admins.auth_id = auth.uid()));
CREATE POLICY "Admins can delete expenses" ON expenses FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = expenses.hostel_id AND admins.auth_id = auth.uid()));

-- RLS Policies for notices table
CREATE POLICY "Users can view their hostel notices" ON notices FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = notices.hostel_id AND admins.auth_id = auth.uid()) OR EXISTS (SELECT 1 FROM members WHERE members.hostel_id = notices.hostel_id AND members.auth_id = auth.uid()));
CREATE POLICY "Admins can insert notices" ON notices FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.id = notices.hostel_id AND admins.auth_id = auth.uid()));
CREATE POLICY "Admins can update notices" ON notices FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = notices.hostel_id AND admins.auth_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.id = notices.hostel_id AND admins.auth_id = auth.uid()));
CREATE POLICY "Admins can delete notices" ON notices FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = notices.hostel_id AND admins.auth_id = auth.uid()));

-- RLS Policies for food_items table
CREATE POLICY "Authenticated users can view food items" ON food_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert food items" ON food_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can insert food items"
  ON food_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.auth_id = auth.uid()
    )
  );

ALTER TABLE food_items
ADD COLUMN IF NOT EXISTS details text;

INSERT INTO food_items (name, details, image_url)
VALUES
('Alu Bhorta','Traditional mashed potato dish','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/alu%20bhorta%20bangladesh.png'),

('Polao Rice','Bangladeshi aromatic polao rice','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/bangladeshi%20polao%20rice.jpg'),

('Beef Bhuri Curry','Traditional beef tripe curry','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/beef%20bhuri%20curry%20bangladesh.jpg'),

('Beef Curry','Spicy Bangladeshi beef curry','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/beef%20curry%20bangladesh.jpg'),

('Beef Tehari','Traditional beef tehari','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/beef%20tehari%20bangladesh.jpg'),

('Beef Kala Bhuna','Traditional kala bhuna beef','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/beef%20kala%20bhuna%20traditional.jpg'),

('Bhuna Khichuri','Special bhuna khichuri','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/bhuna%20khichuri%20bangladesh.jpg'),

('Chicken Biryani','Chicken biryani with spices','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/chicken%20biryani%20plate.jpg'),

('Chicken Curry','Bangladeshi style chicken curry','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/chicken%20curry%20bangladeshi%20style.jpg'),

('Chicken Korma','Creamy chicken korma','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/chicken%20korma%20curry.jpg'),

('Chicken Roast','Wedding style chicken roast','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/chicken%20roast%20bangladesh%20wedding.jpg'),

('Choto Mach Chorchori','Small fish mixed curry','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/choto%20mach%20chorchori%20bangladesh.jpg'),

('Fried Chicken','Crispy fried chicken pieces','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/crispy%20fried%20chicken%20pieces.jpg'),

('Egg Curry','Traditional egg curry','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/egg%20curry%20bangladesh.jpg'),

('Ilish Fry','Fried hilsa fish','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/ilish%20fish%20fry.jpg'),

('Korola Bhaji','Bitter gourd fry','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/korola%20bhaji%20bitter%20gourd%20fry.png'),

('Lal Shak Bhaji','Red spinach fry','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/lal%20shak%20bhaji.png'),

('Masoor Dal','Lentil soup','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/masoor%20dal%20soup.jpg'),

('Mixed Vegetable Curry','Healthy mixed vegetables','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/mixed%20vegetable%20curry.jpg'),

('Moong Dal','Moong dal curry','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/moong%20dal%20curry.jpg'),

('Pabda Fish Curry','Traditional pabda fish curry','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/pabda%20fish%20curry.jpg'),

('Pangas Fish Curry','Pangas fish curry','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/pangas%20fish%20curry.jpg'),

('Paratha','Fried paratha bread','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/paratha%20fried.png'),

('White Rice','Plain white rice','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/plain%20white%20rice%20plate.jpg'),

('Roti','Chapati bread','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/roti%20chapati%20bread.png'),

('Rui Fish Curry','Rui fish curry','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/rui%20fish%20curry%20bangladesh.jpg'),

('Shutki Bhorta','Traditional dried fish mash','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/shutki%20bhorta.png'),

('Omelette','Simple egg omelette','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/simple%20omelette%20egg.jpg'),

('Tilapia Fry','Crispy fried tilapia','https://pwlucglqqmjugvzzuiep.supabase.co/storage/v1/object/public/food-items/tilapia%20fry%20crispy.jpg');

