const DEV_BARCODE_URL = '/api/barcode'
const PROD_BARCODE_URL = import.meta.env.VITE_BARCODE_API_URL

export const BARCODE_API_URL = PROD_BARCODE_URL || DEV_BARCODE_URL

export function barcodeUrl(path: string): string {
  const base = BARCODE_API_URL.replace(/\/+$/, '')
  return `${base}${path}`
}
