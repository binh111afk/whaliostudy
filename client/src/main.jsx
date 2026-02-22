import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import { API_BASE_URL } from './config/apiConfig'
import './index.css' // Dòng này quan trọng để nhận Tailwind

registerSW({ immediate: true })

const nativeFetch = window.fetch.bind(window)
const resolvedApiOrigin = (() => {
  try {
    return API_BASE_URL ? new URL(API_BASE_URL, window.location.origin).origin : window.location.origin
  } catch {
    return window.location.origin
  }
})()

const shouldDecorateApiRequest = (input) => {
  try {
    const urlValue =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input?.url || ''
    const url = new URL(urlValue, window.location.origin)
    const path = url.pathname || ''
    const isApiPath = path.startsWith('/api/') || path === '/api' || path.startsWith('/auth/')
    const isKnownApiOrigin = url.origin === resolvedApiOrigin
    return isApiPath && (isKnownApiOrigin || url.origin === window.location.origin || urlValue.startsWith('/'))
  } catch {
    return false
  }
}

window.fetch = (input, init = {}) => {
  if (!shouldDecorateApiRequest(input)) {
    return nativeFetch(input, init)
  }

  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined))
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('adminToken') ||
    localStorage.getItem('accessToken')

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return nativeFetch(input, {
    ...init,
    headers,
    credentials: init.credentials || 'include'
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
