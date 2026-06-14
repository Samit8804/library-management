-- Safe migration - run this in Supabase SQL Editor
-- Uses IF NOT EXISTS so it won't error on re-run

-- 1. Students
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_number TEXT UNIQUE NOT NULL,
  enrollment_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  course TEXT NOT NULL,
  branch TEXT NOT NULL,
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'restricted', 'alumni')),
  total_fine NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- 2. Books
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id TEXT UNIQUE NOT NULL,
  isbn TEXT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  publisher TEXT,
  category TEXT,
  edition TEXT,
  shelf_number TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  available_copies INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- 3. Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  book_id TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  return_date DATE,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'returned', 'overdue', 'lost')),
  fine_amount NUMERIC(10,2) DEFAULT 0,
  issued_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 4. Fines
CREATE TABLE IF NOT EXISTS fines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  transaction_id UUID REFERENCES transactions(id),
  amount NUMERIC(10,2) NOT NULL,
  days_overdue INTEGER DEFAULT 0,
  paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE fines ENABLE ROW LEVEL SECURITY;

-- 5. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  type TEXT NOT NULL CHECK (type IN ('due_reminder', 'overdue', 'fine', 'restriction', 'general')),
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  read BOOLEAN DEFAULT false
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 6. Email Logs
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  sent_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- 7. Settings
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('fine_per_day', '5'),
  ('grace_period', '2'),
  ('max_fine', '500'),
  ('max_books_per_student', '5'),
  ('low_stock_threshold', '3')
ON CONFLICT (key) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_student ON transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_book ON transactions(book_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_students_form_number ON students(form_number);
CREATE INDEX IF NOT EXISTS idx_students_enrollment ON students(enrollment_number);
CREATE INDEX IF NOT EXISTS idx_books_book_id ON books(book_id);
CREATE INDEX IF NOT EXISTS idx_fines_student ON fines(student_id);

-- RLS Policies (safe: DROP then CREATE to avoid duplicates)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated users can read profiles" ON profiles;
  CREATE POLICY "Authenticated users can read profiles" ON profiles FOR SELECT TO authenticated USING (true);
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated users can read students" ON students;
  CREATE POLICY "Authenticated users can read students" ON students FOR SELECT TO authenticated USING (true);
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin can insert students" ON students;
  CREATE POLICY "Admin can insert students" ON students FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin can update students" ON students;
  CREATE POLICY "Admin can update students" ON students FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin can delete students" ON students;
  CREATE POLICY "Admin can delete students" ON students FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated users can read books" ON books;
  CREATE POLICY "Authenticated users can read books" ON books FOR SELECT TO authenticated USING (true);
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin can insert books" ON books;
  CREATE POLICY "Admin can insert books" ON books FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin can update books" ON books;
  CREATE POLICY "Admin can update books" ON books FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin can delete books" ON books;
  CREATE POLICY "Admin can delete books" ON books FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated users can read transactions" ON transactions;
  CREATE POLICY "Authenticated users can read transactions" ON transactions FOR SELECT TO authenticated USING (true);
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Staff can insert transactions" ON transactions;
  CREATE POLICY "Staff can insert transactions" ON transactions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin can update transactions" ON transactions;
  CREATE POLICY "Admin can update transactions" ON transactions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated users can read settings" ON settings;
  CREATE POLICY "Authenticated users can read settings" ON settings FOR SELECT TO authenticated USING (true);
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin can update settings" ON settings;
  CREATE POLICY "Admin can update settings" ON settings FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
END $$;

-- Functions (use OR REPLACE so they're idempotent)
CREATE OR REPLACE FUNCTION issue_book(
  p_student_id UUID,
  p_book_id TEXT,
  p_issued_by UUID,
  p_due_date DATE
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_book books%ROWTYPE;
  v_student students%ROWTYPE;
  v_max_books INTEGER;
  v_current_issued INTEGER;
BEGIN
  SELECT * INTO v_book FROM books WHERE book_id = p_book_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Book not found'; END IF;
  IF v_book.available_copies <= 0 THEN RAISE EXCEPTION 'No available copies'; END IF;

  SELECT * INTO v_student FROM students WHERE id = p_student_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Student not found'; END IF;
  IF v_student.status = 'restricted' THEN RAISE EXCEPTION 'Student is restricted'; END IF;
  IF v_student.status = 'alumni' THEN RAISE EXCEPTION 'Student is alumni'; END IF;

  SELECT value::INTEGER INTO v_max_books FROM settings WHERE key = 'max_books_per_student';
  SELECT COUNT(*) INTO v_current_issued FROM transactions WHERE student_id = p_student_id AND status IN ('issued', 'overdue');
  IF v_current_issued >= v_max_books THEN RAISE EXCEPTION 'Student already has maximum books issued'; END IF;

  IF v_student.total_fine >= (SELECT value::NUMERIC FROM settings WHERE key = 'max_fine') THEN
    RAISE EXCEPTION 'Student fine exceeds maximum limit';
  END IF;

  UPDATE books SET available_copies = available_copies - 1 WHERE book_id = p_book_id;
  INSERT INTO transactions (student_id, book_id, due_date, issued_by) VALUES (p_student_id, p_book_id, p_due_date, p_issued_by);
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION return_book(p_transaction_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_txn transactions%ROWTYPE;
  v_fine_per_day NUMERIC;
  v_grace_period INTEGER;
  v_days_overdue INTEGER;
  v_fine_amount NUMERIC;
  v_max_fine NUMERIC;
BEGIN
  SELECT * INTO v_txn FROM transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found'; END IF;
  IF v_txn.status = 'returned' THEN RAISE EXCEPTION 'Book already returned'; END IF;

  SELECT value::NUMERIC INTO v_fine_per_day FROM settings WHERE key = 'fine_per_day';
  SELECT value::INTEGER INTO v_grace_period FROM settings WHERE key = 'grace_period';
  SELECT value::NUMERIC INTO v_max_fine FROM settings WHERE key = 'max_fine';

  v_days_overdue := GREATEST(0, (CURRENT_DATE - v_txn.due_date) - v_grace_period);
  v_fine_amount := LEAST(v_days_overdue * v_fine_per_day, v_max_fine);

  UPDATE transactions SET return_date = CURRENT_DATE, status = CASE WHEN v_days_overdue > 0 THEN 'overdue' ELSE 'returned' END, fine_amount = v_fine_amount WHERE id = p_transaction_id;
  UPDATE books SET available_copies = available_copies + 1 WHERE book_id = v_txn.book_id;

  IF v_fine_amount > 0 THEN
    UPDATE students SET total_fine = total_fine + v_fine_amount WHERE id = v_txn.student_id;
    INSERT INTO fines (student_id, transaction_id, amount, days_overdue) VALUES (v_txn.student_id, p_transaction_id, v_fine_amount, v_days_overdue);
  END IF;

  RETURN jsonb_build_object('success', true, 'fine_amount', v_fine_amount, 'days_overdue', v_days_overdue);
END;
$$;

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_books', (SELECT COUNT(*) FROM books),
    'available_books', (SELECT COALESCE(SUM(available_copies), 0) FROM books),
    'issued_books', (SELECT COUNT(*) FROM transactions WHERE status IN ('issued', 'overdue')),
    'overdue_books', (SELECT COUNT(*) FROM transactions WHERE status = 'overdue' AND return_date IS NULL),
    'lost_books', (SELECT COUNT(*) FROM transactions WHERE status = 'lost'),
    'total_students', (SELECT COUNT(*) FROM students),
    'total_fine', (SELECT COALESCE(SUM(total_fine), 0) FROM students),
    'today_transactions', (SELECT COUNT(*) FROM transactions WHERE created_at::date = CURRENT_DATE)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- Trigger: auto-create profile on signup (safe: drop then create)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), COALESCE(NEW.raw_user_meta_data->>'role', 'staff'));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
