import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { getBookByBookId, getBookByIsbn, getStudentByFormNumber } from '../../lib/db'
import { Card, CardContent } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { BookOpen, User, CheckCircle, XCircle, Home } from 'lucide-react'
import type { Book, Student } from '../../types'

type ScanResult =
  | { type: 'book'; data: Book }
  | { type: 'student'; data: Student }
  | null

export function ScanCodePage() {
  const { code: pathCode } = useParams<{ code: string }>()
  const [searchParams] = useSearchParams()
  const queryCode = searchParams.get('code')
  const code = pathCode || queryCode

  const [result, setResult] = useState<ScanResult>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const c = code?.trim().toUpperCase()
    if (!c) {
      setError('No code provided')
      setLoading(false)
      return
    }

    const numeric = c.replace(/[^0-9]/g, '')
    const isIsbn = numeric.length >= 12 && /^\d+$/.test(numeric)

    async function lookup(code: string) {
      try {
        if (code.startsWith('B')) {
          const book = await getBookByBookId(code)
          if (book) setResult({ type: 'book', data: book })
          else setError(`Book "${code}" not found`)
        } else if (isIsbn) {
          const book = await getBookByIsbn(numeric)
          if (book) setResult({ type: 'book', data: book })
          else {
            const student = await getStudentByFormNumber(code)
            if (student) setResult({ type: 'student', data: student })
            else setError(`Not found: "${code}"`)
          }
        } else {
          const student = await getStudentByFormNumber(code)
          if (student) setResult({ type: 'student', data: student })
          else setError(`Student "${code}" not found`)
        }
      } catch {
        setError('Lookup failed')
      } finally {
        setLoading(false)
      }
    }

    lookup(c)
  }, [code])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600">Looking up code...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <p className="text-red-600 font-medium mb-2">{error}</p>
              <p className="text-sm text-gray-500 mb-4">Code: "{code}"</p>
            </div>
          )}

          {result && result.type === 'book' && (
            <div className="text-center py-4">
              <BookOpen className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <h2 className="text-xl font-bold mb-1">{result.data.title}</h2>
              <p className="text-gray-600 mb-1">{result.data.author}</p>
              <p className="text-sm text-gray-500 mb-4">ID: {result.data.book_id} | ISBN: {result.data.isbn}</p>
              <Badge variant={result.data.available_copies > 0 ? 'success' : 'danger'}>
                {result.data.available_copies > 0 ? 'Available' : 'Issued'}
              </Badge>
              <div className="flex gap-2 mt-4">
                <Link to={`/issue`} className="flex-1">
                  <Button className="w-full">Issue Book</Button>
                </Link>
                <Link to="/books" className="flex-1">
                  <Button variant="secondary" className="w-full">View Details</Button>
                </Link>
              </div>
            </div>
          )}

          {result && result.type === 'student' && (
            <div className="text-center py-4">
              <User className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <h2 className="text-xl font-bold mb-1">{result.data.name}</h2>
              <p className="text-gray-600 mb-1">Form: {result.data.form_number}</p>
              <p className="text-sm text-gray-500 mb-4">{result.data.course}{result.data.branch ? ` / ${result.data.branch}` : ''}</p>
              <Badge variant={result.data.status === 'active' ? 'success' : 'danger'}>
                {result.data.status}
              </Badge>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/dashboard">
              <Button variant="secondary">
                <Home className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          <p className="text-xs text-gray-400 text-center mt-4">
            Scan a barcode with any scanner app to look up a book or student.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
