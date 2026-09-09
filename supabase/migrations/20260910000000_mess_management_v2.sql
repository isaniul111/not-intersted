-- ============================================================
-- Mess Management System V2 Upgrade - FIXED VERSION
-- Run AFTER 20260908160000_payment_and_meal_preferences.sql
--
-- Fixes:
-- 1. Existing member_payment_summary view conflict
-- 2. Monthly meal rate calculation
-- 3. Monthly cost distribution
-- 4. Positive due / negative advance
-- 5. Previous balance / advance carry-forward
-- 6. Payment amounts above current due
-- 7. Google account linking
-- 8. Manager lottery
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 1) MEAL PREFERENCES
-- ============================================================

CREATE TABLE IF NOT EXISTS meal_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  hostel_id uuid NOT NULL
    REFERENCES admins(id) ON DELETE CASCADE,

  meal_id uuid NOT NULL
    REFERENCES meals(id) ON DELETE CASCADE,

  meal_date date NOT NULL,

  member_id uuid NOT NULL
    REFERENCES members(id) ON DELETE CASCADE,

  meal_time text NOT NULL
    CHECK (meal_time IN ('day', 'night')),

  preferred_item text NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(meal_id, member_id, meal_time)
);

CREATE INDEX IF NOT EXISTS
idx_meal_preferences_hostel_date
ON meal_preferences(hostel_id, meal_date);

ALTER TABLE meal_preferences ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS
"Members and admins can view hostel preferences"
ON meal_preferences;

CREATE POLICY
"Members and admins can view hostel preferences"
ON meal_preferences
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM admins a
    WHERE a.id = meal_preferences.hostel_id
      AND a.auth_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1
    FROM members m
    WHERE m.hostel_id = meal_preferences.hostel_id
      AND m.auth_id = auth.uid()
  )
);


DROP POLICY IF EXISTS
"Members can insert own preferences"
ON meal_preferences;

CREATE POLICY
"Members can insert own preferences"
ON meal_preferences
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM members m
    WHERE m.id = meal_preferences.member_id
      AND m.hostel_id = meal_preferences.hostel_id
      AND m.auth_id = auth.uid()
  )
);


DROP POLICY IF EXISTS
"Members can update own preferences"
ON meal_preferences;

CREATE POLICY
"Members can update own preferences"
ON meal_preferences
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM members m
    WHERE m.id = meal_preferences.member_id
      AND m.auth_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1
    FROM admins a
    WHERE a.id = meal_preferences.hostel_id
      AND a.auth_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM members m
    WHERE m.id = meal_preferences.member_id
      AND m.hostel_id = meal_preferences.hostel_id
      AND m.auth_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1
    FROM admins a
    WHERE a.id = meal_preferences.hostel_id
      AND a.auth_id = auth.uid()
  )
);


DROP POLICY IF EXISTS
"Members can delete own preferences"
ON meal_preferences;

CREATE POLICY
"Members can delete own preferences"
ON meal_preferences
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM members m
    WHERE m.id = meal_preferences.member_id
      AND m.auth_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1
    FROM admins a
    WHERE a.id = meal_preferences.hostel_id
      AND a.auth_id = auth.uid()
  )
);


-- ============================================================
-- 2) EXPENSE CATEGORY
-- ============================================================

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'bazar';

ALTER TABLE expenses
DROP CONSTRAINT IF EXISTS expenses_category_check;

ALTER TABLE expenses
ADD CONSTRAINT expenses_category_check
CHECK (
  category IN ('bazar', 'utility', 'other')
);


-- ============================================================
-- 3) MONTHLY COSTS
-- ============================================================

CREATE TABLE IF NOT EXISTS monthly_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  hostel_id uuid NOT NULL
    REFERENCES admins(id) ON DELETE CASCADE,

  billing_month date NOT NULL,

  category text NOT NULL
    CHECK (category IN ('rent', 'utility', 'other')),

  description text NOT NULL,

  total_amount numeric(12,2) NOT NULL
    CHECK (total_amount >= 0),

  distribution text NOT NULL DEFAULT 'equal'
    CHECK (distribution IN ('equal', 'custom')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS monthly_cost_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  cost_id uuid NOT NULL
    REFERENCES monthly_costs(id) ON DELETE CASCADE,

  member_id uuid NOT NULL
    REFERENCES members(id) ON DELETE CASCADE,

  amount numeric(12,2) NOT NULL DEFAULT 0
    CHECK (amount >= 0),

  UNIQUE(cost_id, member_id)
);


CREATE INDEX IF NOT EXISTS
idx_monthly_costs_hostel_month
ON monthly_costs(hostel_id, billing_month);


CREATE INDEX IF NOT EXISTS
idx_monthly_cost_allocations_member
ON monthly_cost_allocations(member_id);


ALTER TABLE monthly_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_cost_allocations ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS
"Hostel users can view monthly costs"
ON monthly_costs;

CREATE POLICY
"Hostel users can view monthly costs"
ON monthly_costs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM admins a
    WHERE a.id = monthly_costs.hostel_id
      AND a.auth_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1
    FROM members m
    WHERE m.hostel_id = monthly_costs.hostel_id
      AND m.auth_id = auth.uid()
  )
);


DROP POLICY IF EXISTS
"Admins manage monthly costs"
ON monthly_costs;

CREATE POLICY
"Admins manage monthly costs"
ON monthly_costs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM admins a
    WHERE a.id = monthly_costs.hostel_id
      AND a.auth_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM admins a
    WHERE a.id = monthly_costs.hostel_id
      AND a.auth_id = auth.uid()
  )
);


DROP POLICY IF EXISTS
"Hostel users view allocations"
ON monthly_cost_allocations;

CREATE POLICY
"Hostel users view allocations"
ON monthly_cost_allocations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM monthly_costs c
    JOIN admins a
      ON a.id = c.hostel_id
    WHERE c.id = monthly_cost_allocations.cost_id
      AND a.auth_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1
    FROM monthly_costs c
    JOIN members m
      ON m.hostel_id = c.hostel_id
    WHERE c.id = monthly_cost_allocations.cost_id
      AND m.auth_id = auth.uid()
  )
);


DROP POLICY IF EXISTS
"Admins manage allocations"
ON monthly_cost_allocations;

CREATE POLICY
"Admins manage allocations"
ON monthly_cost_allocations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM monthly_costs c
    JOIN admins a
      ON a.id = c.hostel_id
    WHERE c.id = monthly_cost_allocations.cost_id
      AND a.auth_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM monthly_costs c
    JOIN admins a
      ON a.id = c.hostel_id
    WHERE c.id = monthly_cost_allocations.cost_id
      AND a.auth_id = auth.uid()
  )
);


-- ============================================================
-- 4) MONTHLY MEAL RATE
-- ============================================================

CREATE TABLE IF NOT EXISTS monthly_meal_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  hostel_id uuid NOT NULL
    REFERENCES admins(id) ON DELETE CASCADE,

  billing_month date NOT NULL,

  total_bazar numeric(12,2) NOT NULL DEFAULT 0,

  total_meals integer NOT NULL DEFAULT 0,

  meal_rate numeric(12,4) NOT NULL DEFAULT 0,

  calculated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(hostel_id, billing_month)
);


ALTER TABLE monthly_meal_rates ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS
"Users view monthly meal rates"
ON monthly_meal_rates;

CREATE POLICY
"Users view monthly meal rates"
ON monthly_meal_rates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM admins a
    WHERE a.id = monthly_meal_rates.hostel_id
      AND a.auth_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1
    FROM members m
    WHERE m.hostel_id = monthly_meal_rates.hostel_id
      AND m.auth_id = auth.uid()
  )
);


-- ============================================================
-- 5) MEMBER DUE / PAYMENT COLUMNS
-- ============================================================

ALTER TABLE member_dues
ADD COLUMN IF NOT EXISTS balance numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE member_dues
ADD COLUMN IF NOT EXISTS opening_balance numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE member_dues
ADD COLUMN IF NOT EXISTS advance_amount numeric(12,2) NOT NULL DEFAULT 0;


ALTER TABLE payment_transactions
ADD COLUMN IF NOT EXISTS notes text;


ALTER TABLE payment_transactions
DROP CONSTRAINT IF EXISTS payment_transactions_payment_method_check;


ALTER TABLE payment_transactions
ADD CONSTRAINT payment_transactions_payment_method_check
CHECK (
  payment_method IN (
    'sslcommerz',
    'bkash',
    'nagad',
    'bank_transfer',
    'cash',
    'other'
  )
);


-- ============================================================
-- 6) REFRESH PAYMENT TOTALS
-- ============================================================

CREATE OR REPLACE FUNCTION refresh_due_payment_totals(
  p_due_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paid numeric(12,2);
  v_balance numeric(12,2);
BEGIN

  SELECT COALESCE(SUM(amount), 0)
  INTO v_paid
  FROM payment_transactions
  WHERE due_id = p_due_id
    AND status = 'paid';


  SELECT
    COALESCE(opening_balance, 0)
    + COALESCE(total_due, 0)
    - v_paid
  INTO v_balance
  FROM member_dues
  WHERE id = p_due_id;


  UPDATE member_dues
  SET
    paid_amount = v_paid,
    balance = v_balance,

    advance_amount =
      GREATEST(-v_balance, 0),

    remaining_due =
      GREATEST(v_balance, 0),

    status =
      CASE
        WHEN v_balance <= 0
             AND total_due > 0
          THEN 'paid'

        WHEN v_paid > 0
          THEN 'partial'

        ELSE 'due'
      END,

    updated_at = now()

  WHERE id = p_due_id;

END;
$$;


-- ============================================================
-- 7) CALCULATE MONTHLY MEAL RATE
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_monthly_meal_rate(
  p_hostel_id uuid,
  p_billing_month date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  v_month date :=
    date_trunc('month', p_billing_month)::date;

  v_bazar numeric(12,2);

  v_meals integer;

  v_rate numeric(12,4);

BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM admins
    WHERE id = p_hostel_id
      AND auth_id = auth.uid()
  ) THEN

    RAISE EXCEPTION 'Not authorized';

  END IF;


  SELECT COALESCE(SUM(amount), 0)
  INTO v_bazar
  FROM expenses
  WHERE hostel_id = p_hostel_id
    AND category = 'bazar'
    AND date >= v_month
    AND date < (v_month + interval '1 month')::date;


  SELECT COALESCE(
    SUM(
      (CASE WHEN mr.day_meal THEN 1 ELSE 0 END)
      +
      (CASE WHEN mr.night_meal THEN 1 ELSE 0 END)
    ),
    0
  )
  INTO v_meals

  FROM meal_records mr

  JOIN meals m
    ON m.id = mr.meal_id

  WHERE m.hostel_id = p_hostel_id
    AND m.date >= v_month
    AND m.date < (v_month + interval '1 month')::date;


  v_rate :=
    CASE
      WHEN v_meals > 0
        THEN v_bazar / v_meals
      ELSE 0
    END;


  INSERT INTO monthly_meal_rates (
    hostel_id,
    billing_month,
    total_bazar,
    total_meals,
    meal_rate,
    calculated_at
  )

  VALUES (
    p_hostel_id,
    v_month,
    v_bazar,
    v_meals,
    v_rate,
    now()
  )

  ON CONFLICT (
    hostel_id,
    billing_month
  )

  DO UPDATE SET

    total_bazar = EXCLUDED.total_bazar,

    total_meals = EXCLUDED.total_meals,

    meal_rate = EXCLUDED.meal_rate,

    calculated_at = now();


  RETURN jsonb_build_object(
    'total_bazar', v_bazar,
    'total_meals', v_meals,
    'meal_rate', v_rate,
    'billing_month', v_month
  );

END;
$$;


-- ============================================================
-- 8) DISTRIBUTE MONTHLY COST
-- ============================================================

CREATE OR REPLACE FUNCTION distribute_monthly_cost(
  p_cost_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  v_hostel uuid;

  v_total numeric(12,2);

  v_count integer;

  v_share numeric(12,2);

  r record;

  i integer := 0;

BEGIN

  SELECT
    hostel_id,
    total_amount

  INTO
    v_hostel,
    v_total

  FROM monthly_costs

  WHERE id = p_cost_id;


  IF NOT EXISTS (
    SELECT 1
    FROM admins
    WHERE id = v_hostel
      AND auth_id = auth.uid()
  ) THEN

    RAISE EXCEPTION 'Not authorized';

  END IF;


  DELETE FROM monthly_cost_allocations
  WHERE cost_id = p_cost_id;


  SELECT COUNT(*)
  INTO v_count

  FROM members

  WHERE hostel_id = v_hostel;


  IF v_count = 0 THEN
    RETURN 0;
  END IF;


  v_share :=
    ROUND(v_total / v_count, 2);


  FOR r IN
    SELECT id
    FROM members
    WHERE hostel_id = v_hostel
    ORDER BY id

  LOOP

    i := i + 1;


    INSERT INTO monthly_cost_allocations (
      cost_id,
      member_id,
      amount
    )

    VALUES (
      p_cost_id,
      r.id,

      CASE
        WHEN i = v_count
          THEN GREATEST(
            v_total - (v_share * (v_count - 1)),
            0
          )
        ELSE v_share
      END
    );

  END LOOP;


  RETURN v_count;

END;
$$;


-- ============================================================
-- 9) GENERATE MEMBER DUE
--
-- Formula:
--
-- Current Charge =
--     Meal Charge
--   + Monthly Cost
--   + Other Charge
--
-- Opening Balance =
--     Previous month's signed balance
--
-- Total Due =
--     Current Charge + positive opening balance
--
-- Advance =
--     negative balance
--
-- Example:
--
-- Previous balance = -500
-- Current charge   = 3000
-- New balance      = 2500
--
-- Previous balance = +500
-- Current charge   = 3000
-- New total due    = 3500
-- ============================================================

CREATE OR REPLACE FUNCTION generate_member_due(
  p_member_id uuid,
  p_billing_month date,
  p_other_charge numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  v_month date :=
    date_trunc('month', p_billing_month)::date;

  v_hostel uuid;

  v_meal_count numeric;

  v_rate numeric;

  v_meal_charge numeric(12,2);

  v_cost numeric(12,2);

  v_previous numeric(12,2);

  v_other numeric(12,2);

  v_current_charge numeric(12,2);

  v_total_due numeric(12,2);

  v_opening numeric(12,2);

  v_id uuid;

BEGIN

  SELECT hostel_id
  INTO v_hostel
  FROM members
  WHERE id = p_member_id;


  IF v_hostel IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;


  IF NOT EXISTS (
    SELECT 1
    FROM members
    WHERE id = p_member_id
      AND auth_id = auth.uid()
  )
  AND NOT EXISTS (
    SELECT 1
    FROM admins
    WHERE id = v_hostel
      AND auth_id = auth.uid()
  ) THEN

    RAISE EXCEPTION 'Not authorized';

  END IF;


  -- Get current month's meal rate
  SELECT meal_rate
  INTO v_rate
  FROM monthly_meal_rates
  WHERE hostel_id = v_hostel
    AND billing_month = v_month;


  IF v_rate IS NULL THEN
    v_rate := 0;
  END IF;


  -- Actual meal count
  SELECT COALESCE(
    SUM(
      (CASE WHEN mr.day_meal THEN 1 ELSE 0 END)
      +
      (CASE WHEN mr.night_meal THEN 1 ELSE 0 END)
    ),
    0
  )
  INTO v_meal_count

  FROM meal_records mr

  JOIN meals m
    ON m.id = mr.meal_id

  WHERE mr.member_id = p_member_id
    AND m.date >= v_month
    AND m.date < (v_month + interval '1 month')::date;


  v_meal_charge :=
    ROUND(v_meal_count * v_rate, 2);


  -- Monthly allocated costs
  SELECT COALESCE(SUM(a.amount), 0)
  INTO v_cost

  FROM monthly_cost_allocations a

  JOIN monthly_costs c
    ON c.id = a.cost_id

  WHERE a.member_id = p_member_id
    AND c.billing_month = v_month;


  -- Previous month's signed balance
  SELECT COALESCE(balance, 0)
  INTO v_previous

  FROM member_dues

  WHERE member_id = p_member_id
    AND billing_month =
      (v_month - interval '1 month')::date;


  -- Current other charge
  SELECT COALESCE(other_charge, 0)
  INTO v_other

  FROM member_dues

  WHERE member_id = p_member_id
    AND billing_month = v_month;


  IF p_other_charge IS NOT NULL THEN
    v_other := p_other_charge;
  END IF;


  -- Current month's charges
  v_current_charge :=
      v_meal_charge
    + v_other
    + v_cost;


  -- Previous signed balance becomes opening balance
  v_opening :=
    COALESCE(v_previous, 0);


  -- Positive previous balance is old due.
  -- Negative previous balance is advance.
  --
  -- Advance is automatically deducted.
  v_total_due :=
    GREATEST(
      v_current_charge + v_opening,
      0
    );


  INSERT INTO member_dues (
    member_id,
    hostel_id,
    billing_month,
    meal_charge,
    other_charge,
    previous_due,
    opening_balance,
    total_due
  )

  VALUES (
    p_member_id,
    v_hostel,
    v_month,
    v_meal_charge,

    v_other + v_cost,

    CASE
      WHEN v_opening > 0
        THEN v_opening
      ELSE 0
    END,

    v_opening,

    v_total_due
  )

  ON CONFLICT (
    member_id,
    billing_month
  )

  DO UPDATE SET

    meal_charge =
      EXCLUDED.meal_charge,

    other_charge =
      EXCLUDED.other_charge,

    previous_due =
      EXCLUDED.previous_due,

    opening_balance =
      EXCLUDED.opening_balance,

    total_due =
      EXCLUDED.total_due,

    updated_at = now()

  RETURNING id
  INTO v_id;


  -- Recalculate payment/balance
  PERFORM refresh_due_payment_totals(v_id);


  RETURN v_id;

END;
$$;


-- ============================================================
-- 10) GENERATE HOSTEL DUES
-- ============================================================

CREATE OR REPLACE FUNCTION generate_hostel_dues(
  p_billing_month date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  v_hostel uuid;

  v_count integer := 0;

  r record;

BEGIN

  SELECT id
  INTO v_hostel

  FROM admins

  WHERE auth_id = auth.uid();


  IF v_hostel IS NULL THEN
    RAISE EXCEPTION 'Admin profile not found';
  END IF;


  -- Calculate current month's meal rate
  PERFORM calculate_monthly_meal_rate(
    v_hostel,
    p_billing_month
  );


  FOR r IN
    SELECT id
    FROM members
    WHERE hostel_id = v_hostel
  LOOP

    PERFORM generate_member_due(
      r.id,
      p_billing_month,
      NULL
    );

    v_count := v_count + 1;

  END LOOP;


  RETURN v_count;

END;
$$;


-- ============================================================
-- 11) GOOGLE ACCOUNT LINKING
-- ============================================================

CREATE OR REPLACE FUNCTION link_google_account(
  p_role text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  v_email text :=
    lower(
      coalesce(
        auth.jwt()->>'email',
        ''
      )
    );

  v_id uuid;

BEGIN

  IF v_email = '' THEN
    RAISE EXCEPTION 'Google email not available';
  END IF;


  -- ADMIN
  IF p_role = 'admin' THEN

    SELECT id
    INTO v_id

    FROM admins

    WHERE lower(email) = v_email

      AND (
        auth_id IS NULL
        OR auth_id = auth.uid()
      )

    LIMIT 1;


    IF v_id IS NULL THEN
      RAISE EXCEPTION
        'No existing admin account matches this Google email';
    END IF;


    UPDATE admins

    SET auth_id = auth.uid()

    WHERE id = v_id;


    RETURN 'admin';

  END IF;


  -- MEMBER
  IF p_role = 'member' THEN

    SELECT id
    INTO v_id

    FROM members

    WHERE lower(email) = v_email

      AND (
        auth_id IS NULL
        OR auth_id = auth.uid()
      )

    LIMIT 1;


    IF v_id IS NULL THEN
      RAISE EXCEPTION
        'No existing member account matches this Google email';
    END IF;


    UPDATE members

    SET auth_id = auth.uid()

    WHERE id = v_id;


    RETURN 'member';

  END IF;


  RAISE EXCEPTION 'Invalid role';

END;
$$;


GRANT EXECUTE
ON FUNCTION link_google_account(text)
TO authenticated;


-- ============================================================
-- 12) MANAGER LOTTERY
-- ============================================================

CREATE TABLE IF NOT EXISTS mess_manager_lottery (

  id uuid PRIMARY KEY
    DEFAULT gen_random_uuid(),

  hostel_id uuid NOT NULL
    REFERENCES admins(id)
    ON DELETE CASCADE,

  billing_month date NOT NULL,

  member_id uuid NOT NULL
    REFERENCES members(id)
    ON DELETE CASCADE,

  created_at timestamptz NOT NULL
    DEFAULT now(),

  UNIQUE(hostel_id, billing_month)
);


ALTER TABLE mess_manager_lottery
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS
"Hostel users view lottery"
ON mess_manager_lottery;


CREATE POLICY
"Hostel users view lottery"
ON mess_manager_lottery
FOR SELECT
TO authenticated
USING (

  EXISTS (
    SELECT 1
    FROM admins a
    WHERE a.id = mess_manager_lottery.hostel_id
      AND a.auth_id = auth.uid()
  )

  OR

  EXISTS (
    SELECT 1
    FROM members m
    WHERE m.hostel_id =
      mess_manager_lottery.hostel_id
      AND m.auth_id = auth.uid()
  )

);


DROP POLICY IF EXISTS
"Admins manage lottery"
ON mess_manager_lottery;


CREATE POLICY
"Admins manage lottery"
ON mess_manager_lottery
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM admins a
    WHERE a.id = mess_manager_lottery.hostel_id
      AND a.auth_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM admins a
    WHERE a.id = mess_manager_lottery.hostel_id
      AND a.auth_id = auth.uid()
  )
);


CREATE OR REPLACE FUNCTION run_manager_lottery_for_hostel(
  p_hostel_id uuid,
  p_billing_month date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  v_month date :=
    date_trunc(
      'month',
      p_billing_month
    )::date;

  v_member record;

  v_winner_id uuid;

  v_count integer;

  v_title text;

  v_message text;

BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM admins
    WHERE id = p_hostel_id
      AND auth_id = auth.uid()
  ) THEN

    RAISE EXCEPTION 'Not authorized';

  END IF;


  SELECT COUNT(*)
  INTO v_count

  FROM members

  WHERE hostel_id = p_hostel_id;


  IF v_count = 0 THEN
    RAISE EXCEPTION 'No active members';
  END IF;


  SELECT
    id,
    name,
    email

  INTO v_member

  FROM members

  WHERE hostel_id = p_hostel_id

  ORDER BY random()

  LIMIT 1;


  v_winner_id :=
    v_member.id;


  INSERT INTO mess_manager_lottery (
    hostel_id,
    billing_month,
    member_id
  )

  VALUES (
    p_hostel_id,
    v_month,
    v_winner_id
  )

  ON CONFLICT (
    hostel_id,
    billing_month
  )

  DO UPDATE SET
    member_id = EXCLUDED.member_id;


  v_title :=
    to_char(
      v_month,
      'FMMonth YYYY'
    )
    || ' Mess Manager';


  v_message :=
    v_member.name
    || ' has been selected as the mess manager for '
    || to_char(
      v_month,
      'FMMonth YYYY'
    )
    || '.';


  INSERT INTO notices (
    hostel_id,
    title,
    message
  )

  SELECT
    p_hostel_id,
    v_title,
    v_message

  WHERE NOT EXISTS (
    SELECT 1
    FROM notices
    WHERE hostel_id = p_hostel_id
      AND title = v_title
  );


  RETURN jsonb_build_object(
    'member_id',
    v_winner_id,

    'member_name',
    v_member.name,

    'member_email',
    v_member.email,

    'billing_month',
    v_month
  );

END;
$$;


GRANT EXECUTE
ON FUNCTION run_manager_lottery_for_hostel(
  uuid,
  date
)
TO authenticated;


-- ============================================================
-- 13) FIX EXISTING VIEW
--
-- IMPORTANT:
-- Existing view had different column order.
-- CREATE OR REPLACE VIEW cannot change existing
-- column names/order.
--
-- Therefore DROP + CREATE is used.
-- ============================================================

DROP VIEW IF EXISTS member_payment_summary;


CREATE VIEW member_payment_summary
WITH (security_invoker = true)
AS

SELECT
  d.id,
  d.member_id,
  d.hostel_id,
  d.billing_month,
  d.meal_charge,
  d.other_charge,
  d.previous_due,
  d.opening_balance,
  d.total_due,
  d.paid_amount,
  d.remaining_due,
  d.balance,
  d.advance_amount,
  d.status,
  d.created_at,
  d.updated_at

FROM member_dues d;


GRANT SELECT
ON member_payment_summary
TO authenticated;


-- ============================================================
-- 14) MANUAL PAYMENT REQUESTS
-- ============================================================

DROP POLICY IF EXISTS
"Members can submit manual payments"
ON payment_transactions;


CREATE POLICY
"Members can submit manual payments"
ON payment_transactions
FOR INSERT
TO authenticated
WITH CHECK (

  status = 'pending'

  AND EXISTS (
    SELECT 1
    FROM members m
    WHERE m.id = payment_transactions.member_id
      AND m.hostel_id =
        payment_transactions.hostel_id
      AND m.auth_id = auth.uid()
  )

  AND (
    due_id IS NULL

    OR EXISTS (
      SELECT 1
      FROM member_dues d
      WHERE d.id = payment_transactions.due_id
        AND d.member_id =
          payment_transactions.member_id
        AND d.hostel_id =
          payment_transactions.hostel_id
    )
  )

);


DROP POLICY IF EXISTS
"Admins can update payment status"
ON payment_transactions;


CREATE POLICY
"Admins can update payment status"
ON payment_transactions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM admins a
    WHERE a.id =
      payment_transactions.hostel_id
      AND a.auth_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM admins a
    WHERE a.id =
      payment_transactions.hostel_id
      AND a.auth_id = auth.uid()
  )
);


-- ============================================================
-- 15) FINISH
-- ============================================================

-- Keep the original server-side cutoff
-- for actual meal records unchanged.

DO $$
BEGIN
  RAISE NOTICE
    'Mess Management V2 migration completed successfully.';
END $$;