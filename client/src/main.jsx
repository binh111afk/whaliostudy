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
const ADMIN_SECURITY_THROTTLE_MS = 800
const adminSecurityPendingFetchMap = new Map()
const adminSecurityResponseCache = new Map()

const resolveRequestUrl = (input) => {
  try {
    const raw =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input?.url || ''
    return new URL(raw, window.location.origin)
  } catch {
    return null
  }
}

const resolveRequestMethod = (input, init = {}) => {
  const method = init?.method || (input instanceof Request ? input.method : 'GET') || 'GET'
  return String(method).toUpperCase()
}

const buildRequestKey = (method, url) => `${method}:${url.origin}${url.pathname}${url.search}`

const isAdminSecurityReadRequest = (method, url) =>
  method === 'GET' && Boolean(url?.pathname?.startsWith('/api/admin/security/'))

const getCachedAdminSecurityResponse = (requestKey) => {
  const cached = adminSecurityResponseCache.get(requestKey)
  if (!cached) return null
  if (Date.now() - cached.at > ADMIN_SECURITY_THROTTLE_MS) {
    adminSecurityResponseCache.delete(requestKey)
    return null
  }
  return cached.response
}

const fetchWithAdminSecurityThrottle = (input, init, requestKey) => {
  const pendingRequest = adminSecurityPendingFetchMap.get(requestKey)
  if (pendingRequest) {
    return pendingRequest.then((response) => response.clone())
  }

  const requestPromise = nativeFetch(input, init)
    .then((response) => {
      if (response.ok) {
        adminSecurityResponseCache.set(requestKey, {
          at: Date.now(),
          response: response.clone()
        })
      }
      return response
    })
    .finally(() => {
      adminSecurityPendingFetchMap.delete(requestKey)
    })

  adminSecurityPendingFetchMap.set(requestKey, requestPromise)
  return requestPromise.then((response) => response.clone())
}

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
  const requestUrl = resolveRequestUrl(input)
  const requestMethod = resolveRequestMethod(input, init)
  const isAdminSecurityRequest = isAdminSecurityReadRequest(requestMethod, requestUrl)
  const requestKey =
    isAdminSecurityRequest && requestUrl
      ? buildRequestKey(requestMethod, requestUrl)
      : ''

  if (isAdminSecurityRequest && requestKey) {
    const cachedResponse = getCachedAdminSecurityResponse(requestKey)
    if (cachedResponse) {
      return Promise.resolve(cachedResponse.clone())
    }
  }

  if (!shouldDecorateApiRequest(input)) {
    if (!isAdminSecurityRequest || !requestKey) {
      return nativeFetch(input, init)
    }
    return fetchWithAdminSecurityThrottle(input, init, requestKey)
  }

  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined))
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('adminToken') ||
    localStorage.getItem('accessToken')

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const fetchInit = {
    ...init,
    headers,
    credentials: init.credentials || 'include'
  }
  if (!isAdminSecurityRequest || !requestKey) {
    return nativeFetch(input, fetchInit)
  }
  return fetchWithAdminSecurityThrottle(input, fetchInit, requestKey)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
