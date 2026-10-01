import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children, adminOnly = false }) {
  const location = useLocation()

  const {
    loading,
    isAuthenticated,
    isAdmin,
  } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">
          Checking authentication...
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname + location.search,
        }}
      />
    )
  }

  if (adminOnly && !isAdmin) {
    return (
      <Navigate
        to="/chat"
        replace
      />
    )
  }

  return children
}

export default ProtectedRoute