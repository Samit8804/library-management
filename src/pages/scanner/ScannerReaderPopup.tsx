import { useState, useRef, useEffect } from 'react'
import { ScanLine, Camera, CameraOff, XCircle } from 'lucide-react'
import { barcodeUrl } from '../../lib/config'

export function ScannerReaderPopup() {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)
  const sentRef = useRef(false)
  const attemptsRef = useRef(0)

  useEffect(() => {
    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [])

  useEffect(() => {
    if (code && !sentRef.current) {
      sentRef.current = true
      if (window.opener) {
        window.opener.postMessage({ type: 'BARCODE_SCANNED', barcode: code }, '*')
      }
      setTimeout(() => window.close(), 500)
    }
  }, [code])

  function cleanup() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  async function startScanner() {
    setError('')
    setCode('')
    setStatus('')
    sentRef.current = false
    attemptsRef.current = 0

    try {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1920, min: 640 }, height: { ideal: 1080, min: 480 }, facingMode: 'environment' },
        })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1920, min: 640 }, height: { ideal: 1080, min: 480 } },
        })
      }
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setScanning(true)
      setStatus('Camera active. Point at a barcode...')

      intervalRef.current = setInterval(async () => {
        if (!mountedRef.current || sentRef.current) return
        try {
          const video = videoRef.current
          if (!video || !video.videoWidth) return

          const canvas = document.createElement('canvas')
          canvas.width = video.videoWidth || 640
          canvas.height = video.videoHeight || 480
          const ctx = canvas.getContext('2d')
          if (!ctx) return
          ctx.drawImage(video, 0, 0)

          const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.95))
          if (!blob) return

          attemptsRef.current++
          setStatus(`Scanning frame ${attemptsRef.current}...`)

          const formData = new FormData()
          formData.append('file', new File([blob], 'frame.jpg', { type: 'image/jpeg' }))
          const res = await fetch(barcodeUrl('/scan'), { method: 'POST', body: formData })
          const data = await res.json()

          if (data.success && data.barcode) {
            setStatus(`Found barcode: ${data.barcode}`)
            cleanup()
            setScanning(false)
            setCode(data.barcode)
          } else {
            setStatus(`No barcode detected (frame ${attemptsRef.current})`)
          }
        } catch (err) {
          setStatus(`Error: ${err instanceof Error ? err.message : 'Request failed'}`)
        }
      }, 500)
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.includes('NotAllowed') || msg.includes('Permission')) {
        setError('Camera blocked. Allow camera access in browser settings.')
      } else if (msg.includes('NotFound')) {
        setError('No camera found on this device.')
      } else {
        setError(msg || 'Could not access camera')
      }
    }
  }

  function stopScanner() {
    cleanup()
    setScanning(false)
    setStatus('')
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-white flex items-center justify-center gap-2">
            <ScanLine className="h-6 w-6 text-indigo-400" />
            Barcode Scanner
          </h1>
          <p className="text-gray-400 text-sm mt-1">Point camera at a barcode to scan</p>
        </div>

        <div className="relative w-full aspect-square bg-gray-900 rounded-2xl overflow-hidden mb-4">
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />

          {!scanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-600 z-10">
              <div className="text-center">
                <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Camera off</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-red-400 p-4 z-10">
              <div className="text-center">
                <XCircle className="h-10 w-10 mx-auto mb-2" />
                <p className="text-sm text-center">{error}</p>
              </div>
            </div>
          )}

          {scanning && (
            <div className="absolute inset-0 border-2 border-indigo-500 rounded-2xl z-10 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-1/3 border-2 border-indigo-400/60 rounded-lg" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-3/4 h-0.5 bg-indigo-500/80 shadow-lg shadow-indigo-500/50 animate-pulse rounded-full" />
            </div>
          )}

          {code && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-white font-medium">Barcode: {code}</p>
                <p className="text-gray-400 text-sm">Sending to library...</p>
              </div>
            </div>
          )}
        </div>

        {status && scanning && (
          <p className="text-center text-sm text-gray-400 mb-4">{status}</p>
        )}

        <div className="flex gap-3">
          {!scanning ? (
            <button
              onClick={startScanner}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
            >
              <Camera className="h-5 w-5" />
              Start Scanning
            </button>
          ) : (
            <button
              onClick={stopScanner}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
            >
              <CameraOff className="h-5 w-5" />
              Stop Scanner
            </button>
          )}
          <button
            onClick={() => window.close()}
            className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition-colors"
          >
            Close
          </button>
        </div>

        <p className="text-xs text-gray-600 text-center mt-4">
          Using native camera + Python barcode decoder
        </p>
      </div>
    </div>
  )
}
