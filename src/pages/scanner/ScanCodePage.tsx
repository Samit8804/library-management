import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { getBookByBookId, getBookByIsbn, getStudentByFormNumber, createBook } from '../../lib/db'
import { Card, CardContent } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { BookOpen, User, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
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
  const [saving, setSaving] = useState(false)

  const [isbn, setIsbn] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editAuthor, setEditAuthor] = useState('')
  const [editPublisher, setEditPublisher] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editShelf, setEditShelf] = useState('')
  const [editBookId, setEditBookId] = useState('')

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
          if (book) { setResult({ type: 'book', data: book }); setLoading(false); return }
        }
        if (isIsbn) {
          const book = await getBookByIsbn(numeric)
          if (book) {
            setResult({ type: 'book', data: book })
            setLoading(false)
            setTimeout(() => navigate(`/issue?isbn=${numeric}`), 1500)
            return
          }
          setIsbn(numeric)
          setEditBookId(`B-${numeric.slice(-4)}`)
          setEditCategory('General')
          setLoading(false)
          return
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

  async function handleCreate() {
    if (!isbn) return
    setSaving(true)
    try {
      await createBook({
        book_id: editBookId || `B-${isbn.slice(-4)}`,
        isbn,
        title: editTitle || 'Untitled',
        author: editAuthor || 'Unknown',
        publisher: editPublisher || 'Unknown',
        category: editCategory || 'General',
        edition: '',
        shelf_number: editShelf,
        quantity: 1,
        available_copies: 1,
      })
      toast.success('Book added!')
      navigate(`/issue?isbn=${isbn}`)
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          {loading && (
            <div className="py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-text-secondary">Looking up code...</p>
            </div>
          )}

          {error && (
            <div className="py-8">
              <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <p className="text-red-600 font-medium mb-2">{error}</p>
              <p className="text-sm text-text-muted mb-4">Code: "{code}"</p>
              <Link to="/books"><Button>Go to Books</Button></Link>
            </div>
          )}

          {result && result.type === 'book' && (
            <div className="py-4">
              <BookOpen className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-green-600 mb-2">Book found! Redirecting...</p>
              <h2 className="text-xl font-bold mb-1">{result.data.title}</h2>
              <p className="text-text-secondary mb-1">{result.data.author}</p>
              <p className="text-sm text-text-muted mb-4">ID: {result.data.book_id} | ISBN: {result.data.isbn}</p>
              <Badge variant={result.data.available_copies > 0 ? 'success' : 'danger'}>
                {result.data.available_copies > 0 ? 'Available' : 'Issued'}
              </Badge>
              <div className="mt-4">
                <Button onClick={() => navigate(`/issue?isbn=${result.data.isbn}`)}>
                  <ArrowRight className="h-4 w-4 mr-2" /> Issue Book Now
                </Button>
              </div>
            </div>
          )}

          {result && result.type === 'student' && (
            <div className="py-4">
              <User className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <h2 className="text-xl font-bold mb-1">{result.data.name}</h2>
              <p className="text-text-secondary mb-1">Form: {result.data.form_number}</p>
              <Badge variant={result.data.status === 'active' ? 'success' : 'danger'}>{result.data.status}</Badge>
            </div>
          )}

          {isbn && !result && (
            <div className="py-4 text-left">
              <h2 className="text-lg font-semibold mb-1">Add New Book</h2>
              <p className="text-sm text-text-muted mb-4">ISBN detected — enter the details below:</p>
              <div className="space-y-3">
                <Input label="Book ID" value={editBookId} onChange={(e) => setEditBookId(e.target.value)} />
                <Input label="ISBN" value={isbn} disabled />
                <Input label="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Book title" />
                <Input label="Author" value={editAuthor} onChange={(e) => setEditAuthor(e.target.value)} placeholder="Author name" />
                <Input label="Publisher" value={editPublisher} onChange={(e) => setEditPublisher(e.target.value)} placeholder="Publisher" />
                <Input label="Category" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="e.g. Fiction, Science, History" />
                <Input label="Shelf Number" value={editShelf} onChange={(e) => setEditShelf(e.target.value)} placeholder="e.g. A-12" />
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleCreate} loading={saving} className="flex-1">
                  <CheckCircle className="h-4 w-4 mr-2" /> Save & Issue
                </Button>
                <Link to="/books"><Button variant="secondary">Cancel</Button></Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
