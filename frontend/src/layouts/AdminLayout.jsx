import {
  Bot,
  LayoutDashboard,
  Files,
  Upload,
  Settings,
  ShieldCheck,
  ArrowLeft,
  User,
  Users,
  LogOut,
} from 'lucide-react'

import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

function AdminLayout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()

  const {
    user,
    logout,
  } = useAuth()

  const navigation = [
    {
      name: 'Dashboard',
      path: '/admin',
      icon: LayoutDashboard,
    },
    {
      name: 'Documents',
      path: '/admin/documents',
      icon: Files,
    },
    {
      name: 'Upload Document',
      path: '/admin/upload',
      icon: Upload,
    },
    {
      name: 'Users',
      path: '/admin/users',
      icon: Users,
    },
  ]

  const handleLogout = () => {
    logout()

    navigate('/login', {
      replace: true,
    })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* Sidebar */}
      <aside className="flex w-72 flex-col border-r border-slate-200 bg-white">

        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">

          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Bot size={21} />
          </div>

          <div>
            <div className="font-semibold text-slate-900">
              Enterprise AI
            </div>

            <div className="text-xs text-slate-400">
              Administration
            </div>
          </div>

        </div>

        {/* Admin badge */}
        <div className="mx-4 mt-5 rounded-xl border border-blue-100 bg-blue-50 p-3">

          <div className="flex items-center gap-2">

            <ShieldCheck
              size={18}
              className="text-blue-600"
            />

            <span className="text-sm font-semibold text-blue-800">
              Admin Portal
            </span>

          </div>

          <p className="mt-1 text-xs text-blue-600">
            Manage your AI knowledge base
          </p>

        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">

          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Management
          </div>

          {navigation.map((item) => {
            const Icon = item.icon

            const isActive =
              item.path === '/admin'
                ? location.pathname === '/admin'
                : location.pathname === item.path

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            )
          })}

        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom */}
        <div className="border-t border-slate-200 p-3">

          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            <Settings size={18} />
            Settings
          </button>

          <Link
            to="/chat"
            className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
            Back to User Portal
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            <LogOut size={18} />
            Sign Out
          </button>

        </div>

      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Topbar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">

          <div>
            <h1 className="font-semibold text-slate-900">
              Administration
            </h1>

            <p className="text-xs text-slate-400">
              Knowledge Base Management
            </p>
          </div>

          <button
            type="button"
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50"
          >

            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-white">
              <User size={16} />
            </div>

            <div className="text-left">

              <div className="text-sm font-medium text-slate-700">
                {user?.username || 'Administrator'}
              </div>

              <div className="text-xs text-slate-400">
                {user?.role === 'admin'
                  ? 'Admin'
                  : 'User'}
              </div>

            </div>

          </button>

        </header>

        {/* Content */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </main>

      </div>

    </div>
  )
}

export default AdminLayout