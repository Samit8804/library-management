import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Search, ScanLine } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card, CardContent } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Table } from '../../components/ui/Table'
import { getBooks, searchBooks, createBook, updateBook, deleteBook } from '../../lib/db'
import { lookupIsbn } from '../../lib/utils'
import type { Book } from '../../types'

const bookSchema = z.object({
  book_id: z.string().min(1, 'Book ID is required'),
  isbn: z.string().min(1, 'ISBN is required'),
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  publisher: z.string().min(1, 'Publisher is required'),
  category: z.string().min(1, 'Category is required'),
  edition: z.string(),
  shelf_number: z.string().min(1, 'Shelf number is required'),
  quantity: z.number().min(0, 'Quantity must be 0 or more'),
  available_copies: z.number().min(0, 'Available copies must be 0 or more'),
})

type BookFormData = z.infer<typeof bookSchema>

function getAvailabilityBadge(count: number) {
  if (count === 0) return <Badge variant="danger">0</Badge>
  if (count < 5) return <Badge variant="warning">{count}</Badge>
  return <Badge variant="success">{count}</Badge>
}

export function BooksPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [scanningIsbn, setScanningIsbn] = useState(false)

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'BARCODE_SCANNED' && e.data?.barcode && !editingBook) {
        setScanningIsbn(true)
        resetForm()
        setModalOpen(true)
        lookupIsbn(e.data.barcode)
          .then((info) => {
            if (info) {
              form.setValue('isbn', info.isbn)
              form.setValue('title', info.title)
              form.setValue('author', info.author)
              form.setValue('publisher', info.publisher)
            }
          })
          .catch(() => toast.error('Failed to look up book info'))
          .finally(() => setScanningIsbn(false))
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [editingBook])

  function openBarcodeScanner() {
    const w = window.open('/scanner-reader', 'BarcodeScanner', 'width=500,height=700,scrollbars=no')
    if (!w) toast.error('Popup blocked. Allow popups for this site.')
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data: books, isLoading } = useQuery({
    queryKey: ['books', debouncedSearch],
    queryFn: () => (debouncedSearch ? searchBooks(debouncedSearch) : getBooks()),
  })

  const form = useForm<BookFormData>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      book_id: '',
      isbn: '',
      title: '',
      author: '',
      publisher: '',
      category: '',
      edition: '',
      shelf_number: '',
      quantity: 1,
      available_copies: 1,
    },
  })

  const resetForm = useCallback(() => {
    form.reset({
      book_id: '',
      isbn: '',
      title: '',
      author: '',
      publisher: '',
      category: '',
      edition: '',
      shelf_number: '',
      quantity: 1,
      available_copies: 1,
    })
  }, [form])

  const openAddModal = () => {
    setEditingBook(null)
    resetForm()
    setModalOpen(true)
  }

  const openEditModal = (book: Book) => {
    setEditingBook(book)
    form.reset({
      book_id: book.book_id,
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      category: book.category,
      edition: book.edition || '',
      shelf_number: book.shelf_number,
      quantity: book.quantity,
      available_copies: book.available_copies,
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingBook(null)
    resetForm()
  }

  const createMutation = useMutation({
    mutationFn: (data: BookFormData) =>
      createBook({
        book_id: data.book_id,
        isbn: data.isbn,
        title: data.title,
        author: data.author,
        publisher: data.publisher,
        category: data.category,
        edition: data.edition || '',
        shelf_number: data.shelf_number,
        quantity: data.quantity,
        available_copies: data.quantity,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      toast.success('Book added successfully')
      closeModal()
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to add book')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: BookFormData }) =>
      updateBook(id, {
        book_id: data.book_id,
        isbn: data.isbn,
        title: data.title,
        author: data.author,
        publisher: data.publisher,
        category: data.category,
        edition: data.edition || '',
        shelf_number: data.shelf_number,
        quantity: data.quantity,
        available_copies: data.available_copies,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      toast.success('Book updated successfully')
      closeModal()
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update book')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      toast.success('Book deleted successfully')
      setDeleteId(null)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete book')
    },
  })

  const onSubmit = (data: BookFormData) => {
    if (editingBook) {
      updateMutation.mutate({ id: editingBook.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Books</h1>
          <p className="text-text-muted mt-1">Manage book inventory</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="h-4 w-4" />
          Add Book
        </Button>
        <Button onClick={openBarcodeScanner} variant="secondary" loading={scanningIsbn}>
          <ScanLine className="h-4 w-4" />
          Scan Barcode
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search by title, author, ISBN, or Book ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-lg border border-border pl-10 pr-3 py-2 text-sm shadow-sm focus:border-accent/50 focus:ring-1 focus:ring-accent/30"
            />
          </div>

          <details className="mb-4 text-sm text-text-muted">
            <summary className="cursor-pointer hover:text-gray-700">Using an external barcode scanner app?</summary>
            <div className="mt-2 p-3 bg-surface rounded-lg text-xs space-y-1">
              <p>Install <strong>QR &amp; Barcode Scanner</strong> from Play Store.</p>
              <p>Set URL template to: <code className="bg-gray-200 px-1 rounded">https://library-management-flame-iota.vercel.app/scan/%s</code></p>
              <p>When you scan a book, it will open the site and look up the book by ISBN.</p>
              <p>To add new books, use the <strong>Scan Barcode</strong> button above instead.</p>
            </div>
          </details>

          <Table
            columns={[
              { key: 'book_id', header: 'Book ID' },
              { key: 'isbn', header: 'ISBN' },
              { key: 'title', header: 'Title' },
              { key: 'author', header: 'Author' },
              { key: 'publisher', header: 'Publisher' },
              { key: 'category', header: 'Category' },
              { key: 'edition', header: 'Edition' },
              { key: 'shelf_number', header: 'Shelf' },
              { key: 'quantity', header: 'Qty' },
              {
                key: 'available_copies',
                header: 'Available',
                render: (book: Book) => getAvailabilityBadge(book.available_copies),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (book: Book) => (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(book)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(book.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ),
              },
            ]}
            data={books || []}
            keyExtractor={(book: Book) => book.id}
            loading={isLoading}
            emptyMessage="No books found"
          />
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={closeModal} title={editingBook ? 'Edit Book' : 'Add Book'} size="xl">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Book ID"
              placeholder="e.g. B-001"
              error={form.formState.errors.book_id?.message}
              {...form.register('book_id')}
            />
            <Input
              label="ISBN"
              placeholder="e.g. 978-3-16-148410-0"
              error={form.formState.errors.isbn?.message}
              {...form.register('isbn')}
            />
          </div>
          <Input
            label="Title"
            placeholder="Book title"
            error={form.formState.errors.title?.message}
            {...form.register('title')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Author"
              placeholder="Author name"
              error={form.formState.errors.author?.message}
              {...form.register('author')}
            />
            <Input
              label="Publisher"
              placeholder="Publisher name"
              error={form.formState.errors.publisher?.message}
              {...form.register('publisher')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Category"
              placeholder="e.g. Fiction"
              error={form.formState.errors.category?.message}
              {...form.register('category')}
            />
            <Input
              label="Edition"
              placeholder="e.g. 2nd"
              error={form.formState.errors.edition?.message}
              {...form.register('edition')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Shelf Number"
              placeholder="e.g. A-12"
              error={form.formState.errors.shelf_number?.message}
              {...form.register('shelf_number')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity"
              type="number"
              min={0}
              error={form.formState.errors.quantity?.message}
              {...form.register('quantity', { valueAsNumber: true })}
            />
            <Input
              label="Available Copies"
              type="number"
              min={0}
              error={form.formState.errors.available_copies?.message}
              {...form.register('available_copies', { valueAsNumber: true })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingBook ? 'Update Book' : 'Add Book'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Confirm Delete"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Are you sure you want to delete this book? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (deleteId) deleteMutation.mutate(deleteId)
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
