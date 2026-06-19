import { API_URL } from '../config/constants'

export async function apiRequest(path, options = {}) {
  const headers = options.body
    ? { 'Content-Type': 'application/json', ...(options.headers || {}) }
    : options.headers || {}
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers,
    ...options,
  })
  if (!response.ok) {
    const text = await response.text()
    const error = new Error(text || 'Request failed')
    error.status = response.status
    throw error
  }
  return response.json()
}

export async function adminApiRequest(path, options = {}, activePassword) {
  const headers = { 'X-Admin-Password': activePassword, ...(options.headers || {}) }
  let body = options.body
  if (options.payload) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify({ admin_password: activePassword, ...options.payload })
  }
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body,
  })
  if (!response.ok) throw new Error(await response.text())
  if (response.status === 204) return null
  return response.json()
}
