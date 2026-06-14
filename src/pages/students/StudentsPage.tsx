import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search, Plus, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card, CardContent } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { Table } from '../../components/ui/Table'
import { getStudents, searchStudents, createStudent, updateStudent, deleteStudent } from '../../lib/db'
import { formatCurrency } from '../../lib/utils'
import type { Student } from '../../types'

const studentSchema = z.object({
  form_number: z.string().min(1, 'Form number is required'),
  enrollment_number: z.string().min(1, 'Enrollment number is required'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(1, 'Phone is required'),
  course: z.string().min(1, 'Course is required'),
  branch: z.string().min(1, 'Branch is required'),
  year: z.number().int().positive(),
  status: z.enum(['active', 'restricted', 'alumni']),
})

type StudentFormData = z.infer<typeof studentSchema>

const statusVariants: Record<string, 'success' | 'warning' | 'danger'> = {
  active: 'success',
  restricted: 'warning',
  alumni: 'danger',
}

export function StudentsPage() {
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Student | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { data: students, isLoading, refetch } = useQuery({
    queryKey: ['students', search],
    queryFn: () => (search ? searchStudents(search) : getStudents()),
  })

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      form_number: '',
      enrollment_number: '',
      name: '',
      email: '',
      phone: '',
      course: '',
      branch: '',
      year: 1,
      status: 'active',
    },
  })

  function openAddModal() {
    setEditingStudent(null)
    form.reset({
      form_number: '',
      enrollment_number: '',
      name: '',
      email: '',
      phone: '',
      course: '',
      branch: '',
      year: 1,
      status: 'active',
    })
    setModalOpen(true)
  }

  function openEditModal(student: Student) {
    setEditingStudent(student)
    form.reset({
      form_number: student.form_number,
      enrollment_number: student.enrollment_number,
      name: student.name,
      email: student.email,
      phone: student.phone,
      course: student.course,
      branch: student.branch,
      year: student.year,
      status: student.status,
    })
    setModalOpen(true)
  }

  async function onSubmit(data: StudentFormData) {
    setSubmitting(true)
    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, data)
        toast.success('Student updated successfully')
      } else {
        await createStudent(data)
        toast.success('Student added successfully')
      }
      setModalOpen(false)
      refetch()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return
    try {
      await deleteStudent(deleteConfirm.id)
      toast.success('Student deleted successfully')
      setDeleteConfirm(null)
      refetch()
    } catch {
      toast.error('Something went wrong')
    }
  }

  const columns = [
    { key: 'form_number', header: 'Form Number' },
    { key: 'enrollment_number', header: 'Enrollment Number' },
    { key: 'name', header: 'Name' },
    { key: 'course', header: 'Course' },
    { key: 'branch', header: 'Branch' },
    { key: 'year', header: 'Year' },
    {
      key: 'status',
      header: 'Status',
      render: (student: Student) => (
        <Badge variant={statusVariants[student.status]}>{student.status}</Badge>
      ),
    },
    {
      key: 'total_fine',
      header: 'Fine',
      render: (student: Student) => formatCurrency(student.total_fine),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (student: Student) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEditModal(student)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(student)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        <p className="text-gray-500 mt-1">Manage student records</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            placeholder="Search by name, form number, or enrollment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 pl-10 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-900"
          />
        </div>
        <Button onClick={openAddModal}>
          <Plus className="h-4 w-4" />
          Add Student
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={students || []}
            keyExtractor={(s) => s.id}
            loading={isLoading}
            emptyMessage="No students found"
          />
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingStudent ? 'Edit Student' : 'Add Student'}
        size="lg"
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Form Number"
              {...form.register('form_number')}
              error={form.formState.errors.form_number?.message}
            />
            <Input
              label="Enrollment Number"
              {...form.register('enrollment_number')}
              error={form.formState.errors.enrollment_number?.message}
            />
          </div>
          <Input
            label="Name"
            {...form.register('name')}
            error={form.formState.errors.name?.message}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              {...form.register('email')}
              error={form.formState.errors.email?.message}
            />
            <Input
              label="Phone"
              {...form.register('phone')}
              error={form.formState.errors.phone?.message}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Course"
              {...form.register('course')}
              error={form.formState.errors.course?.message}
            />
            <Input
              label="Branch"
              {...form.register('branch')}
              error={form.formState.errors.branch?.message}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Year"
              type="number"
              min={1}
              {...form.register('year', { valueAsNumber: true })}
              error={form.formState.errors.year?.message}
            />
            <Select
              label="Status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'restricted', label: 'Restricted' },
                { value: 'alumni', label: 'Alumni' },
              ]}
              {...form.register('status')}
              error={form.formState.errors.status?.message}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingStudent ? 'Update' : 'Add'} Student
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Student"
      >
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
