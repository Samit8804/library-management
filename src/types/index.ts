export type Role = 'admin' | 'staff' | 'guest'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  created_at: string
}

export interface Student {
  id: string
  form_number: string
  enrollment_number: string
  name: string
  email: string
  phone: string
  course: string
  branch: string
  year: number
  status: 'active' | 'restricted' | 'alumni'
  created_at: string
  total_fine: number
}

export interface Book {
  id: string
  book_id: string
  isbn: string
  title: string
  author: string
  publisher: string
  category: string
  edition: string
  shelf_number: string
  quantity: number
  available_copies: number
  created_at: string
}

export interface Transaction {
  id: string
  student_id: string
  book_id: string
  book_uuid?: string
  issue_date: string
  due_date: string
  return_date: string | null
  status: 'issued' | 'returned' | 'overdue' | 'lost'
  fine_amount: number
  issued_by: string
  created_at: string
  student?: Student
  book?: Book
}

export interface Fine {
  id: string
  student_id: string
  transaction_id: string
  amount: number
  days_overdue: number
  paid: boolean
  paid_at: string | null
  created_at: string
}

export interface Notification {
  id: string
  student_id: string
  type: 'due_reminder' | 'overdue' | 'fine' | 'restriction' | 'general'
  message: string
  sent_at: string
  read: boolean
}

export interface EmailLog {
  id: string
  recipient: string
  subject: string
  status: 'sent' | 'failed'
  sent_at: string
}

export interface Setting {
  id: string
  key: string
  value: string
  updated_at: string
}

export interface DashboardStats {
  total_books: number
  available_books: number
  issued_books: number
  overdue_books: number
  lost_books: number
  total_students: number
  total_fine: number
  today_transactions: number
}
