
-- ============================================================
-- Mess Management System
-- Payment + Meal Rate + Monthly Due + Meal Preference support
-- Run AFTER the existing hostel management schema migration.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- 1) Meal rates
-- One rate row becomes active from effective_from until a newer
-- rate row is added.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meal_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  effective_from date NOT NULL,
  day_rate numeric(10,2) NOT NULL DEFAULT 0 CHECK (day_rate >= 0),
  night_rate numeric(10,2) NOT NULL DEFAULT 0 CHECK (night_rate >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hostel_id, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_meal_rates_hostel_date
  ON meal_rates(hostel_id, effective_from DESC);

-- ------------------------------------------------------------
-- 2) Monthly member dues / invoice
-- billing_month must be the first day of the month.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_dues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  hostel_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  billing_month date NOT NULL,
  meal_charge numeric(12,2) NOT NULL DEFAULT 0 CHECK (meal_charge >= 0),
  other_charge numeric(12,2) NOT NULL DEFAULT 0 CHECK (other_charge >= 0),
  previous_due numeric(12,2) NOT NULL DEFAULT 0 CHECK (previous_due >= 0),
  total_due numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  remaining_due numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'due'
    CHECK (status IN ('due','partial','paid')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(member_id, billing_month)
);

CREATE INDEX IF NOT EXISTS idx_member_dues_member_month
  ON member_dues(member_id, billing_month DESC);

CREATE INDEX IF NOT EXISTS idx_member_dues_hostel_month
  ON member_dues(hostel_id, billing_month DESC);

-- ------------------------------------------------------------
-- 3) Payment transactions
-- The browser NEVER writes "paid". Only the server-side
-- payment callback/verification does that.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  hostel_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  due_id uuid REFERENCES member_dues(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'BDT',
  payment_method text NOT NULL DEFAULT 'online',
  provider text NOT NULL DEFAULT 'sslcommerz',
  transaction_id text NOT NULL UNIQUE,
  gateway_transaction_id text,
  validation_id text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','failed','cancelled')),
  gateway_response jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_member
  ON payment_transactions(member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_hostel
  ON payment_transactions(hostel_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_due
  ON payment_transactions(due_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status
  ON payment_transactions(status);

-- ------------------------------------------------------------
-- 4) updated_at helper
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_member_dues_updated_at ON member_dues;
CREATE TRIGGER trg_member_dues_updated_at
BEFORE UPDATE ON member_dues
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_payment_transactions_updated_at ON payment_transactions;
CREATE TRIGGER trg_payment_transactions_updated_at
BEFORE UPDATE ON payment_transactions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 5) Recalculate paid/remaining amount from VERIFIED payments.
-- This keeps the invoice consistent with payment history.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_due_payment_totals(p_due_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paid numeric(12,2);
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO v_paid
  FROM payment_transactions
  WHERE due_id = p_due_id
    AND status = 'paid';

  UPDATE member_dues
  SET
    paid_amount = v_paid,
    remaining_due = GREATEST(total_due - v_paid, 0),
    status = CASE
      WHEN v_paid >= total_due AND total_due > 0 THEN 'paid'
      WHEN v_paid > 0 THEN 'partial'
      ELSE 'due'
    END,
    updated_at = now()
  WHERE id = p_due_id;
END;
$$;

CREATE OR REPLACE FUNCTION payment_totals_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.due_id IS NOT NULL THEN
      PERFORM refresh_due_payment_totals(OLD.due_id);
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.due_id IS NOT NULL THEN
    PERFORM refresh_due_payment_totals(NEW.due_id);
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.due_id IS DISTINCT FROM NEW.due_id
     AND OLD.due_id IS NOT NULL THEN
    PERFORM refresh_due_payment_totals(OLD.due_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_totals ON payment_transactions;
CREATE TRIGGER trg_payment_totals
AFTER INSERT OR UPDATE OF amount, status, due_id OR DELETE
ON payment_transactions
FOR EACH ROW
EXECUTE FUNCTION payment_totals_trigger();

-- ------------------------------------------------------------
-- 6) Calculate meal charge for a member for a month.
-- The latest rate whose effective_from <= meal date is used.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_member_meal_charge(
  p_member_id uuid,
  p_billing_month date
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    CASE WHEN mr.day_meal THEN COALESCE(r.day_rate, 0) ELSE 0 END +
    CASE WHEN mr.night_meal THEN COALESCE(r.night_rate, 0) ELSE 0 END
  ), 0)::numeric(12,2)
  FROM meal_records mr
  JOIN meals m ON m.id = mr.meal_id
  JOIN members mem ON mem.id = mr.member_id
  LEFT JOIN LATERAL (
    SELECT day_rate, night_rate
    FROM meal_rates
    WHERE hostel_id = m.hostel_id
      AND effective_from <= m.date
    ORDER BY effective_from DESC
    LIMIT 1
  ) r ON true
  WHERE mr.member_id = p_member_id
    AND m.date >= date_trunc('month', p_billing_month)::date
    AND m.date < (date_trunc('month', p_billing_month) + interval '1 month')::date;
$$;

-- ------------------------------------------------------------
-- 7) Generate/refresh one member's monthly due.
-- previous_due is automatically taken from the previous month's
-- outstanding balance.
-- ------------------------------------------------------------
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
  v_month date := date_trunc('month', p_billing_month)::date;
  v_hostel_id uuid;
  v_meal_charge numeric(12,2);
  v_previous_due numeric(12,2);
  v_other_charge numeric(12,2);
  v_due_id uuid;
BEGIN
  SELECT hostel_id INTO v_hostel_id
  FROM members
  WHERE id = p_member_id;

  IF v_hostel_id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  -- Allow only the member itself or an admin of the same hostel.
  IF NOT EXISTS (
    SELECT 1 FROM members
    WHERE id = p_member_id AND auth_id = auth.uid()
  )
  AND NOT EXISTS (
    SELECT 1 FROM admins
    WHERE id = v_hostel_id AND auth_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_meal_charge := calculate_member_meal_charge(p_member_id, v_month);

  SELECT COALESCE(remaining_due, 0)
  INTO v_previous_due
  FROM member_dues
  WHERE member_id = p_member_id
    AND billing_month = (v_month - interval '1 month')::date;

  SELECT other_charge
  INTO v_other_charge
  FROM member_dues
  WHERE member_id = p_member_id
    AND billing_month = v_month;

  IF p_other_charge IS NOT NULL THEN
    v_other_charge := p_other_charge;
  END IF;

  v_other_charge := COALESCE(v_other_charge, 0);

  INSERT INTO member_dues (
    member_id,
    hostel_id,
    billing_month,
    meal_charge,
    other_charge,
    previous_due,
    total_due
  )
  VALUES (
    p_member_id,
    v_hostel_id,
    v_month,
    v_meal_charge,
    v_other_charge,
    COALESCE(v_previous_due, 0),
    v_meal_charge + v_other_charge + COALESCE(v_previous_due, 0)
  )
  ON CONFLICT (member_id, billing_month)
  DO UPDATE SET
    meal_charge = EXCLUDED.meal_charge,
    previous_due = EXCLUDED.previous_due,
    other_charge = EXCLUDED.other_charge,
    total_due = EXCLUDED.total_due,
    updated_at = now()
  RETURNING id INTO v_due_id;

  PERFORM refresh_due_payment_totals(v_due_id);
  RETURN v_due_id;
END;
$$;

-- ------------------------------------------------------------
-- 8) Admin helper: generate dues for every member in the admin's
-- hostel for a month.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_hostel_dues(
  p_billing_month date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hostel_id uuid;
  v_count integer := 0;
  v_member record;
BEGIN
  SELECT id INTO v_hostel_id
  FROM admins
  WHERE auth_id = auth.uid();

  IF v_hostel_id IS NULL THEN
    RAISE EXCEPTION 'Admin profile not found';
  END IF;

  FOR v_member IN
    SELECT id FROM members WHERE hostel_id = v_hostel_id
  LOOP
    PERFORM generate_member_due(v_member.id, p_billing_month, NULL);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ------------------------------------------------------------
-- 9) Default privileges / permissions
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION calculate_member_meal_charge(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_member_due(uuid, date, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_hostel_dues(date) TO authenticated;

-- ------------------------------------------------------------
-- 10) RLS
-- ------------------------------------------------------------
ALTER TABLE meal_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view hostel meal rates" ON meal_rates;
CREATE POLICY "Users can view hostel meal rates"
ON meal_rates FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = meal_rates.hostel_id
      AND a.auth_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM members m
    WHERE m.hostel_id = meal_rates.hostel_id
      AND m.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can insert meal rates" ON meal_rates;
CREATE POLICY "Admins can insert meal rates"
ON meal_rates FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = meal_rates.hostel_id
      AND a.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can update meal rates" ON meal_rates;
CREATE POLICY "Admins can update meal rates"
ON meal_rates FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = meal_rates.hostel_id
      AND a.auth_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = meal_rates.hostel_id
      AND a.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can delete meal rates" ON meal_rates;
CREATE POLICY "Admins can delete meal rates"
ON meal_rates FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = meal_rates.hostel_id
      AND a.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view their dues" ON member_dues;
CREATE POLICY "Users can view their dues"
ON member_dues FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members m
    WHERE m.id = member_dues.member_id
      AND m.auth_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = member_dues.hostel_id
      AND a.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can insert dues" ON member_dues;
CREATE POLICY "Admins can insert dues"
ON member_dues FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = member_dues.hostel_id
      AND a.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can update dues" ON member_dues;
CREATE POLICY "Admins can update dues"
ON member_dues FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = member_dues.hostel_id
      AND a.auth_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = member_dues.hostel_id
      AND a.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view payment history" ON payment_transactions;
CREATE POLICY "Users can view payment history"
ON payment_transactions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members m
    WHERE m.id = payment_transactions.member_id
      AND m.auth_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM admins a
    WHERE a.id = payment_transactions.hostel_id
      AND a.auth_id = auth.uid()
  )
);

-- No browser INSERT/UPDATE/DELETE policy is intentionally created
-- for payment_transactions. Payment creation and verification happen
-- inside the server-side Edge Functions.

-- ------------------------------------------------------------
-- 11) Seed a default rate for each existing hostel only if none
-- exists. Change these values from the admin UI before billing.
-- ------------------------------------------------------------
INSERT INTO meal_rates (hostel_id, effective_from, day_rate, night_rate)
SELECT id, CURRENT_DATE, 0, 0
FROM admins a
WHERE NOT EXISTS (
  SELECT 1 FROM meal_rates r WHERE r.hostel_id = a.id
);

-- Helpful view for admin/member dashboards.
CREATE OR REPLACE VIEW member_payment_summary
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
  d.total_due,
  d.paid_amount,
  d.remaining_due,
  d.status,
  d.created_at,
  d.updated_at
FROM member_dues d;

GRANT SELECT ON member_payment_summary TO authenticated;


-- ------------------------------------------------------------
-- 12) Secure member meal-preference inserts + server-side cutoff.
-- Admins can still override.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Members can insert their own meal records" ON meal_records;
CREATE POLICY "Members can insert their own meal records"
ON meal_records FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM members m
    WHERE m.id = meal_records.member_id
      AND m.auth_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION enforce_meal_preference_cutoff()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_meal_date date;
  v_is_admin boolean;
  v_now time;
BEGIN
  SELECT m.date
  INTO v_meal_date
  FROM meals m
  WHERE m.id = NEW.meal_id;

  SELECT EXISTS (
    SELECT 1 FROM admins a WHERE a.auth_id = auth.uid()
  )
  INTO v_is_admin;

  -- Admins may edit allocations at any time.
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  v_now := (now() AT TIME ZONE 'Asia/Dhaka')::time;

  IF v_meal_date < (now() AT TIME ZONE 'Asia/Dhaka')::date THEN
    RAISE EXCEPTION 'Meal preference for a past date cannot be changed';
  END IF;

  IF v_meal_date = (now() AT TIME ZONE 'Asia/Dhaka')::date THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.day_meal AND v_now >= time '08:00' THEN
        RAISE EXCEPTION 'Lunch preference is locked after 08:00 AM';
      END IF;

      IF NEW.night_meal AND v_now >= time '20:00' THEN
        RAISE EXCEPTION 'Dinner preference is locked after 08:00 PM';
      END IF;
    ELSE
      IF NEW.day_meal IS DISTINCT FROM OLD.day_meal
         AND v_now >= time '08:00' THEN
        RAISE EXCEPTION 'Lunch preference is locked after 08:00 AM';
      END IF;

      IF NEW.night_meal IS DISTINCT FROM OLD.night_meal
         AND v_now >= time '20:00' THEN
        RAISE EXCEPTION 'Dinner preference is locked after 08:00 PM';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meal_preference_cutoff ON meal_records;
CREATE TRIGGER trg_meal_preference_cutoff
BEFORE INSERT OR UPDATE OF day_meal, night_meal
ON meal_records
FOR EACH ROW
EXECUTE FUNCTION enforce_meal_preference_cutoff();
