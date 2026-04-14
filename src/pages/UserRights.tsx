import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Users, Plus, Save, X, Shield, Search, Check,
  Loader2, Trash2, PanelLeftClose, PanelLeftOpen, ChevronRight,
  User, Lock, ToggleLeft, ToggleRight
} from 'lucide-react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([])
  const [availableScreens, setAvailableScreens] = useState<any[]>([])
  const [availableLocations, setAvailableLocations] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [newUser, setNewUser] = useState<any>({
    username: '',
    password: '',
    userType: 'OPERATOR',
    screens: [],
    locations: [],
    active: true,
  })

  useEffect(() => {
    fetchUsers()
    fetchScreens()
    fetchLocations()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/admin/users`)
      if (response.data.success) setUsers(response.data.data)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchScreens = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/screens`)
      if (response.data.success) setAvailableScreens(response.data.data)
    } catch (error) {
      console.error('Error fetching screens:', error)
    }
  }

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/locations`)
      if (response.data.success) setAvailableLocations(response.data.data)
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }

  const filteredUsers = users.filter((u: any) =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleUpdateUser = async () => {
    try {
      setLoading(true)
      const response = await axios.patch(`${API_URL}/admin/users/${selectedUser.id}`, {
        username: selectedUser.username,
        userType: selectedUser.role,
        screens: selectedUser.screens,
        locations: selectedUser.locations,
        active: selectedUser.active,
      })
      if (response.data.success) {
        await fetchUsers()
        alert('User updated successfully!')
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update user')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password) {
      alert('Please fill all required fields')
      return
    }
    try {
      setLoading(true)
      const response = await axios.post(`${API_URL}/admin/users`, newUser)
      if (response.data.success) {
        await fetchUsers()
        setShowCreateModal(false)
        setNewUser({ username: '', password: '', userType: 'OPERATOR', screens: [], locations: [], active: true })
        alert('User created successfully!')
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: any) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    try {
      setDeleteLoading(true)
      const response = await axios.delete(`${API_URL}/admin/users/${userId}`)
      if (response.data.success) {
        await fetchUsers()
        setSelectedUser(null)
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete user')
    } finally {
      setDeleteLoading(false)
    }
  }

  const toggleScreen = (screenId: any, isNew = false) => {
    if (isNew) {
      setNewUser((prev: any) => ({
        ...prev,
        screens: prev.screens.includes(screenId)
          ? prev.screens.filter((s: any) => s !== screenId)
          : [...prev.screens, screenId],
      }))
    } else {
      setSelectedUser((prev: any) => ({
        ...prev,
        screens: prev.screens.includes(screenId)
          ? prev.screens.filter((s: any) => s !== screenId)
          : [...prev.screens, screenId],
      }))
    }
  }

  const toggleLocation = (locationId: any, isNew = false) => {
    if (isNew) {
      setNewUser((prev: any) => ({
        ...prev,
        locations: prev.locations.includes(locationId)
          ? prev.locations.filter((l: any) => l !== locationId)
          : [...prev.locations, locationId],
      }))
    } else {
      setSelectedUser((prev: any) => ({
        ...prev,
        locations: prev.locations.includes(locationId)
          ? prev.locations.filter((l: any) => l !== locationId)
          : [...prev.locations, locationId],
      }))
    }
  }

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-purple-50 text-purple-600 border-purple-200',
    OPERATOR: 'bg-gray-50 text-gray-500 border-gray-200',
    'HEAD-OFFICE': 'bg-blue-50 text-blue-600 border-blue-200',
    'DEPOT-INCHARGE': 'bg-amber-50 text-amber-600 border-amber-200',
  }

  // ── Shared checkbox grid ─────────────────────────────────────────
  const CheckboxGrid = ({
    items, selected, onToggle, cols = 3
  }: { items: any[]; selected: string[]; onToggle: (id: any) => void; cols?: number }) => (
    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {items.map((item: any) => {
        const checked = selected.includes(item.id)
        return (
          <label
            key={item.id}
            onClick={() => onToggle(item.id)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all select-none"
            style={{
              border: `1.5px solid ${checked ? '#5b6af0' : '#e8e9ef'}`,
              background: checked ? '#eef0fd' : '#fafafa',
            }}
          >
            <div
              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                background: checked ? '#5b6af0' : '#fff',
                border: `1.5px solid ${checked ? '#5b6af0' : '#d1d5e0'}`,
              }}
            >
              {checked && <Check size={10} color="#fff" strokeWidth={3} />}
            </div>
            <span style={{
              fontSize: 12, fontWeight: checked ? 500 : 400,
              color: checked ? '#3b4ed8' : '#6b6d85',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {item.name}
            </span>
          </label>
        )
      })}
    </div>
  )

  // ── Shared label + field ─────────────────────────────────────────
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5">
      <span style={{ fontSize: 10, fontWeight: 500, color: '#b0b2c0', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'DM Sans', sans-serif" }}>
        {label}
      </span>
      {children}
    </div>
  )

  const inputCls = "h-9 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 transition-all"
  const inputStyle = { borderColor: '#e8e9ef', color: '#1a1a2e', fontFamily: "'DM Sans', sans-serif", fontSize: 12 }
  const inputFocus = { '--tw-ring-color': '#c7cdf7' } as any

  return (
    <div className="flex h-full overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif", background: '#f2f3f7' }}>

      {/* ── Sidebar: user list ── */}
      <motion.div
        initial={{ width: '17rem' }}
        animate={{ width: isSidebarOpen ? '17rem' : '0rem' }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="flex-shrink-0 overflow-hidden flex flex-col"
        style={{ borderRight: isSidebarOpen ? '0.5px solid #e8e9ef' : 'none', background: '#fff' }}
      >
        <div style={{ minWidth: '17rem' }} className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-3.5 flex-shrink-0" style={{ borderBottom: '0.5px solid #e8e9ef' }}>
            <div className="flex items-center gap-2">
              <Shield size={14} style={{ color: '#5b6af0' }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1a2e' }}>All Users</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#f4f5fa] transition-colors"
              style={{ color: '#b0b2c0' }}
            >
              <PanelLeftClose size={13} />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 py-3 flex-shrink-0" style={{ borderBottom: '0.5px solid #f4f5fa' }}>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#b0b2c0' }} />
              <input
                type="text"
                placeholder="Search users…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-lg border bg-[#fafafa] text-xs focus:outline-none"
                style={{ borderColor: '#e8e9ef', color: '#1a1a2e', fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>
          </div>

          {/* User list */}
          <div className="flex-1 overflow-y-auto">
            {loading && users.length === 0 ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#e8e9ef', borderTopColor: '#5b6af0' }} />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#f4f5fa' }}>
                  <Users size={15} style={{ color: '#b0b2c0' }} />
                </div>
                <p style={{ fontSize: 12, color: '#b0b2c0' }}>No users found</p>
              </div>
            ) : (
              <div className="py-1">
                {filteredUsers.map((user: any, i: number) => {
                  const isActive = selectedUser?.id === user.id
                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.14, delay: Math.min(i * 0.015, 0.2) }}
                      onClick={() => setSelectedUser({ ...user })}
                      className="flex items-center gap-3 mx-2 my-0.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                      style={{
                        background: isActive ? '#eef0fd' : 'transparent',
                        border: `1px solid ${isActive ? '#c7cdf7' : 'transparent'}`,
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: isActive ? '#5b6af0' : '#f4f5fa' }}
                      >
                        <User size={13} style={{ color: isActive ? '#fff' : '#b0b2c0' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span style={{ fontSize: 12, fontWeight: 500, color: isActive ? '#3b4ed8' : '#1a1a2e', fontFamily: "'DM Sans', sans-serif" }} className="truncate">
                            {user.username}
                          </span>
                          {user.active && <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${roleColors[user.role] || roleColors['OPERATOR']}`} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10 }}>
                        {user.role}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Main panel ── */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden p-4 gap-3">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="flex items-center gap-3 flex-shrink-0"
        >
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border hover:bg-white transition-colors"
              style={{ borderColor: '#e8e9ef', color: '#6b6d85', background: '#fff' }}
            >
              <PanelLeftOpen size={13} />
            </button>
          )}
          <div className="flex-1">
            <h1 style={{ fontSize: 20, fontWeight: 500, color: '#1a1a2e', letterSpacing: '-0.02em' }}>User Management</h1>
            <p style={{ fontSize: 12, color: '#b0b2c0', marginTop: 1 }}>Manage access rights and permissions</p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-medium transition-all hover:opacity-85"
            style={{ background: '#5b6af0', color: '#fff', fontFamily: "'DM Sans', sans-serif" }}
          >
            <Plus size={13} />
            New User
          </button>
        </motion.div>

        {/* Detail panel */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {selectedUser ? (
              <motion.div
                key="details"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className="h-full flex flex-col rounded-xl overflow-hidden"
                style={{ border: '0.5px solid #e8e9ef', background: '#fff' }}
              >
                {/* Detail header */}
                <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '0.5px solid #e8e9ef', background: '#fafafa' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#eef0fd' }}>
                      <User size={16} style={{ color: '#5b6af0' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1a2e', fontFamily: "'DM Sans', sans-serif" }}>{selectedUser.username}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${roleColors[selectedUser.role] || roleColors['OPERATOR']}`} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10 }}>
                        {selectedUser.role}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteUser(selectedUser.id)}
                      disabled={deleteLoading}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all hover:opacity-85 disabled:opacity-40"
                      style={{ background: '#fff0f0', color: '#ef4444', border: '0.5px solid #fecaca', fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {deleteLoading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      Delete
                    </button>
                    <button
                      onClick={handleUpdateUser}
                      disabled={loading}
                      className="flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-medium transition-all hover:opacity-85 disabled:opacity-40"
                      style={{ background: '#5b6af0', color: '#fff', fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {loading ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      Save Changes
                    </button>
                  </div>
                </div>

                {/* Detail body */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                  {/* Basic fields */}
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 500, color: '#b0b2c0', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12, fontFamily: "'DM Sans', sans-serif" }}>Basic Info</p>
                    <div className="grid grid-cols-3 gap-4">
                      <Field label="Username">
                        <input
                          type="text"
                          value={selectedUser.username}
                          onChange={e => setSelectedUser({ ...selectedUser, username: e.target.value })}
                          className={inputCls}
                          style={inputStyle}
                        />
                      </Field>
                      <Field label="Role">
                        <select
                          value={selectedUser.role}
                          onChange={e => setSelectedUser({ ...selectedUser, role: e.target.value })}
                          className={inputCls}
                          style={inputStyle}
                        >
                          <option value="OPERATOR">Operator</option>
                          <option value="ADMIN">Admin</option>
                          <option value="HEAD-OFFICE">Head Office</option>
                          <option value="DEPOT-INCHARGE">Depot Incharge</option>
                        </select>
                      </Field>
                      <Field label="Status">
                        <div className="flex items-center gap-3 h-9">
                          <button
                            onClick={() => setSelectedUser({ ...selectedUser, active: !selectedUser.active })}
                            className="flex items-center gap-2 transition-all"
                          >
                            {selectedUser.active
                              ? <ToggleRight size={28} style={{ color: '#22c55e' }} />
                              : <ToggleLeft size={28} style={{ color: '#d1d5e0' }} />
                            }
                            <span style={{ fontSize: 12, color: selectedUser.active ? '#22c55e' : '#b0b2c0', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                              {selectedUser.active ? 'Active' : 'Inactive'}
                            </span>
                          </button>
                        </div>
                      </Field>
                    </div>
                  </div>

                  {/* Screen access */}
                  {availableScreens.length > 0 && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 500, color: '#b0b2c0', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12, fontFamily: "'DM Sans', sans-serif" }}>Screen Access</p>
                      <CheckboxGrid items={availableScreens} selected={selectedUser.screens} onToggle={id => toggleScreen(id)} cols={4} />
                    </div>
                  )}

                  {/* Location access */}
                  {availableLocations.length > 0 && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 500, color: '#b0b2c0', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12, fontFamily: "'DM Sans', sans-serif" }}>Location Access</p>
                      <CheckboxGrid items={availableLocations} selected={selectedUser.locations} onToggle={id => toggleLocation(id)} cols={3} />
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col items-center justify-center gap-3 rounded-xl"
                style={{ border: '0.5px solid #e8e9ef', background: '#fff' }}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#f4f5fa' }}>
                  <Users size={20} style={{ color: '#b0b2c0' }} />
                </div>
                <p style={{ fontSize: 13, color: '#6b6d85', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>No user selected</p>
                <p style={{ fontSize: 12, color: '#b0b2c0', fontFamily: "'DM Sans', sans-serif" }}>Select a user from the sidebar to view details</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Create User Modal ── */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(26,26,46,0.4)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowCreateModal(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
            >
              <div
                className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden pointer-events-auto"
                style={{ background: '#fff', border: '0.5px solid #e8e9ef', boxShadow: '0 24px 60px rgba(26,26,46,0.16)' }}
              >
                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '0.5px solid #e8e9ef', background: '#fafafa' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#eef0fd' }}>
                      <Plus size={15} style={{ color: '#5b6af0' }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#1a1a2e', fontFamily: "'DM Sans', sans-serif" }}>Create New User</span>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#f4f5fa] transition-colors"
                    style={{ color: '#b0b2c0' }}
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Modal body */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Username *">
                      <div className="relative">
                        <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#b0b2c0' }} />
                        <input
                          type="text"
                          value={newUser.username}
                          onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                          placeholder="Enter username"
                          className={`${inputCls} pl-8 w-full`}
                          style={inputStyle}
                        />
                      </div>
                    </Field>
                    <Field label="Password *">
                      <div className="relative">
                        <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#b0b2c0' }} />
                        <input
                          type="password"
                          value={newUser.password}
                          onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                          placeholder="Enter password"
                          className={`${inputCls} pl-8 w-full`}
                          style={inputStyle}
                        />
                      </div>
                    </Field>
                    <Field label="Role">
                      <select
                        value={newUser.userType}
                        onChange={e => setNewUser({ ...newUser, userType: e.target.value })}
                        className={`${inputCls} w-full`}
                        style={inputStyle}
                      >
                        <option value="OPERATOR">Operator</option>
                        <option value="ADMIN">Admin</option>
                        <option value="HEAD-OFFICE">Head Office</option>
                        <option value="DEPOT-INCHARGE">Depot Incharge</option>
                      </select>
                    </Field>
                    <Field label="Status">
                      <div className="flex items-center gap-3 h-9">
                        <button
                          onClick={() => setNewUser({ ...newUser, active: !newUser.active })}
                          className="flex items-center gap-2 transition-all"
                        >
                          {newUser.active
                            ? <ToggleRight size={28} style={{ color: '#22c55e' }} />
                            : <ToggleLeft size={28} style={{ color: '#d1d5e0' }} />
                          }
                          <span style={{ fontSize: 12, color: newUser.active ? '#22c55e' : '#b0b2c0', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                            {newUser.active ? 'Active' : 'Inactive'}
                          </span>
                        </button>
                      </div>
                    </Field>
                  </div>

                  {availableScreens.length > 0 && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 500, color: '#b0b2c0', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12, fontFamily: "'DM Sans', sans-serif" }}>Screen Access</p>
                      <CheckboxGrid items={availableScreens} selected={newUser.screens} onToggle={id => toggleScreen(id, true)} cols={3} />
                    </div>
                  )}

                  {availableLocations.length > 0 && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 500, color: '#b0b2c0', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12, fontFamily: "'DM Sans', sans-serif" }}>Location Access</p>
                      <CheckboxGrid items={availableLocations} selected={newUser.locations} onToggle={id => toggleLocation(id, true)} cols={3} />
                    </div>
                  )}
                </div>

                {/* Modal footer */}
                <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '0.5px solid #e8e9ef', background: '#fafafa' }}>
                  <button
                    onClick={handleCreateUser}
                    disabled={loading}
                    className="flex items-center justify-center gap-1.5 h-9 px-6 rounded-xl text-sm font-medium transition-all hover:opacity-85 disabled:opacity-40 flex-1"
                    style={{ background: '#5b6af0', color: '#fff', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {loading && <Loader2 size={14} className="animate-spin" />}
                    Create User
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex items-center justify-center h-9 px-6 rounded-xl text-sm font-medium transition-all hover:bg-[#f4f5fa] flex-1"
                    style={{ background: '#fff', color: '#6b6d85', border: '0.5px solid #e8e9ef', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}