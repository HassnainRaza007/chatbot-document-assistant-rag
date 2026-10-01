import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import api from '../services/api'

const AuthContext = createContext(null)

const TOKEN_KEY = 'enterprise_ai_access_token'
const USER_KEY = 'enterprise_ai_user'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    return localStorage.getItem(TOKEN_KEY)
  })

  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem(USER_KEY)

    if (!storedUser) {
      return null
    }

    try {
      return JSON.parse(storedUser)
    } catch {
      localStorage.removeItem(USER_KEY)
      return null
    }
  })

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const restoreAuthentication = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY)

      if (!storedToken) {
        setLoading(false)
        return
      }

      try {
        const response = await api.get('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        })

        setToken(storedToken)
        setUser(response.data)

        localStorage.setItem(
          USER_KEY,
          JSON.stringify(response.data),
        )
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)

        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    restoreAuthentication()
  }, [])

  const login = async (username, password) => {
    const response = await api.post('/api/auth/login', {
      username,
      password,
    })

    const {
      access_token,
      user: loggedInUser,
    } = response.data

    localStorage.setItem(
      TOKEN_KEY,
      access_token,
    )

    localStorage.setItem(
      USER_KEY,
      JSON.stringify(loggedInUser),
    )

    setToken(access_token)
    setUser(loggedInUser)

    return loggedInUser
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)

    setToken(null)
    setUser(null)
  }

  const value = useMemo(
    () => ({
      token,
      user,
      loading,

      isAuthenticated: Boolean(
        token && user,
      ),

      // Both Super Admin and Co-Admin
      // have access to the Admin Portal.
      isAdmin: [
        'admin',
        'super_admin',
      ].includes(user?.role),

      // Only the main Super Admin.
      isSuperAdmin:
        user?.role === 'super_admin',

      login,
      logout,
    }),
    [
      token,
      user,
      loading,
    ],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth must be used inside an AuthProvider',
    )
  }

  return context
}