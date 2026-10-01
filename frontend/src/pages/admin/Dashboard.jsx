import { useEffect, useState } from 'react'
import {
  Files,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  Upload,
  MessageSquare,
  Database,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import api from '../../services/api'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')

  const loadDashboardStats = async (
    showRefreshState = false,
  ) => {
    if (showRefreshState) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setError('')

    try {
      const response = await api.get(
        '/api/dashboard/stats',
      )

      setStats(response.data)
    } catch (requestError) {
      setError(
        'Could not load dashboard statistics.',
      )
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const formatNumber = (value) => {
    return Number(value || 0).toLocaleString()
  }

  const statCards = stats
    ? [
        {
          title: 'Total Documents',
          value: stats.documents.total,
          description: 'Knowledge base documents',
          icon: Files,
        },
        {
          title: 'Indexed',
          value: stats.documents.indexed,
          description: 'Ready for AI search',
          icon: CheckCircle2,
        },
        {
          title: 'Processing',
          value: stats.documents.processing,
          description: 'Currently being indexed',
          icon: Clock,
        },
        {
          title: 'Failed',
          value: stats.documents.failed,
          description: 'Documents requiring attention',
          icon: AlertCircle,
        },
      ]
    : []

  return (
    <div className="p-6 lg:p-8">

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Monitor your enterprise knowledge base.
          </p>
        </div>

        <div className="flex items-center gap-3">

          <button
            onClick={() =>
              loadDashboardStats(true)
            }
            disabled={
              isLoading ||
              isRefreshing
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRefreshing ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : (
              <RefreshCw size={17} />
            )}

            {isRefreshing
              ? 'Refreshing...'
              : 'Refresh'}
          </button>

          <Link
            to="/admin/upload"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            <Upload size={17} />
            Upload Document
          </Link>

        </div>

      </div>

      {/* Error */}
      {error && (
        <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">

          <div className="flex items-center gap-3">

            <AlertCircle
              size={18}
              className="shrink-0 text-red-500"
            />

            <span className="text-sm text-red-700">
              {error}
            </span>

          </div>

          <button
            onClick={() =>
              loadDashboardStats()
            }
            className="text-sm font-semibold text-red-700 hover:text-red-800"
          >
            Retry
          </button>

        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="mt-8 flex min-h-80 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center gap-3 text-sm text-slate-500">

            <Loader2
              size={20}
              className="animate-spin text-blue-600"
            />

            Loading dashboard statistics...

          </div>

        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            {statCards.map((stat) => {
              const Icon = stat.icon

              return (
                <div
                  key={stat.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >

                  <div className="flex items-start justify-between">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Icon size={20} />
                    </div>

                    <TrendingUp
                      size={17}
                      className="text-slate-300"
                    />

                  </div>

                  <div className="mt-5">

                    <div className="text-2xl font-bold text-slate-900">
                      {formatNumber(
                        stat.value,
                      )}
                    </div>

                    <div className="mt-1 font-medium text-slate-700">
                      {stat.title}
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      {stat.description}
                    </div>

                  </div>

                </div>
              )
            })}

          </div>

          {/* Additional Statistics */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Database size={20} />
                </div>

                <div>
                  <div className="text-xs text-slate-400">
                    Knowledge Base
                  </div>

                  <div className="mt-1 text-xl font-bold text-slate-900">
                    {formatNumber(
                      stats.knowledge_base.total_chunks,
                    )}
                  </div>

                  <div className="text-sm text-slate-500">
                    Indexed knowledge chunks
                  </div>
                </div>

              </div>

            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <MessageSquare size={20} />
                </div>

                <div>
                  <div className="text-xs text-slate-400">
                    Conversations
                  </div>

                  <div className="mt-1 text-xl font-bold text-slate-900">
                    {formatNumber(
                      stats.conversations.total,
                    )}
                  </div>

                  <div className="text-sm text-slate-500">
                    {formatNumber(
                      stats.conversations.total_messages,
                    )}{' '}
                    total messages
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Main grid */}
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">

            {/* Activity */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">

              <div className="border-b border-slate-200 px-5 py-4">

                <h3 className="font-semibold text-slate-900">
                  Recent Activity
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  Latest knowledge base changes
                </p>

              </div>

              {stats.activity.length === 0 ? (
                <div className="px-5 py-12 text-center">

                  <Files
                    size={28}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm text-slate-500">
                    No document activity yet.
                  </p>

                </div>
              ) : (
                <div className="divide-y divide-slate-100">

                  {stats.activity.map(
                    (item, index) => (
                      <div
                        key={`${item.document}-${index}`}
                        className="flex items-center justify-between gap-4 px-5 py-4"
                      >

                        <div className="flex min-w-0 items-center gap-3">

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                            <Files
                              size={17}
                              className="text-slate-500"
                            />
                          </div>

                          <div className="min-w-0">

                            <div className="truncate text-sm font-medium text-slate-700">
                              {item.document}
                            </div>

                            <div className="mt-0.5 text-xs text-slate-400">
                              {item.action}
                            </div>

                          </div>

                        </div>

                        <span className="shrink-0 text-xs text-slate-400">
                          {item.time}
                        </span>

                      </div>
                    ),
                  )}

                </div>
              )}

            </div>

            {/* Knowledge Base Health */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <h3 className="font-semibold text-slate-900">
                Knowledge Base Health
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                Current indexing status
              </p>

              <div className="mt-7 flex items-center justify-center">

                <div className="flex h-36 w-36 items-center justify-center rounded-full border-8 border-blue-100">

                  <div className="text-center">

                    <div className="text-3xl font-bold text-slate-900">
                      {
                        stats.knowledge_base
                          .health_percentage
                      }%
                    </div>

                    <div className="text-xs text-slate-400">
                      {stats.knowledge_base
                        .health_percentage === 100
                        ? 'Healthy'
                        : 'Needs attention'}
                    </div>

                  </div>

                </div>

              </div>

              <div className="mt-7 space-y-3">

                <div className="flex items-center justify-between text-sm">

                  <span className="text-slate-500">
                    Indexed
                  </span>

                  <span className="font-medium text-slate-700">
                    {formatNumber(
                      stats.documents.indexed,
                    )}
                  </span>

                </div>

                <div className="flex items-center justify-between text-sm">

                  <span className="text-slate-500">
                    Processing
                  </span>

                  <span className="font-medium text-slate-700">
                    {formatNumber(
                      stats.documents.processing,
                    )}
                  </span>

                </div>

                <div className="flex items-center justify-between text-sm">

                  <span className="text-slate-500">
                    Failed
                  </span>

                  <span className="font-medium text-slate-700">
                    {formatNumber(
                      stats.documents.failed,
                    )}
                  </span>

                </div>

              </div>

            </div>

          </div>
        </>
      )}

    </div>
  )
}

export default Dashboard