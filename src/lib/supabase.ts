import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

// =========================
// Existing Types
// =========================

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
  day_menu_name?: string | null;
  day_menu_image?: string | null;
  night_menu_name?: string | null;
  night_menu_image?: string | null;
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

export type FoodItem = {
  id: string;
  name: string;
  image_url: string;
  created_at: string;
};


// =========================
// New Feature Types
// =========================

export type MealRate = {
  id: string;
  hostel_id: string;
  effective_from: string;
  day_rate: number;
  night_rate: number;
  created_at: string;
};

export type MonthlyMealRate = {
  id: string;
  hostel_id: string;
  billing_month: string;
  total_bazar: number;
  total_meals: number;
  meal_rate: number;
  calculated_at: string;
};

export type MealPreference = {
  id: string;
  hostel_id: string;
  meal_id: string;
  meal_date: string;
  member_id: string;
  meal_time: 'day' | 'night';
  preferred_item: string;
  created_at: string;
  updated_at: string;
};

export type MonthlyCost = {
  id: string;
  hostel_id: string;
  billing_month: string;
  category: 'rent' | 'utility' | 'other';
  description: string;
  total_amount: number;
  distribution: 'equal' | 'custom';
  created_at: string;
  updated_at: string;
};

export type MonthlyCostAllocation = {
  id: string;
  cost_id: string;
  member_id: string;
  amount: number;
  created_at: string;
};

export type MemberDue = {
  id: string;
  member_id: string;
  hostel_id: string;
  billing_month: string;
  meal_charge: number;
  other_charge: number;
  previous_due: number;
  total_due: number;
  paid_amount: number;
  remaining_due: number;
  balance: number;
  advance_amount: number;
  status: 'due' | 'partial' | 'paid';
  created_at: string;
  updated_at: string;
};

export type PaymentTransaction = {
  id: string;
  member_id: string;
  hostel_id: string;
  due_id: string | null;
  amount: number;
  currency: string;
  payment_method: string;
  provider: string;
  transaction_id: string;
  gateway_transaction_id: string | null;
  validation_id: string | null;
  status:
    | 'pending'
    | 'paid'
    | 'failed'
    | 'cancelled';
  gateway_response?: Record<string, unknown> | null;
  notes?: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MessManagerLottery = {
  id: string;
  hostel_id: string;
  billing_month: string;
  member_id: string;
  created_at: string;
};