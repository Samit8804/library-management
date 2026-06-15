import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Send, Mail, Users, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { Table } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { getStudents } from '../../lib/db'
import { formatDate } from '../../lib/utils'
import { supabase } from '../../lib/supabase'
import type { EmailLog, Student } from '../../types'

type Audience = 'all_overdue' | 'all_fines' | 'custom'

export function NotificationsPage() {
  const [audience, setAudience] = useState<Audience>('all_overdue')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Student[]>([])
  const [showStudentPicker, setShowStudentPicker] = useState(false)

  const { data: emailLogs } = useQuery({
    queryKey: ['email-logs'],
    queryFn: async () => {
      const { data } = await supabase.from('email_logs').select('*').order('sent_at', { ascending: false })
      return data as EmailLog[]
    },
  })

  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: getStudents,
  })

  async function handleSend() {
    if (!message.trim()) {
      toast.error('Please enter a message')
      return
    }
    if (audience === 'custom' && selectedStudents.length === 0) {
      toast.error('Please select at least one student')
      return
    }

    setSending(true)
    try {
      let recipients: { name: string; email: string }[] = []
      if (audience === 'all_overdue') {
        const { data: overdue } = await supabase
          .from('transactions')
          .select('student:students(*)')
          .eq('status', 'overdue')
        const map = new Map<string, { name: string; email: string }>()
        ;(overdue || []).forEach((t: any) => {
          if (t.student?.email) map.set(t.student.email, { name: t.student.name, email: t.student.email })
        })
        recipients = Array.from(map.values())
      } else if (audience === 'all_fines') {
        const { data: fined } = await supabase
          .from('students')
          .select('name, email')
          .gt('total_fine', 0)
        recipients = (fined || []).filter((s) => s.email) as { name: string; email: string }[]
      } else {
        recipients = selectedStudents
          .filter((s) => s.email)
          .map((s) => ({ name: s.name, email: s.email }))
      }

      if (recipients.length === 0) {
        toast.error('No recipients found')
        setSending(false)
        return
      }

      const logs = recipients.map((r) => ({
        recipient: r.email,
        subject: audience === 'all_overdue' ? 'Overdue Book Reminder' : audience === 'all_fines' ? 'Fine Notice' : 'Library Notification',
        status: 'sent' as const,
        sent_at: new Date().toISOString(),
      }))

      const { error } = await supabase.from('email_logs').insert(logs)
      if (error) throw error

      toast.success(`Notification sent to ${recipients.length} recipients`)
      setMessage('')
      setSelectedStudents([])
    } catch {
      toast.error('Failed to send notifications')
    } finally {
      setSending(false)
    }
  }

  function handleStudentSearch(q: string) {
    setSearchQuery(q)
    if (!q.trim() || !students) {
      setSearchResults([])
      return
    }
    const query = q.toLowerCase()
    setSearchResults(
      students.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.form_number.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query)
      )
    )
  }

  function toggleStudent(student: Student) {
    setSelectedStudents((prev) =>
      prev.find((s) => s.id === student.id)
        ? prev.filter((s) => s.id !== student.id)
        : [...prev, student]
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>
        <p className="text-text-muted mt-1">Send and manage notifications</p>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Send className="h-5 w-5 text-indigo-500" />
            Send Bulk Notification
          </h3>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <Select
            label="Audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value as Audience)}
            options={[
              { value: 'all_overdue', label: 'All Overdue Students' },
              { value: 'all_fines', label: 'All Students With Fines' },
              { value: 'custom', label: 'Custom' },
            ]}
          />

          {audience === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Select Students</label>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowStudentPicker(true)}
              >
                <Users className="h-4 w-4" />
                {selectedStudents.length > 0
                  ? `${selectedStudents.length} students selected`
                  : 'Select Students'}
              </Button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent/50 focus:ring-1 focus:ring-accent/30"
              placeholder="Type your notification message here..."
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSend} loading={sending}>
              <Send className="h-4 w-4" />
              Send Notification
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Mail className="h-5 w-5 text-indigo-500" />
            Email Logs
          </h3>
        </CardHeader>
        <CardContent className="p-6">
          <Table
            columns={[
              { key: 'recipient', header: 'Recipient' },
              { key: 'subject', header: 'Subject' },
              {
                key: 'status',
                header: 'Status',
                render: (log: EmailLog) => (
                  <Badge variant={log.status === 'sent' ? 'success' : 'danger'}>
                    {log.status}
                  </Badge>
                ),
              },
              {
                key: 'sent_at',
                header: 'Date',
                render: (log: EmailLog) => formatDate(log.sent_at),
              },
            ]}
            data={emailLogs || []}
            keyExtractor={(log) => log.id}
            emptyMessage="No email logs found"
          />
        </CardContent>
      </Card>

      <Modal open={showStudentPicker} onClose={() => setShowStudentPicker(false)} title="Select Students" size="xl">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-text-muted" />
            <input
              value={searchQuery}
              onChange={(e) => handleStudentSearch(e.target.value)}
              placeholder="Search students..."
              className="block w-full rounded-lg border border-border pl-10 pr-3 py-2 text-sm focus:border-accent/50 focus:ring-1 focus:ring-accent/30"
            />
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 border border-border/50 rounded-lg">
            {searchResults.length > 0
              ? searchResults.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface-light cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!selectedStudents.find((ss) => ss.id === s.id)}
                      onChange={() => toggleStudent(s)}
                      className="rounded border-border text-accent focus:ring-accent/30"
                    />
                    <div>
                      <p className="text-sm font-medium text-text-primary">{s.name}</p>
                      <p className="text-xs text-text-muted">{s.form_number} - {s.email}</p>
                    </div>
                  </label>
                ))
              : students?.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface-light cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!selectedStudents.find((ss) => ss.id === s.id)}
                      onChange={() => toggleStudent(s)}
                      className="rounded border-border text-accent focus:ring-accent/30"
                    />
                    <div>
                      <p className="text-sm font-medium text-text-primary">{s.name}</p>
                      <p className="text-xs text-text-muted">{s.form_number} - {s.email}</p>
                    </div>
                  </label>
                ))}
            {searchResults.length === 0 && students?.length === 0 && (
              <p className="text-center py-8 text-text-muted text-sm">No students found</p>
            )}
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-text-secondary">{selectedStudents.length} selected</span>
            <Button onClick={() => setShowStudentPicker(false)}>Done</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
