/*
  # Hostel Management System Database Schema

  ## Overview
  This migration creates the complete database structure for a hostel mess management system
  with two user roles: Admin (Manager) and User (Mess Member).

  ## 1. New Tables

  ### `admins`
  - `id` (uuid, primary key) - Auto-generated admin ID
  - `hostel_name` (text) - Name of the hostel
  - `full_name` (text) - Admin's full name
  - `email` (text, unique) - Admin email for login
  - `auth_id` (uuid, foreign key) - Links to Supabase auth.users
  - `created_at` (timestamptz) - Account creation timestamp

  ### `members`
  - `id` (uuid, primary key) - Auto-generated member ID
  - `hostel_id` (uuid, foreign key) - References admins table
  - `name` (text) - Member's name
  - `email` (text, unique) - Member email for login
  - `auth_id` (uuid, foreign key) - Links to Supabase auth.users
  - `bazar_amount` (numeric, default 0) - Monthly bazar contribution
  - `created_at` (timestamptz) - Account creation timestamp

  ### `meals`
  - `id` (uuid, primary key) - Auto-generated meal record ID
  - `hostel_id` (uuid, foreign key) - References admins table
  - `date` (date) - Date of the meal
  - `created_at` (timestamptz) - Record creation timestamp

  ### `meal_records`
  - `id` (uuid, primary key) - Auto-generated record ID
  - `meal_id` (uuid, foreign key) - References meals table
  - `member_id` (uuid, foreign key) - References members table
  - `day_meal` (boolean, default false) - Did member take day meal
  - `night_meal` (boolean, default false) - Did member take night meal
  - `created_at` (timestamptz) - Record creation timestamp

  ### `expenses`
  - `id` (uuid, primary key) - Auto-generated expense ID
  - `hostel_id` (uuid, foreign key) - References admins table
  - `description` (text) - Expense description (gas, electricity, rent, etc.)
  - `amount` (numeric) - Expense amount
  - `date` (date) - Date of expense
  - `created_at` (timestamptz) - Record creation timestamp

  ### `notices`
  - `id` (uuid, primary key) - Auto-generated notice ID
  - `hostel_id` (uuid, foreign key) - References admins table
  - `title` (text) - Notice title
  - `message` (text) - Notice content
  - `created_at` (timestamptz) - Notice creation timestamp

  ## 2. Security
  - Enable Row Level Security (RLS) on all tables
  - Admins can only access their own hostel data
  - Members can only access their own hostel data
  - Members have read-only access to meals and notices
  - Members can update their own meal records

  ## 3. Indexes
  - Index on email fields for faster authentication lookups
  - Index on foreign keys for faster joins
  - Index on date fields for meal and expense queries
*/

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

-- Create meals table
CREATE TABLE IF NOT EXISTS meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  date date NOT NULL,
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

-- RLS Policies for admins table
CREATE POLICY "Admins can view own profile"
  ON admins FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_id);

CREATE POLICY "Admins can update own profile"
  ON admins FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

CREATE POLICY "Admins can insert own profile"
  ON admins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_id);

-- RLS Policies for members table
CREATE POLICY "Admins can view their hostel members"
  ON members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = members.hostel_id
      AND admins.auth_id = auth.uid()
    )
    OR auth.uid() = members.auth_id
  );

CREATE POLICY "Admins can insert members"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = members.hostel_id
      AND admins.auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update their hostel members"
  ON members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = members.hostel_id
      AND admins.auth_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = members.hostel_id
      AND admins.auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete their hostel members"
  ON members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = members.hostel_id
      AND admins.auth_id = auth.uid()
    )
  );

-- RLS Policies for meals table
CREATE POLICY "Users can view their hostel meals"
  ON meals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = meals.hostel_id
      AND admins.auth_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM members
      WHERE members.hostel_id = meals.hostel_id
      AND members.auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert meals"
  ON meals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = meals.hostel_id
      AND admins.auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update meals"
  ON meals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = meals.hostel_id
      AND admins.auth_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = meals.hostel_id
      AND admins.auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete meals"
  ON meals FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = meals.hostel_id
      AND admins.auth_id = auth.uid()
    )
  );

-- RLS Policies for meal_records table
CREATE POLICY "Users can view their hostel meal records"
  ON meal_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meals m
      JOIN admins a ON a.id = m.hostel_id
      WHERE m.id = meal_records.meal_id
      AND a.auth_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM members
      WHERE members.id = meal_records.member_id
      AND members.auth_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM meals m
      JOIN members mem ON mem.hostel_id = m.hostel_id
      WHERE m.id = meal_records.meal_id
      AND mem.auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert meal records"
  ON meal_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meals m
      JOIN admins a ON a.id = m.hostel_id
      WHERE m.id = meal_records.meal_id
      AND a.auth_id = auth.uid()
    )
  );

CREATE POLICY "Members can update their own meal records"
  ON meal_records FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = meal_records.member_id
      AND members.auth_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.id = meal_records.member_id
      AND members.auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update meal records"
  ON meal_records FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meals m
      JOIN admins a ON a.id = m.hostel_id
      WHERE m.id = meal_records.meal_id
      AND a.auth_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meals m
      JOIN admins a ON a.id = m.hostel_id
      WHERE m.id = meal_records.meal_id
      AND a.auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete meal records"
  ON meal_records FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meals m
      JOIN admins a ON a.id = m.hostel_id
      WHERE m.id = meal_records.meal_id
      AND a.auth_id = auth.uid()
    )
  );

-- RLS Policies for expenses table
CREATE POLICY "Users can view their hostel expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = expenses.hostel_id
      AND admins.auth_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM members
      WHERE members.hostel_id = expenses.hostel_id
      AND members.auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = expenses.hostel_id
      AND admins.auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = expenses.hostel_id
      AND admins.auth_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = expenses.hostel_id
      AND admins.auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = expenses.hostel_id
      AND admins.auth_id = auth.uid()
    )
  );

-- RLS Policies for notices table
CREATE POLICY "Users can view their hostel notices"
  ON notices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = notices.hostel_id
      AND admins.auth_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM members
      WHERE members.hostel_id = notices.hostel_id
      AND members.auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert notices"
  ON notices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = notices.hostel_id
      AND admins.auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update notices"
  ON notices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = notices.hostel_id
      AND admins.auth_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = notices.hostel_id
      AND admins.auth_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete notices"
  ON notices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = notices.hostel_id
      AND admins.auth_id = auth.uid()
    )
  );