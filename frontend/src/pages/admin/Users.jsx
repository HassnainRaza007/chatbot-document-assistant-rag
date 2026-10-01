import { useEffect, useState } from 'react'
import {
  Users as UsersIcon,
  ShieldCheck,
  UserRound,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  X,
  Save,
  Mail,
  LockKeyhole,
  Shield,
  Crown,
  AlertTriangle,
} from 'lucide-react'

import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'


function Users() {
  const {
    user: currentUser,
    isSuperAdmin,
  } = useAuth()

  const [users, setUsers] = useState([])

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState('')

  const [success, setSuccess] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)

  const [modalMode, setModalMode] = useState('add')

  const [selectedUser, setSelectedUser] = useState(null)

  const [isSaving, setIsSaving] = useState(false)

  const [isDeleting, setIsDeleting] = useState(false)

  const [isStatusChanging, setIsStatusChanging] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)

  const [statusTarget, setStatusTarget] = useState(null)

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
    is_active: true,
  })


  // ---------------------------------------------------------
  // Role Helpers
  // ---------------------------------------------------------

  const getRoleLabel = (role) => {
    if (role === 'super_admin') {
      return 'Super Admin'
    }

    if (role === 'admin') {
      return 'Co-Admin'
    }

    return 'User'
  }


  const getRoleDescription = (role) => {
    if (role === 'super_admin') {
      return 'Full system administration'
    }

    if (role === 'admin') {
      return 'Administrative access'
    }

    return 'Standard access'
  }


  const getRoleIcon = (role) => {
    if (role === 'super_admin') {
      return Crown
    }

    if (role === 'admin') {
      return ShieldCheck
    }

    return UserRound
  }


  const canManageUser = (targetUser) => {
    if (!currentUser || !targetUser) {
      return false
    }

    // Nobody can manage the Super Admin account.
    if (targetUser.role === 'super_admin') {
      return false
    }

    // Super Admin can manage Users and Co-Admins.
    if (currentUser.role === 'super_admin') {
      return true
    }

    // Co-Admin can only manage normal Users.
    if (currentUser.role === 'admin') {
      return targetUser.role === 'user'
    }

    return false
  }


  const canEditUser = (targetUser) => {
    return canManageUser(targetUser)
  }


  const canChangeStatus = (targetUser) => {
    if (!canManageUser(targetUser)) {
      return false
    }

    // A user must never deactivate their own account.
    if (targetUser.id === currentUser?.id) {
      return false
    }

    return true
  }


  const canDeleteUser = (targetUser) => {
    if (!canManageUser(targetUser)) {
      return false
    }

    // A user must never delete their own account.
    if (targetUser.id === currentUser?.id) {
      return false
    }

    return true
  }


  // ---------------------------------------------------------
  // Messages
  // ---------------------------------------------------------

  const clearMessages = () => {
    setError('')
    setSuccess('')
  }


  // ---------------------------------------------------------
  // Load Users
  // ---------------------------------------------------------

  const loadUsers = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get('/api/users')

      setUsers(response.data)
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        'Failed to load users.'

      setError(message)
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    loadUsers()
  }, [])


  // ---------------------------------------------------------
  // Add User
  // ---------------------------------------------------------

  const openAddModal = () => {
    clearMessages()

    setModalMode('add')
    setSelectedUser(null)

    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'user',
      is_active: true,
    })

    setIsModalOpen(true)
  }


  // ---------------------------------------------------------
  // Edit User
  // ---------------------------------------------------------

  const openEditModal = (user) => {
    if (!canEditUser(user)) {
      return
    }

    clearMessages()

    setModalMode('edit')
    setSelectedUser(user)

    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      is_active: user.is_active,
    })

    setIsModalOpen(true)
  }


  // ---------------------------------------------------------
  // Close Modal
  // ---------------------------------------------------------

  const closeModal = () => {
    if (isSaving) {
      return
    }

    setIsModalOpen(false)
    setSelectedUser(null)

    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'user',
      is_active: true,
    })
  }


  // ---------------------------------------------------------
  // Form Input
  // ---------------------------------------------------------

  const handleInputChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target

    setFormData((previous) => ({
      ...previous,
      [name]: type === 'checkbox'
        ? checked
        : value,
    }))
  }


  // ---------------------------------------------------------
  // Save User
  // ---------------------------------------------------------

  const handleSaveUser = async (event) => {
    event.preventDefault()

    clearMessages()

    if (!formData.username.trim()) {
      setError('Username is required.')
      return
    }

    if (!formData.email.trim()) {
      setError('Email is required.')
      return
    }

    if (modalMode === 'add' && !formData.password) {
      setError(
        'Password is required when creating a user.',
      )
      return
    }

    if (
      formData.password &&
      formData.password.length < 8
    ) {
      setError(
        'Password must contain at least 8 characters.',
      )
      return
    }

    if (
      modalMode === 'edit' &&
      selectedUser &&
      !canEditUser(selectedUser)
    ) {
      setError(
        'You do not have permission to modify this user.',
      )
      return
    }

    setIsSaving(true)

    try {
      if (modalMode === 'add') {
        await api.post(
          '/api/users',
          {
            username: formData.username.trim(),
            email: formData.email.trim(),
            password: formData.password,
            role: formData.role,
            is_active: formData.is_active,
          },
        )

        setSuccess(
          `User "${formData.username.trim()}" was created successfully.`,
        )
      } else {
        const payload = {
          username: formData.username.trim(),
          email: formData.email.trim(),
          role: formData.role,
          is_active: formData.is_active,
        }

        if (formData.password) {
          payload.password = formData.password
        }

        await api.put(
          `/api/users/${selectedUser.id}`,
          payload,
        )

        setSuccess(
          `User "${formData.username.trim()}" was updated successfully.`,
        )
      }

      setIsModalOpen(false)

      setSelectedUser(null)

      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'user',
        is_active: true,
      })

      await loadUsers()

    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        'Failed to save user.'

      setError(message)
    } finally {
      setIsSaving(false)
    }
  }


  // ---------------------------------------------------------
  // Delete User
  // ---------------------------------------------------------

  const requestDeleteUser = (user) => {
    if (!canDeleteUser(user)) {
      return
    }

    clearMessages()

    setDeleteTarget(user)
  }


  const cancelDelete = () => {
    if (isDeleting) {
      return
    }

    setDeleteTarget(null)
  }


  const confirmDeleteUser = async () => {
    if (!deleteTarget) {
      return
    }

    if (!canDeleteUser(deleteTarget)) {
      setError(
        'You do not have permission to delete this user.',
      )

      setDeleteTarget(null)

      return
    }

    clearMessages()

    setIsDeleting(true)

    try {
      await api.delete(
        `/api/users/${deleteTarget.id}`,
      )

      setSuccess(
        `User "${deleteTarget.username}" was deleted successfully.`,
      )

      setDeleteTarget(null)

      await loadUsers()

    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        'Failed to delete user.'

      setError(message)
    } finally {
      setIsDeleting(false)
    }
  }


  // ---------------------------------------------------------
  // Status Change
  // ---------------------------------------------------------

  const requestStatusChange = (user) => {
    if (!canChangeStatus(user)) {
      return
    }

    clearMessages()

    setStatusTarget(user)
  }


  const cancelStatusChange = () => {
    if (isStatusChanging) {
      return
    }

    setStatusTarget(null)
  }


  const confirmStatusChange = async () => {
    if (!statusTarget) {
      return
    }

    if (!canChangeStatus(statusTarget)) {
      setError(
        'You do not have permission to change this account status.',
      )

      setStatusTarget(null)

      return
    }

    clearMessages()

    setIsStatusChanging(true)

    try {
      await api.put(
        `/api/users/${statusTarget.id}`,
        {
          username: statusTarget.username,
          email: statusTarget.email,
          role: statusTarget.role,
          is_active: !statusTarget.is_active,
        },
      )

      const newStatus =
        !statusTarget.is_active
          ? 'activated'
          : 'deactivated'

      setSuccess(
        `User "${statusTarget.username}" was ${newStatus} successfully.`,
      )

      setStatusTarget(null)

      await loadUsers()

    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        `Failed to ${statusTarget.is_active ? 'deactivate' : 'activate'} user.`

      setError(message)
    } finally {
      setIsStatusChanging(false)
    }
  }


  // ---------------------------------------------------------
  // Summary
  // ---------------------------------------------------------

  const activeUsers = users.filter(
    (user) => user.is_active,
  ).length


  const adminUsers = users.filter(
    (user) =>
      user.role === 'admin' ||
      user.role === 'super_admin',
  ).length


  return (
    <div className="min-h-full bg-slate-50 p-6">

      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <UsersIcon size={22} />
            </div>

            <div>

              <h2 className="text-2xl font-semibold text-slate-900">
                User Management
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage users, roles, account status, and access.
              </p>

            </div>

          </div>

        </div>


        <div className="flex items-center gap-3">

          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={loading ? 'animate-spin' : ''}
            />

            Refresh
          </button>


          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md active:scale-[0.98]"
          >
            <Plus size={18} />

            Add User
          </button>

        </div>

      </div>


      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm font-medium text-slate-500">
                Total Users
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {users.length}
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UsersIcon size={21} />
            </div>

          </div>

        </div>


        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm font-medium text-slate-500">
                Active Users
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {activeUsers}
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <UserCheck size={21} />
            </div>

          </div>

        </div>


        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm font-medium text-slate-500">
                Administrators
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {adminUsers}
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <ShieldCheck size={21} />
            </div>

          </div>

        </div>

      </div>


      {/* Success Message */}
      {success && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">

          <div className="flex items-center gap-2">

            <UserCheck size={18} />

            <span>{success}</span>

          </div>

          <button
            type="button"
            onClick={() => setSuccess('')}
            className="rounded-lg p-1 hover:bg-emerald-100"
          >
            <X size={16} />
          </button>

        </div>
      )}


      {/* Error Message */}
      {error && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">

          <div className="flex items-center gap-2">

            <AlertTriangle size={18} />

            <span>{error}</span>

          </div>

          <button
            type="button"
            onClick={() => setError('')}
            className="rounded-lg p-1 hover:bg-red-100"
          >
            <X size={16} />
          </button>

        </div>
      )}


      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-200 px-6 py-4">

          <div className="flex items-center justify-between">

            <div>

              <div className="flex items-center gap-2">

                <h3 className="font-semibold text-slate-900">
                  All Users
                </h3>

                {!loading && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {users.length}
                  </span>
                )}

              </div>

              <p className="mt-1 text-xs text-slate-400">
                Manage accounts and permissions from this table.
              </p>

            </div>

          </div>

        </div>


        {loading ? (

          <div className="flex items-center justify-center px-6 py-20">

            <div className="text-center">

              <RefreshCw
                size={28}
                className="mx-auto animate-spin text-blue-600"
              />

              <p className="mt-3 text-sm text-slate-500">
                Loading users...
              </p>

            </div>

          </div>

        ) : users.length === 0 ? (

          <div className="px-6 py-20 text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <UsersIcon size={30} />
            </div>

            <p className="mt-4 text-sm font-semibold text-slate-700">
              No users found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Create your first user to get started.
            </p>

            <button
              type="button"
              onClick={openAddModal}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={17} />

              Add User
            </button>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="min-w-full">

              <thead>

                <tr className="border-b border-slate-200 bg-slate-50">

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    User
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Email
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Role
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>

                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>

                </tr>

              </thead>


              <tbody className="divide-y divide-slate-200">

                {users.map((user) => {

                  const isCurrentUser =
                    currentUser?.id === user.id

                  const RoleIcon =
                    getRoleIcon(user.role)

                  const canEdit =
                    canEditUser(user)

                  const canChange =
                    canChangeStatus(user)

                  const canDelete =
                    canDeleteUser(user)

                  return (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-slate-50"
                    >

                      {/* User */}
                      <td className="whitespace-nowrap px-6 py-4">

                        <div className="flex items-center gap-3">

                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                              user.role === 'super_admin'
                                ? 'bg-amber-100 text-amber-700'
                                : user.role === 'admin'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <RoleIcon size={19} />
                          </div>

                          <div>

                            <div className="flex items-center gap-2">

                              <span className="text-sm font-semibold text-slate-900">
                                {user.username}
                              </span>

                              {isCurrentUser && (
                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                  You
                                </span>
                              )}

                            </div>

                            <div className="mt-0.5 text-xs text-slate-400">
                              User ID #{user.id}
                            </div>

                          </div>

                        </div>

                      </td>


                      {/* Email */}
                      <td className="whitespace-nowrap px-6 py-4">

                        <div className="flex items-center gap-2 text-sm text-slate-600">

                          <Mail
                            size={15}
                            className="text-slate-400"
                          />

                          {user.email}

                        </div>

                      </td>


                      {/* Role */}
                      <td className="whitespace-nowrap px-6 py-4">

                        {user.role === 'super_admin' ? (

                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">

                            <Crown size={13} />

                            Super Admin

                          </span>

                        ) : user.role === 'admin' ? (

                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">

                            <ShieldCheck size={13} />

                            Co-Admin

                          </span>

                        ) : (

                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">

                            <UserRound size={13} />

                            User

                          </span>

                        )}

                      </td>


                      {/* Status */}
                      <td className="whitespace-nowrap px-6 py-4">

                        {user.is_active ? (

                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">

                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                            Active

                          </span>

                        ) : (

                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">

                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />

                            Inactive

                          </span>

                        )}

                      </td>


                      {/* Actions */}
                      <td className="whitespace-nowrap px-6 py-4">

                        <div className="flex items-center justify-end gap-2">

                          {isCurrentUser ? (

                            <span className="text-xs font-medium text-slate-400">
                              Current account
                            </span>

                          ) : user.role === 'super_admin' ? (

                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                              <Crown size={13} />
                              Protected
                            </span>

                          ) : (

                            <>

                              {/* Edit */}
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditModal(user)
                                  }
                                  title="Edit user"
                                  className="group inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:shadow"
                                >
                                  <Pencil
                                    size={14}
                                    className="transition-transform group-hover:scale-110"
                                  />

                                  Edit
                                </button>
                              )}


                              {/* Activate / Deactivate */}
                              {canChange && (

                                <button
                                  type="button"
                                  onClick={() =>
                                    requestStatusChange(user)
                                  }
                                  title={
                                    user.is_active
                                      ? 'Deactivate user'
                                      : 'Activate user'
                                  }
                                  className={`group inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold shadow-sm transition-all ${
                                    user.is_active
                                      ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:shadow'
                                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:shadow'
                                  }`}
                                >

                                  {user.is_active ? (
                                    <UserX
                                      size={14}
                                      className="transition-transform group-hover:scale-110"
                                    />
                                  ) : (
                                    <UserCheck
                                      size={14}
                                      className="transition-transform group-hover:scale-110"
                                    />
                                  )}

                                  {user.is_active
                                    ? 'Deactivate'
                                    : 'Activate'}

                                </button>

                              )}


                              {/* Delete */}
                              {canDelete && (

                                <button
                                  type="button"
                                  onClick={() =>
                                    requestDeleteUser(user)
                                  }
                                  title="Delete user"
                                  className="group inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 shadow-sm transition-all hover:bg-red-50 hover:shadow"
                                >

                                  <Trash2
                                    size={14}
                                    className="transition-transform group-hover:scale-110"
                                  />

                                  Delete

                                </button>

                              )}

                            </>

                          )}

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


      {/* Add / Edit User Modal */}
      {isModalOpen && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm">

          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

                  {modalMode === 'add' ? (
                    <Plus size={20} />
                  ) : (
                    <Pencil size={19} />
                  )}

                </div>

                <div>

                  <h3 className="font-semibold text-slate-900">

                    {modalMode === 'add'
                      ? 'Add New User'
                      : 'Edit User'}

                  </h3>

                  <p className="mt-0.5 text-xs text-slate-400">

                    {modalMode === 'add'
                      ? 'Create a new Enterprise AI account.'
                      : 'Update this user account and permissions.'}

                  </p>

                </div>

              </div>


              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
              >
                <X size={19} />
              </button>

            </div>


            {/* Modal Body */}
            <form
              onSubmit={handleSaveUser}
              className="space-y-5 px-6 py-6"
            >

              {/* Username */}
              <div>

                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Username
                </label>

                <div className="relative">

                  <UserRound
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Enter username"
                    disabled={isSaving}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50"
                  />

                </div>

              </div>


              {/* Email */}
              <div>

                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email Address
                </label>

                <div className="relative">

                  <Mail
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="user@example.com"
                    disabled={isSaving}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50"
                  />

                </div>

              </div>


              {/* Password */}
              <div>

                <label
                  htmlFor="password"
                  className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700"
                >

                  <span>Password</span>

                  {modalMode === 'edit' && (
                    <span className="text-xs font-normal text-slate-400">
                      Leave blank to keep current password
                    </span>
                  )}

                </label>

                <div className="relative">

                  <LockKeyhole
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder={
                      modalMode === 'add'
                        ? 'Minimum 8 characters'
                        : 'Enter new password'
                    }
                    disabled={isSaving}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50"
                  />

                </div>

              </div>


              {/* Role */}
              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Role
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

                  {/* User */}
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((previous) => ({
                        ...previous,
                        role: 'user',
                      }))
                    }
                    disabled={isSaving}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                      formData.role === 'user'
                        ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >

                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        formData.role === 'user'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <UserRound size={18} />
                    </div>

                    <div>

                      <div className="text-sm font-semibold text-slate-800">
                        User
                      </div>

                      <div className="text-xs text-slate-400">
                        Standard access
                      </div>

                    </div>

                  </button>


                  {/* Co-Admin */}
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((previous) => ({
                        ...previous,
                        role: 'admin',
                      }))
                    }
                    disabled={
                      isSaving ||
                      !isSuperAdmin
                    }
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                      formData.role === 'admin'
                        ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    } ${
                      !isSuperAdmin
                        ? 'cursor-not-allowed opacity-50'
                        : ''
                    }`}
                  >

                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        formData.role === 'admin'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Shield size={18} />
                    </div>

                    <div>

                      <div className="text-sm font-semibold text-slate-800">
                        Co-Admin
                      </div>

                      <div className="text-xs text-slate-400">
                        Administrative access
                      </div>

                    </div>

                  </button>


                  {/* Super Admin */}
                  <div
                    className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 opacity-70"
                  >

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <Crown size={18} />
                    </div>

                    <div>

                      <div className="text-sm font-semibold text-slate-800">
                        Super Admin
                      </div>

                      <div className="text-xs text-slate-500">
                        Single protected account
                      </div>

                    </div>

                  </div>

                </div>

                <p className="mt-2 text-xs text-slate-400">
                  The Super Admin account is unique and cannot be created, replaced, deactivated, or deleted.
                </p>

              </div>


              {/* Active Status */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                <label className="flex cursor-pointer items-center justify-between">

                  <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">

                      {formData.is_active ? (
                        <UserCheck size={18} />
                      ) : (
                        <UserX size={18} />
                      )}

                    </div>

                    <div>

                      <div className="text-sm font-semibold text-slate-800">
                        Account Status
                      </div>

                      <div className="text-xs text-slate-400">

                        {formData.is_active
                          ? 'User can sign in'
                          : 'User cannot sign in'}

                      </div>

                    </div>

                  </div>


                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    disabled={
                      isSaving ||
                      (
                        modalMode === 'edit' &&
                        selectedUser?.role === 'super_admin'
                      ) ||
                      (
                        modalMode === 'edit' &&
                        selectedUser?.id === currentUser?.id
                      )
                    }
                    className="h-5 w-5 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                  />

                </label>

              </div>


              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {isSaving ? (
                    <>

                      <RefreshCw
                        size={16}
                        className="animate-spin"
                      />

                      Saving...

                    </>
                  ) : (
                    <>

                      <Save size={16} />

                      {modalMode === 'add'
                        ? 'Create User'
                        : 'Save Changes'}

                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* Delete Confirmation Modal */}
      {deleteTarget && (

        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm">

          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="p-6">

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">

                  <Trash2 size={21} />

                </div>

                <div>

                  <h3 className="text-lg font-semibold text-slate-900">
                    Delete User?
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-500">

                    Are you sure you want to permanently delete
                    {' '}

                    <span className="font-semibold text-slate-700">
                      {deleteTarget.username}
                    </span>

                    ? This action cannot be undone.

                  </p>

                </div>

              </div>


              <div className="mt-6 flex justify-end gap-3">

                <button
                  type="button"
                  onClick={cancelDelete}
                  disabled={isDeleting}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmDeleteUser}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {isDeleting ? (
                    <>

                      <RefreshCw
                        size={16}
                        className="animate-spin"
                      />

                      Deleting...

                    </>
                  ) : (
                    <>

                      <Trash2 size={16} />

                      Delete User

                    </>
                  )}

                </button>

              </div>

            </div>

          </div>

        </div>

      )}


      {/* Activate / Deactivate Confirmation Modal */}
      {statusTarget && (

        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm">

          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="p-6">

              <div className="flex items-start gap-4">

                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    statusTarget.is_active
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}
                >

                  {statusTarget.is_active ? (
                    <UserX size={21} />
                  ) : (
                    <UserCheck size={21} />
                  )}

                </div>

                <div>

                  <h3 className="text-lg font-semibold text-slate-900">

                    {statusTarget.is_active
                      ? 'Deactivate User?'
                      : 'Activate User?'}

                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-500">

                    {statusTarget.is_active ? (
                      <>

                        <span className="font-semibold text-slate-700">
                          {statusTarget.username}
                        </span>

                        {' '}
                        will no longer be able to sign in.

                      </>
                    ) : (
                      <>

                        <span className="font-semibold text-slate-700">
                          {statusTarget.username}
                        </span>

                        {' '}
                        will be allowed to sign in again.

                      </>
                    )}

                  </p>

                </div>

              </div>


              <div className="mt-6 flex justify-end gap-3">

                <button
                  type="button"
                  onClick={cancelStatusChange}
                  disabled={isStatusChanging}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>


                <button
                  type="button"
                  onClick={confirmStatusChange}
                  disabled={isStatusChanging}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    statusTarget.is_active
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >

                  {isStatusChanging ? (
                    <>

                      <RefreshCw
                        size={16}
                        className="animate-spin"
                      />

                      Updating...

                    </>
                  ) : (
                    <>

                      {statusTarget.is_active ? (
                        <UserX size={16} />
                      ) : (
                        <UserCheck size={16} />
                      )}

                      {statusTarget.is_active
                        ? 'Deactivate User'
                        : 'Activate User'}

                    </>
                  )}

                </button>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>
  )
}

export default Users