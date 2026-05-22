import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#24283b',
            color: '#e2e8f0',
            border: '1px solid rgba(122,162,247,0.2)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#9ece6a', secondary: '#1a1b26' } },
          error: { iconTheme: { primary: '#f7768e', secondary: '#1a1b26' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)
