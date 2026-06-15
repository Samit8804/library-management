import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Search, User, BookOpen, Calendar, AlertCircle, CheckCircle, ArrowRight, X, ScanLine } from 'lucide-react'
import toast from 'react-hot-toast'
import { addDays, format } from 'date-fns'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../../lib/auth'
import { searchStudents, searchBooks, issueBook, getBookByIsbn } from '../../lib/db'
import { formatDate } from '../../lib/utils'
import type { Student, Book } from '../../types'

export function IssuePage() {
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()

  const [studentQuery, setStudentQuery] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  const [bookQuery, setBookQuery] = useState('')
  const [books, setBooks] = useState<Book[]>([])
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)

  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 14), 'yyyy-MM-dd'))

  const [searchingStudent, setSearchingStudent] = useState(false)
  const [searchingBook, setSearchingBook] = useState(false)

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'BARCODE_SCANNED' && e.data?.barcode) {
        setBookQuery(e.data.barcode)
        handleBookSearch(e.data.barcode)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
    const isbn = searchParams.get('isbn')
    if (isbn) {
      setBookQuery(isbn)
      getBookByIsbn(isbn)
        .then((book) => {
          if (book) {
            setBooks([book])
            setSelectedBook(book)
          }
        })
        .catch(() => {})
    }
  }, [searchParams])

  async function handleBookSearch(barcodeValue?: string) {
    const query = (barcodeValue ?? bookQuery).trim()
    if (!query) return
    setSearchingBook(true)
    try {
      const results = await searchBooks(query)
      setBooks(results)
    } catch {
      toast.error('Failed to search books')
    } finally {
      setSearchingBook(false)
    }
  }

  function openScanner() {
    const w = window.open('/scanner-reader', 'BarcodeScanner', 'width=500,height=700,scrollbars=no')
    if (!w) toast.error('Popup blocked. Allow popups for this site.')
  }

  async function handleStudentSearch() {
    if (!studentQuery.trim()) return
    setSearchingStudent(true)
    try {
      const results = await searchStudents(studentQuery.trim())
      setStudents(results)
    } catch {
      toast.error('Failed to search students')
    } finally {
      setSearchingStudent(false)
    }
  }

  const issueMutation = useMutation({
    mutationFn: () => {
      if (!selectedStudent || !selectedBook || !profile) throw new Error('Missing data')
      return issueBook(selectedStudent.id, selectedBook.book_id, profile.id, dueDate)
    },
    onSuccess: () => {
      toast.success('Book issued successfully')
      setSelectedStudent(null)
      setSelectedBook(null)
      setStudents([])
      setBooks([])
      setStudentQuery('')
      setBookQuery('')
      setDueDate(format(addDays(new Date(), 14), 'yyyy-MM-dd'))
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to issue book')
    },
  })

  function canIssue(): string | null {
    if (!selectedStudent || !selectedBook) return 'Select both student and book'
    if (selectedStudent.status !== 'active') return 'Student is not active'
    if (selectedStudent.total_fine > 0) return `Student has outstanding fine of ₹${selectedStudent.total_fine}`
    if (selectedBook.available_copies <= 0) return 'No copies available'
    return null
  }

  const issueError = canIssue()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Issue Book</h1>
        <p className="text-text-muted mt-1">Issue books to students</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold text-text-primary">Identify Student</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name, form number, or enrollment..."
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStudentSearch()}
              />
              <Button onClick={handleStudentSearch} loading={searchingStudent}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {students.length > 0 && !selectedStudent && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {students.map((student) => (
                  <Card
                    key={student.id}
                    className="border-indigo-100 hover:border-indigo-300"
                    onClick={() => setSelectedStudent(student)}
                  >
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-text-primary">{student.name}</p>
                          <p className="text-sm text-text-muted">{student.form_number}</p>
                        </div>
                        <Badge variant={student.status === 'active' ? 'success' : 'danger'}>
                          {student.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {selectedStudent && (
              <Card className="border-indigo-300 bg-accent/10">
                <CardContent className="py-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-text-primary">{selectedStudent.name}</p>
                        <Badge variant={selectedStudent.status === 'active' ? 'success' : 'danger'}>
                          {selectedStudent.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-text-secondary">Form: {selectedStudent.form_number}</p>
                      <p className="text-sm text-text-secondary">Enrollment: {selectedStudent.enrollment_number}</p>
                      <p className="text-sm text-text-secondary">
                        {selectedStudent.course} - {selectedStudent.branch} (Year {selectedStudent.year})
                      </p>
                      {selectedStudent.total_fine > 0 && (
                        <p className="text-sm font-medium text-red-600">
                          Outstanding Fine: ₹{selectedStudent.total_fine}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold text-text-primary">Scan / Select Book</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by title, author, ISBN, or book ID..."
                value={bookQuery}
                onChange={(e) => setBookQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBookSearch()}
              />
              <Button onClick={() => handleBookSearch()} loading={searchingBook}>
                <Search className="h-4 w-4" />
              </Button>
              <Button onClick={openScanner} title="Scan barcode">
                <ScanLine className="h-4 w-4" />
              </Button>
            </div>

            {books.length > 0 && !selectedBook && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {books.map((book) => (
                  <Card
                    key={book.id}
                    className="border-indigo-100 hover:border-indigo-300"
                    onClick={() => setSelectedBook(book)}
                  >
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-text-primary">{book.title}</p>
                          <p className="text-sm text-text-muted">{book.author}</p>
                        </div>
                        <Badge variant={book.available_copies > 0 ? 'success' : 'danger'}>
                          {book.available_copies} / {book.quantity}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {selectedBook && (
              <Card className="border-indigo-300 bg-accent/10">
                <CardContent className="py-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold text-text-primary">{selectedBook.title}</p>
                      <p className="text-sm text-text-secondary">by {selectedBook.author}</p>
                      <p className="text-sm text-text-secondary">ISBN: {selectedBook.isbn}</p>
                      <p className="text-sm text-text-secondary">Book ID: {selectedBook.book_id}</p>
                      <Badge variant={selectedBook.available_copies > 0 ? 'success' : 'danger'}>
                        {selectedBook.available_copies} copy(ies) available
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedBook(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedStudent && selectedBook && (
        <Card className="border-indigo-400">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-text-primary">Confirm Issue</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-text-muted">Student</p>
                <p className="font-medium text-text-primary">{selectedStudent.name}</p>
                <p className="text-sm text-text-secondary">{selectedStudent.form_number}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-text-muted">Book</p>
                <p className="font-medium text-text-primary">{selectedBook.title}</p>
                <p className="text-sm text-text-secondary">{selectedBook.author}</p>
              </div>
            </div>

            <div className="flex items-end gap-4">
              <div className="w-full max-w-xs">
                <Input
                  label="Due Date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="text-sm text-text-muted pb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                {formatDate(dueDate)}
              </div>
            </div>

            {issueError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {issueError}
              </div>
            )}

            <Button
              onClick={() => issueMutation.mutate()}
              disabled={!!issueError}
              loading={issueMutation.isPending}
              size="lg"
            >
              <ArrowRight className="h-4 w-4" />
              Issue Book
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
