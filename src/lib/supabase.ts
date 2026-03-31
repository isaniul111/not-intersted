import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Admin = {
  id: string;
  hostel_name: string;
  full_name: string;
  email: string;
  auth_id: string;
  created_at: string;
};

export type Member = {
  id: string;
  hostel_id: string;
  name: string;
  email: string;
  auth_id: string;
  bazar_amount: number;
  created_at: string;
};

export type Meal = {
  id: string;
  hostel_id: string;
  date: string;
  created_at: string;
};

export type MealRecord = {
  id: string;
  meal_id: string;
  member_id: string;
  day_meal: boolean;
  night_meal: boolean;
  created_at: string;
};

export type Expense = {
  id: string;
  hostel_id: string;
  description: string;
  amount: number;
  date: string;
  created_at: string;
};

export type Notice = {
  id: string;
  hostel_id: string;
  title: string;
  message: string;
  created_at: string;
};
