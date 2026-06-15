-- Run this entire file in Supabase SQL Editor

-- 1. Add book_uuid column for proper book joins
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS book_uuid UUID REFERENCES books(id);

-- 2. Backfill book_uuid for existing transactions
UPDATE transactions t
SET book_uuid = b.id
FROM books b
WHERE t.book_id = b.book_id
  AND t.book_uuid IS NULL;

-- 3. RLS policies for email_logs
CREATE POLICY "Authenticated users can read email_logs"
  ON email_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert email_logs"
  ON email_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 4. RLS policies for notifications
CREATE POLICY "Authenticated users can read notifications"
  ON notifications FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT TO authenticated WITH CHECK (true);
