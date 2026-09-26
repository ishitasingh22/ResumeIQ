import { useEffect, useState } from 'react'
import { AuthContext } from './authContext.js'
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')

async function authRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.message || 'Something went wrong. Please try again.')
  }

  return payload
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    authRequest('/auth/me')
      .then(({ user: currentUser }) => {
        if (isActive) setUser(currentUser)
      })
      .catch(() => {
        if (isActive) setUser(null)
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [])

  async function login(credentials) {
    const { user: signedInUser } = await authRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    setUser(signedInUser)
    return signedInUser
  }

  async function register(details) {
    const { user: newUser } = await authRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(details),
    })
    setUser(newUser)
    return newUser
  }

  async function logout() {
    try {
      await authRequest('/auth/logout', { method: 'POST' })
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
