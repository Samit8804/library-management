-- Smart Library Management System - Database Schema
-- Run this in your Supabase SQL Editor

-- 1. Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Students
CREATE TABLE students (
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

-- 3. Books
CREATE TABLE books (
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

-- 4. Transactions
CREATE TABLE transactions (
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

-- 5. Fines
CREATE TABLE fines (
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

-- 6. Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  type TEXT NOT NULL CHECK (type IN ('due_reminder', 'overdue', 'fine', 'restriction', 'general')),
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  read BOOLEAN DEFAULT false
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 7. Email Logs
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  sent_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- 8. Settings
CREATE TABLE settings (
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

-- Indexes for performance
CREATE INDEX idx_transactions_student ON transactions(student_id);
CREATE INDEX idx_transactions_book ON transactions(book_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_students_form_number ON students(form_number);
CREATE INDEX idx_students_enrollment ON students(enrollment_number);
CREATE INDEX idx_books_book_id ON books(book_id);
CREATE INDEX idx_fines_student ON fines(student_id);

-- RLS Policies
-- Enable access for authenticated users
CREATE POLICY "Authenticated users can read profiles"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Authenticated users can read students"
  ON students FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can insert students"
  ON students FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can update students"
  ON students FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can delete students"
  ON students FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Books policies
CREATE POLICY "Authenticated users can read books"
  ON books FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can insert books"
  ON books FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can update books"
  ON books FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can delete books"
  ON books FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Transactions policies
CREATE POLICY "Authenticated users can read transactions"
  ON transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert transactions"
  ON transactions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')));

CREATE POLICY "Admin can update transactions"
  ON transactions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Settings policies
CREATE POLICY "Authenticated users can read settings"
  ON settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can update settings"
  ON settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Email logs policies
CREATE POLICY "Authenticated users can read email_logs"
  ON email_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert email_logs"
  ON email_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- Notifications policies
CREATE POLICY "Authenticated users can read notifications"
  ON notifications FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Function: Issue book
CREATE OR REPLACE FUNCTION issue_book(
  p_student_id UUID,
  p_book_id TEXT,
  p_issued_by UUID,
  p_due_date DATE
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_book books%ROWTYPE;
  v_student students%ROWTYPE;
  v_settings RECORD;
  v_max_books INTEGER;
  v_current_issued INTEGER;
BEGIN
  -- Get book
  SELECT * INTO v_book FROM books WHERE book_id = p_book_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Book not found';
  END IF;

  -- Check availability
  IF v_book.available_copies <= 0 THEN
    RAISE EXCEPTION 'No available copies';
  END IF;

  -- Get student
  SELECT * INTO v_student FROM students WHERE id = p_student_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  -- Check student status
  IF v_student.status = 'restricted' THEN
    RAISE EXCEPTION 'Student is restricted';
  END IF;

  IF v_student.status = 'alumni' THEN
    RAISE EXCEPTION 'Student is alumni';
  END IF;

  -- Get max books setting
  SELECT value::INTEGER INTO v_max_books FROM settings WHERE key = 'max_books_per_student';

  -- Count currently issued books
  SELECT COUNT(*) INTO v_current_issued FROM transactions
    WHERE student_id = p_student_id AND status IN ('issued', 'overdue');

  IF v_current_issued >= v_max_books THEN
    RAISE EXCEPTION 'Student already has maximum books issued';
  END IF;

  -- Check fine threshold
  IF v_student.total_fine >= (SELECT value::NUMERIC FROM settings WHERE key = 'max_fine') THEN
    RAISE EXCEPTION 'Student fine exceeds maximum limit';
  END IF;

  -- Update book
  UPDATE books SET available_copies = available_copies - 1 WHERE book_id = p_book_id;

  -- Create transaction
  INSERT INTO transactions (student_id, book_id, due_date, issued_by)
  VALUES (p_student_id, p_book_id, p_due_date, p_issued_by);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function: Return book
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
  -- Get transaction
  SELECT * INTO v_txn FROM transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_txn.status = 'returned' THEN
    RAISE EXCEPTION 'Book already returned';
  END IF;

  -- Get settings
  SELECT value::NUMERIC INTO v_fine_per_day FROM settings WHERE key = 'fine_per_day';
  SELECT value::INTEGER INTO v_grace_period FROM settings WHERE key = 'grace_period';
  SELECT value::NUMERIC INTO v_max_fine FROM settings WHERE key = 'max_fine';

  -- Calculate days overdue
  v_days_overdue := GREATEST(0, (CURRENT_DATE - v_txn.due_date) - v_grace_period);

  -- Calculate fine
  v_fine_amount := LEAST(v_days_overdue * v_fine_per_day, v_max_fine);

  -- Update transaction
  UPDATE transactions
  SET return_date = CURRENT_DATE,
      status = CASE WHEN v_days_overdue > 0 THEN 'overdue' ELSE 'returned' END,
      fine_amount = v_fine_amount
  WHERE id = p_transaction_id;

  -- Update book availability
  UPDATE books SET available_copies = available_copies + 1
  WHERE book_id = v_txn.book_id;

  -- Update student fine
  IF v_fine_amount > 0 THEN
    UPDATE students SET total_fine = total_fine + v_fine_amount WHERE id = v_txn.student_id;

    INSERT INTO fines (student_id, transaction_id, amount, days_overdue)
    VALUES (v_txn.student_id, p_transaction_id, v_fine_amount, v_days_overdue);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'fine_amount', v_fine_amount,
    'days_overdue', v_days_overdue
  );
END;
$$;

-- Function: Get dashboard stats
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result JSONB;
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

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
