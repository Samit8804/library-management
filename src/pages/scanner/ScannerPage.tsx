import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanLine, Camera, CameraOff, Search, BookOpen, User, Wifi, Monitor, Smartphone } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import type { CameraDevice } from 'html5-qrcode'
import toast from 'react-hot-toast'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { getBookByBookId, getBookByIsbn, getStudentByFormNumber } from '../../lib/db'
import { barcodeUrl } from '../../lib/config'
import type { Book, Student } from '../../types'

type ScanResult = { type: 'book'; data: Book } | { type: 'student'; data: Student } | null
type CameraMode = 'browser' | 'ipwebcam' | 'python'

export function ScannerPage() {
  const origin = window.location.origin
  const navigate = useNavigate()
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [manualInput, setManualInput] = useState('')
  const [result, setResult] = useState<ScanResult>(null)
  const [loading, setLoading] = useState(false)
  const [cameraMode, setCameraMode] = useState<CameraMode>('browser')
  const [ipUrl, setIpUrl] = useState('')
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const ipTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scanningRef = useRef(false)
  const mountedRef = useRef(true)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  async function refreshCameras() {
    try {
      let tempStream: MediaStream | null = null
      try { tempStream = await navigator.mediaDevices.getUserMedia({ video: true }) } catch {}
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(d => d.kind === 'videoinput')
      if (tempStream) tempStream.getTracks().forEach(t => t.stop())
      if (mountedRef.current) {
        const cameras = videoDevices.map(d => ({ id: d.deviceId, label: d.label }))
        setCameras(cameras)
        if (cameras.length > 0 && !selectedCamera) setSelectedCamera(cameras[0].id)
      }
    } catch {}
  }

  useEffect(() => { refreshCameras() }, [])

  async function startBrowserScanner() {
    setCameraError('')
    setResult(null)

    let tempStream: MediaStream | null = null
    try { tempStream = await navigator.mediaDevices.getUserMedia({ video: true }) } catch {}
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoDevices = devices.filter(d => d.kind === 'videoinput')
    if (tempStream) tempStream.getTracks().forEach(t => t.stop())

    if (videoDevices.length > 0) {
      const cameras = videoDevices.map(d => ({ id: d.deviceId, label: d.label }))
      setCameras(cameras)
      if (!selectedCamera) setSelectedCamera(cameras[0].id)
    }

    const cameraId = selectedCamera || (videoDevices.length > 0 ? videoDevices[0].deviceId : null)
    if (!cameraId) {
      setCameraError('No camera detected. Make sure DroidCam is running, allow camera permission, then click Start again. If DroidCam is running, click the refresh button next to the camera dropdown.')
      return
    }

    setScanning(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: cameraId }, width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = stream

      const video = document.createElement('video')
      video.srcObject = stream
      video.setAttribute('playsinline', '')
      video.setAttribute('autoplay', '')
      video.setAttribute('muted', '')
      video.style.width = '100%'
      video.style.height = '100%'
      video.style.objectFit = 'cover'
      await video.play()

      const container = document.getElementById('scanner-video-mount')
      if (container) {
        container.innerHTML = ''
        container.appendChild(video)
      }

      const decoder = new Html5Qrcode('qr-decoder-region')

      scanIntervalRef.current = setInterval(async () => {
        if (!mountedRef.current) { cleanupBrowserScanner(); return }
        try {
          const canvas = document.createElement('canvas')
          canvas.width = video.videoWidth || 640
          canvas.height = video.videoHeight || 480
          const ctx = canvas.getContext('2d')
          if (!ctx) return
          ctx.drawImage(video, 0, 0)
          const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.8))
          if (!blob) return
          const decoded = await decoder.scanFile(new File([blob], 'f.jpg', { type: 'image/jpeg' }), false)
          if (decoded) {
            cleanupBrowserScanner()
            setScanning(false)
            await lookupCode(decoded)
          }
        } catch {}
      }, 1000)
    } catch (err: any) {
      setScanning(false)
      const msg = err?.message || ''
      if (msg.includes('NotAllowed') || msg.includes('Permission')) {
        setCameraError('Camera blocked. Allow camera access in browser settings.')
      } else if (msg.includes('NotFound')) {
        setCameraError('Camera not found. Try selecting a different camera from the dropdown.')
      } else {
        setCameraError(msg || 'Could not access camera')
      }
    }
  }

  function cleanupBrowserScanner() {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null }
    const mount = document.getElementById('scanner-video-mount')
    if (mount) mount.innerHTML = ''
  }

  async function stopBrowserScanner() {
    cleanupBrowserScanner()
    setScanning(false)
  }

  async function startPythonScanner() {
    setCameraError('')
    setResult(null)

    let tempStream: MediaStream | null = null
    try { tempStream = await navigator.mediaDevices.getUserMedia({ video: true }) } catch {}
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoDevices = devices.filter(d => d.kind === 'videoinput')
    if (tempStream) tempStream.getTracks().forEach(t => t.stop())

    if (videoDevices.length > 0) {
      const cameras = videoDevices.map(d => ({ id: d.deviceId, label: d.label }))
      setCameras(cameras)
      if (!selectedCamera) setSelectedCamera(cameras[0].id)
    }

    const cameraId = selectedCamera || (videoDevices.length > 0 ? videoDevices[0].deviceId : null)
    if (!cameraId) {
      setCameraError('No camera detected. Allow camera permission, then try again.')
      return
    }

    setScanning(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: cameraId }, width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = stream

      const video = document.createElement('video')
      video.srcObject = stream
      video.setAttribute('playsinline', '')
      video.setAttribute('autoplay', '')
      video.setAttribute('muted', '')
      video.style.width = '100%'
      video.style.height = '100%'
      video.style.objectFit = 'cover'
      await video.play()

      const container = document.getElementById('scanner-video-mount')
      if (container) {
        container.innerHTML = ''
        container.appendChild(video)
      }

      scanIntervalRef.current = setInterval(async () => {
        if (!mountedRef.current) { cleanupBrowserScanner(); return }
        try {
          const canvas = document.createElement('canvas')
          canvas.width = video.videoWidth || 640
          canvas.height = video.videoHeight || 480
          const ctx = canvas.getContext('2d')
          if (!ctx) return
          ctx.drawImage(video, 0, 0)
          const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.8))
          if (!blob) return

          const formData = new FormData()
          formData.append('file', new File([blob], 'frame.jpg', { type: 'image/jpeg' }))
          const res = await fetch(barcodeUrl('/scan'), { method: 'POST', body: formData })
          const data = await res.json()

          if (data.success && data.barcode) {
            cleanupBrowserScanner()
            setScanning(false)
            await lookupCode(data.barcode)
          }
        } catch {}
      }, 1000)
    } catch (err: any) {
      setScanning(false)
      const msg = err?.message || ''
      if (msg.includes('NotAllowed') || msg.includes('Permission')) {
        setCameraError('Camera blocked. Allow camera access in browser settings.')
      } else {
        setCameraError(msg || 'Could not access camera')
      }
    }
  }

  async function stopPythonScanner() {
    cleanupBrowserScanner()
    setScanning(false)
  }

  async function startIpWebcam() {
    if (!ipUrl.trim()) { toast.error('Enter the IP Webcam URL'); return }
    setCameraError('')
    setResult(null)

    const baseUrl = ipUrl.trim().replace(/\/+$/, '')
    const snapshotUrl = baseUrl.includes('/shot.jpg') ? baseUrl : `${baseUrl}/shot.jpg`

    try {
      await fetch(snapshotUrl, { method: 'HEAD' })
    } catch {
      setCameraError(
        ipUrl.includes('localhost')
          ? 'Cannot connect. Run: adb forward tcp:8080 tcp:8080'
          : 'Connection failed. Use USB (ADB) mode.'
      )
      return
    }

    setScanning(true)
    scanningRef.current = true

    const decoder = new Html5Qrcode('qr-decoder-region')

    ipTimerRef.current = setInterval(async () => {
      if (!scanningRef.current || !mountedRef.current) return
      try {
        const res = await fetch(snapshotUrl)
        const blob = await res.blob()
        const file = new File([blob], 'snap.jpg', { type: 'image/jpeg' })
        const decoded = await decoder.scanFile(file, false)
        if (decoded) {
          scanningRef.current = false
          clearInterval(ipTimerRef.current!)
          ipTimerRef.current = null
          setScanning(false)
          await lookupCode(decoded)
        }
      } catch {}
    }, 1200)
  }

  function stopIpWebcam() {
    scanningRef.current = false
    if (ipTimerRef.current) {
      clearInterval(ipTimerRef.current)
      ipTimerRef.current = null
    }
    setScanning(false)
  }

  async function startScanning() {
    if (cameraMode === 'browser') await startBrowserScanner()
    else if (cameraMode === 'python') await startPythonScanner()
    else await startIpWebcam()
  }

  async function stopScanning() {
    if (cameraMode === 'browser') await stopBrowserScanner()
    else if (cameraMode === 'python') await stopPythonScanner()
    else stopIpWebcam()
  }

  useEffect(() => {
    return () => {
      if ((window as any).__cleanupScanner) {
        (window as any).__cleanupScanner()
        ;(window as any).__cleanupScanner = null
      }
      stopScanning()
    }
  }, [cameraMode])

  async function lookupCode(code: string) {
    setLoading(true)
    setResult(null)
    try {
      if (code.startsWith('B') || code.startsWith('b')) {
        const book = await getBookByBookId(code.toUpperCase())
        if (book) setResult({ type: 'book', data: book })
        else toast.error('Book not found')
      } else if (code.length >= 12 && /^\d+$/.test(code)) {
        const book = await getBookByIsbn(code)
        if (book) setResult({ type: 'book', data: book })
        else {
          const student = await getStudentByFormNumber(code)
          if (student) setResult({ type: 'student', data: student })
          else toast.error('Not found')
        }
      } else {
        const student = await getStudentByFormNumber(code)
        if (student) setResult({ type: 'student', data: student })
        else toast.error('Student not found')
      }
    } catch { toast.error('Failed to look up code') }
    finally { setLoading(false) }
  }

  async function handleManualLookup() {
    if (!manualInput.trim()) { toast.error('Please enter a code'); return }
    await lookupCode(manualInput.trim())
  }

  const streamUrl = ipUrl ? `${ipUrl.replace(/\/+$/, '')}/video` : ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scanner</h1>
        <p className="text-gray-500 mt-1">Scan QR codes and barcodes</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => { setCameraMode('browser'); stopScanning() }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            cameraMode === 'browser' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Monitor className="h-4 w-4" />
          Laptop / USB Camera
        </button>
        <button
          onClick={() => { setCameraMode('ipwebcam'); stopScanning() }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            cameraMode === 'ipwebcam' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Wifi className="h-4 w-4" />
          WiFi / USB (ADB)
        </button>
        <button
          onClick={() => { setCameraMode('python'); stopScanning() }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            cameraMode === 'python' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <ScanLine className="h-4 w-4" />
          Python Decoder
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-indigo-500" />
              {cameraMode === 'browser' ? 'Camera Scanner' : cameraMode === 'python' ? 'Python Decoder Scanner' : 'Phone Camera Scanner'}
            </h3>
          </CardHeader>
          <CardContent className="p-6">
            {(cameraMode === 'browser' || cameraMode === 'python') && (
              <div className="mb-4">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Select
                      value={selectedCamera}
                      onChange={(e) => setSelectedCamera(e.target.value)}
                      options={cameras.length > 0 ? cameras.map((c) => ({ value: c.id, label: c.label || `Camera ${c.id.slice(0, 8)}` })) : [{ value: '', label: 'No cameras detected' }]}
                      label="Select Camera"
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={refreshCameras} className="mb-0.5" title="Refresh">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
                  </Button>
                </div>
                {cameras.length === 0 && <p className="text-xs text-amber-600 mt-1">Start DroidCam, then click refresh.</p>}
              </div>
            )}

            {cameraMode === 'ipwebcam' && (
              <div className="mb-4 space-y-3">
                <Input
                  value={ipUrl}
                  onChange={(e) => setIpUrl(e.target.value)}
                  placeholder="http://192.168.1.100:8080"
                  label="Phone Camera URL"
                />
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1">
                  <p className="font-medium">Connection options:</p>
                  <p><strong>WiFi:</strong> Install IP Webcam app on phone, start server, enter URL shown</p>
                  <p><strong>USB (ADB):</strong> Connect phone via USB, run: <code className="bg-blue-100 px-1 rounded">adb forward tcp:8080 tcp:8080</code> then enter <code className="bg-blue-100 px-1 rounded">http://localhost:8080</code></p>
                </div>
              </div>
            )}

            <div className="w-full aspect-square bg-black rounded-lg overflow-hidden mb-4 relative">
              {!scanning && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 z-10">
                  <div className="text-center">
                    <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Scanner is off</p>
                  </div>
                </div>
              )}
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center text-red-400 p-4 z-10">
                  <div className="text-center">
                    <CameraOff className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-sm text-center whitespace-pre-line">{cameraError}</p>
                  </div>
                </div>
              )}

              <div id="scanner-video-mount" className="w-full h-full" />

              {cameraMode === 'ipwebcam' && scanning && streamUrl && (
                <img src={streamUrl} alt="stream" className="absolute inset-0 w-full h-full object-cover z-20" />
              )}

              <div id="qr-decoder-region" className="hidden" />
            </div>

            <div className="flex gap-3">
              {!scanning ? (
                <Button onClick={startScanning} className="flex-1">
                  <Camera className="h-4 w-4" />
                  Start Scanning
                </Button>
              ) : (
                <Button onClick={stopScanning} variant="danger" className="flex-1">
                  <CameraOff className="h-4 w-4" />
                  Stop Scanner
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Search className="h-5 w-5 text-indigo-500" />
                Manual / USB Barcode Scanner
              </h3>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-xs text-gray-500 mb-3">Click the input below and scan with any barcode scanner.</p>
              <div className="flex gap-3">
                <Input
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Focus here and scan"
                  onKeyDown={(e) => e.key === 'Enter' && handleManualLookup()}
                  autoFocus
                />
                <Button onClick={handleManualLookup} loading={loading}>
                  <Search className="h-4 w-4" />
                  Lookup
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Book IDs start with "B" (e.g. B001). Student form numbers are numeric.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-indigo-500" />
                External Scanner App
              </h3>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-3">Use any barcode scanner app from Play Store to send codes to your website:</p>
              <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside mb-3">
                <li>Install <strong>QR &amp; Barcode Scanner</strong> (or similar) from Play Store</li>
                <li>Open the app and go to Settings → Scan Result → Open URL</li>
                <li>Set URL template to: <code className="bg-gray-100 px-1 rounded">{origin}/scan/%s</code></li>
                <li>Scan a barcode — the app will open your site and show the result</li>
              </ol>
              <p className="text-xs text-gray-500">Alternatively, just scan and copy the code, then paste it in the Manual input above.</p>
            </CardContent>
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  {result.type === 'book' ? <BookOpen className="h-5 w-5 text-indigo-500" /> : <User className="h-5 w-5 text-indigo-500" />}
                  {result.type === 'book' ? 'Book Found' : 'Student Found'}
                </h3>
              </CardHeader>
              <CardContent className="p-6">
                {result.type === 'book' ? (
                  <div className="space-y-3">
                    <div><p className="text-sm font-medium text-gray-900">{result.data.title}</p><p className="text-sm text-gray-500">by {result.data.author}</p></div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-gray-500">Book ID:</span><p className="font-medium">{result.data.book_id}</p></div>
                      <div><span className="text-gray-500">ISBN:</span><p className="font-medium">{result.data.isbn}</p></div>
                      <div><span className="text-gray-500">Category:</span><p className="font-medium">{result.data.category}</p></div>
                      <div><span className="text-gray-500">Available:</span><p className="font-medium"><Badge variant={result.data.available_copies > 0 ? 'success' : 'danger'}>{result.data.available_copies} / {result.data.quantity}</Badge></p></div>
                    </div>
                    <Button variant="secondary" onClick={() => navigate(`/books`)} className="w-full mt-2"><BookOpen className="h-4 w-4" /> View Book</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div><p className="text-sm font-medium text-gray-900">{result.data.name}</p><p className="text-sm text-gray-500">{result.data.form_number}</p></div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-gray-500">Course:</span><p className="font-medium">{result.data.course}</p></div>
                      <div><span className="text-gray-500">Branch:</span><p className="font-medium">{result.data.branch}</p></div>
                      <div><span className="text-gray-500">Year:</span><p className="font-medium">{result.data.year}</p></div>
                      <div><span className="text-gray-500">Status:</span><p className="font-medium"><Badge variant={result.data.status === 'active' ? 'success' : 'warning'}>{result.data.status}</Badge></p></div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button onClick={() => navigate(`/issue?student=${result.data.id}`)} className="flex-1">Issue Book</Button>
                      <Button variant="secondary" onClick={() => navigate(`/students`)} className="flex-1"><User className="h-4 w-4" /> View Profile</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
