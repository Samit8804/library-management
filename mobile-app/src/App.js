import React, { useState, useEffect } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { Camera, CameraType } from '@react-native-camera'
import { BarcodeScanningResult, useBarcodeScanner } from 'react-native-qrcode-scanner'
import { API_BASE_URL } from '../config/api'

const BarcodeScannerApp = () => {
  const [scanning, setScanning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleBarcodeScan = async (scanningResult: BarcodeScanningResult) => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: scanningResult.data }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to lookup code')
      }

      setResult(data)
      Alert.alert(
        'Scan Result',
        `Type: ${data.type}\nName: ${data.data.name || data.data.title}\nID: ${data.data.book_id || data.data.form_number}`,
        [
          { text: 'OK', onPress: () => setResult(null) }
        ]
      )
    } catch (err) {
      setError(err.message || 'Failed to scan barcode')
      Alert.alert('Error', err.message || 'Failed to scan barcode')
    } finally {
      setLoading(false)
    }
  }

  const { cameraRef, torchMode, toggleTorch, startScanning, stopScanning } = useBarcodeScanner({
    onBarcodeScanned: handleBarcodeScan,
    torchMode: torchMode,
  })

  const toggleScanner = () => {
    if (scanning) {
      stopScanning()
      setScanning(false)
    } else {
      startScanning()
      setScanning(true)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={CameraType.back}
          barcodeScanning={scanning}
          barcodeTypes={['CODE128', 'EAN13', 'EAN8', 'QR']}
        />
        
        {scanning && (
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame} />
          </View>
        )}
      </View>

      <View style={styles.controls}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Looking up code...</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, scanning && styles.buttonActive]}
          onPress={toggleScanner}
        >
          <Text style={styles.buttonText}>
            {scanning ? 'Stop Scanning' : 'Start Scanning'}
          </Text>
        </TouchableOpacity>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        {result ? (
          <View style={styles.resultContainer}>
            <Text style={styles.resultText}>
              Type: {result.type}
            </Text>
            <Text style={styles.resultText}>
              Name: {result.data.name || result.data.title}
            </Text>
            <Text style={styles.resultText}>
              ID: {result.data.book_id || result.data.form_number}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: 'transparent',
    borderRadius: 10,
  },
  controls: {
    padding: 20,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonActive: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
  },
  resultContainer: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  resultText: {
    fontSize: 14,
    marginBottom: 5,
  },
})

export default BarcodeScannerApp