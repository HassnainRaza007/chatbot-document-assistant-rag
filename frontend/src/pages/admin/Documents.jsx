import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  FileText,
  Upload,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Loader2,
  RefreshCw,
  Trash2,
  RotateCcw,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import api from '../../services/api'

function Documents() {
  const navigate = useNavigate()

  const [documents, setDocuments] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [reindexingId, setReindexingId] = useState(null)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const loadDocuments = async (showRefreshState = false) => {
    try {
      setError('')

      if (showRefreshState) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const response = await api.get('/api/documents')

      setDocuments(response.data)
    } catch (error) {
      console.error('Failed to load documents:', error)

      setError(
        error.response?.data?.detail ||
          'Failed to load documents. Please try again.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [])

  const handleReindex = async (document) => {
    const confirmed = window.confirm(
      `Are you sure you want to re-index "${document.title}"?\n\nThis will regenerate the document embeddings and update its knowledge in the AI assistant.`
    )

    if (!confirmed) {
      return
    }

    try {
      setError('')
      setSuccessMessage('')
      setReindexingId(document.id)

      const response = await api.post(
        `/api/documents/${document.id}/reindex`
      )

      // Update the document status in the current UI
      setDocuments((currentDocuments) =>
        currentDocuments.map((item) =>
          item.id === document.id
            ? {
                ...item,
                status: response.data.status || 'indexed',
              }
            : item
        )
      )

      window.alert(
        `"${document.title}" was re-indexed successfully.\n\n${response.data.chunks_indexed} chunks were indexed.`
      )
    } catch (error) {
      console.error('Failed to re-index document:', error)

      setError(
        error.response?.data?.detail ||
          'Failed to re-index document. Please try again.'
      )
    } finally {
      setReindexingId(null)
    }
  }

  const handleDelete = async (document) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${document.title}"?\n\nThis will permanently remove the document, its chunks, and its indexed knowledge from the system.`
    )

    if (!confirmed) {
      return
    }

    try {
      setError('')
      setSuccessMessage('')
      setDeletingId(document.id)

      await api.delete(`/api/documents/${document.id}`)

      // Remove the document from the current UI
      setDocuments((currentDocuments) =>
        currentDocuments.filter(
          (item) => item.id !== document.id
        )
      )

      // Show a guaranteed success popup
      window.alert(
        `"${document.title}" was deleted successfully.`
      )
    } catch (error) {
      console.error('Failed to delete document:', error)

      setError(
        error.response?.data?.detail ||
          'Failed to delete document. Please try again.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  const departments = useMemo(() => {
    return [
      ...new Set(
        documents
          .map((document) => document.department)
          .filter(Boolean)
      ),
    ].sort()
  }, [documents])

  const filteredDocuments = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()

    return documents.filter((document) => {
      const matchesSearch =
        !search ||
        document.title?.toLowerCase().includes(search) ||
        document.filename?.toLowerCase().includes(search) ||
        document.category?.toLowerCase().includes(search) ||
        document.department?.toLowerCase().includes(search)

      const matchesStatus =
        statusFilter === 'all' ||
        document.status === statusFilter

      const matchesDepartment =
        departmentFilter === 'all' ||
        document.department === departmentFilter

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDepartment
      )
    })
  }, [
    documents,
    searchTerm,
    statusFilter,
    departmentFilter,
  ])

  const getStatusConfig = (status) => {
    switch (status) {
      case 'indexed':
        return {
          label: 'Indexed',
          icon: CheckCircle2,
        }

      case 'indexing':
        return {
          label: 'Indexing',
          icon: Loader2,
        }

      case 'chunked':
        return {
          label: 'Chunked',
          icon: Clock3,
        }

      case 'text_extracted':
        return {
          label: 'Text Extracted',
          icon: Clock3,
        }

      case 'indexing_failed':
        return {
          label: 'Indexing Failed',
          icon: AlertCircle,
        }

      case 'uploaded':
        return {
          label: 'Uploaded',
          icon: Clock3,
        }

      default:
        return {
          label: status || 'Unknown',
          icon: AlertCircle,
        }
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) {
      return '0 KB'
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateString) => {
    if (!dateString) {
      return '-'
    }

    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="space-y-6">

      {/* ================= HEADER ================= */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Documents
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage documents available to the Enterprise AI Assistant.
          </p>
        </div>

        <div className="flex items-center gap-3">

          <button
            type="button"
            onClick={() => loadDocuments(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}

            Refresh
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/upload')}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <Upload className="h-4 w-4" />

            Upload Document
          </button>

        </div>
      </div>

      {/* ================= ERROR ================= */}

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <div className="flex-1">
            {error}
          </div>

          <button
            type="button"
            onClick={() => setError('')}
            className="font-medium text-red-700 hover:text-red-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ================= FILTERS ================= */}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

          {/* Search */}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search documents..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          {/* Status */}

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">
              All Statuses
            </option>

            <option value="indexed">
              Indexed
            </option>

            <option value="indexing">
              Indexing
            </option>

            <option value="chunked">
              Chunked
            </option>

            <option value="text_extracted">
              Text Extracted
            </option>

            <option value="uploaded">
              Uploaded
            </option>

            <option value="indexing_failed">
              Indexing Failed
            </option>
          </select>

          {/* Department */}

          <select
            value={departmentFilter}
            onChange={(event) =>
              setDepartmentFilter(event.target.value)
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">
              All Departments
            </option>

            {departments.map((department) => (
              <option
                key={department}
                value={department}
              >
                {department}
              </option>
            ))}
          </select>

        </div>
      </div>

      {/* ================= DOCUMENT TABLE ================= */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading documents...
            </div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <FileText className="h-10 w-10 text-slate-300" />

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No documents found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Try changing your search or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="min-w-full">

              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Document
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Department
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Category
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Version
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Size
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Uploaded
                  </th>

                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredDocuments.map((document) => {
                  const statusConfig =
                    getStatusConfig(document.status)

                  const StatusIcon =
                    statusConfig.icon

                  const isDeleting =
                    deletingId === document.id

                  const isReindexing =
                    reindexingId === document.id

                  const isBusy =
                    isDeleting || isReindexing

                  return (
                    <tr
                      key={document.id}
                      className="transition hover:bg-slate-50"
                    >

                      {/* Document */}

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                            <FileText className="h-5 w-5 text-slate-600" />
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900">
                              {document.title}
                            </div>

                            <div className="mt-0.5 truncate text-xs text-slate-500">
                              {document.filename}
                            </div>
                          </div>

                        </div>
                      </td>

                      {/* Department */}

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                        {document.department}
                      </td>

                      {/* Category */}

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                        {document.category}
                      </td>

                      {/* Status */}

                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          <StatusIcon
                            className={`h-3.5 w-3.5 ${
                              document.status === 'indexing'
                                ? 'animate-spin'
                                : ''
                            }`}
                          />

                          {statusConfig.label}
                        </div>
                      </td>

                      {/* Version */}

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                        {document.version}
                      </td>

                      {/* Size */}

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                        {formatFileSize(document.file_size)}
                      </td>

                      {/* Uploaded */}

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                        {formatDate(document.uploaded_at)}
                      </td>

                      {/* Actions */}

                      <td className="whitespace-nowrap px-6 py-4 text-right">

                        <div className="flex items-center justify-end gap-2">

                          {/* Re-index */}

                          <button
                            type="button"
                            onClick={() =>
                              handleReindex(document)
                            }
                            disabled={isBusy}
                            title="Re-index document"
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isReindexing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}

                            {isReindexing
                              ? 'Re-indexing...'
                              : 'Re-index'}
                          </button>

                          {/* Delete */}

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(document)
                            }
                            disabled={isBusy}
                            title="Delete document"
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}

                            {isDeleting
                              ? 'Deleting...'
                              : 'Delete'}
                          </button>

                        </div>

                      </td>

                    </tr>
                  )
                })}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* ================= RESULT COUNT ================= */}

      {!loading && (
        <div className="text-sm text-slate-500">
          Showing {filteredDocuments.length} of{' '}
          {documents.length} documents
        </div>
      )}

    </div>
  )
}

export default Documents