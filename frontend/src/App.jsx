import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'

import UserLayout from './layouts/UserLayout'
import AdminLayout from './layouts/AdminLayout'

import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/Login'
import Chat from './pages/user/Chat'
import History from './pages/user/History'

import Dashboard from './pages/admin/Dashboard'
import Documents from './pages/admin/Documents'
import UploadDocument from './pages/admin/UploadDocument'
import Users from './pages/admin/Users'

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public route */}
        <Route
          path="/login"
          element={<Login />}
        />

        {/* Protected user routes */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <UserLayout>
                <Chat />
              </UserLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <UserLayout>
                <History />
              </UserLayout>
            </ProtectedRoute>
          }
        />

        {/* Protected admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <Dashboard />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/documents"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <Documents />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/upload"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <UploadDocument />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout>
                <Users />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* Unknown routes */}
        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  )
}

export default App