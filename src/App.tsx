import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { LoginPage } from './pages/auth/LoginPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { StudentsPage } from './pages/students/StudentsPage'
import { BooksPage } from './pages/books/BooksPage'
import { IssuePage } from './pages/issue/IssuePage'
import { ReturnPage } from './pages/return/ReturnPage'
import { ReportsPage } from './pages/reports/ReportsPage'
import { NotificationsPage } from './pages/notifications/NotificationsPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { ScanCodePage } from './pages/scanner/ScanCodePage'
import { ScannerReaderPopup } from './pages/scanner/ScannerReaderPopup'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/scanner-reader" element={<ScannerReaderPopup />} />
      <Route path="/scan/:code" element={<ScanCodePage />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/books" element={<BooksPage />} />
        <Route path="/issue" element={<IssuePage />} />
        <Route path="/return" element={<ReturnPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
