import {
  Bot,
  Plus,
  MessageSquare,
  History,
  Settings,
  ShieldCheck,
  ChevronDown,
  LogOut,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

function UserLayout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()

  const {
    user,
    isAdmin,
    logout,
  } = useAuth()

  const conversations = [
    'Leave Policy',
    'IT Access',
    'Travel Policy',
    'Expense Policy',
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
              Knowledge Assistant
            </div>
          </div>
        </div>

        {/* New Chat */}
        <div className="p-4">
          <button
            onClick={() => navigate('/chat')}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={18} />
            New Chat
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-3">

          <Link
            to="/chat"
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
              location.pathname === '/chat'
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <MessageSquare size={18} />
            Chat
          </Link>

          <Link
            to="/history"
            className={`mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
              location.pathname === '/history'
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <History size={18} />
            History
          </Link>

        </nav>

        {/* Conversations */}
        <div className="mt-6 flex-1 overflow-y-auto px-4">

          <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Recent Conversations
          </div>

          <div className="space-y-1">

            {conversations.map((conversation) => (
              <button
                key={conversation}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-slate-50"
              >
                <MessageSquare
                  size={16}
                  className="shrink-0 text-slate-400"
                />

                <span className="truncate">
                  {conversation}
                </span>
              </button>
            ))}

          </div>

        </div>

        {/* Bottom navigation */}
        <div className="border-t border-slate-200 p-3">

          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
            <Settings size={18} />
            Settings
          </button>

          {isAdmin && (
            <Link
              to="/admin"
              className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              <ShieldCheck size={18} />
              Admin Portal
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            <LogOut size={18} />
            Sign Out
          </button>

        </div>

      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Topbar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">

          <div>
            <h1 className="font-semibold text-slate-900">
              AI Assistant
            </h1>
          </div>

          <button className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50">

            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
              {user?.username?.charAt(0)?.toUpperCase() || 'U'}
            </div>

            <span className="text-sm font-medium text-slate-700">
              {user?.username || 'User'}
            </span>

            <ChevronDown
              size={16}
              className="text-slate-400"
            />

          </button>

        </header>

        {/* Page */}
        <main className="min-h-0 flex-1">
          {children}
        </main>

      </div>

    </div>
  )
}

export default UserLayout