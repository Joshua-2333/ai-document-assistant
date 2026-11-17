import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [message, setMessage] = useState('Connecting to backend...')

  useEffect(() => {
    async function checkBackend() {
      try {
        const response = await fetch('/api/health')

        if (!response.ok) {
          throw new Error('Backend request failed')
        }

        const data = await response.json()
        setMessage(data.message)
      } catch (error) {
        console.error(error)
        setMessage('Unable to connect to backend')
      }
    }

    checkBackend()
  }, [])

  return (
    <div className="app">
      <h1>AI Document Assistant</h1>
      <p>{message}</p>
    </div>
  )
}

export default App
