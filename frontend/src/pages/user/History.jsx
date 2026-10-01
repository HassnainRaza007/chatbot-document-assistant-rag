import { useEffect, useState } from 'react'
import {
  MessageSquare,
  Plus,
  Loader2,
  ChevronRight,
  Trash2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import api from '../../services/api'

function History() {
  const navigate = useNavigate()

  const [sessions, setSessions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isClearing, setIsClearing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadSessions = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await api.get('/api/chat/sessions')
      setSessions(response.data)
    } catch (requestError) {
      setError(
        'Could not load conversation history.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])

  const handleNewChat = () => {
    navigate('/chat')
  }

  const handleOpenConversation = (sessionId) => {
    navigate(`/chat?session_id=${sessionId}`)
  }

  const handleClearHistory = async () => {
    if (sessions.length === 0) {
      return
    }

    const confirmed = window.confirm(
      'Are you sure you want to delete all conversation history? This action cannot be undone.',
    )

    if (!confirmed) {
      return
    }

    setIsClearing(true)
    setError('')
    setSuccess('')

    try {
      await api.delete('/api/chat/sessions')

      setSessions([])

      setSuccess(
        'All conversation history has been deleted successfully.',
      )
    } catch (requestError) {
      setError(
        'Could not delete conversation history.',
      )
    } finally {
      setIsClearing(false)
    }
  }

  const formatDate = (dateValue) => {
    const date = new Date(dateValue)

    return date.toLocaleString(
      undefined,
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      },
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 px-6 py-8">

      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Conversation History
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              View and continue your previous conversations.
            </p>
          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={handleClearHistory}
              disabled={
                isClearing ||
                isLoading ||
                sessions.length === 0
              }
              className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isClearing ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <Trash2 size={18} />
              )}

              {isClearing
                ? 'Clearing...'
                : 'Clear History'}
            </button>

            <button
              onClick={handleNewChat}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus size={18} />
              New Chat
            </button>

          </div>

        </div>

        {/* Success message */}
        {success && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Content */}
        <div className="mt-8">

          {isLoading ? (
            <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16">

              <div className="flex items-center gap-2 text-sm text-slate-500">

                <Loader2
                  size={18}
                  className="animate-spin"
                />

                Loading conversations...

              </div>

            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
              {error}
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <MessageSquare size={22} />
              </div>

              <h2 className="mt-4 font-semibold text-slate-800">
                No conversations yet
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Start a new conversation with the AI assistant.
              </p>

              <button
                onClick={handleNewChat}
                className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Start New Chat
              </button>

            </div>
          ) : (
            <div className="space-y-3">

              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() =>
                    handleOpenConversation(session.id)
                  }
                  className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <MessageSquare size={20} />
                  </div>

                  <div className="min-w-0 flex-1">

                    <div className="truncate font-semibold text-slate-800">
                      {session.title}
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      Last updated{' '}
                      {formatDate(session.updated_at)}
                    </div>

                  </div>

                  <ChevronRight
                    size={20}
                    className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500"
                  />

                </button>
              ))}

            </div>
          )}

        </div>

      </div>

    </div>
  )
}

export default History