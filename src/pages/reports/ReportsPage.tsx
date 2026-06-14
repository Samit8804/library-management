import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileSpreadsheet, FileText, Search, BookOpen, DollarSign, Users } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Table } from '../../components/ui/Table'
import { formatDate, formatCurrency } from '../../lib/utils'
import { getTransactions, getStudents, getBooks, getStudentTransactions } from '../../lib/db'
import type { Transaction, Student, Book } from '../../types'

type Tab = 'student' | 'book' | 'financial'

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('student')

  const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: 'student', label: 'Student Reports', icon: Users },
    { key: 'book', label: 'Book Reports', icon: BookOpen },
    { key: 'financial', label: 'Financial Reports', icon: DollarSign },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1">Generate and export reports</p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'student' && <StudentReports />}
      {activeTab === 'book' && <BookReports />}
      {activeTab === 'financial' && <FinancialReports />}
    </div>
  )
}

function StudentReports() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [searchResults, setSearchResults] = useState<Student[]>([])

  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: getStudents,
  })

  const { data: studentTxns } = useQuery({
    queryKey: ['student-transactions', selectedStudent?.id],
    queryFn: () => (selectedStudent ? getStudentTransactions(selectedStudent.id) : Promise.resolve([])),
    enabled: !!selectedStudent,
  })

  function handleSearch(query: string) {
    setSearchQuery(query)
    if (!query.trim() || !students) {
      setSearchResults([])
      return
    }
    const q = query.toLowerCase()
    setSearchResults(
      students.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.form_number.toLowerCase().includes(q) ||
          s.enrollment_number.toLowerCase().includes(q)
      )
    )
  }

  function exportPDF() {
    if (!selectedStudent || !studentTxns) return
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Student Report', 14, 20)
    doc.setFontSize(11)
    doc.text(`Name: ${selectedStudent.name}`, 14, 30)
    doc.text(`Form No: ${selectedStudent.form_number}`, 14, 37)
    doc.text(`Course: ${selectedStudent.course} - ${selectedStudent.branch}`, 14, 44)
    doc.text(`Total Fine: ${formatCurrency(selectedStudent.total_fine)}`, 14, 51)

    const tableData = studentTxns.map((t) => [
      t.book?.title || 'N/A',
      formatDate(t.issue_date),
      t.due_date ? formatDate(t.due_date) : 'N/A',
      t.return_date ? formatDate(t.return_date) : '-',
      t.status,
      formatCurrency(t.fine_amount),
    ])

    autoTable(doc, {
      startY: 58,
      head: [['Book', 'Issued', 'Due', 'Returned', 'Status', 'Fine']],
      body: tableData,
    })

    doc.save(`student_report_${selectedStudent.form_number}.pdf`)
    toast.success('PDF exported successfully')
  }

  const currentBooks = studentTxns?.filter((t: Transaction) => t.status === 'issued' || t.status === 'overdue') || []
  const returnedBooks = studentTxns?.filter((t: Transaction) => t.status === 'returned') || []
  const totalFines = studentTxns?.reduce((sum: number, t: Transaction) => sum + t.fine_amount, 0) || 0

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name, form number, or enrollment..."
              className="block w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-lg divide-y max-h-60 overflow-y-auto">
              {searchResults.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedStudent(s)
                    setSearchQuery(`${s.name} (${s.form_number})`)
                    setSearchResults([])
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm"
                >
                  <span className="font-medium text-gray-900">{s.name}</span>
                  <span className="text-gray-500 ml-2">{s.form_number}</span>
                  <span className="text-gray-400 ml-2">{s.course} - {s.branch}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStudent && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedStudent.name}</h3>
                  <p className="text-sm text-gray-500">{selectedStudent.form_number} | {selectedStudent.course} - {selectedStudent.branch}</p>
                </div>
                <Button onClick={exportPDF} variant="secondary" size="sm">
                  <FileText className="h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{currentBooks.length}</p>
                  <p className="text-sm text-blue-600">Current Books</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{returnedBooks.length}</p>
                  <p className="text-sm text-green-600">Returned</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">{formatCurrency(totalFines)}</p>
                  <p className="text-sm text-red-600">Total Fines</p>
                </div>
              </div>

              <h4 className="font-medium text-gray-900 mb-3">Borrowing History</h4>
              <Table
                columns={[
                  { key: 'book', header: 'Book', render: (t: Transaction) => t.book?.title || 'N/A' },
                  { key: 'issue_date', header: 'Issue Date', render: (t: Transaction) => formatDate(t.issue_date) },
                  { key: 'due_date', header: 'Due Date', render: (t: Transaction) => t.due_date ? formatDate(t.due_date) : '-' },
                  { key: 'return_date', header: 'Returned', render: (t: Transaction) => t.return_date ? formatDate(t.return_date) : '-' },
                  { key: 'status', header: 'Status', render: (t: Transaction) => (
                    <Badge variant={t.status === 'returned' ? 'success' : t.status === 'overdue' ? 'danger' : 'warning'}>
                      {t.status}
                    </Badge>
                  )},
                  { key: 'fine', header: 'Fine', render: (t: Transaction) => formatCurrency(t.fine_amount) },
                ]}
                data={studentTxns || []}
                keyExtractor={(t) => t.id}
                emptyMessage="No transactions found"
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function BookReports() {
  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: getTransactions,
  })

  const { data: books } = useQuery({
    queryKey: ['books'],
    queryFn: getBooks,
  })

  if (!transactions || !books) return null

  const borrowCount: Record<string, { count: number; book: Book }> = {}
  transactions.forEach((t: Transaction) => {
    if (t.book) {
      const key = t.book.id
      if (!borrowCount[key]) borrowCount[key] = { count: 0, book: t.book }
      borrowCount[key].count++
    }
  })

  const bookStats = Object.values(borrowCount).sort((a, b) => b.count - a.count)
  const mostBorrowed = bookStats.slice(0, 20).map((b, i) => ({ ...b, rank: i + 1 }))
  const leastBorrowed = [...bookStats].reverse().slice(0, 20).map((b, i) => ({ ...b, rank: i + 1 }))

  function exportExcel(type: 'most' | 'least' | 'inventory') {
    let data: Record<string, string | number>[]
    if (type === 'most') {
      data = mostBorrowed.map((b) => ({
        'Book ID': b.book.book_id,
        Title: b.book.title,
        Author: b.book.author,
        'Times Borrowed': b.count,
      }))
    } else if (type === 'least') {
      data = leastBorrowed.map((b) => ({
        'Book ID': b.book.book_id,
        Title: b.book.title,
        Author: b.book.author,
        'Times Borrowed': b.count,
      }))
    } else {
      data = (books || []).map((b: Book) => ({
        'Book ID': b.book_id,
        Title: b.title,
        Author: b.author,
        Category: b.category,
        'Total Copies': b.quantity,
        Available: b.available_copies,
        Status: b.available_copies === 0 ? 'Out of Stock' : b.available_copies <= 3 ? 'Low Stock' : 'In Stock',
      }))
    }

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, type)
    XLSX.writeFile(wb, `book_report_${type}.xlsx`)
    toast.success('Excel exported successfully')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Most Borrowed Books</h3>
            <Button onClick={() => exportExcel('most')} variant="secondary" size="sm">
              <FileSpreadsheet className="h-4 w-4" />
              Export to Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Table
            columns={[
              { key: 'rank', header: '#' },
              { key: 'book_id', header: 'Book ID', render: (b: { book: Book; rank: number; count: number }) => b.book.book_id },
              { key: 'title', header: 'Title', render: (b: { book: Book; rank: number; count: number }) => b.book.title },
              { key: 'author', header: 'Author', render: (b: { book: Book; rank: number; count: number }) => b.book.author },
              { key: 'count', header: 'Times Borrowed' },
            ]}
            data={mostBorrowed}
            keyExtractor={(b) => b.book.id}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Least Borrowed Books</h3>
            <Button onClick={() => exportExcel('least')} variant="secondary" size="sm">
              <FileSpreadsheet className="h-4 w-4" />
              Export to Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Table
            columns={[
              { key: 'rank', header: '#' },
              { key: 'book_id', header: 'Book ID', render: (b: { book: Book; rank: number; count: number }) => b.book.book_id },
              { key: 'title', header: 'Title', render: (b: { book: Book; rank: number; count: number }) => b.book.title },
              { key: 'author', header: 'Author', render: (b: { book: Book; rank: number; count: number }) => b.book.author },
              { key: 'count', header: 'Times Borrowed' },
            ]}
            data={leastBorrowed}
            keyExtractor={(b) => b.book.id}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Inventory Status</h3>
            <Button onClick={() => exportExcel('inventory')} variant="secondary" size="sm">
              <FileSpreadsheet className="h-4 w-4" />
              Export to Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Table
            columns={[
              { key: 'book_id', header: 'Book ID' },
              { key: 'title', header: 'Title' },
              { key: 'author', header: 'Author' },
              { key: 'quantity', header: 'Total Copies' },
              { key: 'available_copies', header: 'Available' },
              { key: 'status', header: 'Status', render: (b: Book) => (
                <Badge variant={b.available_copies === 0 ? 'danger' : b.available_copies <= 3 ? 'warning' : 'success'}>
                  {b.available_copies === 0 ? 'Out of Stock' : b.available_copies <= 3 ? 'Low Stock' : 'In Stock'}
                </Badge>
              )},
            ]}
            data={books}
            keyExtractor={(b) => b.id}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function FinancialReports() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: getTransactions,
  })

  if (!transactions) return null

  const filtered = transactions.filter((t) => {
    if (startDate && new Date(t.created_at) < new Date(startDate)) return false
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      if (new Date(t.created_at) > end) return false
    }
    return true
  })

  const totalFineCollected = filtered
    .filter((t: Transaction) => t.return_date && t.fine_amount > 0)
    .reduce((sum: number, t: Transaction) => sum + t.fine_amount, 0)

  const pendingFines = filtered
    .filter((t: Transaction) => (t.status === 'overdue' || t.status === 'issued') && t.fine_amount > 0)
    .reduce((sum: number, t: Transaction) => sum + t.fine_amount, 0)

  const totalFines = filtered.reduce((sum: number, t: Transaction) => sum + t.fine_amount, 0)

  function exportPDF() {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Financial Report', 14, 20)
    doc.setFontSize(11)
    if (startDate) doc.text(`From: ${formatDate(startDate)}`, 14, 30)
    if (endDate) doc.text(`To: ${formatDate(endDate)}`, 14, 37)

    doc.text(`Total Fine Collected: ${formatCurrency(totalFineCollected)}`, 14, 48)
    doc.text(`Pending Fines: ${formatCurrency(pendingFines)}`, 14, 55)
    doc.text(`Total Fines: ${formatCurrency(totalFines)}`, 14, 62)

    const tableData = filtered.map((t) => [
      t.student?.name || 'N/A',
      t.book?.title || 'N/A',
      formatDate(t.issue_date),
      t.return_date ? formatDate(t.return_date) : '-',
      t.status,
      formatCurrency(t.fine_amount),
    ])

    autoTable(doc, {
      startY: 70,
      head: [['Student', 'Book', 'Issued', 'Returned', 'Status', 'Fine']],
      body: tableData,
    })

    doc.save('financial_report.pdf')
    toast.success('PDF exported successfully')
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-end gap-4 mb-6">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <Button onClick={exportPDF} variant="secondary" size="sm">
            <FileText className="h-4 w-4" />
            Export PDF
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{formatCurrency(totalFineCollected)}</p>
            <p className="text-sm text-green-600">Fine Collected</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-yellow-700">{formatCurrency(pendingFines)}</p>
            <p className="text-sm text-yellow-600">Pending Fines</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalFines)}</p>
            <p className="text-sm text-blue-600">Total Fines</p>
          </div>
        </div>

        <h4 className="font-medium text-gray-900 mb-3">Transaction History</h4>
        <Table
          columns={[
            { key: 'student', header: 'Student', render: (t: Transaction) => t.student?.name || 'N/A' },
            { key: 'book', header: 'Book', render: (t: Transaction) => t.book?.title || 'N/A' },
            { key: 'issue_date', header: 'Issued', render: (t: Transaction) => formatDate(t.issue_date) },
            { key: 'return_date', header: 'Returned', render: (t: Transaction) => t.return_date ? formatDate(t.return_date) : '-' },
            { key: 'status', header: 'Status', render: (t: Transaction) => (
              <Badge variant={t.status === 'returned' ? 'success' : t.status === 'overdue' ? 'danger' : 'warning'}>
                {t.status}
              </Badge>
            )},
            { key: 'fine', header: 'Fine', render: (t: Transaction) => formatCurrency(t.fine_amount) },
          ]}
          data={filtered}
          keyExtractor={(t) => t.id}
          emptyMessage="No transactions in selected date range"
        />
      </CardContent>
    </Card>
  )
}
