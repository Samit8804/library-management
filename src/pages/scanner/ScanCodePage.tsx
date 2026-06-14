import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { getBookByBookId, getBookByIsbn, getStudentByFormNumber, createBook } from '../../lib/db'
import { lookupIsbn } from '../../lib/utils'
import { Card, CardContent } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { BookOpen, User, CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react'
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
  const navigate = useNavigate()

  const [result, setResult] = useState<ScanResult>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(false)

  useEffect(() => {
    const c = code?.trim().toUpperCase()
    if (!c || c.startsWith('%') || c.startsWith('{')) {
      setError('No valid code provided')
      setLoading(false)
      return
    }

    const numeric = c.replace(/[^0-9]/g, '')
    const isIsbn = numeric.length >= 12 && /^\d+$/.test(numeric)

    async function lookup(code: string) {
      try {
        if (code.startsWith('B')) {
          const book = await getBookByBookId(code)
          if (book) { setResult({ type: 'book', data: book }); return }
        }
        if (isIsbn) {
          const book = await getBookByIsbn(numeric)
          if (book) {
            setResult({ type: 'book', data: book })
            setTimeout(() => navigate(`/issue?isbn=${numeric}`), 1500)
            return
          }
          const student = await getStudentByFormNumber(code)
          if (student) { setResult({ type: 'student', data: student }); return }
          const info = await lookupIsbn(numeric)
          if (info) {
            setCreating(true)
            try {
              const bookId = `B-${numeric.slice(-4)}`
              await createBook({
                book_id: bookId,
                isbn: numeric,
                title: info.title,
                author: info.author,
                publisher: info.publisher,
                category: 'General',
                edition: '',
                shelf_number: '',
                quantity: 1,
                available_copies: 1,
              })
              setCreated(true)
              setTimeout(() => navigate(`/issue?isbn=${numeric}`), 2000)
            } catch {
              setError('Failed to create book. Add it manually from the Books page.')
            }
            setCreating(false)
            return
          }
        }
        const student = await getStudentByFormNumber(code)
        if (student) setResult({ type: 'student', data: student })
        else setError(`Not found: "${code}"`)
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
        <CardContent className="p-6 text-center">
          {loading && (
            <div className="py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600">Looking up code...</p>
            </div>
          )}

          {creating && (
            <div className="py-8">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Book not found in library</p>
              <p className="text-sm text-gray-500 mt-1">Fetching details from OpenLibrary...</p>
            </div>
          )}

          {created && (
            <div className="py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <p className="text-green-600 font-medium text-lg mb-1">Book added successfully!</p>
              <p className="text-sm text-gray-500">Redirecting to Issue page...</p>
            </div>
          )}

          {error && (
            <div className="py-8">
              <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <p className="text-red-600 font-medium mb-2">{error}</p>
              <p className="text-sm text-gray-500 mb-4">Code: "{code}"</p>
              <Link to="/books">
                <Button>Go to Books</Button>
              </Link>
            </div>
          )}

          {result && result.type === 'book' && !created && (
            <div className="py-4">
              <BookOpen className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-green-600 mb-2">Book found! Redirecting to Issue page...</p>
              <h2 className="text-xl font-bold mb-1">{result.data.title}</h2>
              <p className="text-gray-600 mb-1">{result.data.author}</p>
              <p className="text-sm text-gray-500 mb-4">ID: {result.data.book_id} | ISBN: {result.data.isbn}</p>
              <Badge variant={result.data.available_copies > 0 ? 'success' : 'danger'}>
                {result.data.available_copies > 0 ? 'Available' : 'Issued'}
              </Badge>
              <div className="mt-4">
                <Button onClick={() => navigate(`/issue?isbn=${result.data.isbn}`)}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Issue Book Now
                </Button>
              </div>
            </div>
          )}

          {result && result.type === 'student' && (
            <div className="py-4">
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
        </CardContent>
      </Card>
    </div>
  )
}
