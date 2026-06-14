# Library API

This is the backend API for the Library Management System mobile barcode scanner.

## Overview

The API provides endpoints for mobile barcode scanning applications to look up books and students by their codes.

## Endpoints

### GET /health
Returns the health status of the API.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### POST /api/lookup
Looks up a book or student by their code.

**Request Body**:
```json
{
  "code": "B123"  // or student form number like "10A"
}
```

**Response** (Book):
```json
{
  "type": "book",
  "data": {
    "book_id": "B123",
    "title": "Book Title",
    "author": "Author Name",
    "available": true
  }
}
```

**Response** (Student):
```json
{
  "type": "student",
  "data": {
    "student_id": "STU001",
    "name": "Student Name",
    "form_number": "10A",
    "status": "active"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing code in request body
- `404 Not Found`: Code not found in database
- `500 Internal Server Error`: Server error

## Environment Variables

- `PORT`: Port to run the server on (default: 3000)
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anon key

## Deployment

This API is designed to be deployed to Render.com.

## Development

```bash
npm install
npm run dev
```

## Testing

You can test the API using curl:

```bash
# Health check
curl http://localhost:3000/health

# Book lookup
curl -X POST http://localhost:3000/api/lookup \
  -H "Content-Type: application/json" \
  -d '{"code": "B123"}'

# Student lookup
curl -X POST http://localhost:3000/api/lookup \
  -H "Content-Type: application/json" \
  -d '{"code": "10A"}'
```
