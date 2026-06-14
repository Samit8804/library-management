-- Add book_uuid FK column for proper Supabase joins
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS book_uuid UUID REFERENCES books(id);

-- Update issue_book function to populate book_uuid
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
  INSERT INTO transactions (student_id, book_id, book_uuid, due_date, issued_by)
  VALUES (p_student_id, p_book_id, v_book.id, p_due_date, p_issued_by);
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Backfill book_uuid for existing rows (pairs book_id TEXT → books.id UUID)
UPDATE transactions t
SET book_uuid = b.id
FROM books b
WHERE t.book_id = b.book_id
  AND t.book_uuid IS NULL;
