const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3000

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Middleware
app.use(helmet())
app.use(cors())
app.use(morgan('combined'))
app.use(express.json())

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.post('/api/lookup', async (req, res) => {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ error: 'Code is required' })
    }

    let result = null

    if (code.startsWith('B') || code.startsWith('b')) {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('book_id', code.toUpperCase())
        .single()

      if (error) throw error
      result = { type: 'book', data }
    } else {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('form_number', code)
        .single()

      if (error) throw error
      result = { type: 'student', data }
    }

    if (!result.data) {
      return res.status(404).json({ error: 'Code not found' })
    }

    res.json(result)
  } catch (error) {
    console.error('Lookup error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.listen(PORT, () => {
  console.log(`Library API server running on port ${PORT}`)
})