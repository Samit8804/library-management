import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Search, BookOpen, User, Calendar, AlertCircle, CheckCircle, ScanLine } from 'lucide-react'
import toast from 'react-hot-toast'
import { differenceInDays } from 'date-fns'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { searchBooks, getTransactionByBookId, returnBook } from '../../lib/db'
import { formatDate, formatCurrency } from '../../lib/utils'
import type { Book, Transaction } from '../../types'

const FINE_PER_DAY = 5
const GRACE_PERIOD = 2

export function ReturnPage() {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [book, setBook] = useState<Book | null>(null)

  function calculateFine(dueDate: string): { daysOverdue: number; fine: number } {
    const today = new Date()
    const due = new Date(dueDate)
    const diff = differenceInDays(today, due)
    const daysOverdue = Math.max(0, diff)
    const chargeableDays = Math.max(0, daysOverdue - GRACE_PERIOD)
    return { daysOverdue, fine: chargeableDays * FINE_PER_DAY }
  }

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'BARCODE_SCANNED' && e.data?.barcode) {
        setQuery(e.data.barcode)
        handleSearch(e.data.barcode)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  function openScanner() {
    const w = window.open('/scanner-reader', 'BarcodeScanner', 'width=500,height=700,scrollbars=no')
    if (!w) toast.error('Popup blocked. Allow popups for this site.')
  }

  async function handleSearch(barcodeValue?: string) {
    const q = (barcodeValue ?? query).trim()
    if (!q) return
    setSearching(true)
    setTransaction(null)
    setBook(null)
    try {
      const books = await searchBooks(q)
      if (books.length === 0) {
        toast.error('No books found')
        return
      }
      const found = books[0]
      setBook(found)
      const txn = await getTransactionByBookId(found.id)
      if (!txn) {
        toast.error('No active transaction found for this book')
        return
      }
      setTransaction(txn)
    } catch {
      toast.error('Failed to search')
    } finally {
      setSearching(false)
    }
  }

  const returnMutation = useMutation({
    mutationFn: async () => {
      if (!transaction) throw new Error('No transaction')
      const result = await returnBook(transaction.id)
      return result as { fine_amount: number }
    },
    onSuccess: (data) => {
      const fine = data?.fine_amount ?? 0
      if (fine > 0) {
        toast.success(`Book returned successfully. Fine collected: ${formatCurrency(fine)}`)
      } else {
        toast.success('Book returned successfully')
      }
      setTransaction(null)
      setBook(null)
      setQuery('')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to return book')
    },
  })

  const fineInfo = transaction ? calculateFine(transaction.due_date) : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Return Book</h1>
        <p className="text-text-muted mt-1">Process book returns</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold text-text-primary">Search Book</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 max-w-lg">
            <Input
              placeholder="Search by book ID, title, or ISBN..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={() => handleSearch()} loading={searching}>
              <Search className="h-4 w-4" />
            </Button>
            <Button onClick={openScanner} title="Scan barcode">
              <ScanLine className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {book && !transaction && (
        <Card>
          <CardContent className="py-8 text-center text-text-muted">
            <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-text-primary">{book.title}</p>
            <p className="text-sm">No active transaction found for this book</p>
          </CardContent>
        </Card>
      )}

      {transaction && book && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-semibold text-text-primary">Book Details</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-semibold text-text-primary text-lg">{book.title}</p>
              <p className="text-sm text-text-secondary">by {book.author}</p>
              <p className="text-sm text-text-secondary">ISBN: {book.isbn}</p>
              <p className="text-sm text-text-secondary">Book ID: {book.book_id}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-semibold text-text-primary">Borrower Details</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {transaction.student && (
                <>
                  <p className="font-semibold text-text-primary">{transaction.student.name}</p>
                  <p className="text-sm text-text-secondary">Form: {transaction.student.form_number}</p>
                  <p className="text-sm text-text-secondary">
                    {transaction.student.course} - {transaction.student.branch}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-semibold text-text-primary">Transaction Details</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-text-muted">Issue Date</p>
                  <p className="font-medium text-text-primary">{formatDate(transaction.issue_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-text-muted">Due Date</p>
                  <p className="font-medium text-text-primary">{formatDate(transaction.due_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-text-muted">Days Overdue</p>
                  <p className={`font-medium ${fineInfo && fineInfo.daysOverdue > GRACE_PERIOD ? 'text-red-600' : 'text-green-600'}`}>
                    {fineInfo ? Math.max(0, fineInfo.daysOverdue - GRACE_PERIOD) : 0} days
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-muted">Fine Amount</p>
                  <p className={`font-medium ${fineInfo && fineInfo.fine > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {fineInfo && fineInfo.fine > 0 ? formatCurrency(fineInfo.fine) : 'No fine'}
                  </p>
                </div>
              </div>

              {fineInfo && fineInfo.daysOverdue > GRACE_PERIOD && (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  Book is overdue by {fineInfo.daysOverdue} days. Fine of {formatCurrency(fineInfo.fine)} applies (₹{FINE_PER_DAY}/day after {GRACE_PERIOD}-day grace period).
                </div>
              )}

              <Button
                onClick={() => returnMutation.mutate()}
                loading={returnMutation.isPending}
                size="lg"
              >
                <CheckCircle className="h-4 w-4" />
                Return Book
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
