import { useState } from 'react'
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

function UploadDocument() {
  const initialForm = {
    title: '',
    department: '',
    category: '',
    version: '1.0',
    description: '',
  }

  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [form, setForm] = useState(initialForm)

  const handleFile = (selectedFile) => {
    if (!selectedFile) return

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
    ]

    if (!allowedTypes.includes(selectedFile.type)) {
      setUploadError(
        'Please upload a PDF, DOCX, TXT, or Markdown file.',
      )
      return
    }

    setFile(selectedFile)
    setUploaded(false)
    setUploadError('')

    // Automatically use the filename as the title
    if (!form.title) {
      setForm((previous) => ({
        ...previous,
        title: selectedFile.name.replace(/\.[^/.]+$/, ''),
      }))
    }
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setDragActive(false)

    const droppedFile = event.dataTransfer.files?.[0]

    if (droppedFile) {
      handleFile(droppedFile)
    }
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setUploaded(false)
    setUploadError('')

    if (!file) {
      setUploadError('Please select a document first.')
      return
    }

    if (!form.title || !form.department || !form.category) {
      setUploadError(
        'Please complete the required document information.',
      )
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()

      formData.append('file', file)
      formData.append('title', form.title)
      formData.append('department', form.department)
      formData.append('category', form.category)
      formData.append('version', form.version)
      formData.append('description', form.description)

      formData.append('file', file)

      const response = await api.post(
        '/api/documents/upload',
        formData,
      )

      console.log('Upload response:', response.data)

      // Show success message
      setUploaded(true)

      // Clear selected file
      setFile(null)

      // Reset form
      setForm(initialForm)

      // Clear upload error
      setUploadError('')
    } catch (error) {
      console.error('Document upload failed:', error)

      const detail = error.response?.data?.detail

      let message = 'Document upload failed. Please try again.'

      if (typeof detail === 'string') {
        message = detail
      } else if (Array.isArray(detail)) {
        message = detail
          .map((item) => item.msg || 'Invalid request')
          .join(', ')
      }

      setUploadError(message)
    } finally {
      setUploading(false)
    }
  }

  const removeFile = () => {
    setFile(null)
    setUploaded(false)
    setUploadError('')

    setForm((previous) => ({
      ...previous,
      title: '',
    }))
  }

  return (
    <div className="min-h-full bg-slate-50 px-6 py-8 lg:px-8">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-8">
          <Link
            to="/admin/documents"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Documents
          </Link>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Upload Document
          </h1>

          <p className="mt-2 text-slate-500">
            Add a document to your organization's AI knowledge base.
          </p>
        </div>

        {/* Success Message */}
        {uploaded && (
          <div className="mb-6 flex items-start gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2
                size={22}
                className="text-emerald-600"
              />
            </div>

            <div>
              <p className="font-semibold text-emerald-900">
                Document uploaded successfully
              </p>

              <p className="mt-1 text-sm text-emerald-700">
                Your document has been uploaded to the knowledge base.
              </p>

              <p className="mt-1 text-xs text-emerald-600">
                You can upload another document using the form below.
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {uploadError && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0 text-red-600"
            />

            <div>
              <p className="font-semibold text-red-900">
                Upload failed
              </p>

              <p className="mt-1 text-sm text-red-700">
                {uploadError}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-3">

            {/* Left Side */}
            <div className="space-y-6 lg:col-span-2">

              {/* Upload Area */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Document File
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Upload PDF, DOCX, TXT, or Markdown files.
                  </p>
                </div>

                {!file ? (
                  <div
                    onDragOver={(event) => {
                      event.preventDefault()
                      setDragActive(true)
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    className={`rounded-xl border-2 border-dashed p-10 text-center transition ${
                      dragActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-300 bg-slate-50'
                    }`}
                  >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                      <Upload
                        size={26}
                        className="text-blue-600"
                      />
                    </div>

                    <h3 className="mt-4 font-semibold text-slate-900">
                      Drag and drop your document here
                    </h3>

                    <p className="mt-2 text-sm text-slate-500">
                      or select a file from your computer
                    </p>

                    <label className="mt-5 inline-flex cursor-pointer items-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800">
                      Browse Files

                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx,.txt,.md"
                        onChange={(event) =>
                          handleFile(event.target.files?.[0])
                        }
                      />
                    </label>

                    <p className="mt-4 text-xs text-slate-400">
                      Supported formats: PDF, DOCX, TXT, MD
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                        <FileText
                          size={24}
                          className="text-blue-600"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">
                          {file.name}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={removeFile}
                        className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-red-500"
                        title="Remove file"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Document Information */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Document Information
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Add metadata to help organize and retrieve the document.
                  </p>
                </div>

                <div className="space-y-5">

                  {/* Title */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Document Title{' '}
                      <span className="text-red-500">*</span>
                    </label>

                    <input
                      type="text"
                      name="title"
                      value={form.title}
                      onChange={handleInputChange}
                      placeholder="e.g. Employee Leave Policy"
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* Department + Category */}
                  <div className="grid gap-5 sm:grid-cols-2">

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Department{' '}
                        <span className="text-red-500">*</span>
                      </label>

                      <select
                        name="department"
                        value={form.department}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">
                          Select department
                        </option>
                        <option value="HR">HR</option>
                        <option value="IT">IT</option>
                        <option value="Finance">
                          Finance
                        </option>
                        <option value="Operations">
                          Operations
                        </option>
                        <option value="Legal">
                          Legal
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Category{' '}
                        <span className="text-red-500">*</span>
                      </label>

                      <select
                        name="category"
                        value={form.category}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">
                          Select category
                        </option>
                        <option value="Policy">
                          Policy
                        </option>
                        <option value="SOP">
                          SOP
                        </option>
                        <option value="Security">
                          Security
                        </option>
                        <option value="Onboarding">
                          Onboarding
                        </option>
                        <option value="Travel">
                          Travel
                        </option>
                        <option value="Expenses">
                          Expenses
                        </option>
                        <option value="Other">
                          Other
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Version */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Version
                    </label>

                    <input
                      type="text"
                      name="version"
                      value={form.version}
                      onChange={handleInputChange}
                      placeholder="1.0"
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Description
                    </label>

                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleInputChange}
                      rows={4}
                      placeholder="Briefly describe what this document contains..."
                      className="w-full resize-none rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                </div>
              </div>
            </div>

            {/* Right Side */}
            <div className="space-y-6">

              {/* Knowledge Base */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Knowledge Base
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  The document will be processed and indexed after upload.
                </p>

                <div className="mt-5 space-y-3">

                  <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                    <CheckCircle2
                      size={18}
                      className="text-emerald-500"
                    />

                    <span className="text-sm text-slate-700">
                      Text extraction
                    </span>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                    <CheckCircle2
                      size={18}
                      className="text-emerald-500"
                    />

                    <span className="text-sm text-slate-700">
                      Document chunking
                    </span>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                    <CheckCircle2
                      size={18}
                      className="text-emerald-500"
                    />

                    <span className="text-sm text-slate-700">
                      Vector indexing
                    </span>
                  </div>

                </div>
              </div>

              {/* Upload Guidelines */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertCircle
                    size={19}
                    className="mt-0.5 text-slate-400"
                  />

                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      Upload Guidelines
                    </h3>

                    <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-500">
                      <li>• Use clear document titles.</li>
                      <li>• Select the correct department.</li>
                      <li>• Keep document versions updated.</li>
                      <li>• Avoid duplicate documents.</li>
                    </ul>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Bottom Actions */}
          <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-200 pt-6">

            <Link
              to="/admin/documents"
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload size={17} />

              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>

          </div>
        </form>
      </div>
    </div>
  )
}

export default UploadDocument