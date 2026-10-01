import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { LockKeyhole, LogIn, User } from 'lucide-react'

import { useAuth } from '../context/AuthContext'

function Login() {
  const navigate = useNavigate()

  const {
    login,
    isAuthenticated,
    loading: authLoading,
  } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">
          Checking authentication...
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/chat" replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError('')

    if (!username.trim()) {
      setError('Please enter your username.')
      return
    }

    if (!password) {
      setError('Please enter your password.')
      return
    }

    setIsSubmitting(true)

    try {
      await login(
        username.trim(),
        password,
      )

      navigate('/chat', {
        replace: true,
      })
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        'Invalid username or password.'

      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <LogIn size={26} />
            </div>

            <h1 className="text-2xl font-semibold text-slate-900">
              Enterprise AI Assistant
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Sign in to continue
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Username
              </label>

              <div className="relative">
                <User
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value)
                  }
                  placeholder="Enter your username"
                  autoComplete="username"
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn size={18} />

              {isSubmitting
                ? 'Signing in...'
                : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Enterprise AI Assistant
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login