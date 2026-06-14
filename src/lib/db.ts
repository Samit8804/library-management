import { supabase } from './supabase'
import type { Book, Student, Transaction, Setting, DashboardStats } from '../types'

// Books
export async function getBooks() {
  const { data } = await supabase.from('books').select('*').order('created_at', { ascending: false })
  return data as Book[]
}

export async function getBook(id: string) {
  const { data } = await supabase.from('books').select('*').eq('id', id).single()
  return data as Book
}

export async function getBookByBookId(bookId: string) {
  const { data } = await supabase.from('books').select('*').eq('book_id', bookId).single()
  return data as Book
}

export async function getBookByIsbn(isbn: string) {
  const { data } = await supabase.from('books').select('*').eq('isbn', isbn).single()
  return data as Book
}

export async function createBook(book: Omit<Book, 'id' | 'created_at'>) {
  const { data } = await supabase.from('books').insert(book).select().single()
  return data as Book
}

export async function updateBook(id: string, updates: Partial<Book>) {
  const { data } = await supabase.from('books').update(updates).eq('id', id).select().single()
  return data as Book
}

export async function deleteBook(id: string) {
  await supabase.from('books').delete().eq('id', id)
}

export async function searchBooks(query: string) {
  const { data } = await supabase
    .from('books')
    .select('*')
    .or(`title.ilike.%${query}%,author.ilike.%${query}%,isbn.ilike.%${query}%,book_id.ilike.%${query}%`)
  return data as Book[]
}

// Students
export async function getStudents() {
  const { data } = await supabase.from('students').select('*').order('created_at', { ascending: false })
  return data as Student[]
}

export async function getStudent(id: string) {
  const { data } = await supabase.from('students').select('*').eq('id', id).single()
  return data as Student
}

export async function createStudent(student: Omit<Student, 'id' | 'created_at' | 'total_fine'>) {
  const { data } = await supabase.from('students').insert(student).select().single()
  return data as Student
}

export async function updateStudent(id: string, updates: Partial<Student>) {
  const { data } = await supabase.from('students').update(updates).eq('id', id).select().single()
  return data as Student
}

export async function deleteStudent(id: string) {
  await supabase.from('students').delete().eq('id', id)
}

export async function searchStudents(query: string) {
  const { data } = await supabase
    .from('students')
    .select('*')
    .or(`name.ilike.%${query}%,form_number.ilike.%${query}%,enrollment_number.ilike.%${query}%`)
  return data as Student[]
}

export async function getStudentByFormNumber(formNumber: string) {
  const { data } = await supabase.from('students').select('*').eq('form_number', formNumber).single()
  return data as Student
}

// Transactions
export async function getTransactions() {
  const { data } = await supabase
    .from('transactions')
    .select('*, student:students(*), book:books(*)')
    .order('created_at', { ascending: false })
  return data as Transaction[]
}

export async function getStudentTransactions(studentId: string) {
  const { data } = await supabase
    .from('transactions')
    .select('*, book:books(*)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  return data as Transaction[]
}

export async function getActiveTransactions() {
  const { data } = await supabase
    .from('transactions')
    .select('*, student:students(*), book:books(*)')
    .in('status', ['issued', 'overdue'])
    .order('created_at', { ascending: false })
  return data as Transaction[]
}

export async function issueBook(studentId: string, bookId: string, issuedBy: string, dueDate: string) {
  const { data, error } = await supabase.rpc('issue_book', {
    p_student_id: studentId,
    p_book_id: bookId,
    p_issued_by: issuedBy,
    p_due_date: dueDate,
  })
  if (error) throw error
  return data
}

export async function returnBook(transactionId: string) {
  const { data, error } = await supabase.rpc('return_book', {
    p_transaction_id: transactionId,
  })
  if (error) throw error
  return data
}

export async function getTransactionByBookId(bookId: string) {
  const { data } = await supabase
    .from('transactions')
    .select('*, student:students(*), book:books(*)')
    .eq('book_id', bookId)
    .in('status', ['issued', 'overdue'])
    .single()
  return data as Transaction | null
}

// Settings
export async function getSettings() {
  const { data } = await supabase.from('settings').select('*')
  return data as Setting[]
}

export async function getSetting(key: string) {
  const { data } = await supabase.from('settings').select('value').eq('key', key).single()
  return data?.value as string
}

export async function updateSetting(key: string, value: string) {
  const { data } = await supabase.from('settings').upsert({ key, value }).select().single()
  return data as Setting
}

// Dashboard Stats
export async function getDashboardStats() {
  const { data } = await supabase.rpc('get_dashboard_stats')
  return data as DashboardStats
}

// Realtime subscription helper
export function subscribeToTable(table: string, callback: (payload: any) => void) {
  return supabase
    .channel(`${table}_changes`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => callback(payload))
    .subscribe()
}
