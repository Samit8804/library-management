# Library Barcode Scanner

This is a mobile barcode scanner app for the Library Management System.

## Overview

The app allows users to scan book and student barcodes using their phone's camera and send the results to the Library API for lookup.

## Features

- **Barcode Scanning**: Native camera barcode scanning
- **Real-time Feedback**: Instant scanning with visual feedback
- **API Integration**: Sends scanned codes to the Library API
- **Result Display**: Shows book/student information
- **Error Handling**: Clear error messages for failed scans

## Installation

```bash
npm install
```

## Running the App

```bash
npm start
```

## API Configuration

Update the API URL in `src/config/api.js`:

```javascript
export const API_BASE_URL = 'http://your-api-server.com:3000'
```

## Usage

1. Open the app on your phone
2. Point the camera at a barcode
3. The app will automatically scan and send the code to the API
4. Results will be displayed on screen

## Supported Barcode Types

- **Books**: B123, B456, etc. (format: B + book ID)
- **Students**: 10A, 11B, etc. (format: form number)

## Error Handling

- **No Camera Permission**: Request camera permission in device settings
- **No Network**: Check internet connection
- **API Error**: Try again later or contact administrator

## Future Enhancements

- Offline barcode cache
- Scan history
- Export scan results
- Multi-format barcode support

## License

MIT
