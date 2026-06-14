import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Card, CardContent } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { getSettings, updateSetting } from '../../lib/db'
import { useAuth } from '../../lib/auth'

const defaultSettings = [
  { key: 'fine_per_day', label: 'Fine Per Day (₹)', defaultValue: '5', type: 'number' },
  { key: 'grace_period', label: 'Grace Period (days)', defaultValue: '2', type: 'number' },
  { key: 'max_fine', label: 'Maximum Fine (₹)', defaultValue: '500', type: 'number' },
  { key: 'max_books_per_student', label: 'Max Books Per Student', defaultValue: '5', type: 'number' },
  { key: 'low_stock_threshold', label: 'Low Stock Threshold', defaultValue: '3', type: 'number' },
] as const

export function SettingsPage() {
  const profile = useAuth((s) => s.profile)
  const queryClient = useQueryClient()
  const [values, setValues] = useState<Record<string, string>>({})

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  })

  useEffect(() => {
    if (settings) {
      const initial: Record<string, string> = {}
      defaultSettings.forEach((ds) => {
        const found = settings.find((s) => s.key === ds.key)
        initial[ds.key] = found?.value ?? ds.defaultValue
      })
      setValues(initial)
    }
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => updateSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Setting updated')
    },
    onError: () => toast.error('Failed to update setting'),
  })

  function handleSave(key: string) {
    updateMutation.mutate({ key, value: values[key] })
  }

  function handleSaveAll() {
    const promises = Object.entries(values).map(([key, value]) => updateSetting(key, value))
    Promise.all(promises)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['settings'] })
        toast.success('All settings saved')
      })
      .catch(() => toast.error('Failed to save settings'))
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="h-16 w-16 text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
        <p className="text-gray-500 mt-2">Only administrators can access settings.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Configure library policies</p>
        </div>
        {defaultSettings.every((ds) => values[ds.key] !== undefined) && (
          <Button onClick={handleSaveAll} loading={updateMutation.isPending}>
            <Save className="h-4 w-4" />
            Save All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {defaultSettings.map((setting) => (
          <Card key={setting.key}>
            <CardContent className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">{setting.label}</label>
              <div className="flex gap-3">
                <Input
                  type={setting.type}
                  value={values[setting.key] ?? setting.defaultValue}
                  onChange={(e) => setValues((prev) => ({ ...prev, [setting.key]: e.target.value }))}
                  min="0"
                />
                <Button
                  onClick={() => handleSave(setting.key)}
                  size="sm"
                  loading={updateMutation.isPending && updateMutation.variables?.key === setting.key}
                >
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
