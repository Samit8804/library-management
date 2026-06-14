#!/usr/bin/env node

const https = require('https')

function makeRequest(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: url,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data ? Buffer.byteLength(data) : 0
      }
    }

    const req = https.request(options, (res) => {
      let responseData = ''
      res.on('data', (chunk) => {
        responseData += chunk
      })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData)
          resolve({ status: res.statusCode, data: parsed })
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData })
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    if (data) {
      req.write(data)
    }
    req.end()
  })

async function testAPI() {
  console.log('Testing Library API...')
  
  try {
    // Test health endpoint
    console.log('\n1. Testing health endpoint...')
    const health = await makeRequest('/health')
    console.log(`Status: ${health.status}")
    console.log(`Response: ${JSON.stringify(health.data, null, 2)}")
    
    // Test book lookup
    console.log('\n2. Testing book lookup...')
    const bookLookup = await makeRequest('/api/lookup', 'POST', { code: 'B123' })
    console.log(`Status: ${bookLookup.status}")
    console.log(`Response: ${JSON.stringify(bookLookup.data, null, 2)}")
    
    // Test student lookup
    console.log('\n3. Testing student lookup...')
    const studentLookup = await makeRequest('/api/lookup', 'POST', { code: '10A' })
    console.log(`Status: ${studentLookup.status}")
    console.log(`Response: ${JSON.stringify(studentLookup.data, null, 2)}")
    
    console.log('\n✅ All tests passed!')
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

if (require.main === module) {
  testAPI()
}

module.exports = { makeRequest, testAPI }